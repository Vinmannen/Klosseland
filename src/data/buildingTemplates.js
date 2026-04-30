// ─────────────────────────────────────────────────────────────
//  Klosseland — Building Templates (Phase 24)
//  Pre-made structures that can be stamped into the world.
//  blocks: array of [localX, localY, localZ, blockId]
//  origin: [ox, oy, oz] — anchor cell within the template
//          placed at the cursor click position
// ─────────────────────────────────────────────────────────────

// Block IDs (matching blockDefinitions.js)
const OAK_PLANKS   = 12
const OAK_LOG      = 11
const STONE        = 3
const COBBLE       = 120
const STONE_BRICKS = 133
const BRICKS       = 122
const GLASS        = 175
const WATER        = 10
const GLOWSTONE    = 151

// ── Build helpers ─────────────────────────────────────────────

function fill(x0, y0, z0, x1, y1, z1, id, out) {
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        out.push([x, y, z, id])
}

// Outer perimeter ring of a W×D box at given y
function ring(x0, y0, z0, w, d, id, out) {
  for (let x = x0; x < x0 + w; x++) {
    out.push([x, y0, z0,         id])
    out.push([x, y0, z0 + d - 1, id])
  }
  for (let z = z0 + 1; z < z0 + d - 1; z++) {
    out.push([x0,         y0, z, id])
    out.push([x0 + w - 1, y0, z, id])
  }
}

// ── Template builders ─────────────────────────────────────────

function buildCottage() {
  const out = []

  // Floor y=0
  fill(0, 0, 0, 6, 0, 6, OAK_PLANKS, out)

  // Walls y=1 — front gap for door at x=3,z=0
  for (let x = 0; x <= 6; x++) {
    if (x !== 3) out.push([x, 1, 0, OAK_PLANKS])  // front wall minus door
    out.push([x, 1, 6, OAK_PLANKS])                // back wall
  }
  for (let z = 1; z <= 5; z++) {
    out.push([0, 1, z, OAK_PLANKS])
    out.push([6, 1, z, OAK_PLANKS])
  }

  // Walls y=2 — door gap + side windows
  for (let x = 0; x <= 6; x++) {
    if (x === 3) continue                           // door gap
    const id = (x === 1 || x === 5) ? GLASS : OAK_PLANKS
    out.push([x, 2, 0, id])                         // front wall
    out.push([x, 2, 6, OAK_PLANKS])                // back wall
  }
  for (let z = 1; z <= 5; z++) {
    out.push([0, 2, z, OAK_PLANKS])
    out.push([6, 2, z, OAK_PLANKS])
  }

  // Walls y=3 — full outer ring
  for (let x = 0; x <= 6; x++) {
    out.push([x, 3, 0, OAK_PLANKS])
    out.push([x, 3, 6, OAK_PLANKS])
  }
  for (let z = 1; z <= 5; z++) {
    out.push([0, 3, z, OAK_PLANKS])
    out.push([6, 3, z, OAK_PLANKS])
  }

  // Roof y=4 — oak log for visual contrast
  fill(0, 4, 0, 6, 4, 6, OAK_LOG, out)

  return out
}

function buildCastleTower() {
  const out = []

  // Floor y=0
  fill(0, 0, 0, 4, 0, 4, STONE_BRICKS, out)

  // Walls y=1..10 — hollow 5×5 ring
  for (let y = 1; y <= 10; y++) {
    // Front z=0 (door gap at x=2 on y=1,2)
    for (let x = 0; x <= 4; x++) {
      if (y <= 2 && x === 2) continue  // door opening
      out.push([x, y, 0, STONE_BRICKS])
    }
    // Back z=4
    for (let x = 0; x <= 4; x++) out.push([x, y, 4, STONE_BRICKS])
    // Left x=0, interior z=1..3
    for (let z = 1; z <= 3; z++) out.push([0, y, z, STONE_BRICKS])
    // Right x=4, interior z=1..3
    for (let z = 1; z <= 3; z++) out.push([4, y, z, STONE_BRICKS])
  }

  // Crenellations y=11 — alternating battlements (8 of 16 perimeter slots)
  const merlons = [
    [0, 11, 0], [2, 11, 0], [4, 11, 0],  // front
    [4, 11, 2],                            // right mid
    [4, 11, 4], [2, 11, 4], [0, 11, 4],  // back
    [0, 11, 2],                            // left mid
  ]
  for (const [x, y, z] of merlons) out.push([x, y, z, COBBLE])

  return out
}

