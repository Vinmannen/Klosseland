// ─────────────────────────────────────────────────────────────
//  Klosseland — ToolBar HUD
//  Canvas-rendered 2×3 tool slot panel, anchored bottom-left.
//  Only isTool items may occupy these slots.
//  Orange accent colour distinguishes it from the hotbar.
// ─────────────────────────────────────────────────────────────
import { TOOL_SLOTS }  from '../data/constants.js'
import { BLOCKS }      from '../data/blockDefinitions.js'
import { atlas }       from '../engine/TextureAtlas.js'

const BLOCK_BY_ID = new Map(BLOCKS.map(b => [b.id, b]))

const COLS         = 2
const ROWS         = Math.ceil(TOOL_SLOTS / COLS)   // 3
const SLOT_SIZE    = 52
const SLOT_GAP     = 4
const PADDING      = 6
const CORNER_R     = 6
const LEFT_MARGIN  = 20
const BOTTOM_MARGIN = 20

function getTopStyle(def) {
  if (!def?.tex) return null
  return def.tex.all || def.tex.top || def.tex.side || null
}

export class ToolBar {
  constructor(inventory) {
    this._inv = inventory

    const W = COLS * SLOT_SIZE + (COLS - 1) * SLOT_GAP + PADDING * 2
    const H = ROWS * SLOT_SIZE + (ROWS - 1) * SLOT_GAP + PADDING * 2

    this._canvas = document.createElement('canvas')
    this._canvas.id     = 'hud-tool-bar'
    this._canvas.width  = W
    this._canvas.height = H
    Object.assign(this._canvas.style, {
      position:       'fixed',
      bottom:         `${BOTTOM_MARGIN}px`,
      left:           `${LEFT_MARGIN}px`,
      imageRendering: 'pixelated',
      pointerEvents:  'none',
      zIndex:         '10',
    })

    document.getElementById('ui-root').appendChild(this._canvas)
    this._ctx = this._canvas.getContext('2d')

    this._t = 0
    inventory.onChange(() => this.render())
    this.render()
  }

  tick(t) {
    this._t = t
    this.render()
  }

  render() {
    const ctx = this._ctx
    const inv = this._inv
    const W   = this._canvas.width
    const H   = this._canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.50)'
    this._roundRect(ctx, 0, 0, W, H, CORNER_R)
    ctx.fill()

    // Orange accent line on left edge
    ctx.fillStyle = 'rgba(255,160,60,0.40)'
    this._roundRect(ctx, 0, 0, 3, H, 2)
    ctx.fill()

    for (let i = 0; i < TOOL_SLOTS; i++) {
      const col      = i % COLS
      const row      = Math.floor(i / COLS)
      const x        = PADDING + col * (SLOT_SIZE + SLOT_GAP)
      const y        = PADDING + row * (SLOT_SIZE + SLOT_GAP)
      const blockId  = inv.toolSlots[i]
      const blockDef = blockId ? BLOCK_BY_ID.get(blockId) : null
      const selected = i === inv.selectedToolSlot

      // Slot background
      ctx.fillStyle = selected ? 'rgba(255,160,60,0.20)' : 'rgba(0,0,0,0.25)'
      this._roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4)
      ctx.fill()

      // Pulsing glow (orange) behind selected slot
      if (selected) {
        const pulse = 0.5 + 0.5 * Math.sin(this._t * Math.PI * 2)
        const glow  = Math.round(pulse * 48)
        ctx.fillStyle = `rgba(255,160,60,${(glow / 255).toFixed(3)})`
        this._roundRect(ctx, x - 1, y - 1, SLOT_SIZE + 2, SLOT_SIZE + 2, 5)
        ctx.fill()
      }

      // Block texture thumbnail
      if (blockDef) {
        const style = getTopStyle(blockDef)
        if (style) {
          ctx.save()
          this._roundRect(ctx, x + 2, y + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 3)
          ctx.clip()
          atlas.drawTile(ctx, x + 2, y + 2, SLOT_SIZE - 4, style)
          ctx.restore()
        }
      }

      // Slot border
      if (selected) {
        const pulse = 0.5 + 0.5 * Math.sin(this._t * Math.PI * 2)
        const alpha = (0.70 + 0.30 * pulse).toFixed(3)
        ctx.strokeStyle = `rgba(255,160,60,${alpha})`
        ctx.lineWidth   = 2.5
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth   = 1
      }
      this._roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4)
      ctx.stroke()
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y,     x + w, y + r,     r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x,     y + h, x,     y + h - r, r)
    ctx.lineTo(x,     y + r)
    ctx.arcTo(x,     y,     x + r, y,         r)
    ctx.closePath()
  }
}
