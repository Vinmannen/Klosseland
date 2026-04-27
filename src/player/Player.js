// ─────────────────────────────────────────────────────────────
//  Klosseland — Player
//  Position, velocity, AABB physics, fly mode, chunk tracking.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import {
  PLAYER_HEIGHT, PLAYER_WIDTH, WALK_SPEED, FLY_SPEED,
  JUMP_VELOCITY, GRAVITY, CHUNK_W,
} from '../data/constants.js'
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'
import { worldToChunk } from '../utils/math.js'

const HALF_W = PLAYER_WIDTH / 2
const STEP_HEIGHT = 0.55   // automatically step up blocks this tall

export class Player {
  constructor() {
    // World position = feet centre
    this.x = 0; this.y = 20; this.z = 0

    // Velocity
    this.vx = 0; this.vy = 0; this.vz = 0

    // State
    this.onGround = false
    this.flying   = false
    this.yaw      = 0   // horizontal look direction (radians, set by Camera)

    // Game mode — set via setGameMode() before first frame
    this.gameMode      = 'creative'  // 'creative' | 'adventure'
    this.respawnQueued = false        // adventure fall damage: main.js checks this

    // Per-frame events for Camera
    this.justJumped = false
    this.justLanded = false

    // Chunk position (updated each frame)
    this.chunkX = 0; this.chunkZ = 0

    // Internals
    this._jumpQueued = false
    this._sprintT    = 0   // 0..1 sprint blend, ramps over 0.3 s
  }

  // ── Game mode setup ──────────────────────────────────────
  setGameMode(mode) {
    this.gameMode = mode
    // Creative: start airborne so the player floats instead of falling through spawn
    if (mode === 'creative') this.flying = true
    else                     this.flying = false
  }

  // ── Spawn above terrain ──────────────────────────────────
  spawnAt(x, z, world) {
    this.x = x + 0.5
    this.z = z + 0.5
    this.y = world.getSurfaceY(x, z) + 2
    this.vx = this.vy = this.vz = 0
  }

  // ── Main update (called every frame) ─────────────────────
  update(dt, controls, world) {
    // ── Per-frame events reset ────────────────────────────
    this.justJumped = false
    this.justLanded = false
    const wasOnGround = this.onGround

    // ── Fly toggle ────────────────────────────────────────
    if (controls.consumeFlyToggle() && this.gameMode !== 'adventure') {
      this.flying = !this.flying
      if (this.flying) this.vy = 0
    }

    // ── Sprint ramp ───────────────────────────────────────
    const isSprinting = !this.flying && controls.isSprinting()
    if (isSprinting) this._sprintT = Math.min(1, this._sprintT + dt / 0.3)
    else             this._sprintT = Math.max(0, this._sprintT - dt / 0.3)

    // ── Directional movement ──────────────────────────────
    const { forward, right } = controls.getMovement()
    const speed = (this.flying ? FLY_SPEED : WALK_SPEED) * (1 + this._sprintT * 0.6)

    // Move relative to yaw (camera horizontal angle)
    const sinYaw = Math.sin(this.yaw), cosYaw = Math.cos(this.yaw)
    const moveX = (forward * sinYaw - right * cosYaw) * speed
    const moveZ = (forward * cosYaw + right * sinYaw) * speed

    // ── Gravity / jumping ─────────────────────────────────
    const onLadder = !this.flying && this._isOnLadder(world)

    if (this.flying) {
      // Soft lerp toward target in fly mode
      const ft = Math.min(0.25 * dt * 60, 1)
      this.vx += (moveX - this.vx) * ft
      this.vz += (moveZ - this.vz) * ft
      if (controls.isJumping())         this.vy =  FLY_SPEED
      else if (controls.isDescending()) this.vy = -FLY_SPEED
      else this.vy *= 0.8   // dampen vertical in fly mode
    } else if (onLadder) {
      // Ladder climbing — cancel gravity, move vertically with Space/Shift
      const CLIMB = WALK_SPEED * 0.7
      const t = Math.min(0.2 * dt * 60, 1)
      this.vx += (moveX - this.vx) * t
      this.vz += (moveZ - this.vz) * t
      if      (controls.isJumping())    this.vy = CLIMB
      else if (controls.isDescending()) this.vy = -CLIMB
      else                              this.vy = 0
      this.onGround = false
    } else {
      // Acceleration lerp: responsive on ground, floaty in air
      const lerpFactor = this.onGround ? 0.18 : 0.06
      const t = Math.min(lerpFactor * dt * 60, 1)
      this.vx += (moveX - this.vx) * t
      this.vz += (moveZ - this.vz) * t

      if (controls.isJumping() && this.onGround) {
        this.vy = JUMP_VELOCITY
        this.onGround = false
        this.justJumped = true
      }
      this.vy += GRAVITY * dt
    }

    // ── Resolve collisions ───────────────────────────────
    const vyBeforeLand = this.vy
    this._moveAndCollide(dt, world)

    // ── Land detection ───────────────────────────────────
    if (!wasOnGround && this.onGround) {
      this.justLanded = true
      // Adventure fall damage: impact speed > ~5-block drop triggers respawn
      if (this.gameMode === 'adventure' && vyBeforeLand < -15) {
        this.respawnQueued = true
      }
    }

    // ── Chunk position ───────────────────────────────────
    this.chunkX = worldToChunk(Math.floor(this.x), CHUNK_W)
    this.chunkZ = worldToChunk(Math.floor(this.z), CHUNK_W)

    // ── Fall void recovery ───────────────────────────────
    if (this.y < -20) {
      this.y = world.getSurfaceY(Math.floor(this.x), Math.floor(this.z)) + 3
      this.vy = 0
    }
  }

