// ─────────────────────────────────────────────────────────────
//  Klosseland — Procedural 16×16 Pixel-Art Texture Generator
//
//  Style goals:
//    • Cleaner and flatter than Minecraft — 2-4 colours max per face
//    • Consistent cel-shaded look across all blocks
//    • No noise / dithering — clean geometric patterns only
//    • Bright, child-friendly palette
//
//  Each texture is drawn onto a 16×16 HTMLCanvasElement and
//  collected into an atlas by TextureAtlas.js.
// ─────────────────────────────────────────────────────────────
import { PALETTE, COLORS_16 } from '../data/blockDefinitions.js'

const S = 16   // pixels per block face

// ─── Canvas helper ───────────────────────────────────────────
function makeCanvas() {
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  return c
}

// Draw a solid rectangle (pixel coordinates)
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

// Draw a single pixel
function px(ctx, x, y, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, 1, 1)
}

// Fill entire face
function fill(ctx, color) { rect(ctx, 0, 0, S, S, color) }

// Lighten / darken a hex colour by an amount (-1..1)
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const clamp = v => Math.max(0, Math.min(255, v))
  const r = clamp(((n >> 16) & 0xff) + amount * 255)
  const g = clamp(((n >> 8)  & 0xff) + amount * 255)
  const b = clamp(( n        & 0xff) + amount * 255)
  return `rgb(${r|0},${g|0},${b|0})`
}

// Mix two hex colours at ratio t (0=a, 1=b)
function mix(a, b, t) {
  const na = parseInt(a.slice(1), 16)
  const nb = parseInt(b.slice(1), 16)
  const lerp = (ca, cb) => Math.round(ca + (cb - ca) * t)
  const r = lerp((na >> 16) & 0xff, (nb >> 16) & 0xff)
  const g = lerp((na >> 8)  & 0xff, (nb >> 8)  & 0xff)
  const bv= lerp( na        & 0xff,  nb        & 0xff)
  return `rgb(${r},${g},${bv})`
}

// ─── Shared pattern primitives ───────────────────────────────

/** Horizontal planks pattern (for wood plank faces). */
function drawPlanks(ctx, baseColor, darkColor, plankH = 4) {
  fill(ctx, baseColor)
  for (let y = 0; y < S; y += plankH) {
    // Bottom edge of each plank strip – darker line
    rect(ctx, 0, y + plankH - 1, S, 1, darkColor)
    // Vertical joint alternating per row
    const jx = (y / plankH % 2 === 0) ? 8 : 4
    rect(ctx, jx, y, 1, plankH - 1, darkColor)
  }
}

/** Vertical bark stripes (log side). */
function drawBarkSide(ctx, lightColor, darkColor) {
  fill(ctx, lightColor)
  // Alternate 2-pixel dark stripes
  for (let x = 0; x < S; x += 4) {
    rect(ctx, x + 2, 0, 2, S, darkColor)
  }
  // Subtle horizontal grain line every 5 px
  for (let y = 4; y < S; y += 5) {
    rect(ctx, 0, y, S, 1, shade(darkColor, -0.05))
  }
}

/** Concentric rings (log top). */
function drawLogTop(ctx, lightColor, darkColor) {
  fill(ctx, lightColor)
  // Concentric rectangles
  const rings = [
    { inset: 1, color: darkColor },
    { inset: 4, color: lightColor },
    { inset: 6, color: darkColor },
  ]
  for (const { inset, color } of rings) {
    const i = inset
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.strokeRect(i + 0.5, i + 0.5, S - i * 2 - 1, S - i * 2 - 1)
  }
  // Centre dot
  rect(ctx, 7, 7, 2, 2, darkColor)
}

/** Stone / brick style: flat fill + subtle crack marks. */
function drawStone(ctx, baseColor, crackColor) {
  fill(ctx, baseColor)
  // A few 1-pixel cracks
  const cracks = [[2,3,5,1],[9,1,3,1],[1,8,4,1],[10,10,5,1],[5,13,6,1]]
  for (const [x, y, w, h] of cracks) {
    rect(ctx, x, y, w, h, crackColor)
  }
}

/** Brick pattern. */
function drawBricks(ctx, brickColor, mortarColor) {
  fill(ctx, mortarColor)
  // Row 0: full width bricks (offset 0)
  // Row 1: offset by half (4px)
  for (let row = 0; row < 4; row++) {
    const y = row * 4 + 1
    const offset = (row % 2 === 0) ? 0 : 4
    for (let col = 0; col < 3; col++) {
      const x = col * 8 - offset + 1
      rect(ctx, x, y, 6, 2, brickColor)
    }
  }
}

/**
 * Leaves: pixel-art leaf clusters on a transparent background.
 * Transparent pixels let the alphaTest material punch holes through the block,
 * giving the Minecraft-style "see through the canopy" look.
 * ~46% pixel coverage — 3 shades (highlight / base / shadow) per cluster.
 */
function drawLeaves(ctx, baseColor) {
  const hi  = shade(baseColor, +0.22)
  const sha = shade(baseColor, -0.28)
  // 0=transparent  1=base  2=highlight  3=shadow
  // Each 4-row group is one horizontal band of leaf clusters.
  const PATTERN = [
    // band 0 — three clusters across the top
    0,0,2,1,1,0,0,2,1,1,0,0,0,2,1,0,
    0,2,1,1,1,0,2,1,1,1,0,0,2,1,1,0,
    0,1,1,1,3,0,1,1,1,3,0,0,1,1,3,0,
    0,0,1,1,0,0,0,1,1,0,0,0,0,1,0,0,
    // band 1 — two clusters, offset from band 0
    0,0,0,0,0,2,1,0,0,0,2,1,1,0,0,0,
    0,0,0,0,2,1,1,0,0,2,1,1,1,0,0,0,
    0,0,0,0,1,1,3,0,0,1,1,1,3,0,0,0,
    2,1,1,0,0,1,0,0,2,1,1,0,1,0,0,0,
    // band 2 — three clusters, shifted again
    1,1,1,0,0,0,0,2,1,1,1,0,0,0,2,1,
    1,1,3,0,0,0,0,1,1,1,3,0,0,2,1,1,
    0,1,0,0,0,0,0,0,1,1,0,0,0,1,1,3,
    0,0,0,0,2,1,1,0,0,0,0,0,0,0,1,0,
    // band 3 — two clusters near the bottom
    0,0,0,2,1,1,1,0,0,2,1,1,0,0,0,0,
    0,0,0,1,1,1,3,0,2,1,1,1,0,0,0,0,
    2,1,0,0,1,1,0,0,1,1,1,0,0,2,1,0,
    1,1,0,0,0,1,0,0,0,1,0,0,2,1,1,0,
  ]
  for (let i = 0; i < 256; i++) {
    const v = PATTERN[i]
    if (!v) continue
    ctx.fillStyle = v === 2 ? hi : v === 3 ? sha : baseColor
    ctx.fillRect(i & 15, i >> 4, 1, 1)
  }
}

/** Crystal: bright inner, gradient border. */
function drawCrystal(ctx, midColor, edgeColor) {
  // Edge fill
  fill(ctx, edgeColor)
  // Inner bright hexagon-ish diamond shape
  const mid = midColor
  const light = shade(midColor, 0.25)
  rect(ctx, 4, 1, 8, 14, mid)
  rect(ctx, 1, 4, 14, 8, mid)
  // Highlight top-left
  rect(ctx, 5, 2, 4, 4, light)
  px(ctx, 5, 2, light)
  // Shine pixel
  px(ctx, 6, 3, '#FFFFFF')
  px(ctx, 7, 3, shade('#FFFFFF', -0.1))
}

/** Wool: flat solid colour, very slightly darker border pixels. */
function drawWool(ctx, color) {
  fill(ctx, color)
  const dark = shade(color, -0.12)
  // Subtle 1px border
  rect(ctx, 0, 0, S, 1, dark)
  rect(ctx, 0, S-1, S, 1, dark)
  rect(ctx, 0, 0, 1, S, dark)
  rect(ctx, S-1, 0, 1, S, dark)
  // Crosshatch suggestion (1px every 4)
  for (let i = 4; i < S; i += 4) {
    px(ctx, i, i, dark)
    px(ctx, i, S-i, dark)
  }
}

/** Concrete: flat solid, clean edges. */
function drawConcrete(ctx, color) {
  fill(ctx, color)
  const light = shade(color, 0.08)
  // Top-left L highlight (feels solid/moulded)
  rect(ctx, 0, 0, S, 1, light)
  rect(ctx, 0, 0, 1, S, light)
}

/** Stained glass: mostly transparent-looking border frame. */
function drawStainedGlass(ctx, color) {
  const frame = shade(color, -0.3)
  fill(ctx, shade(color, 0.1))
  // Border frame
  rect(ctx, 0, 0, S, 2, frame)
  rect(ctx, 0, S-2, S, 2, frame)
  rect(ctx, 0, 0, 2, S, frame)
  rect(ctx, S-2, 0, 2, S, frame)
  // Cross bar
  rect(ctx, 7, 2, 2, 12, shade(color, -0.1))
  rect(ctx, 2, 7, 12, 2, shade(color, -0.1))
}

/** Terracotta: flat solid with subtle baked-earth crack. */
function drawTerracotta(ctx, color) {
  fill(ctx, color)
  const dark = shade(color, -0.15)
  // Irregular crack lines
  rect(ctx, 3, 5, 1, 6, dark)
  rect(ctx, 11, 3, 1, 7, dark)
  rect(ctx, 6, 11, 4, 1, dark)
}

/** Flower cross sprite (two intersecting quads). */
function drawFlower(ctx, stemColor, petalColor, centreColor) {
  fill(ctx, '#00000000') // fully transparent bg
  ctx.clearRect(0, 0, S, S)
  // Stem
  rect(ctx, 7, 8, 2, 8, stemColor)
  rect(ctx, 6, 10, 4, 1, stemColor) // small leaf
  // Petals ring
  rect(ctx, 5, 3, 6, 5, petalColor)   // main petal block
  rect(ctx, 4, 4, 8, 4, petalColor)
  // Centre
  rect(ctx, 6, 4, 4, 3, centreColor)
  rect(ctx, 7, 3, 2, 4, centreColor)
}

// ─────────────────────────────────────────────────────────────
//  Main draw-function registry
//  key → function(ctx) that draws onto a 16×16 ctx
// ─────────────────────────────────────────────────────────────
const DRAW = {}

// ── Convenience shorthand ─────────────────────────────────────
const P = PALETTE

// ── NATURE ───────────────────────────────────────────────────
DRAW.grassTop = ctx => {
  fill(ctx, P.grassTop)
  // Subtle centre highlight for more depth
  rect(ctx, 3, 3, 10, 10, shade(P.grassTop, 0.06))
  // Darker texture dots
  const dark = [[2,2],[6,1],[10,3],[14,2],[1,8],[5,10],[9,7],[13,11],[3,14],[11,13],[7,6],[12,7]]
  for (const [x,y] of dark) px(ctx, x, y, shade(P.grassTop, -0.18))
  // Brighter highlight pixels
  const light = [[4,4],[9,2],[13,9],[6,13],[1,5]]
  for (const [x,y] of light) px(ctx, x, y, shade(P.grassTop, 0.22))
}

DRAW.grassSide = ctx => {
  // Darker dirt base for clearer colour separation
  fill(ctx, shade(P.dirt, -0.08))
  // Wider green strip (4px) with bright top edge
  rect(ctx, 0, 0, S, 4, P.grassTop)
  rect(ctx, 0, 0, S, 1, shade(P.grassTop, 0.18))
  // Transition pixels at row 4
  for (let x = 0; x < S; x++) {
    if ((x + 1) % 3 !== 0) px(ctx, x, 4, P.grassSide)
  }
  // Dirt texture dots
  const spots = [[3,6],[8,5],[12,8],[2,10],[7,12],[13,10],[5,14]]
  for (const [x,y] of spots) px(ctx, x, y, P.dirtDark)
}

DRAW.dirt = ctx => {
  fill(ctx, P.dirt)
  // More varied dark spots
  const dark = [[2,2],[7,1],[12,3],[4,7],[10,6],[1,11],[6,12],[13,9],[9,14],[3,14],[5,4],[11,8],[8,11],[15,5],[0,9]]
  for (const [x,y] of dark) px(ctx, x, y, P.dirtDark)
  // Lighter spots for subtle grain
  const light = [[1,5],[9,3],[14,7],[4,12],[12,14],[7,8]]
  for (const [x,y] of light) px(ctx, x, y, shade(P.dirt, 0.09))
}

DRAW.stone = ctx => {
  drawStone(ctx, P.stone, P.stoneDark)
  // Subtle pixel-level grain for a rougher look
  const grain = [
    [1,1,0.06],[4,0,-0.05],[8,2,0.04],[11,1,-0.05],[2,5,0.07],
    [6,4,-0.05],[10,5,0.04],[14,3,-0.04],[0,8,0.05],[5,9,-0.05],
    [9,8,0.04],[13,7,-0.04],[3,11,0.05],[7,12,-0.05],[12,11,0.04],
    [1,14,0.04],[8,13,-0.05],[15,12,0.05],[6,7,0.06],[11,10,-0.04],
  ]
  for (const [x, y, d] of grain) px(ctx, x, y, shade(P.stone, d))
}

DRAW.sand = ctx => {
  // Warm gradient: lighter top, slightly deeper bottom
  for (let row = 0; row < S; row++) {
    rect(ctx, 0, row, S, 1, shade(P.sand, (S / 2 - row) * 0.007))
  }
  // Darker speckle
  const spots = [[1,1],[5,3],[9,2],[13,4],[3,8],[8,9],[12,7],[2,13],[7,14],[11,12],[14,1]]
  for (const [x,y] of spots) px(ctx, x, y, P.sandDark)
  // Lighter sparkle pixels
  const sparkle = [[4,2],[11,5],[7,10],[3,14],[14,8]]
  for (const [x,y] of sparkle) px(ctx, x, y, shade(P.sand, 0.14))
}

DRAW.gravel = ctx => {
  fill(ctx, P.gravel)
  // Deterministic pebble patches (consistent across all builds)
  const pebbles = [
    [1,1,3,2, 0.08],[5,0,2,3,-0.06],[9,2,3,2, 0.10],[13,1,2,2,-0.05],
    [0,5,2,3,-0.08],[4,4,3,3, 0.07],[8,5,4,2,-0.06],[12,4,3,3, 0.09],
    [1,8,3,3, 0.06],[6,7,3,3,-0.07],[10,8,4,3, 0.05],[2,11,3,3,-0.08],
    [6,11,4,3, 0.07],[11,10,3,3,-0.06],[0,13,3,2, 0.08],[7,13,4,2,-0.05],[12,13,3,2, 0.09],
  ]
  for (const [x,y,w,h,d] of pebbles) rect(ctx, x, y, w, h, shade(P.gravel, d))
  // Seam lines between pebbles
  const lines = [[4,0,1,16],[8,0,1,16],[12,0,1,16],[0,4,16,1],[0,8,16,1],[0,12,16,1]]
  for (const [x,y,w,h] of lines) rect(ctx, x, y, w, h, shade(P.gravel, -0.20))
}

DRAW.clay = ctx => {
  fill(ctx, P.clay)
  const dark = shade(P.clay, -0.10)
  const mid  = shade(P.clay, -0.07)
  const light = shade(P.clay, 0.08)
  // Larger dark spots (2×1 for more visible texture)
  for (const [x,y] of [[3,3],[8,2],[12,5],[1,9],[6,8],[11,10],[4,13],[9,14],[14,3],[2,12]]) {
    px(ctx, x, y, dark); px(ctx, x+1, y, mid)
  }
  // Lighter flecks for clay's soft, varied surface
  for (const [x,y] of [[5,5],[11,3],[2,8],[13,11],[7,14]]) px(ctx, x, y, light)
  // Subtle layering lines (clay has natural strata)
  rect(ctx, 0, 6, S, 1, shade(P.clay, -0.04))
  rect(ctx, 0, 12, S, 1, shade(P.clay, -0.04))
}

DRAW.snow = ctx => {
  fill(ctx, P.snow)
  // Very subtle sparkle highlights
  const shine = [[4,2],[11,3],[2,9],[13,8],[7,13]]
  for (const [x,y] of shine) rect(ctx, x, y, 2, 1, P.snowDark)
}

DRAW.ice = ctx => {
  fill(ctx, P.ice)
  // Crack-like lines give a frozen look
  rect(ctx, 2, 4, 6, 1, P.iceDark)
  rect(ctx, 9, 7, 5, 1, P.iceDark)
  rect(ctx, 4, 11, 7, 1, P.iceDark)
  // Highlight top-left
  rect(ctx, 0, 0, S, 2, shade(P.ice, 0.15))
}

DRAW.packedIce = ctx => {
  const base = mix(P.ice, '#ffffff', 0.4)
  fill(ctx, base)
  // Top-left highlight
  rect(ctx, 0, 0, S, 2, shade(base, 0.18))
  rect(ctx, 0, 0, 2, S, shade(base, 0.10))
  // Ice crack lines
  rect(ctx, 3, 4, 6, 1, shade(base, -0.12))
  rect(ctx, 8, 7, 5, 1, shade(base, -0.10))
  rect(ctx, 1, 11, 8, 1, shade(base, -0.12))
  rect(ctx, 10, 13, 4, 1, shade(base, -0.08))
  // Diagonal crack fork
  px(ctx, 5, 5, shade(base, -0.15))
  px(ctx, 6, 6, shade(base, -0.15))
  px(ctx, 6, 7, shade(base, -0.12))
  // Frost sparkles
  for (const [x, y] of [[2,2],[11,1],[7,9],[14,6],[4,13]]) px(ctx, x, y, '#FFFFFF')
  // Bottom/right shadow
  rect(ctx, 0, S-1, S, 1, shade(base, -0.08))
  rect(ctx, S-1, 0, 1, S, shade(base, -0.05))
}

// ── Shared water wave drawing ─────────────────────────────────
function _drawWaterWaves(ctx) {
  fill(ctx, P.water)
  const waveBody = mix(P.water, P.waterLight, 0.55)
  for (let x = 0; x < S; x++) {
    const y1 = 4 + Math.round(Math.sin(x * 0.75) * 1.5)
    const y2 = 11 + Math.round(Math.sin(x * 0.75 + Math.PI) * 1.5)
    rect(ctx, x, Math.max(0, y1), 1, 2, waveBody)
    rect(ctx, x, Math.max(0, y2), 1, 2, waveBody)
    px(ctx, x, Math.max(0, y1 - 1), P.waterLight)
    px(ctx, x, Math.max(0, y2 - 1), P.waterLight)
  }
  px(ctx,  3,  1, shade(P.waterLight, 0.25))
  px(ctx,  4,  1, shade(P.waterLight, 0.12))
  px(ctx, 11,  8, shade(P.waterLight, 0.25))
}

// Small bright cross at center — marks source blocks
function _drawSourceMarker(ctx, brightness = 0.38) {
  const glint = shade(P.waterLight, brightness)
  px(ctx, 7, 6, glint)
  px(ctx, 6, 7, glint)
  px(ctx, 7, 7, shade(P.waterLight, brightness + 0.1))
  px(ctx, 8, 7, glint)
  px(ctx, 7, 8, glint)
}

// Source water (player-placed) — waves + source marker
DRAW.water = ctx => {
  _drawWaterWaves(ctx)
  _drawSourceMarker(ctx)
}

// Flowing water (system-placed) — waves only, no marker
DRAW.waterFlow = ctx => {
  _drawWaterWaves(ctx)
}

