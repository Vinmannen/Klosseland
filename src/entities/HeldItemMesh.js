// ─────────────────────────────────────────────────────────────
//  Klosseland — HeldItemMesh
//  Renders a miniature block in the player's hands using the
//  real atlas texture — same UV convention as the world renderer.
//
//  Two-handed items (blocks, furniture) attach to a pivot on the
//  torso and show as a 0.22-unit cube in front of the chest.
//  One-handed items (plants, food, non-solid) attach to a pivot
//  at the right hand tip and show as a smaller 0.17-unit cube.
//
//  AnimationSystem reads .itemType to drive the matching arm pose.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

// Categories rendered one-handed (small / light items)
const ONE_HANDED_CATS = new Set(['plants', 'food'])

function classifyItem(blockDef) {
  if (!blockDef) return null
  if (blockDef.solid === false)               return 'one'
  if (ONE_HANDED_CATS.has(blockDef.category)) return 'one'
  return 'two'
}

// ─────────────────────────────────────────────────────────────
//  Build a box BufferGeometry with per-face atlas UVs.
//
//  faceUVs order (matches atlas.blockFaceUVs):
//    [0] top (+Y)   [1] bottom (-Y)
//    [2] north (-Z) [3] south (+Z)
//    [4] east (+X)  [5] west (-X)
//
//  Atlas uses flipY=false: v0 is top of tile, v1 is bottom.
//  For each face: top vertices → v0, bottom vertices → v1.
// ─────────────────────────────────────────────────────────────
function _buildAtlasBox(size, faceUVs) {
  const h = size / 2

  // Vertices are ordered CCW when viewed from outside (verified via cross product).
  // UV flags: [u,v] where 0→(u0/v0) and 1→(u1/v1).
  // Atlas uses flipY=false: v0=top of tile, v1=bottom.
  // Side faces: bottom vertices (y=-h) → v1, top vertices (y=h) → v0.
  const faces = [
    // 0: TOP (+Y)   cross: (v1-v0)×(v2-v0) = (2h,0,0)×(2h,0,-2h) = (0,4h²,0) ✓
    { n:[0,1,0],   v:[[-h,h,h],[h,h,h],[h,h,-h],[-h,h,-h]],     uv:[[0,0],[1,0],[1,1],[0,1]] },
    // 1: BOTTOM (-Y) cross: (2h,0,0)×(2h,0,2h) = (0,-4h²,0) ✓
    { n:[0,-1,0],  v:[[-h,-h,-h],[h,-h,-h],[h,-h,h],[-h,-h,h]],  uv:[[0,0],[1,0],[1,1],[0,1]] },
    // 2: NORTH (-Z)  cross: (-2h,0,0)×(-2h,2h,0) = (0,0,-4h²) ✓
    { n:[0,0,-1],  v:[[h,-h,-h],[-h,-h,-h],[-h,h,-h],[h,h,-h]],  uv:[[0,1],[1,1],[1,0],[0,0]] },
    // 3: SOUTH (+Z)  cross: (2h,0,0)×(2h,2h,0) = (0,0,4h²) ✓
    { n:[0,0,1],   v:[[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]],      uv:[[0,1],[1,1],[1,0],[0,0]] },
    // 4: EAST (+X)   cross: (0,0,-2h)×(0,2h,-2h) = (4h²,0,0) ✓
    { n:[1,0,0],   v:[[h,-h,h],[h,-h,-h],[h,h,-h],[h,h,h]],      uv:[[0,1],[1,1],[1,0],[0,0]] },
    // 5: WEST (-X)   cross: (0,0,2h)×(0,2h,2h) = (-4h²,0,0) ✓
    { n:[-1,0,0],  v:[[-h,-h,-h],[-h,-h,h],[-h,h,h],[-h,h,-h]], uv:[[0,1],[1,1],[1,0],[0,0]] },
  ]

  const pos = [], nrm = [], uvs = [], idx = []

  for (let fi = 0; fi < 6; fi++) {
    const { n, v, uv } = faces[fi]
    const { u0, v0, u1, v1 } = faceUVs[fi]
    const base = pos.length / 3
    for (let vi = 0; vi < 4; vi++) {
      pos.push(v[vi][0], v[vi][1], v[vi][2])
      nrm.push(n[0], n[1], n[2])
      uvs.push(uv[vi][0] === 0 ? u0 : u1, uv[vi][1] === 0 ? v0 : v1)
    }
    idx.push(base, base+1, base+2, base, base+2, base+3)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  return geo
}

// ─────────────────────────────────────────────────────────────

export class HeldItemMesh {
  /**
   * @param {import('./PlayerMesh.js').PlayerMesh} playerMesh
   * @param {import('../engine/TextureAtlas.js').TextureAtlas} atlas
   */
  constructor(playerMesh, atlas) {
    this._playerMesh = playerMesh
    this._atlas      = atlas
    this._mesh       = null
    this._currentId  = -1
    this._itemType   = null
    this._prevType   = null   // last non-null type (used for blend-out)

    // ── Two-handed pivot (child of torso) ─────────────────────
    // torso is centered at world y≈0.63; +z is forward.
    // This pivot sits slightly above mid-chest, 26 cm in front.
    this._twoPivot = new THREE.Group()
    this._twoPivot.position.set(0, 0.08, 0.26)
    playerMesh.torso.add(this._twoPivot)

    // ── One-handed pivot (child of armR) ──────────────────────
    // handR is at y=-0.330 within armR; place the pivot 5 cm
    // lower and 10 cm forward so the item sits at the hand tip.
    this._onePivot = new THREE.Group()
    this._onePivot.position.set(0, -0.38, 0.10)
    this._onePivot.rotation.x = 0.28   // item tilts forward naturally
    playerMesh.armR.add(this._onePivot)
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Update the held item.  Pass blockId=0 / blockDef=null to clear.
   * Only rebuilds the mesh when blockId changes.
   */
  setItem(blockId, blockDef) {
    if (blockId === this._currentId) return
    this._currentId = blockId

    this._clearMesh()

    if (!blockDef || blockId === 0) {
      this._itemType = null
      return
    }

    this._itemType = classifyItem(blockDef)
    this._prevType = this._itemType

    const size     = this._itemType === 'two' ? 0.22 : 0.17
    const faceUVs  = this._atlas.blockFaceUVs(blockDef)
    const geo      = faceUVs
      ? _buildAtlasBox(size, faceUVs)
      : new THREE.BoxGeometry(size, size, size)
    const mat      = new THREE.MeshLambertMaterial({
      map: faceUVs ? this._atlas.texture : null,
    })

    this._mesh = new THREE.Mesh(geo, mat)
    this._mesh.castShadow    = false
    this._mesh.frustumCulled = false

    if (this._itemType === 'two') {
      this._twoPivot.add(this._mesh)
    } else {
      this._onePivot.add(this._mesh)
    }
  }

  /** 'one' | 'two' | null — read by AnimationSystem. */
  get itemType() { return this._itemType }

  /** Last non-null type — used by AnimationSystem for blend-out. */
  get prevItemType() { return this._prevType }

  dispose() {
    this._clearMesh()
    this._playerMesh.torso.remove(this._twoPivot)
    this._playerMesh.armR.remove(this._onePivot)
  }

  // ── Private ──────────────────────────────────────────────────

  _clearMesh() {
    if (this._mesh) {
      this._mesh.parent?.remove(this._mesh)
      this._mesh.geometry.dispose()
      this._mesh.material.dispose()
      this._mesh = null
    }
    this._itemType = null
  }
}
