// ─────────────────────────────────────────────────────────────
//  Klosseland — DropSystem
//  Manages floating item pickups in the world.
//  Items bob + spin. Auto-collected when player walks near.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'

const PICKUP_RADIUS = 1.8   // blocks
const PICKUP_DELAY  = 0.5   // seconds before item can be picked up
const BOB_SPEED     = 2.5
const BOB_AMP       = 0.07
const SPIN_SPEED    = 2.2
const ITEM_SIZE     = 0.38  // world units

export class DropSystem {
  constructor(scene, atlas, inventory) {
    this._scene     = scene
    this._atlas     = atlas
    this._inventory = inventory
    this._drops     = []
    this._mat       = null
  }

  _material() {
    if (!this._mat) {
      this._mat = new THREE.MeshBasicMaterial({
        map:         this._atlas.texture,
        transparent: true,
        alphaTest:   0.05,
        side:        THREE.DoubleSide,
        depthWrite:  false,
      })
    }
    return this._mat
  }

  spawnDrop(wx, wy, wz, blockId) {
    const def = BLOCK_BY_ID.get(blockId)
    if (!def?.tex) return

    const styleName = def.tex.all ?? def.tex.top ?? def.tex.side ?? null
    if (!styleName) return
    const { u0, v0, u1, v1 } = this._atlas.uv(styleName)

    const s = ITEM_SIZE / 2
    // Two crossed quads, textured with atlas UV
    const positions = [
      // Quad 1: X-axis plane
      -s,  s, 0,   s,  s, 0,  -s, -s, 0,   s, -s, 0,
      // Quad 2: Z-axis plane
       0,  s,-s,   0,  s, s,   0, -s,-s,    0, -s,  s,
    ]
    const uvCoords = [
      u0,v0, u1,v0, u0,v1, u1,v1,
      u0,v0, u1,v0, u0,v1, u1,v1,
    ]
    const indices = [0,1,2, 1,3,2,  4,5,6, 5,7,6]

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('uv',       new THREE.Float32BufferAttribute(uvCoords,  2))
    geom.setIndex(indices)

    const mesh = new THREE.Mesh(geom, this._material())
    const baseY = wy + 0.55
    mesh.position.set(wx + 0.5, baseY, wz + 0.5)
    this._scene.add(mesh)

    this._drops.push({ blockId, mesh, baseY, age: 0 })
  }

  update(dt, px, py, pz, showToast, lang) {
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const drop = this._drops[i]
      drop.age += dt

      drop.mesh.position.y  = drop.baseY + Math.sin(drop.age * BOB_SPEED) * BOB_AMP
      drop.mesh.rotation.y += dt * SPIN_SPEED

      if (drop.age < PICKUP_DELAY) continue

      const dx   = px - drop.mesh.position.x
      const dy   = (py + 1) - drop.mesh.position.y
      const dz   = pz - drop.mesh.position.z
      if (dx*dx + dy*dy + dz*dz < PICKUP_RADIUS * PICKUP_RADIUS) {
        const def = BLOCK_BY_ID.get(drop.blockId)
        if (def?.isProduce) {
          this._inventory.addToProduce(drop.blockId)
        } else {
          this._inventory.addToHotbar(drop.blockId)
        }
        if (def && showToast) {
          const name = lang === 'no' ? def.nameNo : def.nameEn
          const hint = def.isProduce
            ? (lang === 'no' ? ` — trykk R for å spise!` : ` — press R to eat!`)
            : ''
          showToast((lang === 'no' ? `Fikk: ${name}` : `Picked up: ${name}`) + hint)
        }
        this._scene.remove(drop.mesh)
        drop.mesh.geometry.dispose()
        this._drops.splice(i, 1)
      }
    }
  }

  dispose() {
    for (const drop of this._drops) {
      this._scene.remove(drop.mesh)
      drop.mesh.geometry.dispose()
    }
    this._drops = []
    this._mat?.dispose()
    this._mat = null
  }
}