DRAW.lava = ctx => {
  fill(ctx, '#CC3800')
  rect(ctx, 0, 0, S, 1, '#FF6000')
  // Lava blobs
  const blobs = [[2,3,4,2],[8,2,5,2],[1,7,3,3],[6,6,4,3],[11,7,4,2],[3,11,5,3],[9,11,5,3]]
  for (const [x,y,w,h] of blobs) rect(ctx, x, y, w, h, '#FF7020')
  rect(ctx, 4, 4, 2, 2, '#FFAA40') // bright hot spot
  rect(ctx, 10, 9, 3, 2, '#FFAA40')
}

// ── WOOD LOGS ────────────────────────────────────────────────
DRAW.oakLogSide   = ctx => drawBarkSide(ctx, P.oakBark, P.oakBarkDark)
DRAW.oakLogTop    = ctx => drawLogTop(ctx, P.oakRings, P.oakBarkDark)
DRAW.pineLogSide  = ctx => drawBarkSide(ctx, P.pineBark, P.pineBarkDark)
DRAW.pineLogTop   = ctx => drawLogTop(ctx, mix(P.pineBark, '#fff', 0.1), P.pineBarkDark)
DRAW.birchLogSide = ctx => {
  fill(ctx, P.birchBark)
  // Birch characteristic horizontal dark marks
  const marks = [[0,2,S,2],[0,7,4,1],[S-4,7,4,1],[0,11,6,2],[S-5,11,5,2]]
  for (const [x,y,w,h] of marks) rect(ctx, x, y, w, h, P.birchBarkDark)
}
DRAW.birchLogTop    = ctx => drawLogTop(ctx, P.birchBark, P.birchBarkDark)
DRAW.jungleLogSide  = ctx => drawBarkSide(ctx, P.jungleBark, P.jungleBarkDk)
DRAW.jungleLogTop   = ctx => drawLogTop(ctx, P.jungleBark, P.jungleBarkDk)
DRAW.cherryLogSide  = ctx => drawBarkSide(ctx, P.cherryBark, P.cherryBarkDk)
DRAW.cherryLogTop   = ctx => drawLogTop(ctx, P.cherryBark, P.cherryBarkDk)
DRAW.darkOakLogSide = ctx => drawBarkSide(ctx, P.darkBarkLight, P.darkBark)
DRAW.darkOakLogTop  = ctx => drawLogTop(ctx, P.darkBarkLight, P.darkBark)

// ── WOOD PLANKS ──────────────────────────────────────────────
DRAW.oakPlanks      = ctx => drawPlanks(ctx, P.oakPlanks, P.oakPlanksDark)
DRAW.pinePlanks     = ctx => drawPlanks(ctx, P.pinePlanks, P.pinePlanksDark)
DRAW.birchPlanks    = ctx => drawPlanks(ctx, P.birchPlanks, P.birchPlanksDark)
DRAW.junglePlanks   = ctx => drawPlanks(ctx, P.junglePlanks, P.junglePlanks2)
DRAW.cherryPlanks   = ctx => drawPlanks(ctx, P.cherryPlanks, P.cherryPlanks2)
DRAW.darkOakPlanks  = ctx => drawPlanks(ctx, P.darkPlanks2, P.darkPlanks)

// ── LEAVES ───────────────────────────────────────────────────
DRAW.oakLeaves     = ctx => drawLeaves(ctx, P.leavesOak)
DRAW.pineLeaves    = ctx => drawLeaves(ctx, P.leavesPine)
DRAW.birchLeaves   = ctx => drawLeaves(ctx, P.leavesBirch)
DRAW.jungleLeaves  = ctx => drawLeaves(ctx, P.leavesJungle)
DRAW.cherryLeaves  = ctx => {
  // Cherry blossoms — leaf clusters + white petal highlights on top
  drawLeaves(ctx, P.leavesCherry)
  const petals = [[3,4],[7,2],[11,5],[5,9],[13,8],[8,13],[2,12]]
  for (const [x, y] of petals) rect(ctx, x, y, 2, 2, shade('#FFFFFF', -0.05))
}
DRAW.autumnLeaves  = ctx => {
  // Same leaf clusters, then paint some pixels yellow/lighter for multi-tone autumn look
  drawLeaves(ctx, P.leavesAutumn)
  const accents = [[2,1],[6,3],[10,1],[14,4],[3,7],[8,6],[12,9],[1,11],[5,13],[9,12],[13,14]]
  for (const [x, y] of accents) {
    px(ctx, x, y, (x % 3 === 0) ? '#F0A820' : shade(P.leavesAutumn, 0.15))
  }
}

// ── CACTUS ───────────────────────────────────────────────────
DRAW.cactusSide = ctx => {
  fill(ctx, '#3A8C2A')
  rect(ctx, 0, 0, 2, S, '#2A6C1A')
  rect(ctx, S-2, 0, 2, S, '#2A6C1A')
  // Spines suggestion
  for (let y = 2; y < S; y += 4) {
    px(ctx, 0, y, '#F0E880'); px(ctx, S-1, y, '#F0E880')
  }
  // Highlight centre stripe
  rect(ctx, 6, 0, 4, S, '#4AA832')
}
DRAW.cactusTop = ctx => {
  fill(ctx, '#3A8C2A')
  rect(ctx, 3, 3, 10, 10, '#4AA832')
  rect(ctx, 6, 6, 4, 4, '#5ABB38')
}

// ── FLOWERS ──────────────────────────────────────────────────
DRAW.flowerRed    = ctx => drawFlower(ctx, P.flowerStem, P.flowerRed,    '#FFD030')
DRAW.flowerYellow = ctx => drawFlower(ctx, P.flowerStem, P.flowerYellow, '#FFFFFF')
DRAW.flowerBlue   = ctx => drawFlower(ctx, P.flowerStem, P.flowerBlue,   '#FFFF80')
DRAW.flowerPink   = ctx => drawFlower(ctx, P.flowerStem, P.flowerPink,   '#FF80C8')
DRAW.flowerWhite  = ctx => drawFlower(ctx, P.flowerStem, '#EEEEEE',      '#FFD040')
DRAW.flowerPurple = ctx => drawFlower(ctx, P.flowerStem, '#A040D0',      '#FFE040')

// B6 — Tropical flower: vivid orange-red petals + yellow centre, tall stem
DRAW.tropicalFlower = ctx => {
  ctx.clearRect(0, 0, S, S)
  // Tall stem
  rect(ctx, 7, 6, 2, 10, '#3A8028')
  rect(ctx, 5, 10, 3, 1, '#3A8028')  // side leaf nub
  // Outer petals — orange-red (8 directions via rect blocks)
  rect(ctx, 4, 1, 8, 3, '#FF6020')   // top + bottom wide petals
  rect(ctx, 4, 4, 8, 3, '#FF6020')
  rect(ctx, 3, 2, 3, 5, '#FF6020')   // left + right tall petals
  rect(ctx, 10, 2, 3, 5, '#FF6020')
  // Petal detail — slightly brighter highlight
  rect(ctx, 5, 2, 6, 1, '#FF7830')
  rect(ctx, 5, 5, 6, 1, '#FF7830')
  // Yellow centre disc
  rect(ctx, 6, 2, 4, 5, '#FFD000')
  rect(ctx, 5, 3, 6, 3, '#FFD000')
  // Centre dot — deep orange
  rect(ctx, 7, 3, 2, 2, '#FF4010')
}

DRAW.tallGrass = ctx => {
  ctx.clearRect(0,0,S,S)
  const dark  = shade(P.grassTop, -0.18)
  const light = shade(P.grassTop,  0.12)
  // Thin wispy vertical blades — two shades of green, no dirt base
  const blades = [
    [2,3, dark],[4,1, light],[7,4, dark],[9,2, light],
    [12,3, dark],[5,6, light],[11,5, dark],[3,8, light],
    [8,7, dark],[13,4, light],
  ]
  for (const [x,y,c] of blades) {
    rect(ctx, x,   y,   1, S-y,   c)
    if (y < S-2) rect(ctx, x+1, y+1, 1, S-y-3, P.grassTop)
  }
  // slight brightness at tips
  for (const [x,y] of [[4,1],[9,2],[13,4]]) {
    px(ctx, x, y, light)
  }
}

// ── MUSHROOMS ────────────────────────────────────────────────
DRAW.mushroomRed = ctx => {
  ctx.clearRect(0,0,S,S)
  // Cap
  rect(ctx, 2, 0, 12, 8, P.mushRed)
  rect(ctx, 0, 4, S, 5, P.mushRed)
  // White spots
  rect(ctx, 4, 2, 2, 2, P.mushWhite)
  rect(ctx, 10, 1, 2, 2, P.mushWhite)
  rect(ctx, 3, 6, 2, 2, P.mushWhite)
  rect(ctx, 11, 6, 2, 2, P.mushWhite)
  // Stem
  rect(ctx, 5, 9, 6, 7, P.mushWhite)
  rect(ctx, 4, 10, 8, 5, P.mushWhite)
}

DRAW.mushroomBrown = ctx => {
  ctx.clearRect(0,0,S,S)
  rect(ctx, 1, 3, 14, 6, P.mushBrown)
  rect(ctx, 4, 0, 8, 6, P.mushBrown)
  rect(ctx, 2, 7, 4, 1, shade(P.mushBrown, -0.15))
  rect(ctx, 10, 7, 4, 1, shade(P.mushBrown, -0.15))
  rect(ctx, 6, 9, 4, 7, '#D8C8A0')
  rect(ctx, 5, 10, 6, 5, '#D8C8A0')
}

DRAW.giantMushroomTop = ctx => {
  fill(ctx, P.mushRed)
  rect(ctx, 0, 0, 4, 4, shade(P.mushRed, 0.15))
  rect(ctx, 6, 6, 4, 4, shade(P.mushRed, 0.1))
  // White dot clusters
  for (const [x,y] of [[2,2],[5,1],[10,3],[1,10],[8,11],[13,7],[12,13]]) {
    rect(ctx, x, y, 2, 2, '#FFFFFF')
  }
}

DRAW.mushroomStem = ctx => {
  fill(ctx, '#DDD8C8')
  rect(ctx, 0, 0, 1, S, '#C8C4B4')
  rect(ctx, S-1, 0, 1, S, '#C8C4B4')
  for (let y = 3; y < S; y += 5) rect(ctx, 2, y, S-4, 1, '#C8C4B4')
}

DRAW.lilyPad = ctx => {
  ctx.clearRect(0,0,S,S)
  fill(ctx, '#2A8040')
  rect(ctx, 2, 0, 12, 1, '#00000000')
  rect(ctx, 0, 2, 1, 12, '#00000000')
  rect(ctx, S-1, 2, 1, 12, '#00000000')
  rect(ctx, 2, S-1, 12, 1, '#00000000')
  px(ctx, 8, 8, '#40B060') // vein hint
  rect(ctx, 7, 4, 2, 9, '#30A050')
  rect(ctx, 4, 7, 9, 2, '#30A050')
}

DRAW.vine = ctx => {
  ctx.clearRect(0,0,S,S)
  // Vertical tendrils
  for (let x of [3, 9, 13]) {
    rect(ctx, x, 0, 1, S, '#3A8028')
    if (x !== 13) {
      rect(ctx, x+1, 5, 3, 2, '#5AAC40')
      rect(ctx, x-2, 10, 3, 2, '#5AAC40')
    }
  }
}

DRAW.fern = ctx => {
  ctx.clearRect(0,0,S,S)
  rect(ctx, 7, 8, 2, 8, '#408028')
  // Left fronds
  rect(ctx, 2, 5, 6, 2, '#5AAC40'); rect(ctx, 1, 6, 2, 3, '#408028')
  // Right fronds
  rect(ctx, 8, 4, 6, 2, '#5AAC40'); rect(ctx, 13, 5, 2, 3, '#408028')
  // Top frond
  rect(ctx, 5, 2, 6, 2, '#6AB840')
}

DRAW.bambooSide = ctx => {
  fill(ctx, '#6AAA28')
  // Segment joints every 5px
  for (let y = 0; y < S; y += 5) rect(ctx, 0, y, S, 2, '#4A8018')
  // Side shading
  rect(ctx, 0, 0, 2, S, '#4A8018')
  rect(ctx, S-2, 0, 2, S, '#88C840')
}
DRAW.bambooTop = ctx => {
  fill(ctx, '#4A8018')
  rect(ctx, 3, 3, 10, 10, '#6AAA28')
  rect(ctx, 6, 6, 4, 4, '#88C840')
}

// ── STONE & BRICK ────────────────────────────────────────────
DRAW.cobblestone    = ctx => drawStone(ctx, P.cobble, P.cobbleDark)
DRAW.mossyCobblestone = ctx => {
  drawStone(ctx, P.cobble, P.cobbleDark)
  // Green moss patches
  const moss = [[0,0,4,3],[12,2,4,3],[5,8,5,4],[0,12,3,4],[10,11,6,4]]
  for (const [x,y,w,h] of moss) rect(ctx, x, y, w, h, P.mossyCobble)
}
DRAW.bricks     = ctx => drawBricks(ctx, P.bricks, P.bricksDark)
DRAW.mossyBricks = ctx => {
  drawBricks(ctx, P.bricks, P.bricksDark)
  const moss = [[0,0,3,4],[13,4,3,3],[5,8,4,4],[1,12,3,3],[10,10,5,3]]
  for (const [x,y,w,h] of moss) rect(ctx, x, y, w, h, '#6A9040')
}
DRAW.marble = ctx => {
  fill(ctx, P.marble)
  rect(ctx, 0, 0, S, 1, P.marbleDark)
  rect(ctx, 0, 0, 1, S, P.marbleDark)
  // Marble veins
  rect(ctx, 3, 5, 8, 1, P.marbleDark)
  rect(ctx, 6, 9, 7, 1, P.marbleDark)
  rect(ctx, 2, 13, 5, 1, P.marbleDark)
}
DRAW.sandstoneTop    = ctx => { fill(ctx, P.sandstone); rect(ctx, 2, 2, 12, 12, P.sandstoneDk) }
DRAW.sandstoneSide   = ctx => {
  fill(ctx, P.sandstone)
  // Layered lines
  for (let y = 4; y < S; y += 4) rect(ctx, 0, y, S, 1, P.sandstoneDk)
  // Chiseled centre line
  rect(ctx, 1, 7, S-2, 2, P.sandstoneDk)
}
DRAW.sandstoneBottom = ctx => { fill(ctx, P.sandstoneDk); drawStone(ctx, P.sandstoneDk, shade(P.sandstoneDk, -0.15)) }
DRAW.basalt    = ctx => drawStone(ctx, P.basalt, P.basaltLight)
DRAW.obsidian  = ctx => {
  fill(ctx, P.obsidian)
  // Shiny purple-pink speckle
  const shine = [[2,3],[7,1],[11,4],[5,9],[13,7],[3,13],[9,12]]
  for (const [x,y] of shine) px(ctx, x, y, P.obsidianShine)
  rect(ctx, 5, 5, 3, 2, P.obsidianShine) // larger highlight
}
DRAW.polishedStone = ctx => {
  fill(ctx, shade(P.stone, 0.08))
  rect(ctx, 0, 0, S, 1, shade(P.stone, 0.2))
  rect(ctx, 0, 0, 1, S, shade(P.stone, 0.2))
  rect(ctx, 0, S-1, S, 1, P.stoneDark)
  rect(ctx, S-1, 0, 1, S, P.stoneDark)
}
DRAW.crackedStone = ctx => {
  fill(ctx, P.stone)
  // Big crack
  rect(ctx, 4, 0, 2, 8, P.stoneDark)
  rect(ctx, 6, 5, 5, 2, P.stoneDark)
  rect(ctx, 10, 7, 2, 9, P.stoneDark)
}
DRAW.chiseledStone = ctx => {
  fill(ctx, P.stone)
  // Frame
  rect(ctx, 1, 1, S-2, 1, P.stoneDark); rect(ctx, 1, S-2, S-2, 1, P.stoneDark)
  rect(ctx, 1, 1, 1, S-2, P.stoneDark); rect(ctx, S-2, 1, 1, S-2, P.stoneDark)
  // Centre diamond
  rect(ctx, 6, 4, 4, 8, shade(P.stone, 0.1))
  rect(ctx, 4, 6, 8, 4, shade(P.stone, 0.1))
}
DRAW.netherBrick = ctx => {
  drawBricks(ctx, '#4A1820', '#201010')
  // Dark tint overlay
  rect(ctx, 0, 0, S, S, 'rgba(20,0,10,0.3)')
}
DRAW.endStone = ctx => {
  fill(ctx, '#D8D4A0')
  const spots = [[2,2],[7,1],[11,4],[3,8],[9,7],[13,11],[1,13],[6,14]]
  for (const [x,y] of spots) rect(ctx, x, y, 2, 2, '#C0BC88')
}

/** 2×2 grid of square stone bricks separated by 1px mortar. */
function drawStoneBricks(ctx, brickColor, mortarColor) {
  fill(ctx, mortarColor)
  for (const [bx, by] of [[1,1],[9,1],[1,9],[9,9]]) {
    rect(ctx, bx, by, 7, 7, brickColor)
    rect(ctx, bx, by, 7, 1, shade(brickColor,  0.08))  // top highlight
    rect(ctx, bx, by, 1, 7, shade(brickColor,  0.05))  // left highlight
    rect(ctx, bx+6, by, 1, 7, shade(brickColor, -0.06)) // right shadow
    rect(ctx, bx, by+6, 7, 1, shade(brickColor, -0.06)) // bottom shadow
  }
}

DRAW.stoneBricks = ctx => drawStoneBricks(ctx, P.stoneBrick, P.stoneBrickDk)

DRAW.crackedStoneBricks = ctx => {
  drawStoneBricks(ctx, P.stoneBrick, P.stoneBrickDk)
  // Big diagonal crack across the top-left brick
  for (const [x,y] of [[2,2],[3,3],[4,3],[4,4],[5,5],[6,6]]) px(ctx, x, y, P.stoneBrickDk)
  // Hairline crack in bottom-right brick
  for (const [x,y] of [[10,10],[11,11],[12,11],[13,12]]) px(ctx, x, y, P.stoneBrickDk)
}

DRAW.mossyStoneBricks = ctx => {
  drawStoneBricks(ctx, P.stoneBrick, P.stoneBrickDk)
  // Moss patches across brick faces
  const moss = [[1,1,3,2],[9,3,4,3],[3,9,3,4],[10,10,4,4]]
  for (const [x,y,w,h] of moss) {
    rect(ctx, x, y, w, h, '#6A9040')
    // Brighter highlight pixel per patch
    px(ctx, x+1, y+1, '#82AA52')
  }
}

DRAW.quartzBlock = ctx => {
  fill(ctx, P.quartzBlock)
  // Top-left bright corner (polished feel)
  rect(ctx, 0, 0, S, 2, '#FFFFFF')
  rect(ctx, 0, 0, 2, S, '#FFFFFF')
  // Subtle veins
  rect(ctx, 4, 6, 7, 1, P.quartzBlockDk)
  rect(ctx, 8, 10, 6, 1, P.quartzBlockDk)
  rect(ctx, 2, 13, 5, 1, P.quartzBlockDk)
  px(ctx, 5, 6, shade(P.quartzBlockDk, -0.05))
  // Bottom/right shadow
  rect(ctx, 0, S-1, S, 1, P.quartzBlockDk)
  rect(ctx, S-1, 0, 1, S, P.quartzBlockDk)
}

DRAW.smoothStone = ctx => {
  const base = shade(P.stone, 0.06)
  fill(ctx, base)
  // Bevelled-edge highlight
  rect(ctx, 0, 0, S, 1, shade(base, 0.14))
  rect(ctx, 0, 0, 1, S, shade(base, 0.10))
  rect(ctx, 0, S-1, S, 1, P.stoneDark)
  rect(ctx, S-1, 0, 1, S, shade(P.stoneDark, 0.04))
  // Subtle inner panel
  rect(ctx, 2, 2, S-4, S-4, shade(base, 0.03))
}

