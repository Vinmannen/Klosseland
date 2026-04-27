// ─────────────────────────────────────────────────────────────
//  Klosseland — meshBuilder
//  Pure voxel geometry builder — no THREE.js, no DOM dependencies.
//  Shared between ChunkMesher (main-thread sync path) and
//  chunkMeshWorker (off-thread async path).
//
//  Returns plain TypedArrays; the caller is responsible for
//  wrapping them in BufferGeometry / Mesh.
// ─────────────────────────────────────────────────────────────
import { CHUNK_W, CHUNK_H } from '../data/constants.js'
import { BLOCK_BY_ID }       from '../data/blockDefinitions.js'

// ─── Face definitions ─────────────────────────────────────────
const FACES = [
  // 0 – TOP (+Y)
  { nx:0, ny:1, nz:0,
    verts: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]],
    uvs:   [[0,0],[0,1],[1,1],[1,0]] },
  // 1 – BOTTOM (-Y)
  { nx:0, ny:-1, nz:0,
    verts: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
    uvs:   [[0,0],[1,0],[1,1],[0,1]] },
  // 2 – NORTH (-Z)
  { nx:0, ny:0, nz:-1,
    verts: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]],
    uvs:   [[1,1],[0,1],[0,0],[1,0]] },
  // 3 – SOUTH (+Z)
  { nx:0, ny:0, nz:1,
    verts: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]],
    uvs:   [[0,1],[1,1],[1,0],[0,0]] },
  // 4 – EAST (+X)
  { nx:1, ny:0, nz:0,
    verts: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]],
    uvs:   [[1,1],[0,1],[0,0],[1,0]] },
  // 5 – WEST (-X)
  { nx:-1, ny:0, nz:0,
    verts: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]],
    uvs:   [[0,1],[1,1],[1,0],[0,0]] },
]

const FACE_TO_SLOT = [0, 1, 2, 2, 2, 2]

const VERT_ROT = [
  (x, z) => [x, z],
  (x, z) => [1-z, x],
  (x, z) => [1-x, 1-z],
  (x, z) => [z, 1-x],
]
const NORM_ROT = [
  (nx, nz) => [nx, nz],
  (nx, nz) => [-nz, nx],
  (nx, nz) => [-nx, -nz],
  (nx, nz) => [nz, -nx],
]
const TOP_UV_BY_FACING = [
  [[0,0],[0,1],[1,1],[1,0]],
  [[0,1],[0,0],[1,0],[1,1]],
  [[1,0],[1,1],[0,1],[0,0]],
  [[1,1],[1,0],[0,0],[0,1]],
]

const CROSS_QUADS = [
  { verts: [[0,0,0.5],[1,0,0.5],[1,1,0.5],[0,1,0.5]], uvs: [[0,1],[1,1],[1,0],[0,0]] },
  { verts: [[0.5,0,1],[0.5,0,0],[0.5,1,0],[0.5,1,1]], uvs: [[0,1],[1,1],[1,0],[0,0]] },
]

// ─────────────────────────────────────────────────────────────

/**
 * Build raw geometry arrays for one chunk.
 * @param {Uint16Array}      data   centre chunk block data
 * @param {Uint16Array|null} dataW  -X neighbour
 * @param {Uint16Array|null} dataE  +X neighbour
 * @param {Uint16Array|null} dataN  -Z neighbour
 * @param {Uint16Array|null} dataS  +Z neighbour
 * @param {(def, slotIdx:0|1|2|3) => {u0,v0,u1,v1}|null} getUV
 * @returns {{ opaque, transparent, cross, water, emissive }}
 *   Each is null or a { pos, uv, norm, col, wav, idx } object of TypedArrays
 *   (emissive has no norm/wav).
 */
export function buildGeometryArrays(data, dataW, dataE, dataN, dataS, getUV) {
  const oPos=[], oUV=[], oNorm=[], oCol=[], oWav=[], oIdx=[]
  const tPos=[], tUV=[], tNorm=[], tCol=[], tWav=[], tIdx=[]
  const cPos=[], cUV=[], cNorm=[], cCol=[], cWav=[], cIdx=[]
  const wPos=[], wUV=[], wNorm=[], wCol=[], wWav=[], wIdx=[]
  const ePos=[], eUV=[], eCol=[], eIdx=[]

  const W     = CHUNK_W
  const SLICE = W * W

  for (let lx = 0; lx < W; lx++) {
    for (let y = 0; y < CHUNK_H; y++) {
      for (let lz = 0; lz < W; lz++) {
        const id = data[y * SLICE + lz * W + lx]
        if (!id) continue

        const def = BLOCK_BY_ID.get(id)
        if (!def || !def.tex) continue

        if (def.shape) {
          const bucket = def.transparent
            ? { pos:tPos, uv:tUV, norm:tNorm, col:tCol, wav:tWav, idx:tIdx }
            : { pos:oPos, uv:oUV, norm:oNorm, col:oCol, wav:oWav, idx:oIdx }
          _addCustomShape(bucket, lx, y, lz, def, getUV)
          continue
        }

        if (!def.solid && !def.liquid) {
          _addCross(cPos, cUV, cNorm, cCol, cWav, cIdx, lx, y, lz, def, getUV)
          continue
        }

        const bucket = def.liquid
          ? { pos:wPos, uv:wUV, norm:wNorm, col:wCol, wav:wWav, idx:wIdx }
          : def.transparent
          ? { pos:tPos, uv:tUV, norm:tNorm, col:tCol, wav:tWav, idx:tIdx }
          : { pos:oPos, uv:oUV, norm:oNorm, col:oCol, wav:oWav, idx:oIdx }

        for (let fi = 0; fi < 6; fi++) {
          const face = FACES[fi]
          const nlx  = lx + face.nx
          const nly  = y  + face.ny
          const nlz  = lz + face.nz

          let nid = 0
          if (nly >= 0 && nly < CHUNK_H) {
            if (nlx >= 0 && nlx < W && nlz >= 0 && nlz < W) {
              nid = data[nly * SLICE + nlz * W + nlx]
            } else {
              let nd, rlx, rlz
              if      (nlx < 0)  { nd = dataW; rlx = nlx + W; rlz = nlz     }
              else if (nlx >= W) { nd = dataE; rlx = nlx - W; rlz = nlz     }
              else if (nlz < 0)  { nd = dataN; rlx = nlx;     rlz = nlz + W }
              else               { nd = dataS; rlx = nlx;     rlz = nlz - W }
              if (nd) nid = nd[nly * SLICE + rlz * W + rlx]
            }
          }

          const ndef = nid ? BLOCK_BY_ID.get(nid) : null
          if (nid && ndef && !ndef.transparent && ndef.solid !== false) continue
          if (def.liquid && ndef?.liquid) continue

          const uvRect = getUV(def, FACE_TO_SLOT[fi])
          if (!uvRect) continue

          _addFace(bucket, lx, y, lz, fi, face, uvRect, def,
                   data, dataW, dataE, dataN, dataS, W, SLICE)

          if (def.luminance > 0 && def.solid) {
            _addEmissiveFace(ePos, eUV, eCol, eIdx, lx, y, lz, face, uvRect, def)
          }
        }
      }
    }
  }

  return {
    opaque:      _pack6(oPos, oUV, oNorm, oCol, oWav, oIdx),
    transparent: _pack6(tPos, tUV, tNorm, tCol, tWav, tIdx),
    cross:       _pack6(cPos, cUV, cNorm, cCol, cWav, cIdx),
    water:       _pack6(wPos, wUV, wNorm, wCol, wWav, wIdx),
    emissive:    _pack4(ePos, eUV, eCol, eIdx),
  }
}

