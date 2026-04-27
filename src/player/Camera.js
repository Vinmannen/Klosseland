// ─────────────────────────────────────────────────────────────
//  Klosseland — Camera
//  Third-person orbit that follows the player.
//  Mouse drag: azimuth (yaw) + elevation (pitch).
//  Terrain collision: ray from player centre to desired position;
//  camera is pushed forward when blocked by a solid block.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import {
  CAM_DISTANCE, CAM_MIN_POLAR, CAM_MAX_POLAR, WALK_SPEED,
} from '../data/constants.js'
import { clamp } from '../utils/math.js'

const SENSITIVITY   = 0.003    // radians per pixel
const LERP_FACTOR   = 0.10     // camera lag (tuned for Phase 14)
const CLIP_STEP     = 0.3      // metres between collision samples
const CLIP_MIN      = 0.5      // never closer than this to the player
const BOB_AMPLITUDE = 0.010    // vertical bob height in metres (reduced — 0.025 caused perceived shaking)
const BOB_RATE      = (2 * Math.PI) / (WALK_SPEED * 1.2) // slower cycle — less jarring at walk speed

export class Camera {
  constructor(threeCamera) {
    this.cam         = threeCamera
    this._azimuth    = 0           // horizontal angle (yaw)
    this._polar      = 0.6         // vertical angle from horizon, radians
    this._distance   = CAM_DISTANCE
    this._targetPos  = new THREE.Vector3()
    this._currentPos = new THREE.Vector3()
    this._clipDir    = new THREE.Vector3()   // reused scratch vector
    this._initialized = false

    // Jump punch: brief Y offset on jump / land, spring back to 0
    this._punchY  = 0
    this._punchVY = 0

    // Footstep bob
    this._bobPhase = 0
    this._bobBlend = 0   // 0=no bob, 1=full bob — smooth fade to prevent snap
  }

  // ── Update each frame ─────────────────────────────────────
  /**
   * @param {object}    player   Player instance
   * @param {object}    controls Controls instance
   * @param {object}    [world]  World instance (for terrain collision)
   * @param {number}    [dt]     Frame delta seconds
   */
  update(player, controls, world, dt = 0.016) {
    const { dx, dy } = controls.getMouseDelta()

    // Rotate with mouse
    this._azimuth -= dx * SENSITIVITY
    this._polar    = clamp(
      this._polar + dy * SENSITIVITY,
      CAM_MIN_POLAR,
      CAM_MAX_POLAR,
    )

    // Wrap azimuth
    if (this._azimuth >  Math.PI) this._azimuth -= Math.PI * 2
    if (this._azimuth < -Math.PI) this._azimuth += Math.PI * 2

    // Expose yaw to Player so movement is camera-relative
    player.yaw = this._azimuth

    // ── Compute desired camera position (spherical coords) ──
    const target  = player.getCentrePosition()
    const offsetX = -this._distance * Math.sin(this._azimuth) * Math.cos(this._polar)
    const offsetY =  this._distance * Math.sin(this._polar)
    const offsetZ = -this._distance * Math.cos(this._azimuth) * Math.cos(this._polar)

    this._targetPos.set(
      target.x + offsetX,
      target.y + offsetY,
      target.z + offsetZ,
    )

    // ── Terrain collision — push camera in front of blocks ──
    if (world) this._clipToTerrain(target, world)

    // ── Jump punch (spring toward zero) ──────────────────
    if (player.justJumped) this._punchVY =  0.05
    if (player.justLanded) this._punchVY = -0.04
    this._punchVY += (0 - this._punchY) * 0.4
    this._punchVY *= 0.75
    this._punchY  += this._punchVY

    // ── Footstep bob ──────────────────────────────────────
    // Blend the bob amplitude in/out smoothly so it never snaps to 0,
    // which would cause the camera (and apparent character position) to jerk.
    const moveSpeed = Math.hypot(player.vx, player.vz)
    const wantBob   = moveSpeed > 0.5 && player.onGround && !player.flying
    this._bobBlend  = Math.min(1, Math.max(0,
      this._bobBlend + (wantBob ? 1 : -1) * 6 * dt
    ))
    if (this._bobBlend > 0) this._bobPhase += dt * moveSpeed * BOB_RATE
    const bobY = Math.sin(this._bobPhase) * BOB_AMPLITUDE * this._bobBlend

    this._targetPos.y += this._punchY + bobY

    // ── Smooth lag ────────────────────────────────────────
    if (!this._initialized) {
      this._currentPos.copy(this._targetPos)
      this._initialized = true
    } else {
      this._currentPos.lerp(this._targetPos, LERP_FACTOR)
    }

    this.cam.position.copy(this._currentPos)
    this.cam.lookAt(target)
  }

  // ── Shorten camera distance if terrain blocks the line ────
  _clipToTerrain(target, world) {
    this._clipDir.subVectors(this._targetPos, target)
    const totalDist = this._clipDir.length()
    this._clipDir.normalize()

    let safeDist = totalDist
    for (let d = CLIP_STEP; d < totalDist; d += CLIP_STEP) {
      const px = target.x + this._clipDir.x * d
      const py = target.y + this._clipDir.y * d
      const pz = target.z + this._clipDir.z * d
      if (world.isSolid(Math.floor(px), Math.floor(py), Math.floor(pz))) {
        safeDist = Math.max(d - CLIP_STEP, CLIP_MIN)
        break
      }
    }

    if (safeDist < totalDist) {
      this._targetPos.copy(target).addScaledVector(this._clipDir, safeDist)
    }
  }

  /** Yaw angle in radians (horizontal look direction). */
  get yaw() { return this._azimuth }
}