DRAW.copperBlock = ctx => {
  fill(ctx, P.copper)
  // Metallic sheen: bright top-left, dark bottom-right
  rect(ctx, 0, 0, S, 2, shade(P.copper, 0.28))
  rect(ctx, 0, 0, 2, S, shade(P.copper, 0.16))
  rect(ctx, 0, S-2, S, 2, P.copperDk)
  rect(ctx, S-2, 0, 2, S, P.copperDk)
  // Horizontal grain lines
  for (let y = 4; y < S-2; y += 4) rect(ctx, 2, y, S-4, 1, shade(P.copper, -0.05))
  // Bright polish spot
  rect(ctx, 3, 3, 4, 3, shade(P.copper, 0.22))
}

DRAW.oxidizedCopper = ctx => {
  fill(ctx, P.oxidized)
  rect(ctx, 0, 0, S, 2, shade(P.oxidized, 0.22))
  rect(ctx, 0, 0, 2, S, shade(P.oxidized, 0.12))
  rect(ctx, 0, S-2, S, 2, P.oxidizedDk)
  rect(ctx, S-2, 0, 2, S, P.oxidizedDk)
  // Patchy oxidation blobs
  const patches = [[3,4,4,3],[10,2,5,2],[2,9,3,5],[11,8,4,5],[5,12,5,3]]
  for (const [x,y,w,h] of patches) rect(ctx, x, y, w, h, shade(P.oxidized, 0.18))
  for (let y = 4; y < S-2; y += 4) rect(ctx, 2, y, S-4, 1, shade(P.oxidized, -0.06))
}

// ── FANTASY ──────────────────────────────────────────────────
DRAW.crystalBlue   = ctx => drawCrystal(ctx, P.crystalB, P.crystalBDark)
DRAW.crystalPurple = ctx => drawCrystal(ctx, P.crystalP, P.crystalPDark)
DRAW.crystalGreen  = ctx => drawCrystal(ctx, P.crystalG, P.crystalGDark)
DRAW.crystalRed    = ctx => drawCrystal(ctx, P.crystalR, P.crystalRDark)
DRAW.crystalYellow = ctx => drawCrystal(ctx, P.crystalY, P.crystalYDark)

DRAW.rainbowBlock = ctx => {
  // 8 full bands filling all 16 rows — each band gets a highlight top edge
  const bands = [
    ['#FF4848','#FF9090'],
    ['#FF8828','#FFBA68'],
    ['#FFE828','#FFF888'],
    ['#38D038','#78F080'],
    ['#20B890','#60E8C0'],
    ['#3080F8','#78B0FF'],
    ['#7040D0','#A878F8'],
    ['#B030D0','#D870F8'],
  ]
  for (let i = 0; i < 8; i++) {
    const [base, hi] = bands[i]
    rect(ctx, 0, i * 2, S, 2, base)
    rect(ctx, 0, i * 2, S, 1, hi)          // highlight top pixel of each band
  }
  // Sparkle pixels — one per band, offset so they feel scattered
  for (const [x, y] of [[3,1],[11,3],[5,5],[13,7],[2,9],[9,11],[6,13],[14,15]])
    px(ctx, x, y, '#FFFFFF')
  // Left-edge light bevel, right-edge dark bevel
  rect(ctx, 0, 0, 1, S, 'rgba(255,255,255,0.25)')
  rect(ctx, S-1, 0, 1, S, 'rgba(0,0,0,0.15)')
}

DRAW.starBlock = ctx => {
  fill(ctx, '#0E0E28')
  // Nebula wash: faint purple glow top-left quadrant
  rect(ctx, 0, 0, 10, 5, '#11122E')
  rect(ctx, 0, 0, 6, 3, '#1A1448')
  // Tiny dim stars (1px)
  for (const [x,y] of [[1,3],[4,1],[11,2],[14,4],[2,9],[13,7],[0,13],[6,14],[15,11],[3,15]])
    px(ctx, x, y, '#7888A8')
  // Bright medium stars (1px)
  for (const [x,y] of [[7,1],[14,9],[1,12],[10,14]])
    px(ctx, x, y, '#D8E0FF')
  // Twinkling medium stars: 2×2 body + single top pixel
  for (const [x,y] of [[12,10],[4,11]]) {
    px(ctx, x, y, '#C0CAEC'); px(ctx, x+1, y, '#C0CAEC')
    px(ctx, x, y+1, '#E8F0FF'); px(ctx, x+1, y+1, '#C0CAEC')
    px(ctx, x, y-1, '#9098C0')   // twinkle spike up
  }
  // Central 4-pointed star
  rect(ctx, 7, 5, 2, 6, P.starBlock)     // vertical arm
  rect(ctx, 5, 7, 6, 2, P.starBlock)     // horizontal arm
  rect(ctx, 7, 6, 2, 4, '#FFE880')       // bright inner vertical
  rect(ctx, 6, 7, 4, 2, '#FFE880')       // bright inner horizontal
  px(ctx, 7, 7, '#FFFFFF'); px(ctx, 8, 7, '#FFFFFF')
  px(ctx, 7, 8, '#FFFFFF'); px(ctx, 8, 8, '#FFFFFF')  // white core
  // Diagonal sparkle tips
  px(ctx, 6, 6, shade(P.starBlock, -0.1)); px(ctx, 9, 6, shade(P.starBlock, -0.1))
  px(ctx, 6, 9, shade(P.starBlock, -0.1)); px(ctx, 9, 9, shade(P.starBlock, -0.1))
  // Glow halo: single ring of deep-purple pixels just outside the star arms
  for (const [x,y] of [[5,6],[5,9],[10,6],[10,9],[6,5],[9,5],[6,10],[9,10]])
    px(ctx, x, y, '#2E1D60')
}

DRAW.cloudBlock = ctx => {
  fill(ctx, P.cloudShadow)
  // Main cloud body
  rect(ctx, 0, 4, S, S-4, P.cloudBlock)
  // Fluffy bumps — three varied heights
  rect(ctx, 1, 2, 5, 3, P.cloudBlock)    // left bump
  rect(ctx, 7, 0, 5, 4, P.cloudBlock)    // tall centre bump
  rect(ctx, 12, 2, 3, 3, P.cloudBlock)   // right bump
  // White highlight on very top of each bump and main body
  rect(ctx, 1, 2, 5, 1, '#FFFFFF')
  rect(ctx, 7, 0, 5, 1, '#FFFFFF')
  rect(ctx, 12, 2, 3, 1, '#FFFFFF')
  rect(ctx, 0, 4, S, 1, '#FFFFFF')
  // Shadow at the bottom of cloud body
  rect(ctx, 0, S-3, S, 3, shade(P.cloudShadow, -0.06))
  // Inner puff detail — subtle darker pixels
  for (const [x,y] of [[3,7],[8,5],[12,8],[5,11],[11,12]])
    px(ctx, x, y, shade(P.cloudBlock, -0.07))
}

DRAW.candyPink = ctx => {
  // Diagonal candy-cane stripes: stripe every 8px, 3px wide at 45°
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      px(ctx, x, y, ((x + y) % 8 < 3) ? P.candyPink2 : P.candyPink)
  // Bevel highlight top-left, shadow bottom-right
  rect(ctx, 0, 0, S, 1, shade(P.candyPink, 0.35))
  rect(ctx, 0, 0, 1, S, shade(P.candyPink, 0.25))
  rect(ctx, 0, S-1, S, 1, shade(P.candyPink2, -0.12))
  rect(ctx, S-1, 0, 1, S, shade(P.candyPink2, -0.08))
}

DRAW.candyYellow = ctx => {
  // Same diagonal stripe pattern, yellow palette
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      px(ctx, x, y, ((x + y) % 8 < 3) ? P.candyYellow2 : P.candyYellow)
  rect(ctx, 0, 0, S, 1, shade(P.candyYellow, 0.35))
  rect(ctx, 0, 0, 1, S, shade(P.candyYellow, 0.25))
  rect(ctx, 0, S-1, S, 1, shade(P.candyYellow2, -0.12))
  rect(ctx, S-1, 0, 1, S, shade(P.candyYellow2, -0.08))
}

DRAW.magicDirt = ctx => {
  const base = '#6848A8', mid = '#8060C8', light = '#C090FF', bright = '#F0D0FF'
  fill(ctx, base)
  // Spots — varied sizes (1×1 and 2×2)
  for (const [x,y,s] of [[2,2,2],[7,1,1],[11,3,2],[4,7,1],[9,6,2],[13,10,1],[1,12,2],[8,10,1],[5,14,2]])
    rect(ctx, x, y, s, s, mid)
  // Subtle magical veins (barely-brighter horizontal slivers)
  rect(ctx, 3, 5, 6, 1, shade(base, 0.08))
  rect(ctx, 9, 9, 5, 1, shade(base, 0.08))
  rect(ctx, 2, 13, 7, 1, shade(base, 0.06))
  // Cross-shaped sparkle pixels
  for (const [x,y] of [[5,5],[10,3],[3,11],[12,8],[7,13]]) {
    px(ctx, x, y, bright)
    px(ctx, x-1, y, light); px(ctx, x+1, y, light)
    px(ctx, x, y-1, light); px(ctx, x, y+1, light)
  }
  // Top-left bevel
  rect(ctx, 0, 0, S, 1, shade(base, 0.15))
  rect(ctx, 0, 0, 1, S, shade(base, 0.10))
}

DRAW.glowstone = ctx => {
  fill(ctx, P.glowstone)
  // Four slightly-darker cell quadrants
  const cell = shade(P.glowstone, -0.10)
  rect(ctx, 0, 0, 7, 7, cell)
  rect(ctx, 9, 0, 7, 7, cell)
  rect(ctx, 0, 9, 7, 7, cell)
  rect(ctx, 9, 9, 7, 7, cell)
  // Glowing crack lines (bright amber seams)
  rect(ctx, 7, 0, 2, S, '#FFD860')   // vertical
  rect(ctx, 0, 7, S, 2, '#FFD860')   // horizontal
  // Glow spill: one-pixel softer halo on each side of the cracks
  rect(ctx, 6, 0, 1, S, shade(P.glowstone, 0.14))
  rect(ctx, 9, 0, 1, S, shade(P.glowstone, 0.14))
  rect(ctx, 0, 6, S, 1, shade(P.glowstone, 0.14))
  rect(ctx, 0, 9, S, 1, shade(P.glowstone, 0.14))
  // Bright centre region and white hot core
  rect(ctx, 5, 5, 6, 6, '#FFE890')
  rect(ctx, 6, 6, 4, 4, '#FFF4C0')
  px(ctx, 7, 7, '#FFFFFF'); px(ctx, 8, 7, '#FFFFFF')
  px(ctx, 7, 8, '#FFFFFF'); px(ctx, 8, 8, '#FFFFFF')
}

// ── FURNITURE ────────────────────────────────────────────────
DRAW.bookshelf = ctx => {
  fill(ctx, P.oakPlanks)
  // Shelf lines
  rect(ctx, 0, 4, S, 1, P.oakPlanksDark); rect(ctx, 0, 11, S, 1, P.oakPlanksDark)
  // Books (colourful spines)
  const books = [
    [1, 1, 3, 3, '#D04040'], [4, 1, 2, 3, '#4080D0'],
    [6, 1, 2, 3, '#40A840'], [8, 1, 3, 3, '#D0A040'],
    [11,1, 2, 3, '#8040C0'], [13,1, 2, 3, '#D04080'],
    [1, 5, 2, 5, '#4080D0'], [3, 5, 3, 5, '#D04040'],
    [6, 5, 2, 5, '#D0A040'], [8, 5, 3, 5, '#40A840'],
    [11,5, 2, 5, '#8040C0'], [13,5, 2, 5, '#D08020'],
    [1, 12, 3, 3, '#4080D0'],[4, 12, 2, 3, '#D04040'],
    [6, 12, 3, 3, '#40A840'],[9, 12, 2, 3, '#D0A040'],
    [11,12, 2, 3, '#8040C0'],[13,12, 2, 3, '#D08020'],
  ]
  for (const [x,y,w,h,c] of books) rect(ctx, x, y, w, h, c)
}

DRAW.hayBaleTop = ctx => {
  fill(ctx, P.haybale)
  // Circular rope pattern
  rect(ctx, 0, 0, S, 1, P.haybaleDk); rect(ctx, 0, S-1, S, 1, P.haybaleDk)
  rect(ctx, 0, 0, 1, S, P.haybaleDk); rect(ctx, S-1, 0, 1, S, P.haybaleDk)
  rect(ctx, 6, 6, 4, 4, P.haybaleDk) // centre rope knot
}
DRAW.hayBaleSide = ctx => {
  fill(ctx, P.haybale)
  // Horizontal straw lines
  for (let y = 0; y < S; y += 2) rect(ctx, 0, y, S, 1, P.haybaleDk)
  // Rope bands
  rect(ctx, 4, 0, 2, S, shade(P.haybaleDk, -0.1))
  rect(ctx, 10, 0, 2, S, shade(P.haybaleDk, -0.1))
}

DRAW.barrelTop = ctx => {
  fill(ctx, P.oakBark)
  // Metal band ring
  rect(ctx, 1, 1, S-2, 2, '#808880')
  rect(ctx, 1, S-3, S-2, 2, '#808880')
  rect(ctx, 1, 1, 2, S-2, '#808880')
  rect(ctx, S-3, 1, 2, S-2, '#808880')
  // Wood planks
  for (let i = 4; i < S; i += 4) rect(ctx, i, 3, 1, S-6, P.oakBarkDark)
}
DRAW.barrelSide = ctx => {
  fill(ctx, P.oakBark)
  // Metal hoops
  rect(ctx, 0, 2, S, 2, '#808880')
  rect(ctx, 0, S-4, S, 2, '#808880')
  // Stave lines
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.oakBarkDark)
}

DRAW.lantern = ctx => {
  fill(ctx, '#303030')
  // Glass pane interior
  rect(ctx, 2, 3, 12, 10, '#FFD870')
  rect(ctx, 3, 2, 10, 12, '#FFD870')
  // Grid bars
  rect(ctx, 7, 2, 2, 12, '#404040')
  rect(ctx, 2, 7, 12, 2, '#404040')
  // Top/bottom cap
  rect(ctx, 4, 1, 8, 2, '#505050')
  rect(ctx, 4, S-3, 8, 2, '#505050')
  // Glow centre
  rect(ctx, 6, 6, 4, 4, '#FFEE80')
}

DRAW.campfireTop = ctx => {
  fill(ctx, '#8B6030')
  // Logs
  rect(ctx, 1, 7, 14, 2, '#6A4020')
  rect(ctx, 7, 1, 2, 14, '#6A4020')
  // Flame
  rect(ctx, 5, 3, 6, 8, '#FF8020')
  rect(ctx, 6, 2, 4, 10, '#FFC030')
  rect(ctx, 7, 3, 2, 7, '#FFEE60')
}
DRAW.campfireSide = ctx => {
  fill(ctx, P.dirt)
  rect(ctx, 2, 8, S-4, 3, '#6A4020') // log
  // Flame licking up
  rect(ctx, 4, 2, 8, 7, '#FF8020')
  rect(ctx, 5, 1, 6, 5, '#FFC030')
  rect(ctx, 6, 2, 4, 4, '#FFEE60')
}

DRAW.pumpkinTop = ctx => {
  fill(ctx, P.pumpkin)
  rect(ctx, 6, 0, 4, 3, '#4A8020') // stem
  rect(ctx, 7, 3, 2, S-6, '#8B4010') // segments
  rect(ctx, 0, 7, S, 2, shade(P.pumpkin, -0.1))
  rect(ctx, 4, 5, 8, 6, shade(P.pumpkin, 0.08))
}
DRAW.pumpkinSide = ctx => {
  fill(ctx, P.pumpkin)
  // Segments / ridges
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.pumpkinDk)
  rect(ctx, 0, 0, S, 1, shade(P.pumpkin, 0.15))
}
DRAW.jackOLantern = ctx => {
  fill(ctx, P.pumpkin)
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.pumpkinDk)
  // Eyes
  rect(ctx, 2, 3, 4, 3, '#FFD840')
  rect(ctx, 10, 3, 4, 3, '#FFD840')
  // Mouth
  rect(ctx, 2, 8, 12, 2, '#FFD840')
  rect(ctx, 4, 10, 2, 3, '#FFD840')
  rect(ctx, 7, 10, 2, 2, '#FFD840')
  rect(ctx, 10, 10, 2, 3, '#FFD840')
}

DRAW.melonTop = ctx => {
  fill(ctx, '#78B828')
  for (let x = 0; x < S; x += 3) rect(ctx, x, 0, 1, S, shade('#78B828', -0.15))
  rect(ctx, 4, 4, 8, 8, '#90D040')
}
DRAW.melonSide = ctx => {
  fill(ctx, '#78B828')
  for (let x = 0; x < S; x += 3) rect(ctx, x, 0, 1, S, shade('#78B828', -0.12))
  // Horizontal bands
  rect(ctx, 0, 5, S, 1, shade('#78B828', -0.18)); rect(ctx, 0, 10, S, 1, shade('#78B828', -0.18))
}

DRAW.sponge = ctx => {
  fill(ctx, '#D8C830')
  // Pores
  const pores = [[1,1],[4,3],[8,1],[12,2],[2,7],[6,6],[10,8],[14,6],[1,11],[5,12],[9,10],[13,13],[3,14],[7,14],[11,14]]
  for (const [x,y] of pores) rect(ctx, x, y, 2, 2, shade('#D8C830', -0.25))
}

DRAW.tntTop = ctx => {
  fill(ctx, '#C83020')
  rect(ctx, 2, 2, S-4, S-4, '#808080')
  rect(ctx, 4, 4, S-8, S-8, '#C0C0C0')
}
DRAW.tntSide = ctx => {
  fill(ctx, '#C83020')
  // TNT letters
  rect(ctx, 1, 5, 14, 6, '#EEDDAA')
  // Simplified T-N-T lettering in brown
  const letters = [
    [2,6,2,4],[3,6,4,1],[8,6,1,4],[9,6,2,1],[10,6,1,4], // N rough
    [12,6,2,1],[12,9,2,1],[12,6,1,4], // rough T
  ]
  for (const [x,y,w,h] of letters) rect(ctx, x, y, w, h, '#604020')
}

// ── GLASS ────────────────────────────────────────────────────
DRAW.glass = ctx => {
  fill(ctx, 'rgba(200,235,255,0.35)')
  const frame = '#A0C8D8'
  rect(ctx, 0, 0, S, 2, frame); rect(ctx, 0, S-2, S, 2, frame)
  rect(ctx, 0, 0, 2, S, frame); rect(ctx, S-2, 0, 2, S, frame)
  // Glint
  rect(ctx, 3, 3, 3, 1, 'rgba(255,255,255,0.6)')
  px(ctx, 4, 4, 'rgba(255,255,255,0.4)')
}