// ── Pack plain arrays into TypedArrays ────────────────────────

function _pack6(pos, uv, norm, col, wav, idx) {
  if (!pos.length) return null
  return {
    pos:  new Float32Array(pos),
    uv:   new Float32Array(uv),
    norm: new Float32Array(norm),
    col:  new Float32Array(col),
    wav:  new Float32Array(wav),
    idx:  new Uint32Array(idx),
  }
}

function _pack4(pos, uv, col, idx) {
  if (!pos.length) return null
  return {
    pos: new Float32Array(pos),
    uv:  new Float32Array(uv),
    col: new Float32Array(col),
    idx: new Uint32Array(idx),
  }
}

// ── Add one quad face with baked AO ──────────────────────────

function _addFace(bucket, lx, y, lz, fi, face, uvRect, def,
                  data, dataW, dataE, dataN, dataS, W, SLICE) {
  const { pos, uv, norm, col, wav, idx } = bucket
  const base   = pos.length / 3
  const isWavy = (def.waving && fi === 0) ? 1.0 : 0.0
  const aov    = [0, 0, 0, 0]

  for (let vi = 0; vi < 4; vi++) {
    const [vx, vy, vz] = face.verts[vi]
    pos.push(lx + vx, y + vy, lz + vz)
    norm.push(face.nx, face.ny, face.nz)
    const ao = _computeAO(lx, y, lz, face, vx, vy, vz,
                          data, dataW, dataE, dataN, dataS, W, SLICE)
    aov[vi] = ao
    col.push(ao, ao, ao)
    wav.push(isWavy)
  }

  const { u0, v0, u1, v1 } = uvRect
  for (const [fu, fv] of face.uvs) {
    uv.push(fu === 0 ? u0 : u1, fv === 0 ? v0 : v1)
  }

  if (aov[0] + aov[2] < aov[1] + aov[3]) {
    idx.push(base+1, base+2, base+3,  base, base+1, base+3)
  } else {
    idx.push(base, base+1, base+2,   base, base+2, base+3)
  }
}

// ── Per-vertex AO ────────────────────────────────────────────

function _computeAO(lx, y, lz, face, vx, vy, vz,
                    data, dataW, dataE, dataN, dataS, W, SLICE) {
  const { nx, ny, nz } = face
  const sx = (nx !== 0) ? nx : (vx === 0 ? -1 : 1)
  const sy = (ny !== 0) ? ny : (vy === 0 ? -1 : 1)
  const sz = (nz !== 0) ? nz : (vz === 0 ? -1 : 1)

  let ox1, oy1, oz1, ox2, oy2, oz2, oxc, oyc, ozc
  if (nx !== 0) {
    ox1 = nx; oy1 = sy; oz1 = 0
    ox2 = nx; oy2 = 0;  oz2 = sz
    oxc = nx; oyc = sy; ozc = sz
  } else if (ny !== 0) {
    ox1 = sx; oy1 = ny; oz1 = 0
    ox2 = 0;  oy2 = ny; oz2 = sz
    oxc = sx; oyc = ny; ozc = sz
  } else {
    ox1 = sx; oy1 = 0;  oz1 = nz
    ox2 = 0;  oy2 = sy; oz2 = nz
    oxc = sx; oyc = sy; ozc = nz
  }

  const s1 = _isOccluder(lx+ox1, y+oy1, lz+oz1, data, dataW, dataE, dataN, dataS, W, SLICE) ? 1 : 0
  const s2 = _isOccluder(lx+ox2, y+oy2, lz+oz2, data, dataW, dataE, dataN, dataS, W, SLICE) ? 1 : 0
  const sc = _isOccluder(lx+oxc, y+oyc, lz+ozc, data, dataW, dataE, dataN, dataS, W, SLICE) ? 1 : 0
  const aoCount = (s1 && s2) ? 3 : s1 + s2 + sc
  return 1.0 - aoCount * 0.2
}

function _isOccluder(lx, ly, lz, data, dataW, dataE, dataN, dataS, W, SLICE) {
  if (ly < 0 || ly >= CHUNK_H) return false
  let id
  if (lx >= 0 && lx < W && lz >= 0 && lz < W) {
    id = data[ly * SLICE + lz * W + lx]
  } else {
    let nd, rlx = lx, rlz = lz
    if      (lx < 0  && lz >= 0 && lz < W) { nd = dataW; rlx = lx + W }
    else if (lx >= W && lz >= 0 && lz < W) { nd = dataE; rlx = lx - W }
    else if (lz < 0  && lx >= 0 && lx < W) { nd = dataN; rlz = lz + W }
    else if (lz >= W && lx >= 0 && lx < W) { nd = dataS; rlz = lz - W }
    else return false
    if (!nd) return false
    id = nd[ly * SLICE + rlz * W + rlx]
  }
  if (!id) return false
  const def = BLOCK_BY_ID.get(id)
  return def ? (def.solid !== false && !def.transparent) : false
}

