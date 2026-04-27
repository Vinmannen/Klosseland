// ─────────────────────────────────────────────────────────────
//  Klosseland — WorldSave
//  Persists block-change deltas per world using localforage.
//  Only changed blocks are stored (not the full chunk array).
// ─────────────────────────────────────────────────────────────
import localforage from 'localforage'
import { CHUNK_W } from '../data/constants.js'

const DEBOUNCE_MS = 2000
const storeKey = id => `kl_blocks_${id}`

export class WorldSave {
  constructor(worldId) {
    this._id     = worldId
    this._deltas = new Map()   // "bx,by,bz" → blockId (0 = air/removed)
    this._dirty  = false
    this._timer  = null
    this.loaded  = false
  }

  /** Load persisted deltas from localforage. Must be awaited before loadChunk. */
  async load() {
    const arr = await localforage.getItem(storeKey(this._id))
    if (Array.isArray(arr)) {
      for (const [bx, by, bz, id] of arr) {
        this._deltas.set(`${bx},${by},${bz}`, id)
      }
    }
    this.loaded = true
  }

  /** Overlay saved deltas onto a freshly-generated chunk. */
  applyToChunk(chunk) {
    for (const [k, id] of this._deltas) {
      const [bx, by, bz] = k.split(',').map(Number)
      if (Math.floor(bx / CHUNK_W) !== chunk.cx) continue
      if (Math.floor(bz / CHUNK_W) !== chunk.cz) continue
      const lx = ((bx % CHUNK_W) + CHUNK_W) % CHUNK_W
      const lz = ((bz % CHUNK_W) + CHUNK_W) % CHUNK_W
      chunk.setBlock(lx, by, lz, id)
    }
  }

  /** Record a single block change. bx/by/bz are absolute block coords. */
  recordDelta(bx, by, bz, id) {
    this._deltas.set(`${bx},${by},${bz}`, id)
    this._dirty = true
    clearTimeout(this._timer)
    this._timer = setTimeout(() => this._write(), DEBOUNCE_MS)
  }

  /** Flush all pending changes to localforage immediately (call on quit). */
  async flush() {
    clearTimeout(this._timer)
    this._timer = null
    await this._write()
  }

  async _write() {
    if (!this._dirty) return
    const arr = []
    for (const [k, id] of this._deltas) {
      const [bx, by, bz] = k.split(',').map(Number)
      arr.push([bx, by, bz, id])
    }
    await localforage.setItem(storeKey(this._id), arr)
    this._dirty = false
  }

  /** Remove all block data for a world (call when user deletes the world). */
  static async deleteWorld(worldId) {
    await localforage.removeItem(storeKey(worldId))
  }

  /**
   * Export a world to a plain JS object ready to be JSON-serialised.
   * @param {object} worldConfig — entry from kl_worlds localStorage array
   */
  static async exportToObject(worldConfig) {
    const arr = await localforage.getItem(storeKey(worldConfig.id)) || []
    return { version: 1, world: worldConfig, blocks: arr }
  }

  /**
   * Import a previously-exported world object.
   * Assigns a fresh id so it never collides with existing worlds.
   * @returns {object} the new worldConfig entry (already saved to localforage)
   */
  static async importFromObject(data) {
    if (!data?.world || data.version !== 1) throw new Error('Invalid export file')
    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const world = { ...data.world, id: newId, lastPlayed: Date.now() }
    if (Array.isArray(data.blocks) && data.blocks.length) {
      await localforage.setItem(storeKey(newId), data.blocks)
    }
    return world
  }
}
