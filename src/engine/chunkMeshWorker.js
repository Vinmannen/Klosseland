// ─────────────────────────────────────────────────────────────
//  Klosseland — ChunkMeshWorker
//  Off-thread chunk mesh builder. Runs inside a Web Worker.
//  Receives raw chunk data, builds geometry arrays via meshBuilder,
//  and transfers the TypedArray buffers back to the main thread.
//
//  Protocol:
//    IN  { type:'init',  atlasIndex: { [styleName]: {col,row} } }
//    IN  { type:'mesh',  reqId, cx, cz,
//          data, dataW, dataE, dataN, dataS }  ← ArrayBuffers
//    OUT { type:'meshed', reqId, cx, cz,
//          opaque, transparent, cross, water, emissive }
//          each part: null | { pos,uv,norm,col,wav,idx } as ArrayBuffers
//          emissive:  null | { pos,uv,col,idx } as ArrayBuffers
// ─────────────────────────────────────────────────────────────
import { buildGeometryArrays } from './meshBuilder.js'
import { TEX_SIZE, ATLAS_COLS, ATLAS_ROWS } from '../data/constants.js'

const ATLAS_W_PX = TEX_SIZE * ATLAS_COLS
const ATLAS_H_PX = TEX_SIZE * ATLAS_ROWS

let atlasIndex = null   // { [styleName]: { col, row } }

function resolveUV(def, slotIdx) {
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
  const entry = atlasIndex[styleName]
  if (!entry) return { u0: 0, v0: 0, u1: TEX_SIZE/ATLAS_W_PX, v1: TEX_SIZE/ATLAS_H_PX }
  const { col, row } = entry
  return {
    u0:  (col   * TEX_SIZE) / ATLAS_W_PX,
    v0:  (row   * TEX_SIZE) / ATLAS_H_PX,
    u1: ((col+1) * TEX_SIZE) / ATLAS_W_PX,
    v1: ((row+1) * TEX_SIZE) / ATLAS_H_PX,
  }
}

function packPart6(part) {
  if (!part) return { payload: null, transfers: [] }
  const transfers = [
    part.pos.buffer, part.uv.buffer, part.norm.buffer,
    part.col.buffer, part.wav.buffer, part.idx.buffer,
  ]
  return {
    payload: { pos: part.pos.buffer, uv: part.uv.buffer, norm: part.norm.buffer,
                col: part.col.buffer, wav: part.wav.buffer, idx:  part.idx.buffer },
    transfers,
  }
}

function packPart4(part) {
  if (!part) return { payload: null, transfers: [] }
  const transfers = [part.pos.buffer, part.uv.buffer, part.col.buffer, part.idx.buffer]
  return {
    payload: { pos: part.pos.buffer, uv: part.uv.buffer,
                col: part.col.buffer, idx: part.idx.buffer },
    transfers,
  }
}

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    atlasIndex = data.atlasIndex
    return
  }

  if (data.type === 'mesh') {
    const { reqId, cx, cz } = data

    const chunkData = new Uint16Array(data.data)
    const dataW = data.dataW ? new Uint16Array(data.dataW) : null
    const dataE = data.dataE ? new Uint16Array(data.dataE) : null
    const dataN = data.dataN ? new Uint16Array(data.dataN) : null
    const dataS = data.dataS ? new Uint16Array(data.dataS) : null

    const result = buildGeometryArrays(chunkData, dataW, dataE, dataN, dataS, resolveUV)

    const pO = packPart6(result.opaque)
    const pT = packPart6(result.transparent)
    const pC = packPart6(result.cross)
    const pW = packPart6(result.water)
    const pE = packPart4(result.emissive)

    const allTransfers = [
      ...pO.transfers, ...pT.transfers, ...pC.transfers,
      ...pW.transfers, ...pE.transfers,
    ]

    self.postMessage({
      type: 'meshed', reqId, cx, cz,
      opaque:      pO.payload,
      transparent: pT.payload,
      cross:       pC.payload,
      water:       pW.payload,
      emissive:    pE.payload,
    }, allTransfers)
  }
}
