// ─────────────────────────────────────────────────────────────
//  Klosseland — LightingSystem
//  Manages a pool of THREE.PointLight objects positioned at the
//  N closest luminous blocks to the player each frame.
//
//  The visual "glow" on the block itself is baked into the
//  emissive chunk mesh by ChunkMesher. This system handles only
//  dynamic light cast onto surrounding blocks and entities.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'
import { CHUNK_W, CHUNK_H } from '../data/constants.js'

const POOL_SIZE    = 12
const MAX_INTENSITY = 2.0   // PointLight intensity at luminance 15
const BASE_DIST    = 1.8    // world-unit falloff radius per luminance level

export class LightingSystem {
  constructor(scene) {
    this._scene        = scene
    // 'bx,by,bz' → { bx, by, bz, luminance, color: THREE.Color }
    this._registry     = new Map()
    // 'cx,cz' → Set<registry key>  — for fast chunk wipe
    this._chunkEntries = new Map()

    // Pre-create PointLight pool — all invisible at start
    this._pool = []
    for (let i = 0; i < POOL_SIZE; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 0, 2)
      light.castShadow = false   // block lights never cast shadows (perf)
      scene.add(light)
      this._pool.push(light)
    }

    // Sort-skip cache: skip the full O(n log n) sort when player barely moved
    // and no blocks were registered/unregistered since last update.
    this._lastPx     = null
    this._lastPy     = null
    this._lastPz     = null
    this._regDirty   = true   // force first sort
  }

  // ── Chunk tracking ────────────────────────────────────────

  /**
   * Register all luminous blocks in a chunk.
   * Must be called after every (re)mesh of the chunk.
   * @param {number}     cx
   * @param {number}     cz
   * @param {Uint16Array} chunkData  chunk.data
   */
  trackChunk(cx, cz, chunkData) {
    const ck     = `${cx},${cz}`
    const oldSet = this._chunkEntries.get(ck)
    if (oldSet) { for (const k of oldSet) this._registry.delete(k) }

    const keys  = new Set()
    const W     = CHUNK_W
    const SLICE = W * W
    const wx0   = cx * W
    const wz0   = cz * W

    for (let lx = 0; lx < W; lx++) {
      for (let y = 0; y < CHUNK_H; y++) {
        for (let lz = 0; lz < W; lz++) {
          const id  = chunkData[y * SLICE + lz * W + lx]
          if (!id) continue
          const def = BLOCK_BY_ID.get(id)
          if (!def?.luminance) continue

          const rk = `${wx0 + lx},${y},${wz0 + lz}`
          this._registry.set(rk, {
            bx:       wx0 + lx,
            by:       y,
            bz:       wz0 + lz,
            luminance: def.luminance,
            color:    new THREE.Color(def.lightColor ?? '#ffffff'),
          })
          keys.add(rk)
        }
      }
    }

    this._chunkEntries.set(ck, keys)
    this._regDirty = true
  }

  /**
   * Remove all luminous blocks belonging to a chunk.
   * Must be called when a chunk is unloaded.
   */
  untrackChunk(cx, cz) {
    const ck   = `${cx},${cz}`
    const keys = this._chunkEntries.get(ck)
    if (!keys) return
    for (const k of keys) this._registry.delete(k)
    this._chunkEntries.delete(ck)
    this._regDirty = true
  }

  // ── Individual block updates ──────────────────────────────

  /**
   * Call immediately after placing a block so the PointLight
   * appears before the chunk is rebuilt (1-2 frames later).
   */
  blockPlaced(bx, by, bz, blockId) {
    const def = BLOCK_BY_ID.get(blockId)
    if (!def?.luminance) return

    const rk = `${bx},${by},${bz}`
    this._registry.set(rk, {
      bx, by, bz,
      luminance: def.luminance,
      color:    new THREE.Color(def.lightColor ?? '#ffffff'),
    })
    // Keep chunkEntries in sync so untrackChunk cleans this up
    const cx = Math.floor(bx / CHUNK_W)
    const cz = Math.floor(bz / CHUNK_W)
    const ck = `${cx},${cz}`
    if (!this._chunkEntries.has(ck)) this._chunkEntries.set(ck, new Set())
    this._chunkEntries.get(ck).add(rk)
    this._regDirty = true
  }

  /**
   * Call immediately after breaking any block.
   * Safe to call for non-luminous blocks (no-op).
   */
  blockBroken(bx, by, bz) {
    this._registry.delete(`${bx},${by},${bz}`)
    this._regDirty = true
  }

  // ── Per-frame update ──────────────────────────────────────

  /**
   * Assign the PointLight pool to the N closest luminous blocks.
   * Call once per frame.
   * @param {number} px  player world X
   * @param {number} py  player world Y
   * @param {number} pz  player world Z
   */
  update(px, py, pz) {
    const pool = this._pool

    if (this._registry.size === 0) {
      for (const l of pool) l.intensity = 0
      return
    }

    // Skip the sort when the player hasn't moved more than 0.5 blocks and no blocks changed.
    // At 60 fps the player rarely moves that far in one frame, so this saves most sorts.
    const dx = px - this._lastPx
    const dy = py - this._lastPy
    const dz = pz - this._lastPz
    if (!this._regDirty && this._lastPx !== null &&
        dx * dx + dy * dy + dz * dz < 0.25) return

    this._lastPx   = px
    this._lastPy   = py
    this._lastPz   = pz
    this._regDirty = false

    // Sort all lights by squared distance to player (cheap, usually < 200 entries)
    const entries = [...this._registry.values()]
    entries.sort((a, b) => {
      const da = (a.bx - px) ** 2 + (a.by - py) ** 2 + (a.bz - pz) ** 2
      const db = (b.bx - px) ** 2 + (b.by - py) ** 2 + (b.bz - pz) ** 2
      return da - db
    })

    const active = entries.slice(0, POOL_SIZE)
    for (let i = 0; i < POOL_SIZE; i++) {
      const light = pool[i]
      if (i < active.length) {
        const e = active[i]
        light.position.set(e.bx + 0.5, e.by + 0.5, e.bz + 0.5)
        light.color.copy(e.color)
        light.intensity = (e.luminance / 15) * MAX_INTENSITY
        light.distance  =  e.luminance * BASE_DIST
      } else {
        light.intensity = 0
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────

  dispose() {
    for (const light of this._pool) {
      this._scene.remove(light)
      light.dispose()
    }
    this._pool.length = 0
    this._registry.clear()
    this._chunkEntries.clear()
  }
}
