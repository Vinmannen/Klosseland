// ─────────────────────────────────────────────────────────────
//  Klosseland — WaterSystem  (rewrite)
//
//  Cellular-automata water simulation at 4 Hz.
//
//  Key behaviours (matches Minecraft logic):
//    • Source blocks (level 0) are permanent emitters.
//    • Water falls straight down at no level cost.
//    • Horizontal spread costs 1 level per step; max level = MAX_DIST (7).
//    • Before spreading sideways, each direction is tested for a
//      "downward path" within DROP_SCAN_DIST blocks.  If ANY direction
//      leads to a drop, water flows ONLY toward those directions.
//      This prevents the X/diamond artefact on flat terrain.
//    • Flowing blocks no longer reachable are removed.
//
//  Liquid extensibility:
//    Create additional instances with a different LIQUID_ID / config.
// ─────────────────────────────────────────────────────────────
import { CHUNK_W, CHUNK_H } from '../data/constants.js'

const WATER_ID        = 10   // source blocks (player-placed, permanent)
const WATER_FLOW_ID   = 45   // flowing blocks (system-placed, removable)
const TICK_S          = 0.25   // 4 Hz
const MAX_DIST        = 7      // max sideways distance from source
const DROP_SCAN_DIST  = 4      // how far ahead to look for a downward drop

const DIRS = [[1,0],[-1,0],[0,1],[0,-1]]

export class WaterSystem {
  /**
   * @param {import('../world/World.js').World} world
   * @param {{ sourceId?: number, flowId?: number }} [config]
   */
  constructor (world, config = {}) {
    this._world    = world
    this._sourceId = config.sourceId ?? WATER_ID
    this._flowId   = config.flowId   ?? WATER_FLOW_ID
    this._sources  = new Set()   // "bx,by,bz" — permanent emitters
    this._flowing  = new Set()   // "bx,by,bz" — blocks placed by this system
    this._timer    = 0
  }

  _isLiquid(id) { return id === this._sourceId || id === this._flowId }

  // ── Public API ────────────────────────────────────────────

  /** Register water blocks found when a chunk is loaded. */
  scanChunk (chunk) {
    const W = CHUNK_W, SL = W * W
    for (let y = 0; y < CHUNK_H; y++) {
      for (let lz = 0; lz < W; lz++) {
        for (let lx = 0; lx < W; lx++) {
          const id = chunk.data[y * SL + lz * W + lx]
          if (!id) continue
          const bx = chunk.cx * W + lx
          const bz = chunk.cz * W + lz
          const key = `${bx},${y},${bz}`
          if (id === this._sourceId)      this._sources.add(key)
          else if (id === this._flowId)   this._flowing.add(key)
        }
      }
    }
  }

  /**
   * Call whenever world.setBlock is used by the player or network.
   * @param {number} bx
   * @param {number} by
   * @param {number} bz
   * @param {number} newId
   * @param {number} oldId
   */
  onBlockChange (bx, by, bz, newId, oldId) {
    const key = `${bx},${by},${bz}`
    if (newId === this._sourceId) {
      this._sources.add(key)
      this._flowing.delete(key)   // player-placed → upgrade to source
    } else if (this._isLiquid(oldId)) {
      this._sources.delete(key)
      this._flowing.delete(key)
    }
  }

  /** @param {number} dt — frame delta in seconds */
  update (dt) {
    this._timer += dt
    if (this._timer < TICK_S) return
    this._timer = 0
    this._simulate()
  }

  // ── Simulation ────────────────────────────────────────────