// ── GEMS / SPECIAL ───────────────────────────────────────────
DRAW.diamondBlock = ctx => {
  fill(ctx, '#50D8D0')
  const pat = [[1,1],[5,3],[9,1],[13,3],[3,7],[7,5],[11,7],[2,11],[6,9],[10,11],[14,9],[4,13],[8,13],[12,13]]
  for (const [x,y] of pat) rect(ctx, x, y, 2, 2, '#30B0A8')
  rect(ctx, 5, 5, 6, 6, '#70EEE8')
  rect(ctx, 7, 7, 2, 2, '#FFFFFF')
}
DRAW.goldBlock = ctx => {
  fill(ctx, '#F0C040')
  rect(ctx, 2, 2, S-4, S-4, '#F8D860')
  const dark = [[1,1,2,1],[S-3,1,2,1],[1,S-2,2,1],[S-3,S-2,2,1]]
  for (const [x,y,w,h] of dark) rect(ctx, x, y, w, h, '#C89820')
  rect(ctx, 6, 6, 4, 4, '#FFEE80')
}
DRAW.emeraldBlock = ctx => {
  fill(ctx, '#38B848')
  const pat = [[1,1],[5,3],[9,1],[13,3],[3,7],[7,5],[11,7],[2,11],[6,9],[10,11],[14,9],[4,13],[8,13],[12,13]]
  for (const [x,y] of pat) rect(ctx, x, y, 2, 2, '#208030')
  rect(ctx, 5, 5, 6, 6, '#58D868')
  rect(ctx, 7, 7, 2, 2, '#A0FFA8')
}

DRAW.ironBlock = ctx => {
  fill(ctx, P.iron)
  rect(ctx, 0, 0, S, 2, '#FFFFFF')
  rect(ctx, 0, 0, 2, S, '#F0F0F0')
  rect(ctx, 0, S-2, S, 2, P.ironDk)
  rect(ctx, S-2, 0, 2, S, P.ironDk)
  // Vertical polish lines
  for (let x = 4; x < S-2; x += 4) rect(ctx, x, 2, 1, S-4, shade(P.iron, 0.06))
  // Centre sheen
  rect(ctx, 5, 5, 6, 6, shade(P.iron, 0.10))
}

DRAW.coalBlock = ctx => {
  fill(ctx, P.coal)
  rect(ctx, 0, 0, S, 1, P.coalShine)
  rect(ctx, 0, 0, 1, S, P.coalShine)
  // Mineral glint pixels
  for (const [x,y] of [[3,2],[8,1],[13,4],[1,7],[6,9],[11,7],[4,13],[9,11],[14,10],[2,14]]) {
    px(ctx, x, y, '#606060')
    px(ctx, x+1, y, '#505050')
  }
  // Subtle coal vein
  rect(ctx, 5, 5, 3, 1, '#383838')
  rect(ctx, 9, 9, 4, 1, '#383838')
}

DRAW.prismarine = ctx => {
  fill(ctx, P.prismarine)
  // 2×2 diamond-cross sub-pattern tiled four times
  for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
    const ox = gx * 8, oy = gy * 8
    rect(ctx, ox+3, oy+1, 2, 6, P.prismarineDk)
    rect(ctx, ox+1, oy+3, 6, 2, P.prismarineDk)
    px(ctx, ox+4, oy+4, shade(P.prismarine, 0.32))
  }
  // Top-left edge highlight
  rect(ctx, 0, 0, S, 1, shade(P.prismarine, 0.20))
  rect(ctx, 0, 0, 1, S, shade(P.prismarine, 0.14))
}

DRAW.amethystBlock = ctx => {
  fill(ctx, P.amethyst)
  // Facet highlight along top-left
  rect(ctx, 0, 0, S, 2, P.amethystLight)
  rect(ctx, 0, 0, 2, S, shade(P.amethystLight, -0.04))
  // Crystal facet lines
  rect(ctx, 4, 0, 1, 8, P.amethystDk)
  rect(ctx, 10, 4, 1, 9, P.amethystDk)
  rect(ctx, 6, 9, 8, 1, P.amethystDk)
  rect(ctx, 0, 12, 10, 1, P.amethystDk)
  // Sparkle pixels
  for (const [x,y] of [[5,1],[11,5],[2,9],[8,13],[14,3]]) px(ctx, x, y, '#FFFFFF')
  // Bottom/right shadow
  rect(ctx, 0, S-2, S, 2, P.amethystDk)
  rect(ctx, S-2, 0, 2, S, P.amethystDk)
}

DRAW.honeycombBlock = ctx => {
  fill(ctx, P.honeycomb)
  const wall = P.honeycombDk
  const hi   = shade(P.honeycomb, 0.20)

  // Flat-top hexagonal grid (simplified pixel art):
  // Horizontal flat edges at y = 0, 5, 10, 15
  for (const y of [0, 5, 10, 15]) rect(ctx, 0, y, S, 1, wall)

  // For each strip, draw left-leaning (\) and right-leaning (/) diagonal walls.
  // Even strips (y=0..5 and y=10..15): cells start at x=0,6,12
  // Odd strip (y=5..10): cells start at x=3,9,15 (shifted by 3)
  function hexWalls(cellStarts, yBase) {
    for (const cx of cellStarts) {
      // Left wall (\): 3 pixels going down-right from top-left corner of hex top
      for (let d = 1; d <= 4; d++) {
        if (cx > 0) { const px_ = cx - 1 + (d < 3 ? 0 : 1); if (px_ >= 0 && px_ < S) px(ctx, px_, yBase + d, wall) }
      }
      // Right wall (/): 3 pixels going down-left from top-right corner
      const rx = cx + 5
      for (let d = 1; d <= 4; d++) {
        const px_ = rx - (d < 3 ? 0 : 1); if (px_ >= 0 && px_ < S) px(ctx, px_, yBase + d, wall)
      }
      // Inner highlight
      if (cx + 1 >= 0 && cx + 3 < S) rect(ctx, Math.max(0,cx+1), yBase + 2, 3, 2, hi)
    }
  }

  hexWalls([0, 6, 12],    0)  // top strip
  hexWalls([3, 9, 15],    5)  // mid strip (offset)
  hexWalls([0, 6, 12],   10)  // bottom strip
}

// ── SEASONAL ─────────────────────────────────────────────────
DRAW.giftBox = ctx => {
  fill(ctx, '#E03030')
  // Ribbon
  rect(ctx, 7, 0, 2, S, '#FFD840')
  rect(ctx, 0, 7, S, 2, '#FFD840')
  // Bow loops at top
  rect(ctx, 3, 2, 4, 4, '#FFE860'); rect(ctx, 9, 2, 4, 4, '#FFE860')
  rect(ctx, 6, 1, 4, 2, '#FFD840')
}

DRAW.christmasOrnament = ctx => {
  // Baubles! Alternating red and green squares with gold dots
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const c = ((x+y) % 2 === 0) ? '#C83020' : '#208030'
    rect(ctx, x*4, y*4, 4, 4, c)
  }
  // Gold dot in each cell
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    px(ctx, x*4+2, y*4+2, '#FFD040')
  }
  // Gold border
  rect(ctx, 0, 0, S, 1, '#FFD040'); rect(ctx, 0, S-1, S, 1, '#FFD040')
  rect(ctx, 0, 0, 1, S, '#FFD040'); rect(ctx, S-1, 0, 1, S, '#FFD040')
}

DRAW.easterEgg = ctx => {
  fill(ctx, '#E8A0C0')
  // Stripe decorations
  rect(ctx, 0, 5, S, 2, '#70B8F0')
  rect(ctx, 0, 9, S, 2, '#F0D040')
  // Dots
  for (const [x,y] of [[3,2],[8,1],[13,3],[2,12],[7,13],[12,11]]) {
    rect(ctx, x, y, 2, 2, '#E860A0')
  }
  rect(ctx, 0, 0, S, 1, '#FFE8F4')
}

DRAW.snowmanHead = ctx => {
  fill(ctx, '#EEF2FF')
  // Face features
  rect(ctx, 4, 4, 2, 2, '#303030')  // left eye
  rect(ctx, 10, 4, 2, 2, '#303030') // right eye
  // Carrot nose
  rect(ctx, 7, 7, 2, 1, '#E87020')
  rect(ctx, 8, 8, 1, 1, '#E87020')
  // Smile dots
  for (const [x,y] of [[4,10],[6,11],[8,11],[10,11],[12,10]]) px(ctx, x, y, '#303030')
  // Hat
  rect(ctx, 3, 0, 10, 1, '#202020')
  rect(ctx, 5, 0, 6, 4, '#202020') // actually 0 is the very top of the face
}

// ── B2: DESERT ───────────────────────────────────────────────

DRAW.deadBush = ctx => {
  ctx.clearRect(0, 0, S, S)
  // Brown-grey twig color: PALETTE.dirt darkened ~28%
  const twig  = shade(P.dirt, -0.28)   // ~#6E3A12 dark brown
  const light = shade(twig, +0.18)     // branch-tip highlights
  const dark  = shade(twig, -0.15)     // base/root shadow

  // Main stem
  rect(ctx, 7, 5, 2, 11, twig)
  rect(ctx, 7, 13, 3, 3, dark)         // thicker base
  // Top fork
  rect(ctx, 5, 4, 2, 2, twig); px(ctx, 4, 3, light)
  rect(ctx, 9, 5, 2, 2, twig); px(ctx, 10, 3, light)
  // Left branches
  rect(ctx, 3, 7, 5, 1, twig); px(ctx, 2, 6, light)
  rect(ctx, 2, 10, 6, 1, twig); px(ctx, 1, 9, light); px(ctx, 1, 11, dark)
  // Right branches
  rect(ctx, 8, 8, 5, 1, twig); px(ctx, 13, 7, light)
  rect(ctx, 9, 11, 4, 1, twig); px(ctx, 13, 10, light)
}

DRAW.terracottaBiomeTop = ctx => {
  fill(ctx, '#C06828')
  // Subtle centre warmth
  rect(ctx, 3, 3, 10, 10, shade('#C06828', 0.05))
  // Bottom/right shadow for depth
  rect(ctx, 0, S - 1, S, 1, shade('#C06828', -0.12))
  rect(ctx, S - 1, 0, 1, S, shade('#C06828', -0.10))
}

DRAW.terracottaBiomeSide = ctx => {
  fill(ctx, '#C06828')
  // Horizontal band pattern — baked-earth layering
  rect(ctx, 0, 4,  S, 2, '#A04818')
  rect(ctx, 0, 9,  S, 2, '#A04818')
  // Top-left highlight
  rect(ctx, 0, 0,  S, 1, shade('#C06828', 0.12))
  rect(ctx, 0, 0,  1, S, shade('#C06828', 0.08))
}

DRAW.crackedSandstone = ctx => {
  // Same warm gradient as sand
  for (let row = 0; row < S; row++) {
    rect(ctx, 0, row, S, 1, shade(P.sand, (S / 2 - row) * 0.007))
  }
  // Existing sand-style dark speckle
  const spots = [[1,1],[5,3],[9,2],[13,4],[3,8],[8,9],[12,7],[2,13],[7,14],[11,12],[14,1]]
  for (const [x, y] of spots) px(ctx, x, y, P.sandDark)
  // 3 diagonal crack lines (dark brown pixels)
  const crackDark = shade(P.sandDark, -0.25)
  for (const [x, y] of [[2,4],[3,5],[4,6],[5,7]])            px(ctx, x, y, crackDark)
  for (const [x, y] of [[10,2],[11,3],[12,4]])               px(ctx, x, y, crackDark)
  for (const [x, y] of [[5,11],[6,12],[7,13]])               px(ctx, x, y, crackDark)
}

// ── B1: AUTUMN ───────────────────────────────────────────────
DRAW.leafPile = ctx => {
  // Slightly darker than autumn_leaves (#D85818)
  const base = '#B84010'
  const dk   = shade(base, -0.15)
  // 4×4 bumpy patches with alternating lighter/darker autumn tones
  const deltas = [0.12, -0.10, 0.08, -0.06, -0.08, 0.14, -0.12, 0.10,
                  0.10, -0.08, 0.12, -0.10, -0.06, 0.08, -0.08, 0.12]
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      rect(ctx, col * 4, row * 4, 4, 4, shade(base, deltas[row * 4 + col]))
    }
  }
  // Thin seam lines between patches
  for (let i = 4; i < S; i += 4) {
    rect(ctx, i, 0, 1, S, dk)
    rect(ctx, 0, i, S, 1, dk)
  }
}

// ── B3: SNOWY PEAKS ──────────────────────────────────────────
DRAW.powderSnow = ctx => {
  const base = '#F4F8FF'
  fill(ctx, base)
  // Subtle grey tinge on lower portion (depth cue)
  rect(ctx, 0, S - 4, S, 4, shade(base, -0.06))
  // Tiny sparkle dots scattered across the face
  for (const [x, y] of [[2,2],[6,5],[11,3],[14,8],[4,12],[9,10],[13,14],[7,1],[1,14],[10,6]])
    px(ctx, x, y, '#FFFFFF')
  // Soft top-edge highlight
  rect(ctx, 0, 0, S, 1, '#FFFFFF')
}

// ── B4: MUSHROOM ─────────────────────────────────────────────
DRAW.myceliumTop = ctx => {
  const base    = '#5A3870'
  const speckle = '#A070C8'
  fill(ctx, base)
  // Scattered lighter speckle pixels — irregular distribution
  for (const [x, y] of [[1,2],[4,0],[8,1],[12,2],[15,0],[2,5],[6,4],[10,3],[14,5],
    [0,8],[3,9],[7,7],[11,9],[15,8],[1,12],[5,11],[9,13],[13,11],[6,14],[11,14]])
    px(ctx, x, y, speckle)
  // Slightly lighter centre region for subtle depth
  rect(ctx, 5, 5, 6, 6, shade(base, 0.06))
}

DRAW.myceliumSide = ctx => {
  // Lower half: dirt-brown base; upper portion: fades into purple
  const dirtBrown = '#A07048'
  const dirtDark  = '#7A5030'
  const purpleTop = '#5A3870'
  const purpleMid = '#7A4A90'
  // Full dirt base
  fill(ctx, dirtBrown)
  // Dirt spots on lower half
  for (const [x, y] of [[2,9],[7,8],[12,10],[4,13],[10,12],[1,14],[9,14]])
    px(ctx, x, y, dirtDark)
  // Transition zone (rows 5-7): brownish-purple blend
  rect(ctx, 0, 5, S, 3, mix(dirtBrown, purpleMid, 0.55))
  // Purple top (rows 0-4)
  rect(ctx, 0, 0, S, 3, purpleTop)
  rect(ctx, 0, 3, S, 2, purpleMid)
  // Top edge highlight
  rect(ctx, 0, 0, S, 1, shade(purpleTop, 0.12))
}

DRAW.glowingMushroom = ctx => {
  // Cross-shaped mushroom (same geometry as mushroomRed) in cyan-green
  ctx.clearRect(0, 0, S, S)
  const cap    = '#40FFB0'
  const capDk  = '#28D890'
  const stem   = '#F0F0E8'
  const stemDk = '#D8D8C8'
  // Cap
  rect(ctx, 2, 0, 12, 8, cap)
  rect(ctx, 0, 4, S, 4, cap)
  // Cap shading — darker underside edge
  rect(ctx, 1, 7, S - 2, 1, capDk)
  // Subtle highlight on top
  rect(ctx, 4, 1, 8, 2, shade(cap, 0.12))
  // Stem
  rect(ctx, 5, 9, 6, 7, stem)
  rect(ctx, 4, 10, 8, 5, stem)
  // Stem edge darkening
  rect(ctx, 5, 9, 1, 7, stemDk)
  rect(ctx, 10, 9, 1, 7, stemDk)
}

// ── B5: CANDY ─────────────────────────────────────────────────
DRAW.candyRed = ctx => {
  // Diagonal candy-cane stripes — same pattern as candyPink, red palette
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      px(ctx, x, y, ((x + y) % 8 < 3) ? P.candyRedDk : P.candyRed)
  rect(ctx, 0, 0, S, 1, shade(P.candyRed,   0.35))
  rect(ctx, 0, 0, 1, S, shade(P.candyRed,   0.25))
  rect(ctx, 0, S-1, S, 1, shade(P.candyRedDk, -0.12))
  rect(ctx, S-1, 0, 1, S, shade(P.candyRedDk, -0.08))
}

DRAW.candyMint = ctx => {
  // Diagonal candy-cane stripes — mint/green pastel palette
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      px(ctx, x, y, ((x + y) % 8 < 3) ? P.candyMintDk : P.candyMint)
  rect(ctx, 0, 0, S, 1, shade(P.candyMint,   0.35))
  rect(ctx, 0, 0, 1, S, shade(P.candyMint,   0.25))
  rect(ctx, 0, S-1, S, 1, shade(P.candyMintDk, -0.12))
  rect(ctx, S-1, 0, 1, S, shade(P.candyMintDk, -0.08))
}

DRAW.frostedLogTop = ctx => {
  // Lollipop cross-section: concentric rings in white and pink
  const white = P.frostedLog
  const pink  = P.frostedLogPink
  fill(ctx, white)
  // Outer ring
  rect(ctx, 2, 2, 12, 12, shade(white, -0.06))
  // Middle ring
  rect(ctx, 4, 4, 8, 8, pink)
  // Pith (centre)
  rect(ctx, 6, 6, 4, 4, shade(white, 0.04))
  // Highlight bevel top-left
  rect(ctx, 0, 0, S, 1, shade(white, 0.18))
  rect(ctx, 0, 0, 1, S, shade(white, 0.12))
}

DRAW.frostedLogSide = ctx => {
  // White base with a faint pink diagonal spiral stripe
  const white  = P.frostedLog
  const spiral = P.frostedLogPink
  fill(ctx, white)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if ((x + y * 2) % 10 < 2) px(ctx, x, y, spiral)
  // Subtle bottom shadow
  rect(ctx, 0, S-1, S, 1, shade(white, -0.10))
  rect(ctx, 0, S-2, S, 1, shade(white, -0.05))
}

// ── B7: FAIRY WOODLAND ────────────────────────────────────────

DRAW.willowLogTop = ctx => drawLogTop(ctx, P.willowBark, P.willowBarkDk)

DRAW.willowLogSide = ctx => {
  // Pale silver-green bark — gentle vertical grain, no strong stripes
  fill(ctx, P.willowBark)
  for (let x = 0; x < S; x += 3) rect(ctx, x, 0, 1, S, P.willowBarkDk)
  for (let y = 3; y < S; y += 4) rect(ctx, 0, y, S, 1, shade(P.willowBarkDk, -0.04))
  rect(ctx, 0, S-1, S, 1, shade(P.willowBarkDk, -0.10))
}

DRAW.willowLeaves = ctx => {
  // Same cluster structure as other leaves, pale jade tones
  drawLeaves(ctx, P.willowLeaves)
  // Faint glow fringe — a few lighter dots scattered in clusters
  const glints = [[3,3],[7,1],[11,4],[5,8],[13,7],[8,12],[1,11],[14,13]]
  for (const [x, y] of glints) px(ctx, x, y, shade(P.enchMossGlow, 0.10))
}

DRAW.fairyMushroom = ctx => {
  ctx.clearRect(0, 0, S, S)
  const cap   = P.fairyMushCap
  const capDk = P.fairyMushCapDk
  const stem  = P.fairyMushStem
  const stemDk = shade(P.fairyMushStem, -0.12)
  // Cap — teal dome
  rect(ctx, 2, 0, 12, 8, cap)
  rect(ctx, 0, 4, S, 4, cap)
  rect(ctx, 1, 7, S-2, 1, capDk)
  rect(ctx, 4, 1, 8, 2, shade(cap, 0.14))
  // Small glowing spots on cap
  rect(ctx, 5, 2, 2, 2, shade(cap, 0.30))
  rect(ctx, 10, 3, 2, 2, shade(cap, 0.30))
  // Stem
  rect(ctx, 5, 9, 6, 7, stem)
  rect(ctx, 4, 10, 8, 5, stem)
  rect(ctx, 5, 9, 1, 7, stemDk)
  rect(ctx, 10, 9, 1, 7, stemDk)
}

