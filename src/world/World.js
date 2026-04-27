// ─────────────────────────────────────────────────────────────
//  Klosseland — World
//  Manages all loaded chunks, provides the global block API,
//  and handles chunk loading/unloading around the player.
//
//  Chunk generation pipeline:
//    1. updateChunks detects needed chunks → pushes to _genQueue
//    2. _dispatchPending sends requests to idle Web Workers
//    3. Workers return terrain data via _onWorkerResult
//    4. Main thread finalises chunk (apply saves/deltas, mark dirty)
//    5. Time-budgeted mesh rebuild drains the dirty queue each frame
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { CHUNK_W, CHUNK_H, VIEW_DIST_CHUNKS, WORLD_SIZES } from '../data/constants.js'
import { worldToChunk, worldToLocal, worldToBlock } from '../utils/math.js'
import { Chunk }    from './Chunk.js'
import { WorldGen } from './WorldGen.js'
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'
import { WorldSave }   from './WorldSave.js'

// How many Web Workers to use for terrain generation.
const GEN_WORKER_COUNT = 2

// How many Web Workers to use for off-thread mesh building.
// Each worker handles one chunk at a time; 2 keeps two cores busy.
const MESH_WORKER_COUNT = 2

export class World {
  /**
   * @param {{sizeKey: string, seed: number, terrainType: string, worldId: string|null}} options
   */
  constructor({ sizeKey = 'medium', seed = 0, terrainType = 'hills', worldId = null } = {}) {
    this.sizeKey     = sizeKey
    this.seed        = seed
    this.terrainType = terrainType
    this.halfChunks  = WORLD_SIZES[sizeKey]?.chunks / 2 ?? 16

    this._chunks = new Map()        // 'cx,cz' → Chunk
    this._gen    = new WorldGen(seed, this.halfChunks * CHUNK_W)
    this._save   = worldId ? new WorldSave(worldId) : null

    // Queued chunks waiting to have their mesh rebuilt
    this._dirtyQueue = new Set()

    // LAN join: block delta received from server (applied on chunk load / setBlock)
    this._netDelta = null           // null | Map<"bx,by,bz", blockId>

    // ── Async generation pipeline ─────────────────────────────
    this._genQueue    = []          // [{dist2, cx, cz}] — waiting for a free worker
    this._pendingKeys = new Set()   // chunk keys that are queued or in-flight
    this._workers     = []          // Worker instances
    this._workerBusy  = []          // boolean per worker slot
    this._nextReqId   = 0

    this._initWorkers(GEN_WORKER_COUNT)

    // ── Async mesh-building pipeline ──────────────────────────
    // Workers run buildGeometryArrays off-thread; main thread only
    // assembles the resulting TypedArrays into BufferGeometry + Mesh.
    this._meshWorkers     = []      // Worker instances
    this._meshWorkerBusy  = []      // boolean per mesh-worker slot
    this._meshQueue       = []      // [key] ordered closest-first
    this._meshPendingKeys = new Set() // keys in-flight to a mesh worker

    // Stored on first runtime updateChunks call so _onMeshResult can use them.
    this._scene          = null
    this._mesher         = null
    this._lightingSystem = null
  }

  // ── Worker pool ───────────────────────────────────────────

  _initWorkers(n) {
    for (let i = 0; i < n; i++) {
      const w = new Worker(
        new URL('../engine/chunkGenWorker.js', import.meta.url),
        { type: 'module' },
      )
      w.postMessage({ type: 'init', seed: this.seed, halfBlocks: this.halfChunks * CHUNK_W })
      const wi = i
      w.onmessage = ({ data }) => this._onWorkerResult(wi, data)
      this._workers.push(w)
      this._workerBusy.push(false)
    }
  }

  /** Send the next queued generation request to an idle worker, if any. */
  _dispatchPending() {
    for (let wi = 0; wi < this._workers.length; wi++) {
      if (this._workerBusy[wi]) continue
      const item = this._genQueue.shift()
      if (!item) return           // queue empty
      const reqId = this._nextReqId++
      this._workerBusy[wi] = true
      this._workers[wi].postMessage({ type: 'generate', reqId, cx: item.cx, cz: item.cz })
    }
  }