  _simulate () {
    if (this._sources.size === 0) return
    const world = this._world

    // Per-tick cache for _leadsToFall to avoid redundant BFS calls.
    this._dropCache = new Map()

    // levels: key → number  (0 = source / fallen, 1-7 = flowing sideways)
    // Lower is "stronger"; we keep the minimum level offered to each cell.
    const levels = new Map()
    const queue  = []   // [bx, by, bz, level]

    // Seed queue from live source blocks.
    for (const key of this._sources) {
      const [bx, by, bz] = key.split(',').map(Number)
      if (world.getBlock(bx, by, bz) !== this._sourceId) continue  // source must still be present
      if (levels.has(key)) continue
      levels.set(key, 0)
      queue.push([bx, by, bz, 0])
    }

    let qi = 0
    while (qi < queue.length) {
      const [bx, by, bz, lv] = queue[qi++]

      // ── 1. Flow straight down (no level cost) ─────────────
      {
        const ny   = by - 1
        const nid  = world.getBlock(bx, ny, bz)
        if (nid === 0 || this._isLiquid(nid)) {
          const dk = `${bx},${ny},${bz}`
          // Fallen water resets to level 0 so it can spread fully below.
          const existing = levels.get(dk) ?? 99
          if (existing > 0) {
            levels.set(dk, 0)
            queue.push([bx, ny, bz, 0])
          }
        }
      }

      // ── 2. Spread sideways ─────────────────────────────────
      if (lv >= MAX_DIST) continue

      // Only spread sideways when this block is resting on something solid.
      const belowId = world.getBlock(bx, by - 1, bz)
      const hasFloor = world.isSolid(bx, by - 1, bz) || this._isLiquid(belowId)
      if (!hasFloor) continue

      // Collect passable horizontal neighbours.
      const openDirs = []
      const dropDirs = []
      for (const [dx, dz] of DIRS) {
        const nx  = bx + dx
        const nz  = bz + dz
        const nid = world.getBlock(nx, by, nz)
        if (nid !== 0 && !this._isLiquid(nid)) continue   // solid wall
        openDirs.push([dx, dz])
        if (this._leadsToFall(nx, by, nz)) dropDirs.push([dx, dz])
      }

      // If any direction drops, flow only toward those.
      // If no drop exists, water is on flat ground — don't spread sideways at all.
      // This prevents waterfalls and player sources from flooding flat plains.
      if (dropDirs.length === 0) continue
      const spreadDirs = dropDirs

      for (const [dx, dz] of spreadDirs) {
        const nx    = bx + dx
        const nz    = bz + dz
        const nk    = `${nx},${by},${nz}`
        const newLv = lv + 1
        const existing = levels.get(nk) ?? 99
        if (newLv < existing) {
          levels.set(nk, newLv)
          queue.push([nx, by, nz, newLv])
        }
      }
    }

    // ── Remove flowing water no longer reachable ─────────────
    for (const key of [...this._flowing]) {
      if (!levels.has(key)) {
        const [bx, by, bz] = key.split(',').map(Number)
        world.setBlock(bx, by, bz, 0)
        this._flowing.delete(key)
      }
    }

    // ── Place water in newly reachable empty cells ────────────
    for (const [key] of levels) {
      if (this._sources.has(key)) continue
      const [bx, by, bz] = key.split(',').map(Number)
      if (world.getBlock(bx, by, bz) === 0) {
        world.setBlock(bx, by, bz, this._flowId)
        this._flowing.add(key)
      }
    }
  }

  // ── Sponge absorption ─────────────────────────────────────
  //
  // BFS from a source block, removing every connected water block.
  // Call this before placing the sponge so the source is still in world.
  //
  absorbSource (bx, by, bz) {
    if (this._world.getBlock(bx, by, bz) !== this._sourceId) return
    const world  = this._world
    const queue  = [[bx, by, bz]]
    const visited = new Set([`${bx},${by},${bz}`])

    while (queue.length) {
      const [cx, cy, cz] = queue.shift()
      const key = `${cx},${cy},${cz}`
      world.setBlock(cx, cy, cz, 0)
      this._sources.delete(key)
      this._flowing.delete(key)

      for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        const nx = cx + dx, ny = cy + dy, nz = cz + dz
        const nk = `${nx},${ny},${nz}`
        if (visited.has(nk)) continue
        visited.add(nk)
        if (this._isLiquid(world.getBlock(nx, ny, nz))) queue.push([nx, ny, nz])
      }
    }
  }

  // ── Drop-path detector ────────────────────────────────────
  //
  // BFS horizontally from (startX, startY, startZ) up to DROP_SCAN_DIST
  // steps.  Returns true if any reachable cell has open air directly below
  // it, meaning water flowing that way will eventually fall.
  //
  _leadsToFall (startX, startY, startZ) {
    const cacheKey = `${startX},${startY},${startZ}`
    if (this._dropCache.has(cacheKey)) return this._dropCache.get(cacheKey)

    const world  = this._world
    const queue  = [[startX, startZ, 0]]
    const seen   = new Set([`${startX},${startZ}`])
    let   result = false

    outer: while (queue.length) {
      const [cx, cz, d] = queue.shift()
      // Drop here?
      if (world.getBlock(cx, startY - 1, cz) === 0) {
        result = true
        break outer
      }
      if (d >= DROP_SCAN_DIST) continue
      for (const [dx, dz] of DIRS) {
        const nx = cx + dx, nz = cz + dz
        const k  = `${nx},${nz}`
        if (seen.has(k)) continue
        const nid = world.getBlock(nx, startY, nz)
        if (nid !== 0 && !this._isLiquid(nid)) continue   // wall
        seen.add(k)
        queue.push([nx, nz, d + 1])
      }
    }

    this._dropCache.set(cacheKey, result)
    return result
  }
}
