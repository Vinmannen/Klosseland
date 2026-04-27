// ─────────────────────────────────────────────────────────────
//  Klosseland — AnimationSystem
//  Drives PlayerMesh bone rotations each frame from player state.
//  States: idle | walk | run | jump (ascent/fall) | land | action
// ─────────────────────────────────────────────────────────────
import { WALK_SPEED } from '../data/constants.js'

const TWO_PI = Math.PI * 2

// Walk / run
const WALK_FREQ     = 2.8   // leg cycles per second at full speed
const WALK_AMP      = 0.50  // max leg swing in radians
const RUN_FREQ_MUL  = 1.7
const RUN_AMP_MUL   = 1.4

// Idle breathing
const IDLE_BREATH_FREQ = 0.5  // Hz

// Jump / fall pose (radians)
const JUMP_ARM_UP  = 0.52   // arms raise on ascent  (≈30°)
const FALL_ARM_OUT = 0.35   // arms extend while falling (≈20°)
const FALL_LEG_SPR = 0.26   // legs spread sideways while falling (≈15°)

// Walk ↔ idle blend speed (0→1 in 1/N seconds — keeps limbs from snapping on start/stop)
const WALK_BLEND_SPEED = 5

// Block place / break arm swing
const ACTION_DUR   = 0.20   // seconds
const ACTION_ARM   = 0.61   // radians (≈35°)

// Landing squash
const SQUASH_DUR   = 0.15   // seconds
const SQUASH_SY    = 0.85   // Y scale at peak squash
const SQUASH_SXZ   = 1.10   // XZ scale at peak squash

// Sit pose (legs bent forward from hip pivot, arms resting)
// Leg/arm meshes hang BELOW their pivots, so NEGATIVE rotation.x swings them forward (+Z).
const SIT_LEG_X  = -1.35  // forward swing ≈77° (negative: mesh below pivot)
const SIT_LEG_Z  =  0.08  // outward splay magnitude
const SIT_ARM_X  = -0.30  // arms forward/down onto lap
const SIT_ARM_Z  =  0.12  // arms slightly inward toward body

// Sleep pose (character tips horizontal, arms spread)
const SLEEP_ARM_X  = 0.10  // arms nearly flat
const SLEEP_ARM_Z  = 0.55  // arms spread to sides
const SLEEP_LEG_Z  = 0.10  // legs slight spread

// Blend speed (1/sec — 0→1 in ~0.17 s)
const POSE_BLEND = 6

function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

export class AnimationSystem {
  /**
   * @param {import('../entities/PlayerMesh.js').PlayerMesh} playerMesh
   */
  constructor(playerMesh) {
    this._mesh        = playerMesh

    this._phase       = 0      // walk cycle accumulator (radians)
    this._idleTime    = 0      // for breathing oscillation
    this._actionTimer = 0      // arm-swing countdown (seconds)
    this._squashTimer = 0      // landing squash countdown (seconds)
    this._wasOnGround = true   // previous frame ground state
    this._airFrames   = 0      // consecutive frames spent airborne (guards squash trigger)
    this._walkBlend   = 0      // 0 = idle, 1 = fully walking (smooth transition)
    this._isMoving    = false  // hysteretic moving flag — avoids flicker at the threshold

    // Secondary physics — hair spring
    this._hairAngle = 0        // current rotation.x offset (rad)
    this._hairVel   = 0        // angular velocity

    // Secondary physics — cloak trailing spring
    this._cloakAngle = 0       // current rotation.x (positive = bottom trails behind)
    this._cloakVel   = 0

    // Special pose state (set from main.js each frame)
    this.isSitting  = false
    this.isSleeping = false
    this._sitBlend  = 0
    this._sleepBlend = 0
  }

