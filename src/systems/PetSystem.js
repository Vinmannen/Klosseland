// ─────────────────────────────────────────────────────────────
//  Klosseland — PetSystem
//  Spawns and updates the player's chosen companion pet in-game.
//  Reads klosseland_character.pet from localStorage.
//
//  Behaviours (cat-tuned):
//   • follow  — trails player at 1.8–3.0m; runs if > 6m away
//   • idle    — gentle head bob while standing near player
//   • sit     — after 3.5 s idle: body squashes, paws tuck, head tilts
//   • spin    — excited full-360 spin when player leaves the ground
//   • tail    — always wagging; faster when following, slower when sitting
// ─────────────────────────────────────────────────────────────
import { CHAR_DEFAULTS } from '../entities/characterBuilder.js'
import { getPetDef }     from '../data/petDefinitions.js'

const TWO_PI = Math.PI * 2

// Follow thresholds
const FOLLOW_START = 3.0   // m — further than this → start following
const FOLLOW_STOP  = 1.8   // m — closer than this  → stop (idle)
const RUN_START    = 6.0   // m — further than this  → run instead of walk
const FOLLOW_SPEED = 2.2   // units/s  walk pace
const RUN_SPEED    = 5.0   // units/s  run pace
const TURN_RATE    = 5.0   // yaw convergence factor (rad/s · dt)

// Sit
const SIT_DELAY    = 3.5   // s of idle before sitting

// Excited jump-spin
const SPIN_DUR     = 0.55  // s to complete one full 360° spin

function angleDiff(a, b) {
  let d = a - b
  d -= Math.round(d / TWO_PI) * TWO_PI
  return d
}

export class PetSystem {
  /** @param {import('three').Scene} scene */
  constructor(scene) {
    this._scene = scene

    // World position
    this.x = 0; this.y = 1; this.z = 0
    this.yaw = 0

    // AI state
    this._state          = 'idle'  // 'follow' | 'idle' | 'sit'
    this._sitTimer       = 0
    this._spinTimer      = 0
    this._wasOnGround    = true
    this._onGroundFrames = 0      // consecutive frames player has been on ground
    this._initialized    = false

    // Animation timers
    this._time    = 0
    this._legTime = 0

    // Mesh references (populated by _spawn)
    this._group     = null
    this._legs      = null
    this._head      = null
    this._headBaseY = 0
    this._tailRoot  = null

    this._spawn()
  }

  // ── Spawn the pet mesh from localStorage character data ───────
  _spawn() {
    const raw = localStorage.getItem('klosseland_character')
    let data
    try { data = raw ? { ...CHAR_DEFAULTS, ...JSON.parse(raw) } : { ...CHAR_DEFAULTS } }
    catch { data = { ...CHAR_DEFAULTS } }

    const def = getPetDef(data.pet ?? 'none')
    if (!def.build) return   // 'none' chosen — nothing to spawn

    const parts      = def.build()
    this._group      = parts.group
    this._legs       = parts.legs     ?? null
    this._head       = parts.head     ?? null
    this._headBaseY  = parts.head     ? parts.head.position.y : 0
    this._tailRoot   = parts.tailRoot ?? null

    this._group.traverse(obj => {
      obj.frustumCulled = false
      if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true }
    })

