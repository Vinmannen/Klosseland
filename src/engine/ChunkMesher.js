// ─────────────────────────────────────────────────────────────
//  Klosseland — ChunkMesher
//  Thin THREE.js assembly layer over meshBuilder.js.
//
//  Sync path (initial load):
//    buildChunk(chunk, world) → calls buildGeometryArrays then
//    assembles THREE.js Mesh objects on the main thread.
//
//  Async path (runtime):
//    World dispatches chunk data to chunkMeshWorker.js workers.
//    When results arrive, assembleWorkerResult() wraps the
//    transferred ArrayBuffers into BufferGeometry + Mesh.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { CHUNK_W, CHUNK_H } from '../data/constants.js'
import { atlas }              from './TextureAtlas.js'
import { buildGeometryArrays } from './meshBuilder.js'

// Pre-computed bounding sphere for a chunk-sized volume.
// All chunk meshes are <= CHUNK_W × CHUNK_H × CHUNK_W in local space.
// Using a fixed sphere avoids an O(n) vertex scan per mesh.
const _BS_CENTER = new THREE.Vector3(CHUNK_W / 2, CHUNK_H / 2, CHUNK_W / 2)
const _BS_RADIUS = Math.sqrt((CHUNK_W/2)**2 + (CHUNK_H/2)**2 + (CHUNK_W/2)**2)

export class ChunkMesher {
  constructor(renderer) {
    this._opaqueMat      = renderer.opaqueMat
    this._transparentMat = renderer.transparentMat
    this._crossMat       = renderer.crossMat
    this._waterMat       = renderer.waterMat
    this._glowMat        = renderer.glowMat
  }

  /** Synchronous build — used during the initial loading screen. */
  buildChunk(chunk, world) {
    const dataW = world.getChunk(chunk.cx - 1, chunk.cz)?.data ?? null
    const dataE = world.getChunk(chunk.cx + 1, chunk.cz)?.data ?? null
    const dataN = world.getChunk(chunk.cx, chunk.cz - 1)?.data ?? null
    const dataS = world.getChunk(chunk.cx, chunk.cz + 1)?.data ?? null

    const arrays = buildGeometryArrays(
      chunk.data, dataW, dataE, dataN, dataS,
      (def, slotIdx) => this._getUV(def, slotIdx),
    )

    const ox = chunk.cx * CHUNK_W
    const oz = chunk.cz * CHUNK_W
    return this._assemble(arrays, ox, oz)
  }

  /**
   * Assemble mesh result from worker ArrayBuffers into THREE.js Mesh objects.
   * Called on the main thread after an async mesh job completes.
   * @param {{ opaque, transparent, cross, water, emissive }} raw  Worker payload
   * @param {number} ox  world X origin of the chunk
   * @param {number} oz  world Z origin of the chunk
   */
  assembleWorkerResult(raw, ox, oz) {
    const rehydrate6 = (p) => p ? {
      pos:  new Float32Array(p.pos),
      uv:   new Float32Array(p.uv),
      norm: new Float32Array(p.norm),
      col:  new Float32Array(p.col),
      wav:  new Float32Array(p.wav),
      idx:  new Uint32Array(p.idx),
    } : null

    const rehydrate4 = (p) => p ? {
      pos: new Float32Array(p.pos),
      uv:  new Float32Array(p.uv),
      col: new Float32Array(p.col),
      idx: new Uint32Array(p.idx),
    } : null

    return this._assemble({
      opaque:      rehydrate6(raw.opaque),
      transparent: rehydrate6(raw.transparent),
      cross:       rehydrate6(raw.cross),
      water:       rehydrate6(raw.water),
      emissive:    rehydrate4(raw.emissive),
    }, ox, oz)
  }

  // ── Private ───────────────────────────────────────────────

  _assemble(arrays, ox, oz) {
    return {
      opaque:      arrays.opaque      ? this._buildMesh(arrays.opaque,      this._opaqueMat,      ox, oz) : null,
      transparent: arrays.transparent ? this._buildMesh(arrays.transparent, this._transparentMat, ox, oz) : null,
      cross:       arrays.cross       ? this._buildMesh(arrays.cross,       this._crossMat,       ox, oz) : null,
      water:       arrays.water       ? this._buildMesh(arrays.water,       this._waterMat,       ox, oz) : null,
      emissive:    arrays.emissive    ? this._buildEmissiveMesh(arrays.emissive, ox, oz)                  : null,
    }
  }

  _getUV(def, slotIdx) {
    const { tex } = def
    if (!tex) return null
    let styleName
    if (tex.all) {
      styleName = tex.all
    } else {
      styleName = slotIdx === 0 ? (tex.top    || tex.side)
                : slotIdx === 1 ? (tex.bottom || tex.side)
                : slotIdx === 3 ? (tex.front  || tex.side)
                :                 (tex.side   || tex.top)
    }
    if (!styleName) return null
    return atlas.uv(styleName)
  }

  _buildMesh(part, material, ox, oz) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',  new THREE.BufferAttribute(part.pos,  3))
    geo.setAttribute('uv',        new THREE.BufferAttribute(part.uv,   2))
    geo.setAttribute('normal',    new THREE.BufferAttribute(part.norm, 3))
    geo.setAttribute('color',     new THREE.BufferAttribute(part.col,  3))
    geo.setAttribute('isWaving',  new THREE.BufferAttribute(part.wav,  1))
    geo.setIndex(new THREE.BufferAttribute(part.idx, 1))
    geo.boundingSphere = new THREE.Sphere(_BS_CENTER.clone(), _BS_RADIUS)

    const mesh = new THREE.Mesh(geo, material)
    mesh.position.set(ox, 0, oz)
    mesh.receiveShadow    = true
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    return mesh
  }

  _buildEmissiveMesh(part, ox, oz) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(part.pos, 3))
    geo.setAttribute('uv',       new THREE.BufferAttribute(part.uv,  2))
    geo.setAttribute('color',    new THREE.BufferAttribute(part.col, 3))
    geo.setIndex(new THREE.BufferAttribute(part.idx, 1))
    geo.boundingSphere = new THREE.Sphere(_BS_CENTER.clone(), _BS_RADIUS)

    const mesh = new THREE.Mesh(geo, this._glowMat)
    mesh.position.set(ox, 0, oz)
    mesh.castShadow       = false
    mesh.receiveShadow    = false
    mesh.renderOrder      = 1
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    return mesh
  }
}