  /** Called on the main thread when a worker finishes generating a chunk. */
  _onWorkerResult(wi, { cx, cz, buffer }) {
    this._workerBusy[wi] = false

    const key = World.chunkKey(cx, cz)
    if (!this._pendingKeys.has(key)) {
      // Chunk was unloaded while in-flight — discard the result
      this._dispatchPending()
      return
    }
    this._pendingKeys.delete(key)

    if (Math.abs(cx) >= this.halfChunks || Math.abs(cz) >= this.halfChunks) {
      this._dispatchPending()
      return
    }
    if (this._chunks.has(key)) {
      // Somehow already loaded (e.g. synchronous initial load raced the worker)
      this._dispatchPending()
      return
    }

    const chunk = new Chunk(cx, cz)
    chunk.data = new Uint16Array(buffer)
    if (this._save?.loaded) this._save.applyToChunk(chunk)
    if (this._netDelta)     this._applyNetDeltaToChunk(chunk, cx, cz)
    chunk.dirty = true
    this._chunks.set(key, chunk)
    this._dirtyQueue.add(key)

    // Re-mesh neighbouring chunks so boundary face culling stays correct
    this._markDirty(cx - 1, cz)
    this._markDirty(cx + 1, cz)
    this._markDirty(cx, cz - 1)
    this._markDirty(cx, cz + 1)

    // Try to send the next pending job now that a worker is free
    this._dispatchPending()
  }

  // ── Mesh worker pool ──────────────────────────────────────

  /**
   * Create the off-thread mesh worker pool.
   * Must be called once after the texture atlas is built (atlas UV data
   * is required so workers can resolve texture names → UV rects).
   * @param {{ [styleName]: {col,row} }} atlasIndex  from atlas.getStyleIndex()
   */
  initMeshWorkers(atlasIndex) {
    for (let i = 0; i < MESH_WORKER_COUNT; i++) {
      const w = new Worker(
        new URL('../engine/chunkMeshWorker.js', import.meta.url),
        { type: 'module' },
      )
      w.postMessage({ type: 'init', atlasIndex })
      const wi = i
      w.onmessage = ({ data }) => this._onMeshResult(wi, data)
      this._meshWorkers.push(w)
      this._meshWorkerBusy.push(false)
    }
  }

  /** Send the next queued mesh job to an idle mesh worker, if any. */
  _dispatchMeshPending() {
    for (let wi = 0; wi < this._meshWorkers.length; wi++) {
      if (this._meshWorkerBusy[wi]) continue
      const key = this._meshQueue.shift()
      if (!key) return

      const chunk = this._chunks.get(key)
      if (!chunk) {
        this._meshPendingKeys.delete(key)
        this._dispatchMeshPending()
        return
      }

      // Copy neighbour arrays so the chunk's own buffer stays intact on the main thread.
      const dataW = this.getChunk(chunk.cx - 1, chunk.cz)?.data
      const dataE = this.getChunk(chunk.cx + 1, chunk.cz)?.data
      const dataN = this.getChunk(chunk.cx, chunk.cz - 1)?.data
      const dataS = this.getChunk(chunk.cx, chunk.cz + 1)?.data

      const dataBuf  = chunk.data.buffer.slice(0)
      const dataBufW = dataW ? dataW.buffer.slice(0) : null
      const dataBufE = dataE ? dataE.buffer.slice(0) : null
      const dataBufN = dataN ? dataN.buffer.slice(0) : null
      const dataBufS = dataS ? dataS.buffer.slice(0) : null

      const transfers = [dataBuf]
      if (dataBufW) transfers.push(dataBufW)
      if (dataBufE) transfers.push(dataBufE)
      if (dataBufN) transfers.push(dataBufN)
      if (dataBufS) transfers.push(dataBufS)

      this._meshWorkerBusy[wi] = true
      this._meshWorkers[wi].postMessage({
        type: 'mesh',
        reqId: this._nextReqId++,
        cx: chunk.cx, cz: chunk.cz,
        data:  dataBuf,
        dataW: dataBufW,
        dataE: dataBufE,
        dataN: dataBufN,
        dataS: dataBufS,
      }, transfers)
    }
  }

