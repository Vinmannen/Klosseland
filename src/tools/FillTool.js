// ─────────────────────────────────────────────────────────────
//  Klosseland — FillTool
//  Flood-fill: replace all connected same-type blocks within a
//  sphere radius with the selected block type.
//
//  Keybinding (wired in main.js):
//    Hold F + LMB → fill from targeted block
//
//  Caps at 4096 block changes to prevent accidental huge fills.
// ─────────────────────────────────────────────────────────────

const MAX_BLOCKS = 4096

export class FillTool {
  /**
   * Flood-fill from (cx, cy, cz).
   * Replaces all blocks matching the target type (the block at the
   * origin) within `radius` blocks (Euclidean sphere) with `fillId`.
   *
   * @param {import('../world/World.js').World} world
   * @param {number} cx  Origin X (integer)
   * @param {number} cy  Origin Y (integer)
   * @param {number} cz  Origin Z (integer)
   * @param {number} fillId  Block ID to place
   * @param {number} [radius=5]  Max fill radius (capped at 10)
   * @returns {Array<[number,number,number]>}  List of changed positions
   */
  fill(world, cx, cy, cz, fillId, radius = 5) {
    radius = Math.min(radius, 10)
    const targetId = world.getBlock(cx, cy, cz)

    // Nothing to fill: origin is air or same as fill
    if (!targetId || targetId === fillId) return []

    const r2      = radius * radius
    const seen    = new Set()
    const queue   = [cx, cy, cz]   // flat triplet stack (faster than object array)
    const changed = []

    // Compact integer key — works for coordinates in [-512, 511] range
    const key = (x, y, z) =>
      ((x + 512) & 0x3FF) | (((y + 512) & 0x3FF) << 10) | (((z + 512) & 0x3FF) << 20)

    seen.add(key(cx, cy, cz))

    while (queue.length > 0 && changed.length < MAX_BLOCKS) {
      // Pop from end (stack — depth-first keeps fill connected)
      const z = queue.pop()
      const y = queue.pop()
      const x = queue.pop()

      const dx = x - cx, dy = y - cy, dz = z - cz
      if (dx * dx + dy * dy + dz * dz > r2) continue
      if (world.getBlock(x, y, z) !== targetId) continue

      world.setBlock(x, y, z, fillId)
      changed.push([x, y, z])

      const nb = [
        x + 1, y, z,
        x - 1, y, z,
        x, y + 1, z,
        x, y - 1, z,
        x, y, z + 1,
        x, y, z - 1,
      ]
      for (let i = 0; i < nb.length; i += 3) {
        const nx = nb[i], ny = nb[i + 1], nz = nb[i + 2]
        const k = key(nx, ny, nz)
        if (!seen.has(k)) { seen.add(k); queue.push(nx, ny, nz) }
      }
    }

    return changed
  }
}
