// ─────────────────────────────────────────────────────────────
//  Klosseland — BlockRaycaster
//  DDA (Amanatides & Woo) voxel traversal.
//  Returns the first solid block hit and the face normal so the
//  caller can compute the placement position.
// ─────────────────────────────────────────────────────────────

/**
 * Cast a ray through the voxel grid.
 *
 * @param {number} ox  Ray origin X
 * @param {number} oy  Ray origin Y
 * @param {number} oz  Ray origin Z
 * @param {number} dx  Normalised direction X
 * @param {number} dy  Normalised direction Y
 * @param {number} dz  Normalised direction Z
 * @param {number} maxDist  Maximum reach in blocks
 * @param {import('../world/World.js').World} world
 * @returns {{ hit: false } | { hit: true, bx: number, by: number, bz: number,
 *            nx: number, ny: number, nz: number,
 *            hx: number, hy: number, hz: number }}
 */
export function castRay(ox, oy, oz, dx, dy, dz, maxDist, world, extraHitTest = null) {
  let bx = Math.floor(ox)
  let by = Math.floor(oy)
  let bz = Math.floor(oz)

  const stepX = dx >= 0 ? 1 : -1
  const stepY = dy >= 0 ? 1 : -1
  const stepZ = dz >= 0 ? 1 : -1

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : 1e30
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : 1e30
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : 1e30

  // Distance along the ray to the first axis-aligned boundary
  let tMaxX = dx !== 0 ? (stepX > 0 ? (bx + 1 - ox) : (ox - bx)) / Math.abs(dx) : 1e30
  let tMaxY = dy !== 0 ? (stepY > 0 ? (by + 1 - oy) : (oy - by)) / Math.abs(dy) : 1e30
  let tMaxZ = dz !== 0 ? (stepZ > 0 ? (bz + 1 - oz) : (oz - bz)) / Math.abs(dz) : 1e30

  // Face normal of the last crossed boundary (opposite to step direction)
  let nx = 0, ny = 0, nz = 0
  // t at which we entered the current voxel (0 for the origin voxel)
  let tEntry = 0

  for (let i = 0; i < 128; i++) {
    if (world.isSolid(bx, by, bz) || extraHitTest?.(bx, by, bz)) {
      return {
        hit: true, bx, by, bz, nx, ny, nz,
        hx: ox + dx * tEntry,
        hy: oy + dy * tEntry,
        hz: oz + dz * tEntry,
      }
    }

    // Advance along the axis whose boundary is closest
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      if (tMaxX > maxDist) break
      tEntry = tMaxX
      tMaxX += tDeltaX
      bx += stepX
      nx = -stepX; ny = 0; nz = 0
    } else if (tMaxY < tMaxZ) {
      if (tMaxY > maxDist) break
      tEntry = tMaxY
      tMaxY += tDeltaY
      by += stepY
      nx = 0; ny = -stepY; nz = 0
    } else {
      if (tMaxZ > maxDist) break
      tEntry = tMaxZ
      tMaxZ += tDeltaZ
      bz += stepZ
      nx = 0; ny = 0; nz = -stepZ
    }
  }

  return { hit: false }
}