  /** Called on the main thread when a mesh worker returns geometry arrays. */
  _onMeshResult(wi, { cx, cz, opaque, transparent, cross, water, emissive }) {
    this._meshWorkerBusy[wi] = false

    const key   = World.chunkKey(cx, cz)
    this._meshPendingKeys.delete(key)

    const chunk = this._chunks.get(key)
    if (!chunk || !this._scene) {
      // Chunk was unloaded while being meshed, or world not yet active — discard.
      this._dispatchMeshPending()
      return
    }

    // Remove old meshes from scene.
    if (chunk.mesh)            this._scene.remove(chunk.mesh)
    if (chunk.transparentMesh) this._scene.remove(chunk.transparentMesh)
    if (chunk.crossMesh)       this._scene.remove(chunk.crossMesh)
    if (chunk.waterMesh)       this._scene.remove(chunk.waterMesh)
    if (chunk.emissiveMesh)    this._scene.remove(chunk.emissiveMesh)

    // Assemble BufferGeometry + Mesh from the transferred arrays (fast, ~0.5 ms).
    const ox = cx * CHUNK_W, oz = cz * CHUNK_W
    const result = this._mesher.assembleWorkerResult(
      { opaque, transparent, cross, water, emissive }, ox, oz,
    )

    chunk.mesh            = result.opaque
    chunk.transparentMesh = result.transparent
    chunk.crossMesh       = result.cross
    chunk.waterMesh       = result.water
    chunk.emissiveMesh    = result.emissive

    if (chunk.mesh)            this._scene.add(chunk.mesh)
    if (chunk.transparentMesh) this._scene.add(chunk.transparentMesh)
    if (chunk.crossMesh)       this._scene.add(chunk.crossMesh)
    if (chunk.waterMesh)       this._scene.add(chunk.waterMesh)
    if (chunk.emissiveMesh)    this._scene.add(chunk.emissiveMesh)

    this._lightingSystem?.trackChunk(cx, cz, chunk.data)
    chunk.dirty = false

    this._dispatchMeshPending()
  }

  /** Terminate all worker threads. Call when the world is no longer needed. */
  dispose() {
    for (const w of this._workers) w.terminate()
    this._workers = []
    this._workerBusy = []
    this._genQueue = []
    this._pendingKeys.clear()

    for (const w of this._meshWorkers) w.terminate()
    this._meshWorkers = []
    this._meshWorkerBusy = []
    this._meshQueue = []
    this._meshPendingKeys.clear()
  }

  // ── Persistence ───────────────────────────────────────────

  /** Load persisted block deltas. Must be awaited before loadChunk is called. */
  async load() {
    if (this._save) await this._save.load()
  }

  /** Flush unsaved block changes to localforage (call on quit). */
  async flush() {
    if (this._save) await this._save.flush()
  }

  // ── LAN / network helpers ─────────────────────────────────

  /**
   * Pre-load a block-change delta received from the server.
   * Must be called before any chunks are loaded (i.e. before world.load()).
   *
   * @param {Array<[number,number,number,number]>} arr  [[bx,by,bz,id], …]
   */
  setNetworkDelta(arr) {
    this._netDelta = new Map()
    for (const [bx, by, bz, id] of arr) {
      this._netDelta.set(`${bx},${by},${bz}`, id)
    }
  }

  /**
   * Return the current block-change delta as an array [[bx,by,bz,id], …].
   *
   * @returns {Array<[number,number,number,number]>}
   */
  getDelta() {
    if (!this._save) return []
    const arr = []
    for (const [k, id] of this._save._deltas) {
      const [bx, by, bz] = k.split(',').map(Number)
      arr.push([bx, by, bz, id])
    }
    return arr
  }

  // ── Key helpers ───────────────────────────────────────────
  static chunkKey(cx, cz) { return `${cx},${cz}` }

  // ── Chunk access ──────────────────────────────────────────
  getChunk(cx, cz) {
    return this._chunks.get(World.chunkKey(cx, cz)) ?? null
  }