  /**
   * @param {number} dt
   * @param {import('../player/Player.js').Player} player
   * @param {import('../player/Controls.js').Controls} controls
   */
  update(dt, player, controls) {
    const { vx, vz, vy, onGround, flying } = player

    const horizSpeed   = Math.sqrt(vx * vx + vz * vz)
    // Hysteresis prevents the walk animation from flickering when speed oscillates near
    // the threshold. Start threshold (0.5) is higher than stop threshold (0.1), so
    // brief velocity blips or slow drifts never trigger the walk pose.
    if (this._isMoving) {
      this._isMoving = horizSpeed > 0.10
    } else {
      this._isMoving = horizSpeed > 0.50
    }
    const isMoving     = this._isMoving
    const isSprinting  = controls.isSprinting() && isMoving && onGround
    // Require 3 consecutive airborne frames before switching to jump/fall poses.
    // Single-frame onGround flickers (physics stutter or high-framerate edge cases)
    // won't cause a visible hard snap between the airborne pose and the ground pose.
    const isAirborne   = !onGround && this._airFrames >= 3
    const isAscending  = isAirborne && !flying && vy > 0
    const isDescending = isAirborne && !flying && vy <= 0

    // ── Landing detection ─────────────────────────────────────
    // Require 8+ consecutive airborne frames before the squash arms itself.
    // A single-frame onGround flicker (physics stutter) won't trigger the scale change.
    if (onGround) {
      if (this._airFrames >= 8) this._squashTimer = SQUASH_DUR
      this._airFrames = 0
    } else {
      this._airFrames++
    }
    this._wasOnGround = onGround

    // ── Action trigger (place / break — fires on first press, loops while held) ──
    if ((controls._lmbDown || controls._rmbDown) && this._actionTimer <= 0) {
      this._actionTimer = ACTION_DUR
    }
    this._actionTimer = Math.max(0, this._actionTimer - dt)

    // ── Walk phase accumulation ───────────────────────────────
    // Scale frequency with speed so legs cycle at the right rate for the actual
    // movement — without this, legs thrash at 2.8 Hz even at 0.5 m/s (looks shaky).
    const speedFrac  = Math.min(1, horizSpeed / WALK_SPEED)
    const baseFreq   = isSprinting ? WALK_FREQ * RUN_FREQ_MUL : WALK_FREQ
    const freq       = baseFreq * speedFrac
    if (isMoving && onGround) {
      this._phase += freq * TWO_PI * dt
      // Wrap to [0, 2π] to prevent floating-point drift at large values
      if (this._phase > TWO_PI) this._phase -= TWO_PI
    }

    // ── Idle timer ────────────────────────────────────────────
    this._idleTime += dt

    // ── Determine bone targets and apply ─────────────────────
    const m = this._mesh

    // Reset torso scale (only idle overrides it)
    m.torso.scale.y = 1
    // Reset arm Z — no animation branch sets this, so without a reset the sit/sleep
    // blend has no base value to lerp back from, leaving arms stuck in the crossed pose.
    m.armL.rotation.z = 0
    m.armR.rotation.z = 0

    if (flying) {
      // Gliding pose
      m.armL.rotation.x =  -0.40
      m.armR.rotation.x =  -0.40
      m.legL.rotation.x =   0.15
      m.legR.rotation.x =   0.15
      m.legL.rotation.z =   0
      m.legR.rotation.z =   0

    } else if (isAscending) {
      // Jump ascent — arms raise, legs spread slightly so they don't cross
      m.armL.rotation.x =  JUMP_ARM_UP
      m.armR.rotation.x =  JUMP_ARM_UP
      m.legL.rotation.x = -0.10
      m.legR.rotation.x = -0.10
      m.legL.rotation.z =  0.13
      m.legR.rotation.z = -0.13

    } else if (isDescending) {
      // Apex / fall — arms out, legs spread
      m.armL.rotation.x = -FALL_ARM_OUT
      m.armR.rotation.x = -FALL_ARM_OUT
      m.legL.rotation.x =  0.10
      m.legR.rotation.x =  0.10
      m.legL.rotation.z =  FALL_LEG_SPR
      m.legR.rotation.z = -FALL_LEG_SPR

    } else {
      // Walk / idle — blended to avoid snapping when crossing the isMoving threshold
      this._walkBlend = _clamp(
        this._walkBlend + (isMoving ? WALK_BLEND_SPEED : -WALK_BLEND_SPEED * 1.6) * dt, 0, 1
      )
      const wb = this._walkBlend

      // Once fully idle, reset phase so the next walk always starts from neutral
      // (legs straight). Prevents a random mid-swing first step.
      if (wb === 0 && !isMoving) this._phase = 0

      const breath = Math.sin(this._idleTime * IDLE_BREATH_FREQ * TWO_PI)
      const amp    = isSprinting ? WALK_AMP * RUN_AMP_MUL : WALK_AMP
      const swing  = Math.sin(this._phase) * amp * speedFrac

      // Lerp each limb between idle and walk target
      m.legL.rotation.x =  swing * wb
      m.legR.rotation.x = -swing * wb
      m.armL.rotation.x =  breath * 0.04 * (1 - wb) + (-swing * 0.65) * wb
      m.armR.rotation.x = -breath * 0.04 * (1 - wb) + ( swing * 0.65) * wb
      m.legL.rotation.z =  0
      m.legR.rotation.z =  0
      m.torso.scale.y   = 1 + breath * 0.005 * (1 - wb)
    }

    // ── Hair secondary physics ────────────────────────────────
    // Damped spring excited by the walk-cycle vertical bounce (2× per stride).
    // Hair swings back on footstrike, forward on lift-off — classic secondary motion.
    if (m.hairGroup) {
      const HAIR_K = 14, HAIR_D = 6.5
      const excite = (isMoving && onGround)
        ? Math.sin(this._phase * 2) * horizSpeed * 0.007 * dt
        : 0
      const hairForce = -HAIR_K * this._hairAngle - HAIR_D * this._hairVel
      this._hairVel   += (hairForce + excite * HAIR_K) * dt
      this._hairAngle += this._hairVel * dt
      this._hairAngle  = Math.max(-0.22, Math.min(0.22, this._hairAngle))
      m.hairGroup.rotation.x = this._hairAngle
    }

    // ── Cloak trailing physics ────────────────────────────────
    // Cloak pivot is at the collar; positive rotation.x trails the bottom backward.
    if (m.cloakGroup) {
      const CLOAK_K    = 6, CLOAK_D = 4
      const speedFrac  = Math.min(1, horizSpeed / 7.0)  // 7 ≈ full sprint speed
      const cloakTarget = speedFrac * 0.40              // max ~23° at full sprint
      const cloakForce  = CLOAK_K * (cloakTarget - this._cloakAngle) - CLOAK_D * this._cloakVel
      this._cloakVel   += cloakForce * dt
      this._cloakAngle += this._cloakVel * dt
      m.cloakGroup.rotation.x = this._cloakAngle
    }

    // ── Special pose blending (sit / sleep) ──────────────────
    this._sitBlend   = _clamp(this._sitBlend   + (this.isSitting  ? 1 : -1) * POSE_BLEND * dt, 0, 1)
    this._sleepBlend = _clamp(this._sleepBlend + (this.isSleeping ? 1 : -1) * POSE_BLEND * dt, 0, 1)

    if (this._sitBlend > 0) {
      const b = this._sitBlend
      m.legL.rotation.x += (SIT_LEG_X  - m.legL.rotation.x) * b
      m.legR.rotation.x += (SIT_LEG_X  - m.legR.rotation.x) * b
      // Negative Z for left leg, positive for right = outward splay
      m.legL.rotation.z += (-SIT_LEG_Z - m.legL.rotation.z) * b
      m.legR.rotation.z += ( SIT_LEG_Z - m.legR.rotation.z) * b
      m.armL.rotation.x += (SIT_ARM_X  - m.armL.rotation.x) * b
      m.armR.rotation.x += (SIT_ARM_X  - m.armR.rotation.x) * b
      m.armL.rotation.z += ( SIT_ARM_Z - m.armL.rotation.z) * b
      m.armR.rotation.z += (-SIT_ARM_Z - m.armR.rotation.z) * b
    }

    if (this._sleepBlend > 0) {
      const b = this._sleepBlend
      m.legL.rotation.x += (0            - m.legL.rotation.x) * b
      m.legR.rotation.x += (0            - m.legR.rotation.x) * b
      m.legL.rotation.z += (SLEEP_LEG_Z  - m.legL.rotation.z) * b
      m.legR.rotation.z += (-SLEEP_LEG_Z - m.legR.rotation.z) * b
      m.armL.rotation.x += (SLEEP_ARM_X  - m.armL.rotation.x) * b
      m.armR.rotation.x += (SLEEP_ARM_X  - m.armR.rotation.x) * b
      m.armL.rotation.z += (SLEEP_ARM_Z  - m.armL.rotation.z) * b
      m.armR.rotation.z += (-SLEEP_ARM_Z - m.armR.rotation.z) * b
    }

    // Tilt entire character horizontal when sleeping (rotation.x: 0 = upright, -PI/2 = lying down)
    m.group.rotation.x = -(Math.PI / 2) * this._sleepBlend

    // ── Action arm overlay (right arm swings forward) ─────────
    if (this._actionTimer > 0 && this._sitBlend < 0.5 && this._sleepBlend < 0.5) {
      const t = this._actionTimer / ACTION_DUR           // 1 → 0
      m.armR.rotation.x += ACTION_ARM * Math.sin(t * Math.PI)
    }

    // ── Landing squash (scale whole mesh group) ───────────────
    if (this._squashTimer > 0 && this._sitBlend < 0.5 && this._sleepBlend < 0.5) {
      this._squashTimer = Math.max(0, this._squashTimer - dt)
      const t    = this._squashTimer / SQUASH_DUR        // 1 → 0
      const ease = Math.sin(t * Math.PI)                 // bell curve: 0→1→0
      const sy   = 1 + (SQUASH_SY  - 1) * ease
      const sxz  = 1 + (SQUASH_SXZ - 1) * ease
      m.setScale(sxz, sy, sxz)
    } else {
      m.setScale(1, 1, 1)
    }
  }

  dispose() {
    // No owned resources; reset bones on teardown
    const m = this._mesh
    m.armL.rotation.set(0, 0, 0)
    m.armR.rotation.set(0, 0, 0)
    m.legL.rotation.set(0, 0, 0)
    m.legR.rotation.set(0, 0, 0)
    m.torso.scale.y = 1
    m.setScale(1, 1, 1)
    m.group.rotation.x = 0
    if (m.hairGroup)  { m.hairGroup.rotation.x  = 0 }
    if (m.cloakGroup) { m.cloakGroup.rotation.x = 0 }
    this._hairAngle = this._hairVel = this._cloakAngle = this._cloakVel = 0
    this._sitBlend = this._sleepBlend = this._walkBlend = 0
  }
}