// ── Emissive face ─────────────────────────────────────────────

function _addEmissiveFace(pos, uv, col, idx, lx, y, lz, face, uvRect, def) {
  const base       = pos.length / 3
  const brightness = 0.5 + 0.5 * (def.luminance / 15)
  for (const [vx, vy, vz] of face.verts) {
    pos.push(lx + vx, y + vy, lz + vz)
    col.push(brightness, brightness, brightness)
  }
  const { u0, v0, u1, v1 } = uvRect
  for (const [fu, fv] of face.uvs) {
    uv.push(fu === 0 ? u0 : u1, fv === 0 ? v0 : v1)
  }
  idx.push(base, base+1, base+2, base, base+2, base+3)
}

// ── Cross sprite ──────────────────────────────────────────────

function _addCross(pos, uv, norm, col, wav, idx, lx, y, lz, def, getUV) {
  const uvRect = getUV(def, 2)
  if (!uvRect) return
  const { u0, v0, u1, v1 } = uvRect
  for (const quad of CROSS_QUADS) {
    const base = pos.length / 3
    for (let vi = 0; vi < 4; vi++) {
      const [vx, vy, vz] = quad.verts[vi]
      pos.push(lx + vx, y + vy, lz + vz)
      norm.push(0, 1, 0)
      col.push(1, 1, 1)
      wav.push(vy > 0.5 ? 1.0 : 0.0)
    }
    for (const [fu, fv] of quad.uvs) {
      uv.push(fu === 0 ? u0 : u1, fv === 0 ? v0 : v1)
    }
    idx.push(base, base+1, base+2, base, base+2, base+3)
  }
}

// ── Custom sub-block shapes ───────────────────────────────────