DRAW.fairyLantern = ctx => {
  ctx.clearRect(0, 0, S, S)
  const glow = P.fairyLantern
  const rim  = P.fairyLanternDk
  // Round orb — concentric brightness layers
  fill(ctx, 'transparent')
  // Outer dim halo (full rect acts as background glow)
  rect(ctx, 2, 2, 12, 12, shade(rim, -0.05))
  // Mid glow band
  rect(ctx, 3, 3, 10, 10, rim)
  rect(ctx, 4, 2, 8, 12, rim)
  rect(ctx, 2, 4, 12, 8, rim)
  // Bright core
  rect(ctx, 4, 4, 8, 8, glow)
  rect(ctx, 5, 3, 6, 10, glow)
  rect(ctx, 3, 5, 10, 6, glow)
  // White hot centre
  rect(ctx, 6, 6, 4, 4, shade(glow, 0.25))
  rect(ctx, 7, 5, 2, 6, shade(glow, 0.25))
  rect(ctx, 5, 7, 6, 2, shade(glow, 0.25))
}

DRAW.enchantedMoss = ctx => {
  // Deep forest floor — dark base, varied green patches, faint glow speckles
  fill(ctx, P.enchMoss)
  const patches = [
    [0,0,4,3],[11,1,5,3],[5,5,4,4],[0,9,3,4],[12,8,4,4],[6,12,5,3],[2,13,4,2]
  ]
  for (const [x, y, w, h] of patches) rect(ctx, x, y, w, h, P.enchMossLight)
  // Tiny glow speckles — will-o-wisp light catching the moss
  const speckles = [[3,2],[8,0],[14,3],[1,6],[10,7],[5,10],[13,12],[7,15]]
  for (const [x, y] of speckles) px(ctx, x, y, P.enchMossGlow)
  // Subtle dark divots
  const divots = [[6,3],[2,5],[11,6],[4,9],[9,11],[1,14]]
  for (const [x, y] of divots) px(ctx, x, y, shade(P.enchMoss, -0.15))
}

DRAW.fairyFlower = ctx => {
  ctx.clearRect(0, 0, S, S)
  // Stem
  rect(ctx, 7, 8, 2, 8, '#508030')
  // Two side leaves
  rect(ctx, 4, 10, 3, 1, '#508030')
  rect(ctx, 9, 12, 3, 1, '#508030')
  // Outer petals — large magenta-purple
  rect(ctx, 4, 0, 8, 3, P.fairyFlower)
  rect(ctx, 4, 5, 8, 3, P.fairyFlower)
  rect(ctx, 2, 2, 4, 5, P.fairyFlower)
  rect(ctx, 10, 2, 4, 5, P.fairyFlower)
  // Petal highlight
  rect(ctx, 5, 1, 6, 1, shade(P.fairyFlower, 0.22))
  rect(ctx, 5, 6, 6, 1, shade(P.fairyFlower, 0.22))
  // Glowing centre disc
  rect(ctx, 5, 2, 6, 5, P.fairyFlowerGlow)
  rect(ctx, 6, 1, 4, 7, P.fairyFlowerGlow)
  // Centre stamen dot
  rect(ctx, 7, 3, 2, 3, shade(P.fairyFlowerDk, 0.10))
}

// ── B8: MEADOW ────────────────────────────────────────────────

DRAW.mossyStone = ctx => {
  // Weathered stone with green-brown tinge and moss patches
  drawStone(ctx, P.mossyStone, shade(P.mossyStone, -0.18))
  // Irregular surface variation (lighter highlight chips)
  const chips = [[2,1],[7,3],[11,1],[4,6],[13,5],[1,9],[9,8],[6,12],[14,10],[3,13]]
  for (const [x, y] of chips) px(ctx, x, y, P.mossyStoneHi)
  // Moss patches — small soft rectangles in a warmer green
  const patches = [[0,0,3,3],[12,2,4,3],[5,6,4,3],[0,10,3,4],[11,11,5,3]]
  for (const [x, y, w, h] of patches) rect(ctx, x, y, w, h, shade(P.mossyStone, 0.12))
}

DRAW.wildflowerPatch = ctx => {
  ctx.clearRect(0, 0, S, S)
  // Stems — scattered thin verticals
  const stemColor = '#508030'
  for (const [x, y] of [[2,7],[5,9],[8,6],[11,8],[14,7],[3,11],[9,10],[13,9]]) {
    rect(ctx, x, y, 1, S - y, stemColor)
  }
  // Dense multi-color flower dots (red, yellow, blue, pink, white)
  const flowers = [
    [2,5,'#E83030'],[5,7,'#F0D030'],[8,4,'#4080E8'],[11,6,'#E870A8'],[14,5,'#EEEEEE'],
    [1,3,'#E870A8'],[4,2,'#E83030'],[7,5,'#F0D030'],[10,3,'#4080E8'],[13,4,'#E870A8'],
    [0,8,'#EEEEEE'],[6,1,'#E83030'],[12,2,'#F0D030'],[15,6,'#4080E8'],[3,4,'#EEEEEE'],
    [9,2,'#E870A8'],[2,1,'#F0D030'],[11,1,'#E83030'],[6,7,'#EEEEEE'],[14,3,'#E870A8'],
  ]
  for (const [x, y, c] of flowers) {
    px(ctx, x, y, c)
    if (x + 1 < S) px(ctx, x + 1, y, shade(c, -0.08))
  }
}

DRAW.wispLight = ctx => {
  ctx.clearRect(0, 0, S, S)
  // Will-o-wisp — soft icy blue orb, pure white core
  // Outer glow halo
  rect(ctx, 3, 3, 10, 10, shade(P.wispLightDk, -0.10))
  rect(ctx, 4, 2, 8, 12, shade(P.wispLightDk, -0.10))
  rect(ctx, 2, 4, 12, 8, shade(P.wispLightDk, -0.10))
  // Mid glow
  rect(ctx, 4, 4, 8, 8, P.wispLightDk)
  rect(ctx, 5, 3, 6, 10, P.wispLightDk)
  rect(ctx, 3, 5, 10, 6, P.wispLightDk)
  // Bright ring
  rect(ctx, 5, 5, 6, 6, P.wispLight)
  rect(ctx, 6, 4, 4, 8, P.wispLight)
  rect(ctx, 4, 6, 8, 4, P.wispLight)
  // Pure white core
  rect(ctx, 6, 6, 4, 4, P.wispCore)
  rect(ctx, 7, 5, 2, 6, P.wispCore)
}

// ── B9: CHERRY ───────────────────────────────────────────────

DRAW.petalCarpet = ctx => {
  // Pale green base — like grass dusted with fallen petals
  fill(ctx, P.petalGreen)
  // Subtle grass-texture variation
  const grass = [[1,2],[5,0],[9,3],[13,1],[3,7],[7,5],[11,8],[14,6],[2,11],[6,13],[10,10],[15,12]]
  for (const [x, y] of grass) px(ctx, x, y, shade(P.petalGreen, -0.10))
  // Scattered petal shapes — small 2×1 or 1×2 blobs in pink/white
  const petals = [
    [2, 3, 2, 1, P.petalPink],
    [7, 1, 1, 2, P.petalWhite],
    [12, 4, 2, 1, P.petalPink],
    [4, 8, 2, 1, P.petalWhite],
    [10, 6, 1, 2, P.petalPink],
    [1, 12, 2, 1, P.petalWhite],
    [8, 10, 2, 1, P.petalPink],
    [14, 11, 1, 2, P.petalPink],
    [6, 14, 2, 1, P.petalWhite],
    [11, 13, 1, 2, P.petalPink],
  ]
  for (const [x, y, w, h, c] of petals) rect(ctx, x, y, w, h, c)
}

// ── B10: BLODMARK ──────────────────────────────────────────────

DRAW.bloodWater = ctx => {
  fill(ctx, P.vBloodBase)
  // Dark ripple lines
  for (let y = 1; y < S; y += 4) rect(ctx, 0, y, S, 1, P.vBloodLight)
  // Surface shimmer specks
  const shimmer = [[3,2],[9,0],[13,3],[5,6],[11,5],[2,9],[7,10],[14,8]]
  for (const [x, y] of shimmer) px(ctx, x, y, shade(P.vBloodLight, 0.12))
  // Edge darkening
  rect(ctx, 0, S-1, S, 1, shade(P.vBloodBase, -0.15))
}

DRAW.bloodWaterFlow = ctx => {
  fill(ctx, P.vBloodBase)
  // Vertical flow streaks
  for (let x of [3, 7, 11]) {
    rect(ctx, x, 0, 2, S, shade(P.vBloodBase, 0.08))
  }
  // Dark valleys between streaks
  for (let x of [0, 5, 9, 13]) {
    rect(ctx, x, 0, 1, S, shade(P.vBloodBase, -0.10))
  }
  // Ripple cross marks
  rect(ctx, 0, 5, S, 1, shade(P.vBloodLight, -0.05))
  rect(ctx, 0, 11, S, 1, shade(P.vBloodLight, -0.05))
}

DRAW.crimsonMossTop = ctx => {
  fill(ctx, P.vCrimsonMoss)
  // Dark patches — oppressive, uneven surface
  const patches = [[0,0,5,4],[11,1,5,3],[4,6,5,5],[0,10,4,4],[12,9,4,5],[6,13,5,3]]
  for (const [x, y, w, h] of patches) rect(ctx, x, y, w, h, P.vCrimsonLight)
  // Sparse lighter flecks
  const flecks = [[2,3],[8,1],[13,5],[5,8],[1,12],[10,11],[14,13]]
  for (const [x, y] of flecks) px(ctx, x, y, shade(P.vCrimsonLight, 0.18))
  // Top highlight bevel
  rect(ctx, 0, 0, S, 1, shade(P.vCrimsonLight, 0.10))
}

DRAW.crimsonMossSide = ctx => {
  // Top crimson band fading into dark stone
  const splitY = 4
  fill(ctx, P.vDarkStone)
  rect(ctx, 0, 0, S, splitY, P.vCrimsonMoss)
  rect(ctx, 0, splitY - 1, S, 1, shade(P.vCrimsonMoss, -0.15))
  // Vertical dark fissures in the stone portion
  for (let x = 2; x < S; x += 5) rect(ctx, x, splitY, 1, S - splitY, P.vDarkCrack)
}

DRAW.vDarkStone = ctx => {
  fill(ctx, P.vDarkStone)
  // Crimson-tinted cracks — feels ancient and corrupted
  const cracks = [[2,3,4,1],[9,1,3,1],[1,8,5,1],[11,10,4,1],[4,13,6,1],[7,6,2,1]]
  for (const [x, y, w, h] of cracks) rect(ctx, x, y, w, h, P.vDarkCrack)
  // Subtle obsidian sheen highlights
  const sheen = [[5,2],[12,4],[3,9],[10,12],[8,7],[1,14]]
  for (const [x, y] of sheen) px(ctx, x, y, shade(P.vDarkStone, 0.14))
}

DRAW.bloodwoodLogTop = ctx => drawLogTop(ctx, P.vBloodBark, P.vBloodBarkLt)

DRAW.bloodwoodLogSide = ctx => {
  fill(ctx, P.vBloodBark)
  // Deep vertical bark furrows — darker than the body
  for (let x = 0; x < S; x += 4) {
    rect(ctx, x, 0, 2, S, P.vDarkCrack)
    rect(ctx, x + 2, 0, 2, S, shade(P.vBloodBark, 0.10))
  }
  // Faint crimson sap seeps — small horizontal flecks
  const seeps = [[1,3],[6,7],[10,4],[3,11],[8,13],[13,8]]
  for (const [x, y] of seeps) px(ctx, x, y, P.vBloodBase)
  // Bottom shadow
  rect(ctx, 0, S-1, S, 1, P.vDarkCrack)
}

DRAW.bloodwoodLeaves = ctx => {
  // Deep crimson canopy — same cluster geometry as other leaves
  drawLeaves(ctx, P.vBloodLeaves)
  // Near-black shadow clusters (sinister depth)
  const dark = [[4,2,3,2],[10,5,2,3],[1,8,2,2],[12,10,3,2],[6,13,4,2]]
  for (const [x, y, w, h] of dark) rect(ctx, x, y, w, h, shade(P.vBloodLeaves, -0.22))
  // Rare crimson bright tips
  const tips = [[5,1],[11,3],[2,6],[13,9],[7,14]]
  for (const [x, y] of tips) px(ctx, x, y, P.vBloodBase)
}

DRAW.darkThorns = ctx => {
  ctx.clearRect(0, 0, S, S)
  // Two diagonal thorn stalks — X cross shape like regular plants
  const dark  = shade(P.vDarkStone, 0.12)
  const sharp = P.vBloodLight
  // Left stalk (\)
  for (let i = 0; i < S; i++) {
    px(ctx, i, i, dark)
    if (i > 0) px(ctx, i - 1, i, shade(dark, -0.08))
  }
  // Right stalk (/)
  for (let i = 0; i < S; i++) {
    px(ctx, S - 1 - i, i, dark)
  }
  // Thorn spikes — short horizontal jabs at intervals
  for (const [x, y] of [[4,3],[11,3],[2,8],[13,8],[5,12],[10,12]]) {
    px(ctx, x, y, sharp)
  }
}

DRAW.bloodCrystal = ctx => {
  ctx.clearRect(0, 0, S, S)
  const mid   = P.vBloodCrystal
  const dark  = P.vBloodCrystDk
  const light = shade(P.vBloodCrystal, 0.25)
  // Hexagonal crystal facets — same construction as blue crystal
  // Centre column
  rect(ctx, 5, 0, 6, S, mid)
  // Side columns (darker)
  rect(ctx, 3, 2, 3, 12, dark)
  rect(ctx, 10, 2, 3, 12, dark)
  // Left bevel
  rect(ctx, 2, 3, 2, 10, shade(dark, -0.10))
  // Right bevel
  rect(ctx, 12, 3, 2, 10, shade(dark, -0.10))
  // Top cap
  rect(ctx, 6, 0, 4, 2, light)
  // Bottom cap
  rect(ctx, 6, S-2, 4, 2, dark)
  // Inner glow stripe
  rect(ctx, 7, 2, 2, S-4, shade(light, 0.10))
}

DRAW.vampireThroneTop = ctx => {
  fill(ctx, P.vThroneWood)
  // Crimson velvet seat cushion
  rect(ctx, 2, 3, S-4, S-5, P.vThroneBlood)
  rect(ctx, 3, 4, S-6, S-7, shade(P.vThroneBlood, -0.10))
  // Gold trim border
  rect(ctx, 1, 2, S-2, 1, P.vThroneGold)
  rect(ctx, 1, S-3, S-2, 1, P.vThroneGold)
  rect(ctx, 1, 2, 1, S-4, P.vThroneGold)
  rect(ctx, S-2, 2, 1, S-4, P.vThroneGold)
  // Backrest top edge (back face = v=0)
  rect(ctx, 0, 0, S, 2, shade(P.vThroneWood, 0.12))
}

DRAW.vampireThroneSide = ctx => {
  fill(ctx, P.vThroneWood)
  // Crimson velvet cushion face
  rect(ctx, 1, 5, S-2, 3, P.vThroneBlood)
  rect(ctx, 2, 6, S-4, 2, shade(P.vThroneBlood, -0.08))
  // Tall backrest
  rect(ctx, 0, 0, 2, S, shade(P.vThroneWood, 0.10))
  rect(ctx, S-2, 0, 2, S, shade(P.vThroneWood, 0.10))
  // Gold top rail
  rect(ctx, 1, 0, S-2, 2, P.vThroneGold)
  // Pointed crown spikes atop the backrest
  px(ctx, 3, 0, P.vThroneGold)
  px(ctx, 7, 0, P.vThroneGold)
  px(ctx, 11, 0, P.vThroneGold)
  // Carved vampire crest — vertical blood stripe
  rect(ctx, 7, 2, 2, 3, P.vThroneBlood)
  // Leg carving
  rect(ctx, 2, S-4, 3, 4, shade(P.vThroneWood, -0.12))
  rect(ctx, S-5, S-4, 3, 4, shade(P.vThroneWood, -0.12))
}

DRAW.vampireThroneBottom = ctx => {
  fill(ctx, P.vThroneWood)
  // Four leg footprints
  rect(ctx, 1, 1, 3, 3, shade(P.vThroneWood, -0.15))
  rect(ctx, S-4, 1, 3, 3, shade(P.vThroneWood, -0.15))
  rect(ctx, 1, S-4, 3, 3, shade(P.vThroneWood, -0.15))
  rect(ctx, S-4, S-4, 3, 3, shade(P.vThroneWood, -0.15))
}

DRAW.stoneLantern = ctx => {
  // Dark stone body
  fill(ctx, P.stoneLantern)
  // Subtle stone cracking
  const cracks = [[3,4,2,1],[10,2,3,1],[2,9,4,1],[9,11,3,1]]
  for (const [x, y, w, h] of cracks) rect(ctx, x, y, w, h, shade(P.stoneLantern, -0.18))
  // Stone highlights
  const hi = [[1,1],[6,3],[12,2],[14,8],[2,14]]
  for (const [x, y] of hi) px(ctx, x, y, shade(P.stoneLantern, 0.18))
  // Glowing inset panel — central glowing square
  rect(ctx, 4, 4, 8, 8, P.stoneLanternGlow)
  rect(ctx, 5, 5, 6, 6, shade(P.stoneLanternGlow, 0.15))
  // Lantern frame cross bars over glow
  rect(ctx, 7, 4, 2, 8, P.stoneLantern)
  rect(ctx, 4, 7, 8, 2, P.stoneLantern)
  // "Roof" detail on top — overhanging cap
  rect(ctx, 1, 0, 14, 2, shade(P.stoneLantern, 0.10))
  rect(ctx, 0, 1, S, 1, shade(P.stoneLantern, 0.06))
}

// ─────────────────────────────────────────────────────────────
//  Furniture — Phase 18
// ─────────────────────────────────────────────────────────────

// ── Chair ──────────────────────────────────────────────────
// Top: seat cushion (head of cushion = backrest end at v=0/top of image)
DRAW.chairTop = ctx => {
  fill(ctx, P.chairCushion)
  // Cushion border + seam
  rect(ctx, 1, 1, S-2, S-2, P.chairCushionDk)
  rect(ctx, 2, 2, S-4, S-4, P.chairCushion)
  // Stitch seam across middle
  rect(ctx, 2, 8, S-4, 1, P.chairCushionDk)
  // Backrest edge bar at top of image (z=0 side = head of cushion)
  rect(ctx, 0, 0, S, 3, P.oakBark)
  rect(ctx, 1, 1, S-2, 2, P.oakBarkDark)
}
// Side: shown on seat sides and backrest faces — shows oak frame + cushion
DRAW.chairSide = ctx => {
  fill(ctx, P.oakPlanks)
  // Cushion face (upper half of side face = seat)
  rect(ctx, 1, 4, S-2, 4, P.chairCushion)
  rect(ctx, 2, 5, S-4, 2, P.chairCushionDk)
  // Frame wood uprights on sides
  rect(ctx, 0, 0, 2, S, P.oakBark)
  rect(ctx, S-2, 0, 2, S, P.oakBark)
  // Top rail (backrest)
  rect(ctx, 2, 1, S-4, 2, P.oakBark)
}
DRAW.chairBottom = ctx => {
  fill(ctx, P.oakPlanks)
  rect(ctx, 0, 0, 3, 3, P.oakBark)
  rect(ctx, S-3, 0, 3, 3, P.oakBark)
  rect(ctx, 0, S-3, 3, 3, P.oakBark)
  rect(ctx, S-3, S-3, 3, 3, P.oakBark)
}

