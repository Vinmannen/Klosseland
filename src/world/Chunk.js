// ─────────────────────────────────────────────────────────────
//  Klosseland — Chunk
//  A 16×64×16 column of blocks.
// ─────────────────────────────────────────────────────────────
import { CHUNK_W, CHUNK_H } from '../data/constants.js'

const SLICE = CHUNK_W * CHUNK_W     // blocks per Y-layer
const VOL   = CHUNK_W * CHUNK_H * CHUNK_W

/** Block data index: Y-major for cache-friendly column walks. */
const idx = (lx, y, lz) => y * SLICE + lz * CHUNK_W + lx

export class Chunk {
  /**
   * @param {number} cx  – chunk column X (world_x / CHUNK_W, floored)
   * @param {number} cz  – chunk column Z
   */
  constructor(cx, cz) {
    this.cx   = cx
    this.cz   = cz
    this.data = new Uint16Array(VOL)   // block IDs; 0 = air

    // Rendering state
    this.dirty             = true   // needs mesh rebuild
    this.mesh              = null   // THREE.Mesh (opaque)
    this.transparentMesh   = null   // THREE.Mesh (transparent/cutout)
    this.crossMesh         = null   // THREE.Mesh (plant crosses)
    this.waterMesh         = null   // THREE.Mesh (water surface)
  }

  // ── Block access (local coords, bounds-checked) ───────────
  getBlock(lx, y, lz) {
    if (lx < 0 || lx >= CHUNK_W || y < 0 || y >= CHUNK_H || lz < 0 || lz >= CHUNK_W) return 0
    return this.data[idx(lx, y, lz)]
  }

  setBlock(lx, y, lz, id) {
    if (lx < 0 || lx >= CHUNK_W || y < 0 || y >= CHUNK_H || lz < 0 || lz >= CHUNK_W) return
    this.data[idx(lx, y, lz)] = id
    this.dirty = true
  }

  /** Highest non-air Y at local (lx, lz). Returns -1 if empty column. */
  topBlock(lx, lz) {
    for (let y = CHUNK_H - 1; y >= 0; y--) {
      if (this.data[idx(lx, y, lz)] !== 0) return y
    }
    return -1
  }

  /** Dispose Three.js meshes when chunk is unloaded. */
  dispose() {
    for (const m of [this.mesh, this.transparentMesh, this.crossMesh, this.waterMesh]) {
      if (!m) continue
      m.geometry.dispose()
      m.parent?.remove(m)
    }
    this.mesh = this.transparentMesh = this.crossMesh = this.waterMesh = null
    this.dirty = true
  }
}