function _addCustomShape(bucket, lx, y, lz, def, getUV) {
  const { pos, uv, norm, col, wav, idx } = bucket
  const topUV   = getUV(def, 0)
  const botUV   = getUV(def, 1)
  const sideUV  = getUV(def, 2)
  const frontUV = getUV(def, 3)
  if (!topUV || !botUV || !sideUV) return

  const addQ = (verts, nx, ny, nz, uvRect, uvCoords) => {
    if (!uvRect) return
    const base = pos.length / 3
    for (const [vx, vy, vz] of verts) {
      pos.push(lx + vx, y + vy, lz + vz)
      norm.push(nx, ny, nz)
      col.push(1, 1, 1)
      wav.push(0)
    }
    const { u0, v0, u1, v1 } = uvRect
    for (const [fu, fv] of uvCoords) {
      uv.push(fu === 0 ? u0 : u1, fv === 0 ? v0 : v1)
    }
    idx.push(base, base+1, base+2, base, base+2, base+3)
  }

  const facing = def.facing ?? 0
  const rotV   = VERT_ROT[facing]
  const rotN   = NORM_ROT[facing]
  const addQF  = (verts, nx, ny, nz, uvRect, uvCoords) => {
    if (!uvRect) return
    const base = pos.length / 3
    let rnx = nx, rnz = nz
    if (ny === 0) { [rnx, rnz] = rotN(nx, nz) }
    for (const [vx, vy, vz] of verts) {
      const [rx, rz] = rotV(vx, vz)
      pos.push(lx + rx, y + vy, lz + rz)
      norm.push(rnx, ny, rnz)
      col.push(1, 1, 1)
      wav.push(0)
    }
    const { u0, v0, u1, v1 } = uvRect
    for (const [fu, fv] of uvCoords) {
      uv.push(fu === 0 ? u0 : u1, fv === 0 ? v0 : v1)
    }
    idx.push(base, base+1, base+2, base, base+2, base+3)
  }

  const UV_TOP = [[0,0],[0,1],[1,1],[1,0]]
  const UV_N   = [[1,1],[0,1],[0,0],[1,0]]
  const UV_S   = [[0,1],[1,1],[1,0],[0,0]]
  const UV_E   = [[1,1],[0,1],[0,0],[1,0]]
  const UV_W   = [[0,1],[1,1],[1,0],[0,0]]
  const UV_BOT = [[0,0],[1,0],[1,1],[0,1]]

  const shape = def.shape

  if (shape === 'chair') {
    const SH = 0.5, BH = 1.0, BR = 3/16
    const topUVR = TOP_UV_BY_FACING[facing]
    addQF([[0,SH,0],[0,SH,1],[1,SH,1],[1,SH,0]],    0, 1, 0, topUV,  topUVR)
    addQF([[1,0,0],[0,0,0],[0,SH,0],[1,SH,0]],       0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,SH,1],[0,SH,1]],       0, 0, 1, sideUV, UV_S)
    addQF([[1,0,1],[1,0,0],[1,SH,0],[1,SH,1]],       1, 0, 0, sideUV, UV_E)
    addQF([[0,0,0],[0,0,1],[0,SH,1],[0,SH,0]],      -1, 0, 0, sideUV, UV_W)
    addQF([[0,SH,BR],[1,SH,BR],[1,BH,BR],[0,BH,BR]], 0, 0, 1, sideUV, UV_S)
    addQF([[1,SH,0],[0,SH,0],[0,BH,0],[1,BH,0]],     0, 0,-1, sideUV, UV_N)
    addQF([[0,BH,0],[0,BH,BR],[1,BH,BR],[1,BH,0]],   0, 1, 0, topUV,  UV_TOP)
    addQF([[1,SH,BR],[1,SH,0],[1,BH,0],[1,BH,BR]],   1, 0, 0, sideUV, UV_E)
    addQF([[0,SH,0],[0,SH,BR],[0,BH,BR],[0,BH,0]],  -1, 0, 0, sideUV, UV_W)

  } else if (shape === 'sofa') {
    const SH = 0.5, BH = 1.0, BR = 3/16, AR = 3/16, AH = 0.75
    const topUVR = TOP_UV_BY_FACING[facing]
    addQF([[0,SH,0],[0,SH,1],[1,SH,1],[1,SH,0]],    0, 1, 0, topUV,  topUVR)
    addQF([[1,0,0],[0,0,0],[0,SH,0],[1,SH,0]],       0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,SH,1],[0,SH,1]],       0, 0, 1, sideUV, UV_S)
    addQF([[1,0,1],[1,0,0],[1,SH,0],[1,SH,1]],       1, 0, 0, sideUV, UV_E)
    addQF([[0,0,0],[0,0,1],[0,SH,1],[0,SH,0]],      -1, 0, 0, sideUV, UV_W)
    addQF([[0,SH,BR],[1,SH,BR],[1,BH,BR],[0,BH,BR]], 0, 0, 1, sideUV, UV_S)
    addQF([[1,SH,0],[0,SH,0],[0,BH,0],[1,BH,0]],     0, 0,-1, sideUV, UV_N)
    addQF([[0,BH,0],[0,BH,BR],[1,BH,BR],[1,BH,0]],   0, 1, 0, topUV,  UV_TOP)
    addQF([[1,SH,BR],[1,SH,0],[1,BH,0],[1,BH,BR]],   1, 0, 0, sideUV, UV_E)
    addQF([[0,SH,0],[0,SH,BR],[0,BH,BR],[0,BH,0]],  -1, 0, 0, sideUV, UV_W)
    const x1L = AR
    addQF([[0,SH,AR],[x1L,SH,AR],[x1L,AH,AR],[0,AH,AR]],     0, 0, 1, sideUV, UV_S)
    addQF([[x1L,SH,1],[0,SH,1],[0,AH,1],[x1L,AH,1]],          0, 0,-1, sideUV, UV_N)
    addQF([[0,AH,AR],[0,AH,1],[x1L,AH,1],[x1L,AH,AR]],        0, 1, 0, topUV,  UV_TOP)
    addQF([[x1L,SH,AR],[x1L,SH,1],[x1L,AH,1],[x1L,AH,AR]],   1, 0, 0, sideUV, UV_E)
    const x0R = 1-AR
    addQF([[x0R,SH,AR],[1,SH,AR],[1,AH,AR],[x0R,AH,AR]],      0, 0, 1, sideUV, UV_S)
    addQF([[1,SH,1],[x0R,SH,1],[x0R,AH,1],[1,AH,1]],          0, 0,-1, sideUV, UV_N)
    addQF([[x0R,AH,AR],[x0R,AH,1],[1,AH,1],[1,AH,AR]],        0, 1, 0, topUV,  UV_TOP)
    addQF([[x0R,SH,1],[x0R,SH,AR],[x0R,AH,AR],[x0R,AH,1]],  -1, 0, 0, sideUV, UV_W)

  } else if (shape === 'table') {
    const TH = 14/16, LW = 2/16
    addQF([[0,1,0],[0,1,1],[1,1,1],[1,1,0]],     0, 1, 0, topUV,  UV_TOP)
    addQF([[0,TH,0],[1,TH,0],[1,1,0],[0,1,0]],   0, 0,-1, sideUV, UV_N)
    addQF([[0,TH,1],[1,TH,1],[1,1,1],[0,1,1]],   0, 0, 1, sideUV, UV_S)
    addQF([[1,TH,0],[1,TH,1],[1,1,1],[1,1,0]],   1, 0, 0, sideUV, UV_E)
    addQF([[0,TH,0],[0,TH,1],[0,1,1],[0,1,0]],  -1, 0, 0, sideUV, UV_W)
    const legs = [
      [0,    0, 0,    LW,  0, LW  ],
      [1-LW, 0, 0,    1,   0, LW  ],
      [0,    0, 1-LW, LW,  0, 1   ],
      [1-LW, 0, 1-LW, 1,   0, 1   ],
    ]
    for (const [x0,y0,z0,x1,,z1] of legs) {
      addQF([[x0,TH,z0],[x1,TH,z0],[x1,y0,z0],[x0,y0,z0]], 0, 0,-1, sideUV, UV_N)
      addQF([[x0,TH,z1],[x1,TH,z1],[x1,y0,z1],[x0,y0,z1]], 0, 0, 1, sideUV, UV_S)
      addQF([[x1,TH,z0],[x1,TH,z1],[x1,y0,z1],[x1,y0,z0]], 1, 0, 0, sideUV, UV_E)
      addQF([[x0,TH,z1],[x0,TH,z0],[x0,y0,z0],[x0,y0,z1]],-1, 0, 0, sideUV, UV_W)
    }

  } else if (shape === 'bed_furn') {
    const SH = 0.5, PH = 0.5 + 1/16, PD = 4/16
    const topUVR = TOP_UV_BY_FACING[facing]
    addQF([[0,SH,0],[0,SH,1],[1,SH,1],[1,SH,0]],                    0, 1, 0, topUV,  topUVR)
    addQF([[1,0,0],[0,0,0],[0,SH,0],[1,SH,0]],                       0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,SH,1],[0,SH,1]],                       0, 0, 1, sideUV, UV_S)
    addQF([[1,0,1],[1,0,0],[1,SH,0],[1,SH,1]],                       1, 0, 0, sideUV, UV_E)
    addQF([[0,0,0],[0,0,1],[0,SH,1],[0,SH,0]],                      -1, 0, 0, sideUV, UV_W)
    addQF([[1/16,SH,0],[1/16,SH,PD],[15/16,SH,PD],[15/16,SH,0]],    0, 1, 0, topUV,  UV_TOP)
    addQF([[15/16,SH,0],[1/16,SH,0],[1/16,PH,0],[15/16,PH,0]],       0, 0,-1, sideUV, UV_N)
    addQF([[1/16,SH,PD],[15/16,SH,PD],[15/16,PH,PD],[1/16,PH,PD]],  0, 0, 1, sideUV, UV_S)
    addQF([[15/16,SH,0],[15/16,SH,PD],[15/16,PH,PD],[15/16,PH,0]],  1, 0, 0, sideUV, UV_E)
    addQF([[1/16,SH,PD],[1/16,SH,0],[1/16,PH,0],[1/16,PH,PD]],     -1, 0, 0, sideUV, UV_W)

  } else if (shape === 'bed_foot') {
    const SH = 0.5, FH = 0.5 + 3/16, FD = 3/16
    const topUVR = TOP_UV_BY_FACING[facing]
    addQF([[0,SH,0],[0,SH,1],[1,SH,1],[1,SH,0]],              0, 1, 0, topUV,  topUVR)
    addQF([[1,0,0],[0,0,0],[0,SH,0],[1,SH,0]],                 0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,SH,1],[0,SH,1]],                 0, 0, 1, sideUV, UV_S)
    addQF([[1,0,1],[1,0,0],[1,SH,0],[1,SH,1]],                 1, 0, 0, sideUV, UV_E)
    addQF([[0,0,0],[0,0,1],[0,SH,1],[0,SH,0]],                -1, 0, 0, sideUV, UV_W)
    addQF([[0,SH,1],[1,SH,1],[1,FH,1],[0,FH,1]],               0, 0, 1, sideUV, UV_S)
    addQF([[1,SH,1-FD],[0,SH,1-FD],[0,FH,1-FD],[1,FH,1-FD]],  0, 0,-1, sideUV, UV_N)
    addQF([[0,FH,1-FD],[0,FH,1],[1,FH,1],[1,FH,1-FD]],         0, 1, 0, topUV,  UV_TOP)
    addQF([[1,SH,1],[1,SH,1-FD],[1,FH,1-FD],[1,FH,1]],         1, 0, 0, sideUV, UV_E)
    addQF([[0,SH,1-FD],[0,SH,1],[0,FH,1],[0,FH,1-FD]],        -1, 0, 0, sideUV, UV_W)

  } else if (shape === 'chest_furn') {
    const B = 1/16, H = 14/16
    addQ([[B,H,B],[B,H,1-B],[1-B,H,1-B],[1-B,H,B]],     0, 1, 0, topUV,  UV_TOP)
    addQ([[B,0,B],[1-B,0,B],[1-B,0,1-B],[B,0,1-B]],     0,-1, 0, botUV,  UV_BOT)
    addQ([[1-B,0,B],[B,0,B],[B,H,B],[1-B,H,B]],          0, 0,-1, sideUV, UV_N)
    addQ([[B,0,1-B],[1-B,0,1-B],[1-B,H,1-B],[B,H,1-B]], 0, 0, 1, sideUV, UV_S)
    addQ([[1-B,0,1-B],[1-B,0,B],[1-B,H,B],[1-B,H,1-B]], 1, 0, 0, sideUV, UV_E)
    addQ([[B,0,B],[B,0,1-B],[B,H,1-B],[B,H,B]],         -1, 0, 0, sideUV, UV_W)

  } else if (shape === 'cabinet_furn') {
    const fr = frontUV || sideUV
    addQF([[0,1,0],[0,1,1],[1,1,1],[1,1,0]],  0, 1, 0, topUV,  UV_TOP)
    addQF([[0,0,0],[1,0,0],[1,0,1],[0,0,1]],  0,-1, 0, botUV,  UV_BOT)
    addQF([[1,0,0],[0,0,0],[0,1,0],[1,1,0]],  0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,1,1],[0,1,1]],  0, 0, 1, fr,     UV_S)
    addQF([[1,0,1],[1,0,0],[1,1,0],[1,1,1]],  1, 0, 0, sideUV, UV_E)
    addQF([[0,0,0],[0,0,1],[0,1,1],[0,1,0]], -1, 0, 0, sideUV, UV_W)

  } else if (shape === 'slab') {
    const H = 0.5
    addQ([[0,H,0],[0,H,1],[1,H,1],[1,H,0]], 0, 1, 0, topUV,  [[0,0],[0,1],[1,1],[1,0]])
    addQ([[0,0,0],[1,0,0],[1,0,1],[0,0,1]], 0,-1, 0, botUV,  [[0,0],[1,0],[1,1],[0,1]])
    addQ([[1,0,0],[0,0,0],[0,H,0],[1,H,0]], 0, 0,-1, sideUV, [[1,1],[0,1],[0,0],[1,0]])
    addQ([[0,0,1],[1,0,1],[1,H,1],[0,H,1]], 0, 0, 1, sideUV, [[0,1],[1,1],[1,0],[0,0]])
    addQ([[1,0,1],[1,0,0],[1,H,0],[1,H,1]], 1, 0, 0, sideUV, [[1,1],[0,1],[0,0],[1,0]])
    addQ([[0,0,0],[0,0,1],[0,H,1],[0,H,0]],-1, 0, 0, sideUV, [[0,1],[1,1],[1,0],[0,0]])

  } else if (shape === 'bowl') {
    const BH = 10/16, WT = 2/16, IH = 2/16
    addQ([[0,0,0],[1,0,0],[1,0,1],[0,0,1]],             0,-1, 0, botUV,  UV_BOT)
    addQ([[1,0,0],[0,0,0],[0,BH,0],[1,BH,0]],            0, 0,-1, sideUV, UV_N)
    addQ([[0,0,1],[1,0,1],[1,BH,1],[0,BH,1]],            0, 0, 1, sideUV, UV_S)
    addQ([[1,0,1],[1,0,0],[1,BH,0],[1,BH,1]],            1, 0, 0, sideUV, UV_E)
    addQ([[0,0,0],[0,0,1],[0,BH,1],[0,BH,0]],           -1, 0, 0, sideUV, UV_W)
    // Rim top (4 strips around the opening)
    addQ([[0,BH,0],[WT,BH,0],[WT,BH,1],[0,BH,1]],        0, 1, 0, topUV,  UV_TOP)
    addQ([[1-WT,BH,0],[1,BH,0],[1,BH,1],[1-WT,BH,1]],   0, 1, 0, topUV,  UV_TOP)
    addQ([[WT,BH,0],[1-WT,BH,0],[1-WT,BH,WT],[WT,BH,WT]],0, 1, 0, topUV, UV_TOP)
    addQ([[WT,BH,1-WT],[1-WT,BH,1-WT],[1-WT,BH,1],[WT,BH,1]],0,1,0,topUV,UV_TOP)
    // Inner floor
    addQ([[WT,IH,WT],[1-WT,IH,WT],[1-WT,IH,1-WT],[WT,IH,1-WT]], 0, 1, 0, topUV, UV_TOP)
    // Inner walls (facing inward so visible from above)
    addQ([[WT,IH,WT],[1-WT,IH,WT],[1-WT,BH,WT],[WT,BH,WT]],     0, 0, 1, sideUV, UV_S)
    addQ([[1-WT,IH,1-WT],[WT,IH,1-WT],[WT,BH,1-WT],[1-WT,BH,1-WT]],0,0,-1,sideUV,UV_N)
    addQ([[WT,IH,1-WT],[WT,IH,WT],[WT,BH,WT],[WT,BH,1-WT]],      1, 0, 0, sideUV, UV_E)
    addQ([[1-WT,IH,WT],[1-WT,IH,1-WT],[1-WT,BH,1-WT],[1-WT,BH,WT]],-1,0,0,sideUV,UV_W)

  } else if (shape === 'post') {
    const P0 = 6/16, P1 = 10/16
    addQ([[P0,1,P0],[P0,1,P1],[P1,1,P1],[P1,1,P0]], 0, 1, 0, topUV,  [[0,0],[0,1],[1,1],[1,0]])
    addQ([[P0,0,P0],[P1,0,P0],[P1,0,P1],[P0,0,P1]], 0,-1, 0, botUV,  [[0,0],[1,0],[1,1],[0,1]])
    addQ([[P1,0,P0],[P0,0,P0],[P0,1,P0],[P1,1,P0]], 0, 0,-1, sideUV, [[1,1],[0,1],[0,0],[1,0]])
    addQ([[P0,0,P1],[P1,0,P1],[P1,1,P1],[P0,1,P1]], 0, 0, 1, sideUV, [[0,1],[1,1],[1,0],[0,0]])
    addQ([[P1,0,P1],[P1,0,P0],[P1,1,P0],[P1,1,P1]], 1, 0, 0, sideUV, [[1,1],[0,1],[0,0],[1,0]])
    addQ([[P0,0,P0],[P0,0,P1],[P0,1,P1],[P0,1,P0]],-1, 0, 0, sideUV, [[0,1],[1,1],[1,0],[0,0]])

  } else if (shape === 'panel') {
    const DW = 3/16
    addQ([[0,0,DW],[1,0,DW],[1,1,DW],[0,1,DW]],   0, 0, 1, sideUV, [[0,1],[1,1],[1,0],[0,0]])
    addQ([[1,0,0],[0,0,0],[0,1,0],[1,1,0]],         0, 0,-1, sideUV, [[1,1],[0,1],[0,0],[1,0]])
    addQ([[0,1,0],[1,1,0],[1,1,DW],[0,1,DW]],       0, 1, 0, topUV,  [[0,0],[1,0],[1,1],[0,1]])
    addQ([[0,0,0],[0,0,DW],[1,0,DW],[1,0,0]],       0,-1, 0, botUV,  [[0,0],[0,1],[1,1],[1,0]])
    addQ([[1,0,0],[1,0,DW],[1,1,DW],[1,1,0]],       1, 0, 0, sideUV, [[0,1],[1,1],[1,0],[0,0]])
    addQ([[0,0,DW],[0,0,0],[0,1,0],[0,1,DW]],      -1, 0, 0, sideUV, [[1,1],[0,1],[0,0],[1,0]])

  } else if (shape === 'ladder') {
    const T = 1/16
    addQ([[0,0,T],[1,0,T],[1,1,T],[0,1,T]],  0, 0, 1, sideUV, [[0,1],[1,1],[1,0],[0,0]])
    addQ([[1,0,0],[0,0,0],[0,1,0],[1,1,0]],  0, 0,-1, sideUV, [[1,1],[0,1],[0,0],[1,0]])

  } else if (shape === 'tub') {
    // Bathtub — 3-sided box open at the front (facing direction).
    // facing=0: open face at +Z (south). addQF rotates for other facings.
    const TH = 10/16, WT = 2/16, IH = 2/16
    // Exterior bottom
    addQF([[0,0,0],[1,0,0],[1,0,1],[0,0,1]],    0,-1, 0, botUV,  UV_BOT)
    // Exterior back wall (–Z, north)
    addQF([[1,0,0],[0,0,0],[0,TH,0],[1,TH,0]],   0, 0,-1, sideUV, UV_N)
    // Exterior left wall (–X, west)
    addQF([[0,0,0],[0,0,1],[0,TH,1],[0,TH,0]],  -1, 0, 0, sideUV, UV_W)
    // Exterior right wall (+X, east)
    addQF([[1,0,1],[1,0,0],[1,TH,0],[1,TH,1]],   1, 0, 0, sideUV, UV_E)
    // Top rim — back
    addQF([[0,TH,0],[1,TH,0],[1,TH,WT],[0,TH,WT]],           0, 1, 0, topUV, UV_TOP)
    // Top rim — left
    addQF([[0,TH,WT],[WT,TH,WT],[WT,TH,1],[0,TH,1]],          0, 1, 0, topUV, UV_TOP)
    // Top rim — right
    addQF([[1-WT,TH,WT],[1,TH,WT],[1,TH,1],[1-WT,TH,1]],      0, 1, 0, topUV, UV_TOP)
    // Interior back wall (visible from open front)
    addQF([[WT,IH,WT],[1-WT,IH,WT],[1-WT,TH,WT],[WT,TH,WT]],  0, 0, 1, topUV, UV_S)
    // Interior left wall
    addQF([[WT,IH,1],[WT,IH,WT],[WT,TH,WT],[WT,TH,1]],         1, 0, 0, topUV, UV_E)
    // Interior right wall
    addQF([[1-WT,IH,WT],[1-WT,IH,1],[1-WT,TH,1],[1-WT,TH,WT]],-1, 0, 0, topUV, UV_W)
    // Interior floor
    addQF([[WT,IH,WT],[1-WT,IH,WT],[1-WT,IH,1],[WT,IH,1]],     0, 1, 0, topUV, UV_TOP)

  } else if (shape === 'toilet') {
    // Porcelain toilet — tank at back, bowl body, lid.
    // facing=0: tank at -Z (north/back), bowl opens toward +Z (south/front).
    const BH   = 9/16, TKH = 14/16, TKD = 6/16
    const TKX0 = 2/16,  TKX1 = 14/16
    const BX0  = 1/16,  BX1  = 15/16, BZ1 = 14/16
    const LH   = 10/16
    const LX0  = 2/16,  LX1  = 14/16
    const LZ0  = 7/16,  LZ1  = 13/16
    // Bowl body
    addQF([[BX0,0,0],[BX1,0,0],[BX1,0,BZ1],[BX0,0,BZ1]],         0,-1,0, botUV,  UV_BOT)
    addQF([[BX0,0,BZ1],[BX1,0,BZ1],[BX1,BH,BZ1],[BX0,BH,BZ1]],  0, 0,1, sideUV, UV_S)
    addQF([[BX0,0,0],[BX0,0,BZ1],[BX0,BH,BZ1],[BX0,BH,0]],      -1,0,0, sideUV, UV_W)
    addQF([[BX1,0,BZ1],[BX1,0,0],[BX1,BH,0],[BX1,BH,BZ1]],       1,0,0, sideUV, UV_E)
    addQF([[BX0,BH,0],[BX0,BH,BZ1],[BX1,BH,BZ1],[BX1,BH,0]],     0, 1,0, topUV,  UV_TOP)
    // Tank (sits on bowl back, runs full height)
    addQF([[TKX1,0,0],[TKX0,0,0],[TKX0,TKH,0],[TKX1,TKH,0]],             0, 0,-1, sideUV, UV_N)
    addQF([[TKX0,BH,TKD],[TKX0,TKH,TKD],[TKX1,TKH,TKD],[TKX1,BH,TKD]], 0, 0, 1, sideUV, UV_S)
    addQF([[TKX0,0,0],[TKX0,0,TKD],[TKX0,TKH,TKD],[TKX0,TKH,0]],        -1,0,0, sideUV, UV_W)
    addQF([[TKX1,0,TKD],[TKX1,0,0],[TKX1,TKH,0],[TKX1,TKH,TKD]],         1,0,0, sideUV, UV_E)
    addQF([[TKX0,TKH,0],[TKX0,TKH,TKD],[TKX1,TKH,TKD],[TKX1,TKH,0]],    0, 1,0, topUV,  UV_TOP)
    // Lid (thin slab slightly above bowl seat)
    addQF([[LX0,LH,LZ0],[LX0,LH,LZ1],[LX1,LH,LZ1],[LX1,LH,LZ0]],        0, 1,0, topUV,  UV_TOP)
    addQF([[LX0,BH,LZ1],[LX1,BH,LZ1],[LX1,LH,LZ1],[LX0,LH,LZ1]],        0, 0,1, sideUV, UV_S)
    addQF([[LX0,BH,LZ1],[LX0,LH,LZ1],[LX0,LH,LZ0],[LX0,BH,LZ0]],       -1,0,0, sideUV, UV_W)
    addQF([[LX1,BH,LZ0],[LX1,LH,LZ0],[LX1,LH,LZ1],[LX1,BH,LZ1]],        1,0,0, sideUV, UV_E)

  } else if (shape === 'sofa_l') {
    // Left arm of 2-wide sofa. Right side open (companion sofa_r goes there).
    const SH = 0.5, BH = 1.0, BR = 3/16, AR = 3/16, AH = 0.75
    const topUVR = TOP_UV_BY_FACING[facing]
    addQF([[0,SH,0],[0,SH,1],[1,SH,1],[1,SH,0]],     0, 1,0, topUV,  topUVR)
    addQF([[1,0,0],[0,0,0],[0,SH,0],[1,SH,0]],        0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,SH,1],[0,SH,1]],        0, 0,1, sideUV, UV_S)
    addQF([[0,0,0],[0,0,1],[0,SH,1],[0,SH,0]],       -1, 0,0, sideUV, UV_W)
    // Backrest (no right side — companion meets here)
    addQF([[0,SH,BR],[1,SH,BR],[1,BH,BR],[0,BH,BR]], 0, 0,1, sideUV, UV_S)
    addQF([[1,SH,0],[0,SH,0],[0,BH,0],[1,BH,0]],     0, 0,-1, sideUV, UV_N)
    addQF([[0,BH,0],[0,BH,BR],[1,BH,BR],[1,BH,0]],   0, 1,0, topUV,  UV_TOP)
    addQF([[0,SH,0],[0,SH,BR],[0,BH,BR],[0,BH,0]],  -1, 0,0, sideUV, UV_W)
    // Left arm
    const x1L = AR
    addQF([[0,SH,AR],[x1L,SH,AR],[x1L,AH,AR],[0,AH,AR]],       0, 0,1, sideUV, UV_S)
    addQF([[x1L,SH,1],[0,SH,1],[0,AH,1],[x1L,AH,1]],           0, 0,-1, sideUV, UV_N)
    addQF([[0,AH,AR],[0,AH,1],[x1L,AH,1],[x1L,AH,AR]],         0, 1,0, topUV,  UV_TOP)
    addQF([[x1L,SH,AR],[x1L,SH,1],[x1L,AH,1],[x1L,AH,AR]],    1, 0,0, sideUV, UV_E)

  } else if (shape === 'sofa_r') {
    // Right arm of 2-wide sofa. Left side open (companion sofa_l goes there).
    const SH = 0.5, BH = 1.0, BR = 3/16, AR = 3/16, AH = 0.75
    const topUVR = TOP_UV_BY_FACING[facing]
    addQF([[0,SH,0],[0,SH,1],[1,SH,1],[1,SH,0]],     0, 1,0, topUV,  topUVR)
    addQF([[1,0,0],[0,0,0],[0,SH,0],[1,SH,0]],        0, 0,-1, sideUV, UV_N)
    addQF([[0,0,1],[1,0,1],[1,SH,1],[0,SH,1]],        0, 0,1, sideUV, UV_S)
    addQF([[1,0,1],[1,0,0],[1,SH,0],[1,SH,1]],        1, 0,0, sideUV, UV_E)
    // Backrest (no left side — companion meets here)
    addQF([[0,SH,BR],[1,SH,BR],[1,BH,BR],[0,BH,BR]], 0, 0,1, sideUV, UV_S)
    addQF([[1,SH,0],[0,SH,0],[0,BH,0],[1,BH,0]],     0, 0,-1, sideUV, UV_N)
    addQF([[0,BH,0],[0,BH,BR],[1,BH,BR],[1,BH,0]],   0, 1,0, topUV,  UV_TOP)
    addQF([[1,SH,BR],[1,SH,0],[1,BH,0],[1,BH,BR]],   1, 0,0, sideUV, UV_E)
    // Right arm
    const x0R = 1-AR
    addQF([[x0R,SH,AR],[1,SH,AR],[1,AH,AR],[x0R,AH,AR]],       0, 0,1, sideUV, UV_S)
    addQF([[1,SH,1],[x0R,SH,1],[x0R,AH,1],[1,AH,1]],           0, 0,-1, sideUV, UV_N)
    addQF([[x0R,AH,AR],[x0R,AH,1],[1,AH,1],[1,AH,AR]],         0, 1,0, topUV,  UV_TOP)
    addQF([[x0R,SH,1],[x0R,SH,AR],[x0R,AH,AR],[x0R,AH,1]],   -1, 0,0, sideUV, UV_W)

  } else if (shape === 'invisible') {
    // Solid placeholder with no geometry (used by multi-block part blocks)

  } else if (shape === 'tub2') {
    // 2×2 bathtub. Main block is the NW corner; companions fill NE/SW/SE.
    // Mesh spans [0..2, 0..TH, 0..2]; slot 3 (frontUV) = tubWater for water surface.
    const TH = 10/16, WT = 3/16, IH = 3/16, WL = 5/16
    const waterUV = frontUV

    // Rotation around centre (1,1) instead of (0.5,0.5) for 2×2 mesh
    const RV2 = [
      (x, z) => [x,   z  ],
      (x, z) => [2-z, x  ],
      (x, z) => [2-x, 2-z],
      (x, z) => [z,   2-x],
    ]
    const rv2 = RV2[facing]
    const rn2 = NORM_ROT[facing]

    const addTF = (verts, nx, ny, nz, uvRect, uvCoords) => {
      if (!uvRect) return
      const base = pos.length / 3
      let rnx = nx, rnz = nz
      if (ny === 0) { [rnx, rnz] = rn2(nx, nz) }
      for (const [vx, vy, vz] of verts) {
        const [rx, rz] = rv2(vx, vz)
        pos.push(lx + rx, y + vy, lz + rz)
        norm.push(rnx, ny, rnz)
        col.push(1, 1, 1)
        wav.push(0)
      }
      const { u0, v0, u1, v1 } = uvRect
      for (const [fu, fv] of uvCoords) {
        uv.push(fu === 0 ? u0 : u1, fv === 0 ? v0 : v1)
      }
      idx.push(base, base+1, base+2, base, base+2, base+3)
    }

    // Exterior bottom
    addTF([[0,0,0],[2,0,0],[2,0,2],[0,0,2]],                       0,-1,0, botUV,  UV_BOT)
    // Exterior back wall (Z=0)
    addTF([[2,0,0],[0,0,0],[0,TH,0],[2,TH,0]],                     0, 0,-1, sideUV, UV_N)
    // Exterior left wall (X=0)
    addTF([[0,0,0],[0,0,2],[0,TH,2],[0,TH,0]],                    -1, 0, 0, sideUV, UV_W)
    // Exterior right wall (X=2)
    addTF([[2,0,2],[2,0,0],[2,TH,0],[2,TH,2]],                     1, 0, 0, sideUV, UV_E)
    // Top rim — back
    addTF([[0,TH,0],[2,TH,0],[2,TH,WT],[0,TH,WT]],                 0, 1, 0, topUV,  UV_TOP)
    // Top rim — left
    addTF([[0,TH,WT],[WT,TH,WT],[WT,TH,2],[0,TH,2]],               0, 1, 0, topUV,  UV_TOP)
    // Top rim — right
    addTF([[2-WT,TH,WT],[2,TH,WT],[2,TH,2],[2-WT,TH,2]],          0, 1, 0, topUV,  UV_TOP)
    // Exterior front wall (Z=2)
    addTF([[0,0,2],[2,0,2],[2,TH,2],[0,TH,2]],                           0, 0, 1, sideUV, UV_S)
    // Top rim — front inner strip (corners covered by left/right rims)
    addTF([[WT,TH,2-WT],[2-WT,TH,2-WT],[2-WT,TH,2],[WT,TH,2]],          0, 1, 0, topUV,  UV_TOP)
    // Interior back wall (faces +Z toward front)
    addTF([[WT,IH,WT],[2-WT,IH,WT],[2-WT,TH,WT],[WT,TH,WT]],            0, 0, 1, sideUV, UV_S)
    // Interior front wall (faces -Z toward back, visible from inside)
    addTF([[2-WT,IH,2-WT],[WT,IH,2-WT],[WT,TH,2-WT],[2-WT,TH,2-WT]],   0, 0,-1, sideUV, UV_N)
    // Interior left wall (faces +X toward centre)
    addTF([[WT,IH,2-WT],[WT,IH,WT],[WT,TH,WT],[WT,TH,2-WT]],            1, 0, 0, sideUV, UV_E)
    // Interior right wall (faces -X toward centre)
    addTF([[2-WT,IH,WT],[2-WT,IH,2-WT],[2-WT,TH,2-WT],[2-WT,TH,WT]],  -1, 0, 0, sideUV, UV_W)
    // Interior floor
    addTF([[WT,IH,WT],[2-WT,IH,WT],[2-WT,IH,2-WT],[WT,IH,2-WT]],       0, 1, 0, topUV,  UV_TOP)
    // Water surface
    addTF([[WT,WL,WT],[2-WT,WL,WT],[2-WT,WL,2-WT],[WT,WL,2-WT]],       0, 1, 0, waterUV, UV_TOP)
  }
}