  // ── AABB sweep collision ──────────────────────────────────
  _moveAndCollide(dt, world) {
    let dx = this.vx * dt
    let dy = this.vy * dt
    let dz = this.vz * dt

    // Resolve Y first to correctly detect ground
    this.y += dy
    if (this._resolveY(world, dy)) {
      if (dy < 0) { this.onGround = true; this.vy = 0 }
      else        { this.vy = 0 }
    } else {
      this.onGround = false
    }

    // Resolve X
    this.x += dx
    if (this._resolveX(world)) {
      // Try step-up
      if (!this.flying && this.onGround) {
        const stepped = this._tryStep(world, dx, 0)
        if (!stepped) this.vx = 0
      } else {
        this.vx = 0
      }
    }

    // Resolve Z
    this.z += dz
    if (this._resolveZ(world)) {
      if (!this.flying && this.onGround) {
        const stepped = this._tryStep(world, 0, dz)
        if (!stepped) this.vz = 0
      } else {
        this.vz = 0
      }
    }
  }

  // ── AABB overlap helpers ──────────────────────────────────
  _resolveY(world, dy) {
    const minX = this.x - HALF_W, maxX = this.x + HALF_W
    const minZ = this.z - HALF_W, maxZ = this.z + HALF_W
    const minY = this.y, maxY = this.y + PLAYER_HEIGHT
    const checkY = dy < 0 ? Math.floor(minY) : Math.floor(maxY)

    let hit = false
    for (let bx = Math.floor(minX); bx <= Math.floor(maxX - 0.001); bx++) {
      for (let bz = Math.floor(minZ); bz <= Math.floor(maxZ - 0.001); bz++) {
        const colH = world.getBlockCollisionHeight(bx, checkY, bz)
        if (colH === 0) continue
        const surface = checkY + colH

        if (dy < 0) {
          // Falling: skip if player's feet are already above this block's surface
          // (handles slab — feet at checkY+0.8 should not snap to checkY+0.5)
          if (minY >= surface) continue
          this.y = surface
        } else {
          this.y = checkY - PLAYER_HEIGHT
        }
        hit = true
        break
      }
      if (hit) break
    }
    return hit
  }

  _resolveX(world) {
    const minZ = this.z - HALF_W, maxZ = this.z + HALF_W
    const minY = this.y + 0.05,   maxY = this.y + PLAYER_HEIGHT - 0.05
    let hit = false

    for (let by = Math.floor(minY); by <= Math.floor(maxY); by++) {
      for (let bz = Math.floor(minZ); bz <= Math.floor(maxZ - 0.001); bz++) {
        const minX = this.x - HALF_W, maxX = this.x + HALF_W
        const bxMin = Math.floor(minX), bxMax = Math.floor(maxX)
        if (this.vx > 0) {
          if (!world.isSolid(bxMax, by, bz)) continue
          this.x = bxMax - HALF_W
        } else {
          if (!world.isSolid(bxMin, by, bz)) continue
          this.x = bxMin + 1 + HALF_W
        }
        hit = true; break
      }
      if (hit) break
    }
    return hit
  }

  _resolveZ(world) {
    const minX = this.x - HALF_W, maxX = this.x + HALF_W
    const minY = this.y + 0.05,   maxY = this.y + PLAYER_HEIGHT - 0.05
    let hit = false

    for (let by = Math.floor(minY); by <= Math.floor(maxY); by++) {
      for (let bx = Math.floor(minX); bx <= Math.floor(maxX - 0.001); bx++) {
        const minZ = this.z - HALF_W, maxZ = this.z + HALF_W
        const bzMin = Math.floor(minZ), bzMax = Math.floor(maxZ)
        if (this.vz > 0) {
          if (!world.isSolid(bx, by, bzMax)) continue
          this.z = bzMax - HALF_W
        } else {
          if (!world.isSolid(bx, by, bzMin)) continue
          this.z = bzMin + 1 + HALF_W
        }
        hit = true; break
      }
      if (hit) break
    }
    return hit
  }

  _tryStep(world, dx, dz) {
    // Check if stepping up by STEP_HEIGHT clears the obstacle
    this.y += STEP_HEIGHT
    const oldX = this.x - dx, oldZ = this.z - dz
    if (dx !== 0) {
      this.x += dx
      if (this._resolveX(world)) { this.y -= STEP_HEIGHT; this.x = oldX; return false }
    }
    if (dz !== 0) {
      this.z += dz
      if (this._resolveZ(world)) { this.y -= STEP_HEIGHT; this.z = oldZ; return false }
    }
    return true
  }

  // ── Check if player body overlaps a ladder block ─────────
  _isOnLadder(world) {
    const minX = Math.floor(this.x - HALF_W)
    const maxX = Math.floor(this.x + HALF_W)
    const minZ = Math.floor(this.z - HALF_W)
    const maxZ = Math.floor(this.z + HALF_W)
    // Check two block heights (feet and mid-body)
    for (const by of [Math.floor(this.y + 0.1), Math.floor(this.y + PLAYER_HEIGHT * 0.5)]) {
      for (let bx = minX; bx <= maxX; bx++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const id = world.getBlock(bx, by, bz)
          if (!id) continue
          const def = BLOCK_BY_ID.get(id)
          if (def?.shape === 'ladder') return true
        }
      }
    }
    return false
  }

  // ── Three.js position vector ─────────────────────────────
  getEyePosition() {
    return new THREE.Vector3(this.x, this.y + PLAYER_HEIGHT * 0.85, this.z)
  }

  getCentrePosition() {
    return new THREE.Vector3(this.x, this.y + PLAYER_HEIGHT * 0.5, this.z)
  }
}