// ── Table ──────────────────────────────────────────────────
// Top: wide-plank oak surface with border
DRAW.tableTop = ctx => {
  fill(ctx, P.oakPlanks)
  // Plank grain lines
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.oakPlanksDark)
  // Dark border edge
  rect(ctx, 0, 0, S, 1, P.oakBark)
  rect(ctx, 0, S-1, S, 1, P.oakBark)
  rect(ctx, 0, 0, 1, S, P.oakBark)
  rect(ctx, S-1, 0, 1, S, P.oakBark)
}
// Side: clean apron face (no leg decorations — legs are separate geometry)
DRAW.tableSide = ctx => {
  fill(ctx, P.oakPlanks)
  // Plank grain
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.oakPlanksDark)
  // Bottom edge shadow
  rect(ctx, 0, S-2, S, 2, P.oakBark)
  // Left/right edge highlight
  rect(ctx, 0, 0, 1, S, P.oakBark)
  rect(ctx, S-1, 0, 1, S, P.oakBark)
}

// ── Bed ────────────────────────────────────────────────────
// Top: pillow at v=0 (head/north end), blanket toward v=1 (foot)
DRAW.bedTop = ctx => {
  fill(ctx, P.bedFrame)
  rect(ctx, 1, 1, S-2, S-2, '#F0EBE0')
  // Pillow (head end — top of image = v=0 = z=0 for facing=0)
  rect(ctx, 2, 1, S-4, 5, P.bedPillow)
  rect(ctx, 3, 2, S-6, 3, '#FFFFFF')
  rect(ctx, 2, 5, S-4, 1, '#D0C8B0')
  // Blanket body
  rect(ctx, 2, 7, S-4, S-9, P.bedBlanket)
  rect(ctx, 3, 8, S-6, S-12, P.bedBlanketDk)
  // Blanket fold (top of blanket, near head)
  rect(ctx, 2, 6, S-4, 2, '#FFFFFF')
  rect(ctx, 3, 7, S-6, 1, P.bedBlanket)
}
DRAW.bedSide = ctx => {
  fill(ctx, P.bedFrame)
  // Mattress
  rect(ctx, 0, 7, S, 2, '#F0EBE0')
  // Blanket drape
  rect(ctx, 0, 8, S, 2, P.bedBlanket)
  // Frame legs
  rect(ctx, 1, S-4, 2, 4, P.oakBark)
  rect(ctx, S-3, S-4, 2, 4, P.oakBark)
  // Headboard/footboard slat
  rect(ctx, 0, 0, 2, 9, P.oakBark)
  rect(ctx, S-2, 0, 2, 9, P.oakBark)
}
DRAW.bedBottom = ctx => {
  fill(ctx, P.bedFrame)
  for (let x = 3; x < S-3; x += 3) rect(ctx, x, 0, 1, S, P.oakBarkDark)
}

// ── Chest ──────────────────────────────────────────────────
DRAW.chestBlockTop = ctx => {
  fill(ctx, P.oakPlanks)
  // Iron band ring
  rect(ctx, 0, 6, S, 2, '#909898')
  rect(ctx, 6, 0, 2, S, '#909898')
  // Latch
  rect(ctx, 6, 6, 4, 4, '#B0C0B0')
  rect(ctx, 7, 7, 2, 2, '#808888')
}
DRAW.chestBlockSide = ctx => {
  fill(ctx, P.oakPlanks)
  // Horizontal iron bands
  rect(ctx, 0, 3, S, 2, '#909898')
  rect(ctx, 0, S-5, S, 2, '#909898')
  // Vertical corner bands
  rect(ctx, 0, 0, 2, S, '#909898')
  rect(ctx, S-2, 0, 2, S, '#909898')
  // Lock on front (centred)
  rect(ctx, 6, 5, 4, 6, '#808888')
  rect(ctx, 7, 7, 2, 2, P.oakBarkDark)
}
DRAW.chestBlockBottom = ctx => {
  fill(ctx, P.oakBark)
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.oakBarkDark)
}

// ── Sofa ───────────────────────────────────────────────────
// Top: backrest at v=0 (z=0), seat cushion body, armrests on x sides
DRAW.sofaTop = ctx => {
  fill(ctx, P.sofaFabric)
  // Backrest section (top of image = z=0 side)
  rect(ctx, 0, 0, S, 3, P.sofaFabricDk)
  rect(ctx, 1, 0, S-2, 2, '#A07858')
  // Seat cushion body
  rect(ctx, 3, 3, S-6, S-5, '#C89878')
  rect(ctx, 4, 4, S-8, S-8, '#D4A880')
  // Cushion seam
  rect(ctx, 3, 9, S-6, 1, P.sofaFabric)
  // Armrest bars (left/right sides)
  rect(ctx, 0, 3, 3, S-5, P.sofaFabricDk)
  rect(ctx, S-3, 3, 3, S-5, P.sofaFabricDk)
}
// Side: shows the sofa profile — seat + backrest up the back
DRAW.sofaSide = ctx => {
  fill(ctx, P.sofaFabric)
  // Seat cushion face
  rect(ctx, 1, 5, S-2, 4, '#C89878')
  rect(ctx, 2, 6, S-4, 2, '#D4A880')
  // Backrest face
  rect(ctx, 1, 1, S-2, 4, P.sofaFabricDk)
  // Frame/leg at bottom
  rect(ctx, 1, S-3, 2, 3, P.oakBark)
  rect(ctx, S-3, S-3, 2, 3, P.oakBark)
  // Side borders
  rect(ctx, 0, 0, 1, S, P.sofaFabricDk)
  rect(ctx, S-1, 0, 1, S, P.sofaFabricDk)
}
DRAW.sofaBottom = ctx => {
  fill(ctx, P.sofaFabric)
  rect(ctx, 2, 2, S-4, S-4, P.sofaFabricDk)
}

// ── Cabinet ────────────────────────────────────────────────
DRAW.cabinetTop = ctx => {
  fill(ctx, P.darkPlanks)
  for (let x = 4; x < S; x += 4) rect(ctx, x, 0, 1, S, P.darkPlanks2)
  rect(ctx, 0, 0, 1, S, P.darkBark)
  rect(ctx, S-1, 0, 1, S, P.darkBark)
}
// Front face: two door panels with knob handles
DRAW.cabinetFront = ctx => {
  fill(ctx, P.darkPlanks)
  // Door panel left
  rect(ctx, 1, 1, 6, S-2, P.darkPlanks2)
  rect(ctx, 2, 2, 4, S-4, P.darkPlanks)
  // Door panel right
  rect(ctx, 9, 1, 6, S-2, P.darkPlanks2)
  rect(ctx, 10, 2, 4, S-4, P.darkPlanks)
  // Divider strip
  rect(ctx, 7, 0, 2, S, P.darkBark)
  // Door handles
  rect(ctx, 6, 7, 2, 2, P.cabinetMetal)
  rect(ctx, 8, 7, 2, 2, P.cabinetMetal)
}

// ─────────────────────────────────────────────────────────────
//  Non-cube geometry block textures
// ─────────────────────────────────────────────────────────────

// Fence post — same face on all sides (oak plank cross-section)
DRAW.fence = ctx => {
  fill(ctx, P.oakPlanks)
  for (let x = 2; x < S; x += 5) rect(ctx, x, 0, 1, S, P.oakPlanksDark)
  rect(ctx, 0, 7, S, 2, P.oakPlanksDark)
  rect(ctx, 0, 0, S, 1, shade(P.oakPlanks, 0.15))
  rect(ctx, 0, S - 1, S, 1, shade(P.oakPlanks, -0.12))
}

// Trapdoor top face — plank lid with iron strap
DRAW.trapdoorTop = ctx => {
  drawPlanks(ctx, P.oakPlanks, P.oakPlanksDark, 8)
  // Iron strap across the middle
  rect(ctx, 0, 6, S, 4, '#707070')
  rect(ctx, 0, 7, S, 2, '#808080')
  // Rivet dots
  px(ctx, 2, 7, '#A0A0A0'); px(ctx, 13, 7, '#A0A0A0')
}

// Trapdoor side — shows the half-thickness edge
DRAW.trapdoorSide = ctx => {
  fill(ctx, P.oakPlanks)
  rect(ctx, 0, 0, S, 8, P.oakPlanksDark)
  rect(ctx, 0, 7, S, 1, shade(P.oakPlanksDark, -0.1))
  rect(ctx, 0, 8, S, 1, shade(P.oakPlanks, 0.12))
  // Plank joint
  rect(ctx, 8, 0, 1, 8, shade(P.oakPlanksDark, -0.1))
}

// Ladder — rope rungs on bark background
DRAW.ladder = ctx => {
  fill(ctx, P.oakBark)
  // Vertical side rails
  rect(ctx, 1, 0, 3, S, P.oakBarkDark)
  rect(ctx, 12, 0, 3, S, P.oakBarkDark)
  // Horizontal rungs
  for (let y = 2; y < S; y += 4) {
    rect(ctx, 1, y, 14, 2, P.oakBarkDark)
    rect(ctx, 2, y, 12, 1, shade(P.oakBark, 0.10))
  }
}

// Door face — vertical plank panel with frame
DRAW.doorSide = ctx => {
  drawPlanks(ctx, P.oakPlanks, P.oakPlanksDark, 4)
  // Frame border
  rect(ctx, 0, 0, 2, S, P.oakBark)
  rect(ctx, S - 2, 0, 2, S, P.oakBark)
  rect(ctx, 0, 0, S, 2, P.oakBark)
  rect(ctx, 0, S - 2, S, 2, P.oakBark)
  // Door handle
  rect(ctx, 11, 7, 2, 3, '#909090')
  px(ctx, 12, 8, '#C0C0C0')
}

// Door top/bottom edge — narrow end grain
DRAW.doorTop = ctx => {
  fill(ctx, P.oakBark)
  rect(ctx, 0, 0, S, 1, shade(P.oakBark, 0.12))
  rect(ctx, 0, S - 1, S, 1, shade(P.oakBark, -0.12))
  for (let x = 2; x < S; x += 4) rect(ctx, x, 0, 2, S, P.oakBarkDark)
}

// ─────────────────────────────────────────────────────────────
//  Kitchen / Bathroom / Bedroom furniture textures
// ─────────────────────────────────────────────────────────────

// ── Kitchen Counter ──────────────────────────────────────────
// Top: ceramic tile surface with integrated sink basin
DRAW.counterTop = ctx => {
  fill(ctx, P.counterBase)
  // Grout lines (tile grid)
  for (let x = 0; x < S; x += 4) rect(ctx, x, 0, 1, S, P.counterEdge)
  for (let y = 0; y < S; y += 4) rect(ctx, 0, y, S, 1, P.counterEdge)
  // Sink basin (right half of counter)
  rect(ctx, 8, 2, 7, 12, '#8890A0')
  rect(ctx, 9, 3, 5, 10, '#606878')
  // Drain
  rect(ctx, 11, 7, 2, 2, '#404850')
  px(ctx, 11, 7, '#505860'); px(ctx, 12, 8, '#505860')
  // Edge highlight
  rect(ctx, 0, 0, S, 1, '#F0EEEA')
  rect(ctx, 0, 0, 1, S, '#F0EEEA')
}
// Side: ceramic tile edge profile
DRAW.counterSide = ctx => {
  fill(ctx, P.counterBase)
  for (let y = 0; y < S; y += 4) rect(ctx, 0, y, S, 1, P.counterEdge)
  rect(ctx, 0, 0, S, 2, '#F0EEEA')
  rect(ctx, 0, S - 2, S, 2, P.counterEdge)
  rect(ctx, 0, 0, 1, S, '#F0EEEA')
  rect(ctx, S - 1, 0, 1, S, shade(P.counterEdge, -0.08))
}

// ── Stove ────────────────────────────────────────────────────
// Top: dark metal with 4 burner coil elements
DRAW.stoveTop = ctx => {
  fill(ctx, P.stoveBody)
  // 4 burners in a 2×2 grid
  for (const [bx, by] of [[4,4],[12,4],[4,12],[12,12]]) {
    rect(ctx, bx-3, by-1, 5, 3, P.stoveLight)
    rect(ctx, bx-1, by-3, 3, 5, P.stoveLight)
    rect(ctx, bx-1, by-1, 3, 3, shade(P.stoveBody, -0.04))
    px(ctx, bx, by, P.stoveGlow)
  }
  // Rear control panel strip
  rect(ctx, 0, 0, S, 2, shade(P.stoveBody, -0.08))
  for (const kx of [2, 6, 10, 14]) px(ctx, kx, 1, '#707880')
}
// Side: dark brushed metal panel
DRAW.stoveSide = ctx => {
  fill(ctx, P.stoveBody)
  rect(ctx, 0, 0, S, 2, shade(P.stoveBody, -0.06))
  rect(ctx, 0, S - 1, S, 1, shade(P.stoveBody, -0.10))
  rect(ctx, 2, 3, S - 4, S - 6, P.stoveLight)
  rect(ctx, 3, 4, S - 6, S - 8, P.stoveBody)
  rect(ctx, 0, 0, 1, S, '#202428')
  rect(ctx, S - 1, 0, 1, S, '#202428')
}
// Front: oven door with glass window + knobs
DRAW.stoveFront = ctx => {
  fill(ctx, P.stoveBody)
  // Oven glass window
  rect(ctx, 2, 1, 12, 8, P.stoveLight)
  rect(ctx, 3, 2, 10, 6, '#181C22')
  rect(ctx, 3, 2, 10, 1, '#282E3A')
  // Door handle bar
  rect(ctx, 2, 10, 12, 2, '#707880')
  rect(ctx, 2, 10, 12, 1, '#9098A0')
  // Control knobs (bottom row)
  for (const kx of [1, 5, 9, 13]) {
    rect(ctx, kx, 13, 2, 2, '#585E66')
    px(ctx, kx, 13, '#808890')
  }
  rect(ctx, 0, 0, 1, S, shade(P.stoveBody, -0.08))
  rect(ctx, S - 1, 0, 1, S, shade(P.stoveBody, -0.08))
  rect(ctx, 0, S - 1, S, 1, shade(P.stoveBody, -0.10))
}

// ── Fridge ───────────────────────────────────────────────────
// Side: clean white/off-white exterior
DRAW.fridgeSide = ctx => {
  fill(ctx, '#F0F0F0')
  rect(ctx, 0, 0, S, 1, '#FFFFFF')
  rect(ctx, 0, 0, 1, S, '#FFFFFF')
  rect(ctx, S - 1, 0, 1, S, '#D0D0D0')
  rect(ctx, 0, S - 1, S, 1, '#D0D0D0')
  rect(ctx, 2, 2, S - 4, S - 4, '#ECECEC')
}
// Front: white door with freezer divider and handle
DRAW.fridgeFront = ctx => {
  fill(ctx, '#F0F0F0')
  // Freezer divider
  rect(ctx, 1, 5, S - 2, 1, '#C8C8C8')
  // Door panels (inset)
  rect(ctx, 2, 1, S - 4, 4, '#E8E8E8')
  rect(ctx, 2, 6, S - 4, S - 8, '#E8E8E8')
  // Handle (right side)
  rect(ctx, S - 3, 2, 2, 12, '#ACACB4')
  rect(ctx, S - 3, 2, 1, 12, '#C8C8D0')
  // Small display/indicator (top-left of lower door)
  rect(ctx, 3, 7, 4, 2, '#A0C8D0')
  px(ctx, 4, 8, '#60A0B0')
  // Frame edges
  rect(ctx, 0, 0, 1, S, '#D8D8D8')
  rect(ctx, 0, S - 1, S, 1, '#C8C8C8')
}

// ── Toilet ───────────────────────────────────────────────────
// Top: symmetric top-down view of seat + bowl
DRAW.toiletTop = ctx => {
  fill(ctx, P.toiletTop)
  // Lid surface (fills most of the top, slightly inset)
  rect(ctx, 2, 1, S - 4, S - 3, shade(P.toiletTop, -0.03))
  // Lid rim highlight
  rect(ctx, 2, 1, S - 4, 1, '#FFFFFF')
  rect(ctx, 2, 1, 1, S - 4, '#FFFFFF')
  // Lid shadow edge
  rect(ctx, 2, S - 3, S - 4, 1, shade(P.toiletTop, -0.10))
  rect(ctx, S - 2, 1, 1, S - 3, shade(P.toiletTop, -0.08))
  // Water visible inside (lid gap near front)
  rect(ctx, 4, S - 4, 8, 3, '#4888C0')
  rect(ctx, 5, S - 3, 6, 2, '#5898D0')
  px(ctx, 6, S - 3, '#80B8E8')  // water glint
  // Hinge bumps at back
  px(ctx, 4, 1, shade(P.toiletTop, -0.12))
  px(ctx, S - 5, 1, shade(P.toiletTop, -0.12))
}
// Side: white porcelain — tank at back, curved bowl body in front
DRAW.toiletSide = ctx => {
  fill(ctx, P.toiletTop)
  // Tank body (left = back of toilet in side view)
  rect(ctx, 0, 0, 6, 14, shade(P.toiletTop, -0.05))
  rect(ctx, 1, 1, 4, 12, shade(P.toiletTop, 0.02))
  // Tank top edge highlight
  rect(ctx, 0, 0, 6, 1, '#FFFFFF')
  rect(ctx, 0, 0, 1, 14, '#FFFFFF')
  // Bowl body front (right side, lower — curves inward at bottom)
  rect(ctx, 5, 8, 11, 7, shade(P.toiletTop, -0.04))
  rect(ctx, 6, 9, 9, 6, shade(P.toiletTop, 0.01))
  // Base curve taper (slightly narrower at very bottom)
  rect(ctx, 7, S - 2, 7, 2, shade(P.toiletTop, -0.08))
  // Lid lip (thin line above bowl front)
  rect(ctx, 5, 8, 10, 1, shade(P.toiletTop, -0.10))
  // Overall base line
  rect(ctx, 0, S - 1, S, 1, shade(P.toiletTop, -0.12))
  rect(ctx, S - 1, 0, 1, S, shade(P.toiletTop, -0.08))
}

// ── Bathtub ──────────────────────────────────────────────────
// Single texture used for all faces (exterior and interior)
DRAW.tubSide = ctx => {
  fill(ctx, P.tubSide)
  // Panel inset
  rect(ctx, 2, 2, S - 4, S - 5, shade(P.tubSide, -0.06))
  rect(ctx, 3, 3, S - 6, S - 7, shade(P.tubSide, -0.03))
  // Feet at bottom corners
  rect(ctx, 2, S - 3, 3, 3, shade(P.tubSide, -0.12))
  rect(ctx, S - 5, S - 3, 3, 3, shade(P.tubSide, -0.12))
  // Top rim highlight
  rect(ctx, 0, 0, S, 2, '#FFFFFF')
  rect(ctx, 0, 0, 1, S, '#FFFFFF')
  rect(ctx, S - 1, 0, 1, S, shade(P.tubSide, -0.10))
  rect(ctx, 0, S - 1, S, 1, shade(P.tubSide, -0.10))
}

// ── Bathtub water surface ────────────────────────────────────
DRAW.tubWater = ctx => {
  fill(ctx, P.tubWater)
  // Subtle ripple highlights
  rect(ctx, 2, 3, S - 4, 2, shade(P.tubWater, 0.12))
  rect(ctx, 4, 7, S - 8, 1, shade(P.tubWater, 0.08))
  rect(ctx, 1, 11, S - 5, 2, shade(P.tubWater, 0.10))
  // Light glint
  rect(ctx, S - 4, 2, 2, 1, '#E8F8FF')
}

