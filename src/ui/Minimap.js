// ─────────────────────────────────────────────────────────────
//  Klosseland — Minimap  (Phase 16.1)
//  96 × 96 canvas, top-right corner.
//  Top-down biome view ±32 blocks around player.
//  Toggle: M.  Visibility persisted to localStorage.
// ─────────────────────────────────────────────────────────────
import { BIOME } from '../data/constants.js'

// Representative colour for each biome (BIOME enum index → [R,G,B])
const BIOME_RGB = {
  [BIOME.MEADOW]:      [124, 200,  80],
  [BIOME.FOREST]:      [ 45, 106,  47],
  [BIOME.SNOWY_PEAKS]: [224, 234, 245],
  [BIOME.DESERT]:      [212, 165,  90],
  [BIOME.JUNGLE]:      [ 42, 138,  48],
  [BIOME.MUSHROOM]:    [139,  90, 158],
  [BIOME.CANDY]:       [245, 160, 200],
  [BIOME.AUTUMN]:      [212, 116,  42],
  [BIOME.CHERRY]:      [240, 184, 200],
}
const DEFAULT_RGB = [124, 200, 80]

const SIZE   = 96     // canvas px
const RADIUS = 32     // world blocks on each side of player
// SCALE = 1.5 px/block  (96 / 64)

export class Minimap {
  constructor() {
    this._el           = null
    this._canvas       = null   // visible canvas
    this._ctx          = null
    this._terrainCanvas = null  // offscreen terrain cache
    this._terrainCtx   = null
    this._lastBX       = Infinity
    this._lastBZ       = Infinity
    this._visible      = (localStorage.getItem('kl_minimap') ?? 'true') === 'true'
  }

  mount() {
    // ── Wrapper ───────────────────────────────────────────────
    this._el = document.createElement('div')
    this._el.id = 'minimap'

    // ── Visible canvas ────────────────────────────────────────
    this._canvas        = document.createElement('canvas')
    this._canvas.width  = SIZE
    this._canvas.height = SIZE
    this._ctx = this._canvas.getContext('2d')
    this._el.appendChild(this._canvas)

    // ── Offscreen terrain cache ───────────────────────────────
    this._terrainCanvas        = document.createElement('canvas')
    this._terrainCanvas.width  = SIZE
    this._terrainCanvas.height = SIZE
    this._terrainCtx = this._terrainCanvas.getContext('2d')

    document.getElementById('ui-root').appendChild(this._el)
    if (!this._visible) this._el.style.display = 'none'
  }

  toggle() {
    this._visible = !this._visible
    localStorage.setItem('kl_minimap', String(this._visible))
    if (this._el) this._el.style.display = this._visible ? '' : 'none'
  }

  get visible() { return this._visible }

  // ── Main update (called every frame from game loop) ───────
  update(player, world) {
    if (!this._visible || !this._ctx) return

    const bx = Math.floor(player.x)
    const bz = Math.floor(player.z)

    // Redraw terrain only when player moves to a new block
    if (bx !== this._lastBX || bz !== this._lastBZ) {
      this._drawTerrain(world, bx, bz)
      this._lastBX = bx
      this._lastBZ = bz
    }

    // Composite: terrain + player arrow (every frame for smooth rotation)
    this._ctx.drawImage(this._terrainCanvas, 0, 0)
    this._drawArrow(player.yaw)
    this._drawNorthLabel()
  }

  // ── Draw biome terrain into offscreen canvas ──────────────
  _drawTerrain(world, px, pz) {
    const tctx    = this._terrainCtx
    const imgData = tctx.createImageData(SIZE, SIZE)
    const data    = imgData.data
    const scale   = SIZE / (RADIUS * 2)   // 1.5

    for (let dz = -RADIUS; dz < RADIUS; dz++) {
      for (let dx = -RADIUS; dx < RADIUS; dx++) {
        const biome = world.getBiomeAt(px + dx, pz + dz)
        const rgb   = BIOME_RGB[biome] ?? DEFAULT_RGB

        const startX = Math.floor((dx + RADIUS) * scale)
        const endX   = Math.floor((dx + RADIUS + 1) * scale)
        const startY = Math.floor((dz + RADIUS) * scale)
        const endY   = Math.floor((dz + RADIUS + 1) * scale)

        for (let py = startY; py < endY; py++) {
          for (let px2 = startX; px2 < endX; px2++) {
            const i = (py * SIZE + px2) * 4
            data[i]     = rgb[0]
            data[i + 1] = rgb[1]
            data[i + 2] = rgb[2]
            data[i + 3] = 255
          }
        }
      }
    }

    tctx.putImageData(imgData, 0, 0)
  }

  // ── Draw player direction arrow on visible canvas ─────────
  _drawArrow(yaw) {
    const ctx = this._ctx
    const cx  = SIZE / 2
    const cy  = SIZE / 2

    // White dot for player position
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()

    // Direction triangle — (sin yaw, cos yaw) is the forward vector in (X, Z).
    // On canvas: +X = right, +Z = down  ⟹ south (+Z) points downward.
    const len = 8
    const tip   = { x: cx + Math.sin(yaw) * len,                         y: cy + Math.cos(yaw) * len }
    const left  = { x: cx + Math.sin(yaw + Math.PI * 0.65) * 4.5,        y: cy + Math.cos(yaw + Math.PI * 0.65) * 4.5 }
    const right = { x: cx + Math.sin(yaw - Math.PI * 0.65) * 4.5,        y: cy + Math.cos(yaw - Math.PI * 0.65) * 4.5 }

    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(left.x, left.y)
    ctx.lineTo(right.x, right.y)
    ctx.closePath()
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // ── North label ───────────────────────────────────────────
  _drawNorthLabel() {
    const ctx = this._ctx
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText('N', SIZE / 2, 2)
  }

  dispose() {
    this._el?.remove()
    this._el = null
    this._canvas = null
    this._ctx = null
    this._terrainCanvas = null
    this._terrainCtx = null
  }
}
