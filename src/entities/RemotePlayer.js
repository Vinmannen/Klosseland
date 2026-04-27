// ─────────────────────────────────────────────────────────────
//  Klosseland — RemotePlayer
//  Block-person mesh with a canvas name tag.
//  Smoothly interpolates toward the latest server position.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

// Mesh proportions
const HEAD_S = 0.5
const BODY_W = 0.5,  BODY_H  = 0.75, BODY_D  = 0.25
const LIMB_W = 0.25, LIMB_H  = 0.75, LIMB_D  = 0.25

// How fast the mesh lerps toward the target position (multiplier per second)
const LERP_SPEED = 14

// ── Utilities ─────────────────────────────────────────────────
function idToHue(id) {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = (h << 5) ^ h ^ id.charCodeAt(i)
  return ((h >>> 0) % 360) / 360
}

function makeNameTag(name) {
  const W = 256, H = 48
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Dark pill background
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(4, 4, W - 8, H - 8, 8)
  } else {
    ctx.rect(4, 4, W - 8, H - 8)
  }
  ctx.fill()

  // Name text
  ctx.font         = 'bold 26px Arial, sans-serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#ffffff'
  ctx.fillText(name.slice(0, 18), W / 2, H / 2)

  const tex    = new THREE.CanvasTexture(canvas)
  const mat    = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.6, 0.3, 1)
  sprite.position.set(0, 2.5, 0)   // above the head (group root is at feet)
  return sprite
}

// ── RemotePlayer class ────────────────────────────────────────
export class RemotePlayer {
  /**
   * @param {string}            id     Server-assigned player id
   * @param {string}            name
   * @param {THREE.Scene}       scene
   */
  constructor(id, name, scene) {
    this.id    = id
    this.name  = name
    this._scene = scene

    const color = new THREE.Color().setHSL(idToHue(id), 0.65, 0.55)
    const mat   = new THREE.MeshLambertMaterial({ color })

    // Build humanoid group (root = feet position)
    this._group = new THREE.Group()
    this._group.frustumCulled = false

    const box = (w, h, d, ox, oy, oz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      m.position.set(ox, oy, oz)
      this._group.add(m)
      return m
    }

    box(HEAD_S, HEAD_S, HEAD_S,  0,      1.875, 0)   // head
    box(BODY_W, BODY_H, BODY_D,  0,      1.25,  0)   // body
    box(LIMB_W, LIMB_H, LIMB_D, -0.375, 1.25,  0)   // left arm
    box(LIMB_W, LIMB_H, LIMB_D,  0.375, 1.25,  0)   // right arm
    this._leftLeg  = box(LIMB_W, LIMB_H, LIMB_D, -0.125, 0.5, 0)
    this._rightLeg = box(LIMB_W, LIMB_H, LIMB_D,  0.125, 0.5, 0)

    this._group.add(makeNameTag(name))

    // Interpolation state
    this._cx = 0; this._cy = 20; this._cz = 0
    this._tx = 0; this._ty = 20; this._tz = 0
    this._cyaw = 0; this._tyaw = 0
    this._walkTimer = 0

    scene.add(this._group)
  }

  /** Teleport immediately (used on initial join). */
  setPosition(x, y, z, yaw = 0) {
    this._cx = this._tx = x
    this._cy = this._ty = y
    this._cz = this._tz = z
    this._cyaw = this._tyaw = yaw
    this._applyTransform()
  }

  /** Set interpolation target (called on each received move packet). */
  setTarget(x, y, z, yaw = 0) {
    this._tx = x; this._ty = y; this._tz = z; this._tyaw = yaw
  }

  update(dt) {
    const t  = Math.min(1, LERP_SPEED * dt)
    const px = this._cx, pz = this._cz

    this._cx += (this._tx - this._cx) * t
    this._cy += (this._ty - this._cy) * t
    this._cz += (this._tz - this._cz) * t

    // Yaw: shortest-path lerp
    let dyaw = this._tyaw - this._cyaw
    while (dyaw >  Math.PI) dyaw -= Math.PI * 2
    while (dyaw < -Math.PI) dyaw += Math.PI * 2
    this._cyaw += dyaw * t

    // Leg swing proportional to horizontal speed
    const speed = Math.hypot(this._cx - px, this._cz - pz) / dt
    if (speed > 0.1) {
      this._walkTimer += dt * speed * 3
      const swing = Math.sin(this._walkTimer) * 0.4
      this._leftLeg.rotation.x  =  swing
      this._rightLeg.rotation.x = -swing
    } else {
      this._leftLeg.rotation.x  = 0
      this._rightLeg.rotation.x = 0
    }

    this._applyTransform()
  }

  _applyTransform() {
    this._group.position.set(this._cx, this._cy, this._cz)
    this._group.rotation.y = this._cyaw
  }

  dispose() {
    this._scene.remove(this._group)
    this._group.traverse(obj => {
      obj.geometry?.dispose()
      if (obj.isMesh || obj.isSprite) {
        if (obj.material?.map) obj.material.map.dispose()
        obj.material?.dispose()
      }
    })
  }
}