  /**
   * Synchronously generate and register a chunk.
   * Used only for the initial full-world load at game start
   * (called with maxLoads=Infinity during the loading screen).
   */
  loadChunk(cx, cz) {
    if (Math.abs(cx) >= this.halfChunks || Math.abs(cz) >= this.halfChunks) return null

    const key = World.chunkKey(cx, cz)
    if (this._chunks.has(key)) return this._chunks.get(key)

    // Cancel any pending async request for this key so the worker result
    // is discarded when it eventually arrives
    this._pendingKeys.delete(key)

    const chunk = new Chunk(cx, cz)
    this._gen.generateChunk(chunk)
    if (this._save?.loaded) this._save.applyToChunk(chunk)
    if (this._netDelta)     this._applyNetDeltaToChunk(chunk, cx, cz)
    chunk.dirty = true
    this._chunks.set(key, chunk)
    this._dirtyQueue.add(key)

    this._markDirty(cx - 1, cz)
    this._markDirty(cx + 1, cz)
    this._markDirty(cx, cz - 1)
    this._markDirty(cx, cz + 1)

    return chunk
  }

  unloadChunk(cx, cz) {
    const key = World.chunkKey(cx, cz)
    const chunk = this._chunks.get(key)
    if (chunk) {
      chunk.dispose()
      this._chunks.delete(key)
      this._dirtyQueue.delete(key)
    }
  }

  // ── Block access (world coordinates) ─────────────────────
  getBlock(wx, wy, wz) {
    const bx = worldToBlock(wx), by = worldToBlock(wy), bz = worldToBlock(wz)
    if (by < 0 || by >= CHUNK_H) return 0
    const cx = worldToChunk(bx, CHUNK_W), cz = worldToChunk(bz, CHUNK_W)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return 0
    return chunk.getBlock(worldToLocal(bx, CHUNK_W), by, worldToLocal(bz, CHUNK_W))
  }

  setBlock(wx, wy, wz, id) {
    const bx = worldToBlock(wx), by = worldToBlock(wy), bz = worldToBlock(wz)
    if (by < 0 || by >= CHUNK_H) return
    const cx = worldToChunk(bx, CHUNK_W), cz = worldToChunk(bz, CHUNK_W)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return
    chunk.setBlock(worldToLocal(bx, CHUNK_W), by, worldToLocal(bz, CHUNK_W), id)
    this._save?.recordDelta(bx, by, bz, id)
    if (this._netDelta) this._netDelta.set(`${bx},${by},${bz}`, id)
    this._dirtyQueue.add(World.chunkKey(cx, cz))

    const lx = worldToLocal(bx, CHUNK_W), lz = worldToLocal(bz, CHUNK_W)
    if (lx === 0)          this._markDirty(cx - 1, cz)
    if (lx === CHUNK_W-1)  this._markDirty(cx + 1, cz)
    if (lz === 0)          this._markDirty(cx, cz - 1)
    if (lz === CHUNK_W-1)  this._markDirty(cx, cz + 1)
  }

  _markDirty(cx, cz) {
    const key = World.chunkKey(cx, cz)
    if (this._chunks.has(key)) this._dirtyQueue.add(key)
  }

  _applyNetDeltaToChunk(chunk, cx, cz) {
    for (const [k, id] of this._netDelta) {
      const [bx, by, bz] = k.split(',').map(Number)
      if (Math.floor(bx / CHUNK_W) !== cx) continue
      if (Math.floor(bz / CHUNK_W) !== cz) continue
      const lx = ((bx % CHUNK_W) + CHUNK_W) % CHUNK_W
      const lz = ((bz % CHUNK_W) + CHUNK_W) % CHUNK_W
      chunk.setBlock(lx, by, lz, id)
    }
  }

  /** Iterate over all currently loaded chunks. */
  eachChunk(fn) {
    for (const chunk of this._chunks.values()) fn(chunk)
  }

  /** Biome ID at world (wx, wz). Delegates to WorldGen. */
  getBiomeAt(wx, wz) {
    return this._gen.getBiome(wx, wz)
  }