    this._scene.add(this._group)
  }

  // ─────────────────────────────────────────────────────────────
  /**
   * @param {number} dt
   * @param {import('../player/Player.js').Player} player
   * @param {import('../world/World.js').World} world
   */
  update(dt, player, world) {
    if (!this._group) return

    // Place pet beside player on first frame so it doesn't teleport from (0,0)
    if (!this._initialized) {
      this.x = player.x + 1.5
      this.y = player.y
      this.z = player.z + 1.5
      this._initialized = true
    }

    this._time += dt

    const dx   = this.x - player.x
    const dz   = this.z - player.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // ── Detect player jump → trigger excited spin ─────────────
    // Require 5 consecutive on-ground frames before the trigger is armed — prevents
    // a single-frame onGround flicker (e.g. physics stutter) from causing endless spinning.
    // Also skip if already spinning so rapid jumps don't stack/reset the timer.
    if (player.onGround) {
      this._onGroundFrames = Math.min(this._onGroundFrames + 1, 10)
    } else {
      if (this._onGroundFrames >= 5 && !player.flying && this._spinTimer <= 0) {
        this._spinTimer = SPIN_DUR
        this._sitTimer  = 0
        if (this._state === 'sit') this._state = 'idle'
      }
      this._onGroundFrames = 0
    }
    this._wasOnGround = player.onGround

    // ── Spin overrides normal movement ────────────────────────
    if (this._spinTimer > 0) {
      this._spinTimer = Math.max(0, this._spinTimer - dt)
      this.yaw += (TWO_PI / SPIN_DUR) * dt
    } else {
      // ── State transitions ──────────────────────────────────
      if (dist > FOLLOW_START && this._state !== 'follow') {
        this._state    = 'follow'
        this._sitTimer = 0
      } else if (this._state === 'follow' && dist < FOLLOW_STOP) {
        this._state    = 'idle'
        this._sitTimer = 0
      } else if (this._state === 'idle') {
        this._sitTimer += dt
        if (this._sitTimer >= SIT_DELAY) this._state = 'sit'
      } else if (this._state === 'sit' && dist > FOLLOW_START) {
        this._state    = 'follow'
        this._sitTimer = 0
      }

      // ── Movement ────────────────────────────────────────────
      if (this._state === 'follow') {
        const speed = dist > RUN_START ? RUN_SPEED : FOLLOW_SPEED
        const toYaw = Math.atan2(-dx, -dz)
        this.yaw   += angleDiff(toYaw, this.yaw) * Math.min(1, dt * TURN_RATE)
        this.x     += Math.sin(this.yaw) * speed * dt
        this.z     += Math.cos(this.yaw) * speed * dt
      }
    }

    // ── Surface snap ──────────────────────────────────────────
    const sy = world.getSurfaceY(this.x, this.z)
    if (sy > 0 && sy <= this.y + 2) {
      this.y += (sy + 1 - this.y) * Math.min(1, dt * 12)
    }

    this._syncMesh(dt)
  }

  // ─────────────────────────────────────────────────────────────
  _syncMesh(dt) {
    this._group.position.set(this.x, this.y, this.z)
    this._group.rotation.y = this.yaw

    const moving   = this._state === 'follow'
    const sitting  = this._state === 'sit'
    const spinning = this._spinTimer > 0

    // ── 4-legged diagonal gait ────────────────────────────────
    // Skip during spin — rigid splayed legs look funnier mid-spin
    if (this._legs && !spinning) {
      if (moving) {
        this._legTime += 4.5 * dt
        const swing = 0.38
        // Pair A: FL[2] + BR[1]
        this._legs[2].rotation.x =  Math.sin(this._legTime) * swing
        this._legs[1].rotation.x =  Math.sin(this._legTime) * swing
        // Pair B: FR[3] + BL[0]
        this._legs[3].rotation.x =  Math.sin(this._legTime + Math.PI) * swing
        this._legs[0].rotation.x =  Math.sin(this._legTime + Math.PI) * swing
      } else {
        for (const leg of this._legs) leg.rotation.x *= 0.88
        if (!sitting) this._legTime = 0
        // Sitting: ease front paws forward (tucked-in pose)
        if (sitting) {
          const tuck = 0.30
          this._legs[2].rotation.x += (tuck - this._legs[2].rotation.x) * Math.min(1, dt * 5)
          this._legs[3].rotation.x += (tuck - this._legs[3].rotation.x) * Math.min(1, dt * 5)
        }
      }
    }

    // ── Tail wag — always active ──────────────────────────────
    if (this._tailRoot) {
      const wagSpeed = sitting ? 2.0 : (moving ? 4.5 : 2.5)
      this._tailRoot.rotation.z = Math.sin(this._time * wagSpeed) * 0.28
    }

    // ── Head animations ───────────────────────────────────────
    if (this._head) {
      if (sitting) {
        // Cute slow side-to-side tilt (the classic curious-cat look)
        this._head.rotation.z = Math.sin(this._time * 1.3) * 0.13
        this._head.position.y = this._headBaseY - 0.02
      } else if (spinning) {
        // Tip head to one side during spin
        this._head.rotation.z = 0.20
        this._head.position.y = this._headBaseY
      } else if (!moving) {
        // Idle: gentle vertical bob
        this._head.rotation.z *= 0.92
        this._head.position.y  = this._headBaseY + Math.sin(this._time * 1.5) * 0.012
      } else {
        // Following: reset smoothly
        this._head.rotation.z *= 0.92
        this._head.position.y  = this._headBaseY
      }
    }

    // ── Sit: Y-squash body (smooth lerp to target) ────────────
    const targetSY = sitting ? 0.86 : 1.0
    this._group.scale.y += (targetSY - this._group.scale.y) * Math.min(1, dt * 7)
  }

  // ─────────────────────────────────────────────────────────────
  dispose() {
    if (!this._group) return
    this._group.traverse(obj => {
      if (obj.isMesh) { obj.geometry?.dispose(); obj.material?.dispose() }
    })
    this._scene.remove(this._group)
    this._group = null
  }
}