function buildGardenArch() {
  const out = []

  // Base y=0
  for (let x = 0; x <= 4; x++) out.push([x, 0, 0, BRICKS])
  // Pillars y=1,2
  out.push([0, 1, 0, BRICKS], [4, 1, 0, BRICKS])
  out.push([0, 2, 0, BRICKS], [4, 2, 0, BRICKS])
  // Arch top y=3
  for (let x = 0; x <= 4; x++) out.push([x, 3, 0, BRICKS])

  return out
}

function buildFountain() {
  const out = []

  // Floor y=0
  fill(0, 0, 0, 4, 0, 4, COBBLE, out)

  // Basin walls y=1 — outer ring of stone_bricks
  ring(0, 1, 0, 5, 5, STONE_BRICKS, out)

  // Water y=1 — inner 3×3
  fill(1, 1, 1, 3, 1, 3, WATER, out)

  // Corner pillars y=2
  out.push([0, 2, 0, COBBLE], [4, 2, 0, COBBLE])
  out.push([0, 2, 4, COBBLE], [4, 2, 4, COBBLE])

  return out
}

function buildTreehouse() {
  const out = []

  // Trunk — single oak log column at center x=2,z=2, y=0..4
  for (let y = 0; y <= 4; y++) out.push([2, y, 2, OAK_LOG])

  // Platform floor y=5
  fill(0, 5, 0, 4, 5, 4, OAK_PLANKS, out)

  // Cabin walls y=6,7 — outer ring of 5×5 with door gap at x=2,z=0
  for (let y = 6; y <= 7; y++) {
    // Front wall (z=0) minus door at x=2
    for (let x = 0; x <= 4; x++) {
      if (x !== 2) out.push([x, y, 0, OAK_PLANKS])
    }
    // Back wall (z=4)
    for (let x = 0; x <= 4; x++) out.push([x, y, 4, OAK_PLANKS])
    // Left wall (x=0), interior z=1..3
    for (let z = 1; z <= 3; z++) out.push([0, y, z, OAK_PLANKS])
    // Right wall (x=4), interior z=1..3
    for (let z = 1; z <= 3; z++) out.push([4, y, z, OAK_PLANKS])
  }

  // Roof y=8
  fill(0, 8, 0, 4, 8, 4, OAK_LOG, out)

  return out
}

function buildLighthouse() {
  const out = []

  // Base y=0
  fill(0, 0, 0, 2, 0, 2, COBBLE, out)

  // Tower y=1..11 — alternating hollow 3×3 ring
  for (let y = 1; y <= 11; y++) {
    const id = y % 2 === 0 ? STONE_BRICKS : COBBLE
    // Front z=0
    for (let x = 0; x <= 2; x++) out.push([x, y, 0, id])
    // Back z=2
    for (let x = 0; x <= 2; x++) out.push([x, y, 2, id])
    // Left x=0, interior z=1
    out.push([0, y, 1, id])
    // Right x=2, interior z=1
    out.push([2, y, 1, id])
  }

  // Observation deck y=12
  fill(0, 12, 0, 2, 12, 2, STONE_BRICKS, out)

  // Lantern y=13
  out.push([1, 13, 1, GLOWSTONE])

  return out
}

// ── Exported template list ────────────────────────────────────

export const TEMPLATES = [
  {
    key:       'cottage',
    nameEn:    'Cottage',
    nameNo:    'Hytte',
    iconStyle: 'oakPlanks',
    size:      [7, 5, 7],
    origin:    [3, 0, 3],
    blocks:    buildCottage(),
  },
  {
    key:       'castle_tower',
    nameEn:    'Castle Tower',
    nameNo:    'Slottstårn',
    iconStyle: 'stoneBricks',
    size:      [5, 12, 5],
    origin:    [2, 0, 2],
    blocks:    buildCastleTower(),
  },
  {
    key:       'garden_arch',
    nameEn:    'Garden Arch',
    nameNo:    'Hagebuе',
    iconStyle: 'bricks',
    size:      [5, 4, 1],
    origin:    [2, 0, 0],
    blocks:    buildGardenArch(),
  },
  {
    key:       'fountain',
    nameEn:    'Fountain',
    nameNo:    'Fontene',
    iconStyle: 'cobblestone',
    size:      [5, 3, 5],
    origin:    [2, 0, 2],
    blocks:    buildFountain(),
  },
  {
    key:       'treehouse',
    nameEn:    'Treehouse',
    nameNo:    'Trehytte',
    iconStyle: 'oakLogTop',
    size:      [5, 9, 5],
    origin:    [2, 0, 2],
    blocks:    buildTreehouse(),
  },
  {
    key:       'lighthouse',
    nameEn:    'Lighthouse',
    nameNo:    'Fyrtårn',
    iconStyle: 'cobblestone',
    size:      [3, 14, 3],
    origin:    [1, 0, 1],
    blocks:    buildLighthouse(),
  },
]