  /** Highest solid block Y at world (wx, wz). */
  getSurfaceY(wx, wz) {
    const cx = worldToChunk(worldToBlock(wx), CHUNK_W)
    const cz = worldToChunk(worldToBlock(wz), CHUNK_W)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return this._gen.getSurfaceY(wx, wz)
    const lx = worldToLocal(worldToBlock(wx), CHUNK_W)
    const lz = worldToLocal(worldToBlock(wz), CHUNK_W)
    return chunk.topBlock(lx, lz)
  }

  /**
   * Search outward from the world centre to find a spawn point inside
   * the requested biome. Falls back to (0, 0) if none found within bounds.
   * @param {number} biomeId  — one of the BIOME.* constants
   * @returns {{ x: number, z: number }}
   */
  findBiomeSpawn(biomeId) {
    const halfBlocks = (this.halfChunks - 1) * CHUNK_W
    const step = 16

    if (this._gen.getBiome(0, 0) === biomeId) return { x: 0, z: 0 }

    for (let r = step; r <= halfBlocks; r += step) {
      for (let i = -r; i <= r; i += step) {
        const candidates = [[i, -r], [i, r], [-r, i], [r, i]]
        for (const [x, z] of candidates) {
          if (this._gen.getBiome(x, z) === biomeId) return { x, z }
        }
      }
    }
    return { x: 0, z: 0 }
  }

  isSolid(wx, wy, wz) {
    const id = this.getBlock(wx, wy, wz)
    if (!id) return false
    const def = BLOCK_BY_ID.get(id)
    if (!def) return true
    // Post-shaped blocks (fence) use a thin geometry — treat as non-solid for AABB
    if (def.shape === 'post') return false
    return def.solid !== false
  }

  /**
   * Returns the collision surface height within the block (0..1).
   * 0   = no collision (air, transparent pass-through)
   * 0.5 = slab/half-block (trapdoor)
   * 1.0 = full cube
   */
  getBlockCollisionHeight(wx, wy, wz) {
    const id = this.getBlock(wx, wy, wz)
    if (!id) return 0
    const def = BLOCK_BY_ID.get(id)
    if (!def || def.solid === false || def.shape === 'post') return 0
    if (def.shape === 'slab') return 0.5
    return 1.0
  }