// ── Dresser ──────────────────────────────────────────────────
// Front: 3 drawer fronts with brass handles — reuses cabinetTop for sides
DRAW.dresserFront = ctx => {
  fill(ctx, P.darkPlanks2)
  // 3 drawer fronts
  for (const [dy, dh] of [[1, 4],[6, 4],[11, 4]]) {
    rect(ctx, 2, dy, S - 4, dh, P.darkPlanks)
    rect(ctx, 3, dy + 1, S - 6, dh - 2, P.darkPlanks2)
    // Brass handle (centred)
    rect(ctx, 5, dy + 1, 6, 2, '#C8C090')
    rect(ctx, 5, dy + 1, 6, 1, '#E0D8A8')
  }
  // Frame side rails
  rect(ctx, 0, 0, 2, S, P.darkBark)
  rect(ctx, S - 2, 0, 2, S, P.darkBark)
  rect(ctx, 0, 0, S, 1, P.darkBark)
  rect(ctx, 0, S - 1, S, 1, P.darkBark)
}

// ── Fridge top half ──────────────────────────────────────────
// Freezer door section with horizontal vent line at top
DRAW.fridgeTopFront = ctx => {
  fill(ctx, P.fridgeTopBody)
  // Subtle horizontal panel division (freezer look)
  rect(ctx, 0, 0, S, 4, shade(P.fridgeTopBody, -0.06))
  rect(ctx, 0, 0, S, 1, '#FFFFFF')
  // Door handle (right side)
  rect(ctx, S - 4, 4, 2, 8, shade(P.fridgeTopBody, -0.12))
  rect(ctx, S - 4, 4, 1, 8, shade(P.fridgeTopBody, -0.04))
  // Freezer label area
  rect(ctx, 2, 5, 8, 2, shade(P.fridgeTopBody, -0.08))
  rect(ctx, 2, 5, 8, 1, shade(P.fridgeTopBody, -0.04))
  // Bottom edge where top meets lower door
  rect(ctx, 0, S - 1, S, 1, shade(P.fridgeTopBody, -0.14))
}
DRAW.fridgeTopSide = ctx => {
  fill(ctx, P.fridgeTopBody)
  rect(ctx, 0, 0, 1, S, '#FFFFFF')
  rect(ctx, S - 1, 0, 1, S, shade(P.fridgeTopBody, -0.10))
  rect(ctx, 0, S - 1, S, 1, shade(P.fridgeTopBody, -0.08))
}
DRAW.fridgeTopTop = ctx => {
  fill(ctx, P.fridgeTopBody)
  // Vent grille lines
  for (let x = 3; x < S - 2; x += 3) rect(ctx, x, 2, 1, S - 4, shade(P.fridgeTopBody, -0.10))
  rect(ctx, 0, 0, S, 2, shade(P.fridgeTopBody, -0.06))
  rect(ctx, 0, 0, 1, S, '#FFFFFF')
}

// ── Food items ───────────────────────────────────────────────
DRAW.foodApple = ctx => {
  fill(ctx, '#70C840')   // leaf/stem bg
  // Apple body
  rect(ctx, 3, 3, 10, 10, P.foodApple)
  rect(ctx, 4, 2, 8, 11, P.foodApple)
  rect(ctx, 2, 4, 12, 8, P.foodApple)
  // Highlight
  rect(ctx, 5, 4, 3, 3, shade(P.foodApple, 0.18))
  // Stem
  rect(ctx, 7, 1, 2, 2, '#5A3818')
  // Leaf
  rect(ctx, 9, 1, 4, 2, '#48A828')
  // Shadow
  rect(ctx, 10, 10, 3, 3, shade(P.foodApple, -0.14))
}
DRAW.foodBread = ctx => {
  fill(ctx, '#E8D0A0')
  rect(ctx, 2, 4, 12, 8, P.foodBread)
  rect(ctx, 3, 3, 10, 10, P.foodBread)
  // Crust top
  rect(ctx, 3, 3, 10, 2, shade(P.foodBread, -0.20))
  // Score line
  rect(ctx, 6, 4, 4, 1, shade(P.foodBread, -0.15))
  // Highlight
  rect(ctx, 4, 4, 4, 2, shade(P.foodBread, 0.12))
  // Bottom crust
  rect(ctx, 3, S - 4, 10, 2, shade(P.foodBread, -0.18))
}
DRAW.foodCarrot = ctx => {
  fill(ctx, '#50A830')   // green bg
  // Body
  rect(ctx, 5, 3, 6, 12, P.foodCarrot)
  rect(ctx, 4, 4, 8, 10, P.foodCarrot)
  // Tapers
  rect(ctx, 6, 13, 4, 1, P.foodCarrot)
  rect(ctx, 7, 14, 2, 1, P.foodCarrot)
  // Highlight
  rect(ctx, 6, 4, 2, 5, shade(P.foodCarrot, 0.18))
  // Texture rings
  for (let y = 6; y < 13; y += 3) rect(ctx, 4, y, 8, 1, shade(P.foodCarrot, -0.10))
  // Green tops
  rect(ctx, 6, 1, 4, 3, '#48A828')
  rect(ctx, 5, 2, 2, 2, '#38882A')
  rect(ctx, 9, 1, 2, 3, '#38882A')
}
DRAW.foodCookie = ctx => {
  fill(ctx, '#D8C090')
  rect(ctx, 3, 2, 10, 12, P.foodCookie)
  rect(ctx, 2, 3, 12, 10, P.foodCookie)
  // Edge crust
  rect(ctx, 3, 2, 10, 1, shade(P.foodCookie, -0.12))
  rect(ctx, 3, S - 3, 10, 1, shade(P.foodCookie, -0.14))
  // Chocolate chips
  for (const [cx, cy] of [[5,5],[9,5],[7,8],[4,9],[11,9],[6,12],[10,11]]) {
    px(ctx, cx, cy, '#4A2E10')
    px(ctx, cx + 1, cy, '#6A4020')
  }
  // Highlight
  rect(ctx, 5, 3, 4, 2, shade(P.foodCookie, 0.10))
}
DRAW.foodMushF = ctx => {
  fill(ctx, '#F0E8C0')   // bowl
  // Bowl background
  rect(ctx, 2, 7, 12, 7, '#F0E8D0')
  rect(ctx, 1, 8, 14, 6, '#F0E8D0')
  rect(ctx, 3, 6, 10, 8, '#F0E8D0')
  // Broth
  rect(ctx, 3, 9, 10, 3, '#D4A850')
  rect(ctx, 4, 9, 8, 2, '#E0B860')
  // Mushroom cap on top
  rect(ctx, 4, 2, 8, 5, P.foodMushF)
  rect(ctx, 3, 4, 10, 4, P.foodMushF)
  // Cap highlight
  rect(ctx, 5, 3, 3, 2, shade(P.foodMushF, 0.15))
  // Stem
  rect(ctx, 7, 6, 2, 3, '#E8D8B0')
  // Bowl rim highlight
  rect(ctx, 2, 7, 12, 1, '#FFFFFF')
}
DRAW.foodMeat = ctx => {
  fill(ctx, '#D04038')
  rect(ctx, 3, 3, 10, 10, P.foodMeat)
  rect(ctx, 2, 4, 12, 8, P.foodMeat)
  rect(ctx, 4, 2, 8, 12, P.foodMeat)
  // Fat marbling
  rect(ctx, 5, 5, 3, 1, '#F0B8A0')
  rect(ctx, 8, 8, 4, 1, '#F0B8A0')
  rect(ctx, 6, 10, 2, 2, '#F0B8A0')
  // Highlight
  rect(ctx, 4, 3, 3, 2, shade(P.foodMeat, 0.15))
}
DRAW.foodCooked = ctx => {
  fill(ctx, '#A05830')
  rect(ctx, 3, 3, 10, 10, P.foodCooked)
  rect(ctx, 2, 4, 12, 8, P.foodCooked)
  rect(ctx, 4, 2, 8, 12, P.foodCooked)
  // Char marks
  rect(ctx, 5, 4, 2, 5, shade(P.foodCooked, -0.20))
  rect(ctx, 9, 5, 2, 4, shade(P.foodCooked, -0.18))
  // Grease sheen
  rect(ctx, 4, 3, 4, 1, shade(P.foodCooked, 0.12))
  px(ctx, 7, 3, '#FFD090')
}
DRAW.foodFish = ctx => {
  fill(ctx, '#A8D8F0')
  rect(ctx, 3, 5, 10, 6, P.foodFish)
  rect(ctx, 2, 6, 12, 4, P.foodFish)
  // Tail
  rect(ctx, S - 3, 4, 3, 8, shade(P.foodFish, -0.08))
  // Eye
  px(ctx, 4, 7, '#202828')
  px(ctx, 4, 6, '#404040')
  // Scale pattern
  for (const [fx, fy] of [[7,6],[10,7],[7,8]]) rect(ctx, fx, fy, 2, 1, shade(P.foodFish, -0.10))
  // Highlight
  rect(ctx, 4, 5, 5, 2, shade(P.foodFish, 0.15))
  // Fins
  rect(ctx, 6, 4, 5, 1, shade(P.foodFish, -0.14))
}
DRAW.foodFishC = ctx => {
  fill(ctx, '#E8B840')
  rect(ctx, 3, 5, 10, 6, P.foodFishC)
  rect(ctx, 2, 6, 12, 4, P.foodFishC)
  // Tail
  rect(ctx, S - 3, 4, 3, 8, shade(P.foodFishC, -0.12))
  // Char marks
  rect(ctx, 5, 6, 2, 3, shade(P.foodFishC, -0.22))
  rect(ctx, 9, 7, 2, 2, shade(P.foodFishC, -0.18))
  // Crispy edge
  rect(ctx, 3, 5, 10, 1, shade(P.foodFishC, -0.15))
  rect(ctx, 3, 10, 10, 1, shade(P.foodFishC, -0.15))
  // Golden highlight
  rect(ctx, 4, 6, 4, 1, shade(P.foodFishC, 0.14))
}

// ─────────────────────────────────────────────────────────────
//  Cooking stations, utensils, ingredients, dishes
// ─────────────────────────────────────────────────────────────

DRAW.chopBoardTop = ctx => {
  fill(ctx, P.chopBoardTop)
  // Grain lines
  for (let y = 3; y < S; y += 4) rect(ctx, 0, y, S, 1, shade(P.chopBoardTop, -0.10))
  // Vertical joint at midpoint
  rect(ctx, 7, 0, 1, S, shade(P.chopBoardTop, -0.08))
  // Knife cut groove
  rect(ctx, 3, 5, 10, 1, P.chopBoardDk)
  rect(ctx, 3, 9, 10, 1, P.chopBoardDk)
  // Edge border
  rect(ctx, 0, 0, S, 1, P.chopBoardSide)
  rect(ctx, 0, S - 1, S, 1, P.chopBoardSide)
  rect(ctx, 0, 0, 1, S, P.chopBoardSide)
  rect(ctx, S - 1, 0, 1, S, P.chopBoardSide)
}
DRAW.chopBoardSide = ctx => {
  fill(ctx, P.chopBoardSide)
  rect(ctx, 0, 0, S, 1, shade(P.chopBoardSide, 0.08))
  rect(ctx, 0, S - 1, S, 1, shade(P.chopBoardSide, -0.10))
}

DRAW.bowlTop = ctx => {
  fill(ctx, P.bowlBody)
  // Outer rim ring
  rect(ctx, 0, 0, S, 2, P.bowlRim)
  rect(ctx, 0, S - 2, S, 2, P.bowlRim)
  rect(ctx, 0, 2, 2, S - 4, P.bowlRim)
  rect(ctx, S - 2, 2, 2, S - 4, P.bowlRim)
  // Inner bowl — cream interior
  rect(ctx, 2, 2, S - 4, S - 4, P.bowlInner)
  // Subtle inner shadow ring
  rect(ctx, 2, 2, S - 4, 1, shade(P.bowlRim, -0.05))
  rect(ctx, 2, 2, 1, S - 4, shade(P.bowlRim, -0.05))
}
DRAW.bowlSide = ctx => {
  fill(ctx, P.bowlBody)
  rect(ctx, 0, 0, S, 1, P.bowlRim)
  rect(ctx, 0, S - 1, S, 1, shade(P.bowlBody, -0.10))
  // Slight curve illusion
  rect(ctx, 0, 4, 1, S - 6, shade(P.bowlBody, -0.08))
  rect(ctx, S - 1, 4, 1, S - 6, shade(P.bowlBody, -0.08))
}

DRAW.bookTop = ctx => {
  fill(ctx, P.bookCover)
  // Spine down the middle
  rect(ctx, 7, 0, 2, S, shade(P.bookCover, -0.20))
  // Left page
  fill(ctx, P.bookPage)  // will be overdrawn
  rect(ctx, 1, 1, 6, S - 2, P.bookPage)
  // Right page
  rect(ctx, 9, 1, 6, S - 2, P.bookPage)
  // Text lines on pages
  for (let y = 3; y < S - 2; y += 2) {
    rect(ctx, 2, y, 4, 1, P.bookText)
    rect(ctx, 10, y, 4, 1, P.bookText)
  }
  // Cover border
  rect(ctx, 0, 0, 1, S, P.bookCover)
  rect(ctx, S - 1, 0, 1, S, P.bookCover)
  rect(ctx, 7, 0, 2, S, shade(P.bookCover, -0.20))
}
DRAW.bookSide = ctx => {
  fill(ctx, P.bookCover)
  rect(ctx, 0, 0, S, 1, shade(P.bookCover, 0.08))
  rect(ctx, 0, S - 1, S, 1, shade(P.bookCover, -0.12))
  // Pages edge showing
  rect(ctx, 2, 1, S - 4, S - 2, shade(P.bookPage, -0.05))
}

// ── Utensils ─────────────────────────────────────────────

DRAW.toolKnife = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Blade (long silver shape from top-left to mid-right)
  rect(ctx, 1, 1, 9, 3, P.knifeBlade)
  rect(ctx, 2, 0, 7, 5, P.knifeBlade)
  rect(ctx, 1, 2, 10, 1, shade(P.knifeBlade, 0.15))  // highlight edge
  rect(ctx, 3, 4, 7, 1, shade(P.knifeBlade, -0.12))  // bottom bevel
  // Guard
  rect(ctx, 9, 0, 2, 5, shade(P.knifeHandle, 0.05))
  // Handle
  rect(ctx, 11, 1, 4, 3, P.knifeHandle)
  rect(ctx, 11, 2, 4, 1, shade(P.knifeHandle, 0.10))
  rect(ctx, 14, 0, 1, 5, shade(P.knifeHandle, -0.12))
  // Rivets
  px(ctx, 12, 1, shade(P.knifeHandle, 0.20))
  px(ctx, 13, 3, shade(P.knifeHandle, 0.20))
}

DRAW.toolWhisk = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Handle
  rect(ctx, 6, 11, 4, 4, P.knifeHandle)
  rect(ctx, 7, 12, 2, 3, shade(P.knifeHandle, 0.10))
  // Wires forming balloon whisk shape
  // Left arc
  rect(ctx, 4, 4, 2, 7, P.whiskWire)
  rect(ctx, 3, 6, 2, 4, P.whiskWire)
  // Right arc
  rect(ctx, 10, 4, 2, 7, P.whiskWire)
  rect(ctx, 11, 6, 2, 4, P.whiskWire)
  // Cross wires
  rect(ctx, 5, 3, 6, 2, P.whiskWire)
  rect(ctx, 6, 9, 4, 2, P.whiskWire)
  // Centre wire
  rect(ctx, 7, 2, 2, 9, shade(P.whiskWire, -0.08))
  // Top loop
  rect(ctx, 6, 1, 4, 2, P.whiskWire)
}

DRAW.toolSpatula = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Flat head (wide at top)
  rect(ctx, 3, 1, 10, 6, P.spatulaHead)
  rect(ctx, 4, 0, 8, 7, P.spatulaHead)
  rect(ctx, 5, 1, 6, 2, shade(P.spatulaHead, 0.14))  // highlight
  // Slots in head
  rect(ctx, 5, 3, 1, 3, shade(P.spatulaHead, -0.20))
  rect(ctx, 8, 3, 1, 3, shade(P.spatulaHead, -0.20))
  rect(ctx, 11, 3, 1, 3, shade(P.spatulaHead, -0.20))
  // Neck narrowing
  rect(ctx, 6, 7, 4, 2, P.spatulaHead)
  // Handle
  rect(ctx, 6, 9, 4, 6, P.knifeHandle)
  rect(ctx, 7, 10, 2, 5, shade(P.knifeHandle, 0.10))
}

DRAW.toolPot = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Pot body (wide oval)
  rect(ctx, 2, 4, 12, 9, P.potBody)
  rect(ctx, 3, 3, 10, 11, P.potBody)
  rect(ctx, 4, 2, 8, 12, P.potBody)
  // Rim
  rect(ctx, 2, 3, 12, 2, P.potRim)
  rect(ctx, 3, 2, 10, 2, P.potRim)
  // Handles
  rect(ctx, 0, 4, 2, 4, P.potRim)
  rect(ctx, 14, 4, 2, 4, P.potRim)
  // Highlight
  rect(ctx, 5, 5, 3, 3, shade(P.potBody, 0.15))
  // Shadow
  rect(ctx, 4, 11, 8, 2, shade(P.potBody, -0.18))
  // Lid
  rect(ctx, 5, 3, 6, 1, shade(P.potRim, 0.10))
}

DRAW.toolPan = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Pan body (round, flatter than pot)
  rect(ctx, 2, 6, 10, 7, P.panBody)
  rect(ctx, 3, 5, 8, 9, P.panBody)
  rect(ctx, 4, 4, 6, 10, P.panBody)
  // Rim
  rect(ctx, 2, 5, 10, 2, P.panRim)
  rect(ctx, 3, 4, 8, 2, P.panRim)
  // Long handle to the right
  rect(ctx, 12, 7, 4, 3, P.knifeHandle)
  rect(ctx, 11, 8, 1, 2, P.panRim)
  // Highlight in pan
  rect(ctx, 5, 8, 2, 2, shade(P.panBody, 0.15))
  // Shadow bottom
  rect(ctx, 4, 12, 6, 1, shade(P.panBody, -0.18))
}

// ── Raw Ingredients ──────────────────────────────────────

DRAW.ingEgg = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Egg oval shape
  rect(ctx, 4, 2, 8, 12, P.ingEggShell)
  rect(ctx, 3, 3, 10, 10, P.ingEggShell)
  rect(ctx, 2, 5, 12, 6, P.ingEggShell)
  // Highlight
  rect(ctx, 5, 3, 3, 3, shade(P.ingEggShell, -0.04))
  px(ctx, 6, 4, '#FFFFFF')
  // Shadow
  rect(ctx, 5, 11, 6, 2, shade(P.ingEggShell, -0.10))
}

DRAW.ingFlour = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Flour sack shape
  rect(ctx, 3, 2, 10, 12, P.ingFlour)
  rect(ctx, 2, 3, 12, 10, P.ingFlour)
  // Tie at top
  rect(ctx, 6, 1, 4, 2, shade(P.ingFlour, -0.15))
  rect(ctx, 7, 0, 2, 2, shade(P.ingFlour, -0.20))
  // Fold lines
  rect(ctx, 3, 5, 10, 1, shade(P.ingFlour, -0.08))
  rect(ctx, 3, 9, 10, 1, shade(P.ingFlour, -0.08))
  // Label stripe
  rect(ctx, 4, 6, 8, 3, shade(P.ingFlour, -0.06))
  // Edge shading
  rect(ctx, 2, 3, 1, 10, shade(P.ingFlour, -0.10))
  rect(ctx, 13, 3, 1, 10, shade(P.ingFlour, -0.10))
  rect(ctx, 3, 13, 10, 1, shade(P.ingFlour, -0.12))
}

