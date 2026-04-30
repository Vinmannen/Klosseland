// ─────────────────────────────────────────────────────────────
//  Klosseland — Ghost Helper (Phase 24)
//  Shared per-block wireframe ghost for the stamp tool.
//  Creates a merged THREE.LineSegments with one box outline
//  per block in the template.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

const GHOST_COLOR = 0xFFD04A  // yellow — matches CopyPasteTool selection

// 12 edges of a unit cube, each as a pair of [x,y,z] offsets
const CUBE_EDGES = [
  // bottom face
  [[0,0,0],[1,0,0]], [[1,0,0],[1,0,1]], [[1,0,1],[0,0,1]], [[0,0,1],[0,0,0]],
  // top face
  [[0,1,0],[1,1,0]], [[1,1,0],[1,1,1]], [[1,1,1],[0,1,1]], [[0,1,1],[0,1,0]],
  // vertical edges
  [[0,0,0],[0,1,0]], [[1,0,0],[1,1,0]], [[1,0,1],[1,1,1]], [[0,0,1],[0,1,1]],
]

/**
 * Build a merged LineSegments ghost mesh from a template's block list.
 * @param {THREE.Scene} scene
 * @param {Array<[number,number,number,number]>} blocks  [lx,ly,lz,id] array
 * @returns {THREE.LineSegments}
 */
export function buildGhostMesh(scene, blocks) {
  const positions = []

  for (const [dx, dy, dz] of blocks.map(b => [b[0], b[1], b[2]])) {
    for (const [[x0,y0,z0],[x1,y1,z1]] of CUBE_EDGES) {
      positions.push(
        dx + x0, dy + y0, dz + z0,
        dx + x1, dy + y1, dz + z1,
      )
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  const mat = new THREE.LineBasicMaterial({
    color:       GHOST_COLOR,
    transparent: true,
    opacity:     0.65,
    depthTest:   false,
  })

  const mesh = new THREE.LineSegments(geo, mat)
  mesh.renderOrder = 1
  mesh.visible     = false
  scene.add(mesh)
  return mesh
}

/**
 * Move the ghost mesh so that its local origin aligns with (wx, wy, wz)
 * minus the template's anchor offset.
 */
export function updateGhostPosition(mesh, wx, wy, wz, origin) {
  if (!mesh) return
  mesh.position.set(
    wx - origin[0],
    wy - origin[1],
    wz - origin[2],
  )
}

/**
 * Remove a ghost mesh from the scene and free its GPU resources.
 */
export function disposeGhostMesh(scene, mesh) {
  if (!mesh) return
  scene.remove(mesh)
  mesh.geometry.dispose()
  mesh.material.dispose()
}