  // ── Per-frame update: load/unload + mesh queue ─────────────
  /**
   * Call every frame with the player's current chunk coords.
   *
   * When maxLoads === Infinity (used during the initial loading screen) all
   * missing chunks are generated synchronously on the main thread so the
   * world is fully populated before the player can move.
   *
   * During normal gameplay (default maxLoads=2) new chunks are handed off
   * to the Web Worker pool and generated asynchronously — the main thread
   * only pays the cost of dispatching a message, never the terrain noise.
   *
   * @param {number} pcx              player chunk X
   * @param {number} pcz              player chunk Z
   * @param {ChunkMesher} mesher
   * @param {THREE.Scene} scene
   * @param {number} maxRebuilds      max synchronous mesh rebuilds per frame
   * @param {number} maxLoads         Infinity = synchronous; number = async dispatch limit
   * @param {LightingSystem|null} lightingSystem  optional, updated on chunk (re)build
   */
  updateChunks(pcx, pcz, mesher, scene, maxRebuilds = 2, maxLoads = 2, lightingSystem = null) {
    // Cache references so async callbacks (_onMeshResult) can reach them.
    if (!this._scene)          this._scene          = scene
    if (!this._mesher)         this._mesher          = mesher
    if (!this._lightingSystem) this._lightingSystem  = lightingSystem

    const R = VIEW_DIST_CHUNKS

    if (maxLoads === Infinity) {
      // ── Synchronous initial load (loading screen) ──────────
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          if (dx*dx + dz*dz > R*R) continue
          this.loadChunk(pcx + dx, pcz + dz)
        }
      }
    } else {
      // ── Async worker-based loading (runtime) ───────────────
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const dist2 = dx*dx + dz*dz
          if (dist2 > R*R) continue
          const cx = pcx + dx, cz = pcz + dz
          const key = World.chunkKey(cx, cz)
          if (this._chunks.has(key) || this._pendingKeys.has(key)) continue
          if (Math.abs(cx) >= this.halfChunks || Math.abs(cz) >= this.halfChunks) continue
          this._pendingKeys.add(key)
          this._genQueue.push({ dist2, cx, cz })
        }
      }

      // Sort once per frame (queue is usually tiny — 0-4 entries)
      if (this._genQueue.length > 0) {
        this._genQueue.sort((a, b) => a.dist2 - b.dist2)
        this._dispatchPending()
      }
    }

    // ── Unload far chunks ──────────────────────────────────
    const UNLOAD = R + 3
    for (const [key, chunk] of this._chunks) {
      const dx = chunk.cx - pcx, dz = chunk.cz - pcz
      if (dx*dx + dz*dz > UNLOAD*UNLOAD) {
        if (chunk.mesh)            scene.remove(chunk.mesh)
        if (chunk.transparentMesh) scene.remove(chunk.transparentMesh)
        if (chunk.crossMesh)       scene.remove(chunk.crossMesh)
        if (chunk.waterMesh)       scene.remove(chunk.waterMesh)
        if (chunk.emissiveMesh)    scene.remove(chunk.emissiveMesh)
        lightingSystem?.untrackChunk(chunk.cx, chunk.cz)
        this.unloadChunk(chunk.cx, chunk.cz)
      }
    }

    // Cancel pending gen requests for chunks now out of unload range
    if (this._genQueue.length > 0) {
      this._genQueue = this._genQueue.filter(({ cx, cz }) => {
        const dx = cx - pcx, dz = cz - pcz
        if (dx*dx + dz*dz > UNLOAD*UNLOAD) {
          this._pendingKeys.delete(World.chunkKey(cx, cz))
          return false
        }
        return true
      })
    }

    // ── Rebuild dirty meshes ──────────────────────────────────
    if (this._dirtyQueue.size === 0) return

    if (maxRebuilds === Infinity) {
      // Synchronous path: initial loading screen — build all meshes now.
      for (const key of this._dirtyQueue) {
        const chunk = this._chunks.get(key)
        if (!chunk) continue

        if (chunk.mesh)            scene.remove(chunk.mesh)
        if (chunk.transparentMesh) scene.remove(chunk.transparentMesh)
        if (chunk.crossMesh)       scene.remove(chunk.crossMesh)
        if (chunk.waterMesh)       scene.remove(chunk.waterMesh)
        if (chunk.emissiveMesh)    scene.remove(chunk.emissiveMesh)

        const result = mesher.buildChunk(chunk, this)
        chunk.mesh            = result.opaque
        chunk.transparentMesh = result.transparent
        chunk.crossMesh       = result.cross
        chunk.waterMesh       = result.water
        chunk.emissiveMesh    = result.emissive

        if (chunk.mesh)            scene.add(chunk.mesh)
        if (chunk.transparentMesh) scene.add(chunk.transparentMesh)
        if (chunk.crossMesh)       scene.add(chunk.crossMesh)
        if (chunk.waterMesh)       scene.add(chunk.waterMesh)
        if (chunk.emissiveMesh)    scene.add(chunk.emissiveMesh)
        lightingSystem?.trackChunk(chunk.cx, chunk.cz, chunk.data)

        chunk.dirty = false
      }
      this._dirtyQueue.clear()
      return
    }

    // Async path: dispatch dirty chunks to mesh workers (off-thread).
    // Sort closest-first so near chunks appear before distant ones.
    if (this._meshWorkers.length === 0) return  // workers not initialised yet

    const sortedDirty = [...this._dirtyQueue].sort((a, b) => {
      const [ax, az] = a.split(',').map(Number)
      const [bx, bz] = b.split(',').map(Number)
      return ((ax-pcx)**2 + (az-pcz)**2) - ((bx-pcx)**2 + (bz-pcz)**2)
    })

    for (const key of sortedDirty) {
      if (this._meshPendingKeys.has(key)) continue   // already in-flight
      const chunk = this._chunks.get(key)
      if (!chunk) { this._dirtyQueue.delete(key); continue }

      this._meshPendingKeys.add(key)
      this._meshQueue.push(key)
      this._dirtyQueue.delete(key)
    }

    this._dispatchMeshPending()
  }
}