DRAW.ingPotato = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Lumpy potato shape
  rect(ctx, 3, 4, 10, 8, P.ingPotato)
  rect(ctx, 2, 5, 12, 6, P.ingPotato)
  rect(ctx, 4, 3, 8, 10, P.ingPotato)
  // Bumps / eyes
  px(ctx, 5, 5, shade(P.ingPotato, -0.15))
  px(ctx, 10, 7, shade(P.ingPotato, -0.15))
  px(ctx, 7, 10, shade(P.ingPotato, -0.15))
  // Highlight
  rect(ctx, 5, 5, 3, 2, shade(P.ingPotato, 0.14))
  // Shadow
  rect(ctx, 4, 11, 8, 2, shade(P.ingPotato, -0.18))
  rect(ctx, 3, 5, 1, 6, shade(P.ingPotato, -0.10))
}

DRAW.ingTomato = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Round tomato
  rect(ctx, 3, 3, 10, 10, P.ingTomato)
  rect(ctx, 2, 4, 12, 8, P.ingTomato)
  rect(ctx, 4, 2, 8, 12, P.ingTomato)
  // Green stem + leaves
  rect(ctx, 6, 1, 4, 2, P.ingTomatoGrn)
  rect(ctx, 4, 2, 2, 1, P.ingTomatoGrn)
  rect(ctx, 10, 2, 2, 1, P.ingTomatoGrn)
  rect(ctx, 7, 0, 2, 2, shade(P.ingTomatoGrn, -0.15))
  // Highlight
  rect(ctx, 5, 4, 3, 3, shade(P.ingTomato, 0.18))
  // Shadow
  rect(ctx, 4, 11, 8, 2, shade(P.ingTomato, -0.18))
  rect(ctx, 3, 4, 1, 8, shade(P.ingTomato, -0.10))
}

DRAW.ingOnion = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Onion body (layered look)
  rect(ctx, 3, 4, 10, 9, P.ingOnion)
  rect(ctx, 2, 5, 12, 7, P.ingOnion)
  rect(ctx, 4, 3, 8, 11, P.ingOnion)
  // Inner lighter rings
  rect(ctx, 4, 5, 8, 6, mix(P.ingOnion, P.ingOnionWht, 0.35))
  rect(ctx, 5, 6, 6, 4, mix(P.ingOnion, P.ingOnionWht, 0.55))
  // Top greens
  rect(ctx, 6, 1, 1, 3, P.ingTomatoGrn)
  rect(ctx, 8, 0, 1, 4, P.ingTomatoGrn)
  rect(ctx, 10, 1, 1, 3, P.ingTomatoGrn)
  // Root at bottom
  rect(ctx, 5, 13, 6, 1, shade(P.ingOnion, -0.20))
  // Highlight
  rect(ctx, 5, 5, 2, 2, shade(P.ingOnion, 0.20))
}

DRAW.ingCheese = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Triangle wedge of cheese
  // Bottom base
  rect(ctx, 1, 9, 14, 5, P.ingCheese)
  // Left side, going up to a point
  rect(ctx, 1, 5, 12, 4, P.ingCheese)
  rect(ctx, 1, 3, 10, 2, P.ingCheese)
  rect(ctx, 1, 1, 8, 2, P.ingCheese)
  // Holes
  rect(ctx, 3, 7, 2, 2, shade(P.ingCheese, -0.25))
  rect(ctx, 8, 10, 2, 2, shade(P.ingCheese, -0.25))
  rect(ctx, 11, 8, 2, 2, shade(P.ingCheese, -0.25))
  // Highlight
  rect(ctx, 2, 2, 4, 2, shade(P.ingCheese, 0.14))
  // Dark edge (rind)
  rect(ctx, 1, 13, 14, 1, shade(P.ingCheese, -0.25))
  rect(ctx, 1, 9, 1, 5, shade(P.ingCheese, -0.18))
}

DRAW.ingMilk = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Milk bottle shape
  // Cap at top
  rect(ctx, 5, 0, 6, 3, P.ingMilkCap)
  rect(ctx, 4, 1, 8, 2, P.ingMilkCap)
  // Neck
  rect(ctx, 5, 3, 6, 2, shade(P.ingMilkBot, -0.06))
  // Bottle body
  rect(ctx, 3, 5, 10, 10, P.ingMilkBot)
  rect(ctx, 2, 6, 12, 8, P.ingMilkBot)
  // Label stripe
  rect(ctx, 3, 8, 10, 4, shade(P.ingMilkBot, -0.05))
  // Highlight
  rect(ctx, 4, 6, 2, 4, shade(P.ingMilkBot, 0.0))  // reflective edge
  px(ctx, 4, 7, '#FFFFFF')
  px(ctx, 4, 8, '#FFFFFF')
  // Shadow
  rect(ctx, 11, 6, 2, 8, shade(P.ingMilkBot, -0.10))
  rect(ctx, 3, 14, 10, 1, shade(P.ingMilkBot, -0.12))
}

// ── Prepped Variants ──────────────────────────────────────

DRAW.prepPotatoChopped = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Chunky cubes arranged
  const col = P.ingPotato
  const dk  = shade(col, -0.15)
  // Chunk 1
  rect(ctx, 1, 7, 6, 5, col); rect(ctx, 1, 7, 6, 1, dk); rect(ctx, 1, 7, 1, 5, dk)
  // Chunk 2
  rect(ctx, 8, 7, 6, 5, col); rect(ctx, 8, 7, 6, 1, dk); rect(ctx, 8, 7, 1, 5, dk)
  // Chunk 3
  rect(ctx, 3, 2, 5, 4, col); rect(ctx, 3, 2, 5, 1, dk); rect(ctx, 3, 2, 1, 4, dk)
  // Chunk 4
  rect(ctx, 9, 2, 5, 4, col); rect(ctx, 9, 2, 5, 1, dk); rect(ctx, 9, 2, 1, 4, dk)
  // Cut surface highlights
  rect(ctx, 2, 8, 4, 1, shade(col, 0.12))
  rect(ctx, 9, 8, 4, 1, shade(col, 0.12))
}

DRAW.prepCarrotSliced = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Orange discs (circles = squares in pixel art)
  const col = P.foodCarrot
  const dk  = shade(col, -0.15)
  const hi  = shade(col, 0.15)
  // Three slices
  rect(ctx, 1, 9, 6, 4, col); rect(ctx, 2, 8, 4, 6, col)
  rect(ctx, 3, 9, 2, 1, hi)
  rect(ctx, 1, 12, 6, 1, dk)
  rect(ctx, 8, 4, 6, 4, col); rect(ctx, 9, 3, 4, 6, col)
  rect(ctx, 10, 4, 2, 1, hi)
  rect(ctx, 8, 7, 6, 1, dk)
  rect(ctx, 4, 1, 6, 4, col); rect(ctx, 5, 0, 4, 6, col)
  rect(ctx, 6, 1, 2, 1, hi)
  rect(ctx, 4, 4, 6, 1, dk)
}

DRAW.prepOnionDiced = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Small diced squares with a translucent purple tint
  const col = mix(P.ingOnion, P.ingOnionWht, 0.4)
  const dk  = shade(P.ingOnion, -0.10)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const ox = 2 + c * 4, oy = 3 + r * 4
      rect(ctx, ox, oy, 3, 3, col)
      rect(ctx, ox, oy, 3, 1, dk)
      rect(ctx, ox, oy, 1, 3, dk)
    }
  }
}

DRAW.prepCheeseShredded = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Shredded strands of cheese
  const col = P.ingCheese
  const dk  = shade(col, -0.12)
  // Diagonal strands
  for (let i = 0; i < 4; i++) {
    const ox = 1 + i * 3, oy = 1 + i * 2
    rect(ctx, ox, oy, 4, 2, col)
    rect(ctx, ox, oy + 1, 4, 1, dk)
  }
  rect(ctx, 2, 9, 5, 2, col);  rect(ctx, 2, 10, 5, 1, dk)
  rect(ctx, 8, 12, 5, 2, col); rect(ctx, 8, 13, 5, 1, dk)
  rect(ctx, 5, 6, 3, 2, col);  rect(ctx, 5, 7, 3, 1, dk)
}

DRAW.prepEggCracked = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Cracked shell halves
  const shell = P.ingEggShell
  const sk    = shade(shell, -0.12)
  // Left shell half
  rect(ctx, 1, 3, 5, 5, shell); rect(ctx, 1, 3, 5, 1, sk); rect(ctx, 1, 3, 1, 5, sk)
  rect(ctx, 2, 8, 3, 1, sk)  // jagged bottom
  px(ctx, 4, 7, sk)
  // Right shell half
  rect(ctx, 9, 1, 5, 5, shell); rect(ctx, 9, 1, 5, 1, sk); rect(ctx, 13, 1, 1, 5, sk)
  px(ctx, 10, 6, sk)
  // Yolk
  rect(ctx, 5, 9, 6, 5, P.ingYolk)
  rect(ctx, 4, 10, 8, 4, P.ingYolk)
  rect(ctx, 6, 9, 4, 6, P.ingYolk)
  rect(ctx, 7, 10, 2, 2, shade(P.ingYolk, 0.18))  // highlight
  // Egg white spreading
  rect(ctx, 2, 11, 12, 3, shade(shell, -0.02))
  rect(ctx, 4, 10, 8, 5, shade(shell, -0.02))
}

// ── Cooked Dishes ────────────────────────────────────────

DRAW.dishPizza = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Crust ring
  rect(ctx, 2, 2, 12, 12, P.dishCrust)
  rect(ctx, 3, 1, 10, 14, P.dishCrust)
  rect(ctx, 1, 3, 14, 10, P.dishCrust)
  // Sauce fill
  rect(ctx, 3, 3, 10, 10, P.dishPizzaSauce)
  rect(ctx, 4, 2, 8, 12, P.dishPizzaSauce)
  rect(ctx, 2, 4, 12, 8, P.dishPizzaSauce)
  // Cheese dots
  for (const [cx, cy] of [[5,5],[9,5],[5,9],[9,9],[7,7]]) {
    rect(ctx, cx, cy, 2, 2, P.ingCheese)
    px(ctx, cx, cy, shade(P.ingCheese, 0.12))
  }
  // Crust highlight
  rect(ctx, 3, 2, 10, 1, shade(P.dishCrust, 0.10))
}

DRAW.dishCake = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Cake slice — 3 layers visible from side
  // Bottom layer (cake)
  rect(ctx, 1, 10, 14, 4, P.dishCake)
  // Middle cream layer
  rect(ctx, 1, 8, 14, 2, P.dishCakeCream)
  // Top cake layer
  rect(ctx, 1, 4, 14, 4, P.dishCake)
  // Top frosting
  rect(ctx, 1, 2, 14, 2, P.dishCakeCream)
  // Top decoration dots
  for (const cx of [3, 7, 11]) px(ctx, cx, 2, P.ingTomato)
  // Side texture — crumb
  rect(ctx, 3, 5, 2, 2, shade(P.dishCake, 0.12))
  rect(ctx, 9, 11, 2, 2, shade(P.dishCake, 0.12))
  // Plate at bottom
  rect(ctx, 0, 14, S, 2, shade(P.dishCakeCream, -0.15))
}

DRAW.dishSoup = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Bowl shape
  rect(ctx, 2, 5, 12, 9, P.bowlBody)
  rect(ctx, 3, 4, 10, 11, P.bowlBody)
  rect(ctx, 1, 6, 14, 7, P.bowlBody)
  // Bowl rim
  rect(ctx, 1, 5, 14, 2, P.bowlRim)
  // Soup broth surface
  rect(ctx, 3, 7, 10, 6, P.dishSoup)
  rect(ctx, 2, 8, 12, 4, P.dishSoup)
  // Vegetable bits in soup
  px(ctx, 5, 8, P.foodCarrot)
  px(ctx, 8, 9, P.ingPotato)
  px(ctx, 11, 8, P.ingOnion)
  px(ctx, 6, 11, P.ingTomatoGrn)
  px(ctx, 10, 11, P.foodCarrot)
  // Steam wisps
  rect(ctx, 5, 2, 1, 3, shade(P.bowlRim, -0.05))
  rect(ctx, 8, 1, 1, 4, shade(P.bowlRim, -0.05))
  rect(ctx, 11, 2, 1, 3, shade(P.bowlRim, -0.05))
}

DRAW.dishOmelet = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Folded omelette shape
  rect(ctx, 2, 5, 12, 7, P.dishOmelet)
  rect(ctx, 3, 4, 10, 9, P.dishOmelet)
  rect(ctx, 1, 6, 14, 5, P.dishOmelet)
  // Fold line down the middle
  rect(ctx, 1, 8, 14, 1, shade(P.dishOmelet, -0.15))
  // Cooked edges (browned)
  rect(ctx, 2, 5, 12, 1, shade(P.dishOmelet, -0.20))
  rect(ctx, 2, 11, 12, 1, shade(P.dishOmelet, -0.20))
  // Filling peek at fold
  rect(ctx, 5, 9, 6, 1, shade(P.ingTomato, 0.10))
  rect(ctx, 7, 9, 2, 1, P.ingCheese)
  // Highlight
  rect(ctx, 4, 6, 4, 2, shade(P.dishOmelet, 0.14))
}

DRAW.dishFries = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Fry box / cone at bottom
  rect(ctx, 4, 11, 8, 4, '#C83020')
  rect(ctx, 5, 10, 6, 5, '#C83020')
  // Box stripe
  rect(ctx, 5, 11, 6, 1, '#A82010')
  // Fries sticking up
  const frCol = P.dishFries
  const frDk  = shade(frCol, -0.18)
  rect(ctx, 2, 2, 2, 9, frCol); rect(ctx, 2, 2, 2, 1, frDk)
  rect(ctx, 5, 1, 2, 9, frCol); rect(ctx, 5, 1, 2, 1, frDk)
  rect(ctx, 8, 3, 2, 8, frCol); rect(ctx, 8, 3, 2, 1, frDk)
  rect(ctx, 11, 1, 2, 9, frCol); rect(ctx, 11, 1, 2, 1, frDk)
  rect(ctx, 14, 2, 1, 8, frCol); rect(ctx, 14, 2, 1, 1, frDk)
}

DRAW.dishPancakes = ctx => {
  fill(ctx, 'rgba(0,0,0,0)')
  // Stack of 3 pancakes
  const col = P.dishPancake
  const dk  = shade(col, -0.18)
  const hi  = shade(col, 0.12)
  // Bottom pancake
  rect(ctx, 1, 11, 14, 3, col); rect(ctx, 2, 10, 12, 4, col)
  rect(ctx, 2, 10, 12, 1, hi); rect(ctx, 2, 13, 12, 1, dk)
  // Middle pancake
  rect(ctx, 2, 7, 12, 3, col); rect(ctx, 3, 6, 10, 4, col)
  rect(ctx, 3, 6, 10, 1, hi); rect(ctx, 3, 9, 10, 1, dk)
  // Top pancake
  rect(ctx, 3, 3, 10, 3, col); rect(ctx, 4, 2, 8, 4, col)
  rect(ctx, 4, 2, 8, 1, hi); rect(ctx, 4, 5, 8, 1, dk)
  // Syrup drips (brown)
  px(ctx, 4, 4, P.bookCover); px(ctx, 10, 3, P.bookCover)
  rect(ctx, 3, 7, 1, 2, P.bookCover)
  rect(ctx, 12, 8, 1, 2, P.bookCover)
  rect(ctx, 2, 11, 1, 2, P.bookCover)
}

// ─────────────────────────────────────────────────────────────
//  Phase 20 — Signs
// ─────────────────────────────────────────────────────────────

DRAW.signFace = ctx => {
  fill(ctx, '#E8D8A0')
  // 4px dark border on all sides
  rect(ctx, 0,   0,   S, 1, '#8A6030')
  rect(ctx, 0,   S-1, S, 1, '#8A6030')
  rect(ctx, 0,   0,   1, S, '#8A6030')
  rect(ctx, S-1, 0,   1, S, '#8A6030')
  // Subtle horizontal line guides (faint)
  rect(ctx, 1, 5,  S-2, 1, '#D4C490')
  rect(ctx, 1, 10, S-2, 1, '#D4C490')
}

// ─────────────────────────────────────────────────────────────
//  Colour blocks (generated dynamically)
// ─────────────────────────────────────────────────────────────
for (const color of COLORS_16) {
  const { key, hex } = color
  DRAW[`wool_${key}`]      = ctx => drawWool(ctx, hex)
  DRAW[`concrete_${key}`]  = ctx => drawConcrete(ctx, hex)
  DRAW[`stainedGlass_${key}`] = ctx => drawStainedGlass(ctx, hex)
  DRAW[`terracotta_${key}`]= ctx => drawTerracotta(ctx, hex)
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/**
 * Generate a 16×16 canvas for a named texture style.
 * Returns an HTMLCanvasElement.
 */
export function generateTexture(styleName) {
  const c = makeCanvas()
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const drawFn = DRAW[styleName]
  if (drawFn) {
    drawFn(ctx)
  } else {
    // Fallback: magenta checkerboard (missing texture indicator)
    fill(ctx, '#FF00FF')
    for (let y = 0; y < S; y += 4)
      for (let x = (y/4 % 2 === 0 ? 0 : 4); x < S; x += 8)
        rect(ctx, x, y, 4, 4, '#000000')
    console.warn(`[TextureGenerator] Unknown style: "${styleName}"`)
  }
  return c
}

/** All registered texture style names (for atlas packing). */
export function getAllStyleNames() { return Object.keys(DRAW) }

/**
 * Draw an animated water frame at time `elapsed` (seconds) into `ctx`.
 * Call this each frame and patch the atlas tile with the result.
 */
function _animateWaveFrame(ctx, elapsed) {
  fill(ctx, P.water)
  const phase = elapsed * 2.2
  const waveBody = mix(P.water, P.waterLight, 0.55)
  for (let x = 0; x < S; x++) {
    const y1 = Math.max(1, Math.min(S - 3, 4 + Math.round(Math.sin(x * 0.75 + phase) * 2)))
    const y2 = Math.max(1, Math.min(S - 3, 11 + Math.round(Math.sin(x * 0.75 + phase + Math.PI) * 2)))
    rect(ctx, x, y1, 1, 2, waveBody)
    px(ctx, x, y1 - 1, P.waterLight)
    rect(ctx, x, y2, 1, 2, waveBody)
    px(ctx, x, y2 - 1, P.waterLight)
  }
  const gx1 = ((elapsed * 5) % S + S) % S | 0
  const gy1 = Math.max(0, Math.min(S - 1, 2 + Math.round(Math.sin(elapsed * 1.5) * 1)))
  const gx2 = (((elapsed * 4) + 9) % S + S) % S | 0
  const gy2 = Math.max(0, Math.min(S - 1, 9 + Math.round(Math.sin(elapsed * 1.2 + 1.5) * 1)))
  px(ctx, gx1, gy1, shade(P.waterLight, 0.3))
  px(ctx, (gx1 + 1) % S, gy1, shade(P.waterLight, 0.15))
  px(ctx, gx2, gy2, shade(P.waterLight, 0.3))
}

/** Animate the source water tile (ID 10) — waves + pulsing center marker. */
export function animateWater(ctx, elapsed) {
  _animateWaveFrame(ctx, elapsed)
  // Center cross pulses gently so it's readable but not jarring
  _drawSourceMarker(ctx, 0.3 + Math.sin(elapsed * 3) * 0.1)
}

/** Animate the flowing water tile (ID 45) — waves only, no marker. */
export function animateWaterFlow(ctx, elapsed) {
  _animateWaveFrame(ctx, elapsed)
}
