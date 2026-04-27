// ─────────────────────────────────────────────────────────────
//  Klosseland — PlayerMesh
//  Humanoid mesh for the local player, built from character data.
//  Bone groups (head, torso, armL, armR, legL, legR) are the same
//  references AnimationSystem expects.
// ─────────────────────────────────────────────────────────────
import { buildCharacterGroup, CHAR_DEFAULTS } from './characterBuilder.js'

function loadCharacter() {
  try {
    const raw = localStorage.getItem('klosseland_character')
    if (raw) return { ...CHAR_DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...CHAR_DEFAULTS }
}

// ─────────────────────────────────────────────────────────────
export class PlayerMesh {
  /**
   * @param {import('three').Scene} scene
   */
  constructor(scene) {
    this._scene     = scene
    this._facingYaw = 0

    const data = loadCharacter()
    const { group, head, torso, armL, armR, legL, legR, hairGroup, cloakGroup } = buildCharacterGroup(data)
    // YXZ order: yaw (Y) applied before tilt (X), needed for correct sleep orientation
    group.rotation.order = 'YXZ'

    // Expose bone references for AnimationSystem
    this.head       = head
    this.torso      = torso
    this.armL       = armL
    this.armR       = armR
    this.legL       = legL
    this.legR       = legR
    this.hairGroup  = hairGroup   // secondary physics target (may be null for bald styles)
    this.cloakGroup = cloakGroup  // secondary physics target (null if no cloak)

    this.group  = group   // exposed for AnimationSystem pose tilts (sleep tilt)
    this._group = group
    scene.add(group)
  }

  // ── Update each frame ─────────────────────────────────────
  /**
   * @param {number} x   Player feet X
   * @param {number} y   Player feet Y
   * @param {number} z   Player feet Z
   * @param {number} vx  Horizontal velocity X (for facing direction)
   * @param {number} vz  Horizontal velocity Z
   */
  update(x, y, z, vx, vz) {
    this._group.position.set(x, y, z)
    if (vx * vx + vz * vz > 0.25) {
      this._facingYaw = Math.atan2(vx, vz)
    }
    this._group.rotation.y = this._facingYaw
  }

  /** Force the facing yaw — used when sitting/sleeping to lock orientation. */
  setFacing(yaw) {
    this._facingYaw = yaw
  }

  /** Scale the entire character — used by AnimationSystem for landing squash. */
  setScale(x, y, z) {
    this._group.scale.set(x, y, z)
  }

  dispose() {
    this._scene.remove(this._group)
    this._group.traverse(obj => {
      obj.geometry?.dispose()
      obj.material?.dispose()
    })
  }
}
