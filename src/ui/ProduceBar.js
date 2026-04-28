// ─────────────────────────────────────────────────────────────
//  Klosseland — ProduceBar HUD
//  Canvas-rendered 6-slot produce row, positioned directly above
//  the regular hotbar.  Only isProduce items may occupy these slots.
//  Green accent colour distinguishes it from the hotbar and tool bar.
// ─────────────────────────────────────────────────────────────
import { PRODUCE_SLOTS } from '../data/constants.js'
import { BLOCKS }        from '../data/blockDefinitions.js'
import { atlas }         from '../engine/TextureAtlas.js'

const BLOCK_BY_ID = new Map(BLOCKS.map(b => [b.id, b]))

const SLOT_SIZE     = 52
const SLOT_GAP      = 4
const PADDING       = 6
const CORNER_R      = 6
const BOTTOM_MARGIN = 20    // same as hotbar
const HOTBAR_H      = SLOT_SIZE + PADDING * 2   // 64 px
const BAR_GAP       = 6    // gap between hotbar and this bar

const BOTTOM = BOTTOM_MARGIN + HOTBAR_H + BAR_GAP   // 90 px from screen bottom

function getTopStyle(def) {
  if (!def?.tex) return null
  return def.tex.all || def.tex.top || def.tex.side || null
}

export class ProduceBar {
  constructor(inventory) {
    this._inv = inventory

    const W = PRODUCE_SLOTS * SLOT_SIZE + (PRODUCE_SLOTS - 1) * SLOT_GAP + PADDING * 2
    const H = SLOT_SIZE + PADDING * 2

    this._canvas = document.createElement('canvas')
    this._canvas.id     = 'hud-produce-bar'
    this._canvas.width  = W
    this._canvas.height = H
    Object.assign(this._canvas.style, {
      position:       'fixed',
      bottom:         `${BOTTOM}px`,
      left:           '50%',
      transform:      'translateX(-50%)',
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

  /** Total canvas height — used by Hotbar to position the block-name label. */
  get totalHeight() { return SLOT_SIZE + PADDING * 2 }

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

    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.50)'
    this._roundRect(ctx, 0, 0, W, H, CORNER_R)
    ctx.fill()

    // Thin green accent line at top
    ctx.fillStyle = 'rgba(108,201,82,0.40)'
    this._roundRect(ctx, 0, 0, W, 3, 2)
    ctx.fill()

    for (let i = 0; i < PRODUCE_SLOTS; i++) {
      const x        = PADDING + i * (SLOT_SIZE + SLOT_GAP)
      const y        = PADDING
      const blockId  = inv.produceSlots[i]
      const blockDef = blockId ? BLOCK_BY_ID.get(blockId) : null
      const selected = i === inv.selectedProduceSlot

      // Slot background
      ctx.fillStyle = selected ? 'rgba(108,201,82,0.20)' : 'rgba(0,0,0,0.25)'
      this._roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4)
      ctx.fill()

      // Pulsing glow (green) behind selected slot
      if (selected) {
        const pulse = 0.5 + 0.5 * Math.sin(this._t * Math.PI * 2)
        const glow  = Math.round(pulse * 48)
        ctx.fillStyle = `rgba(108,201,82,${(glow / 255).toFixed(3)})`
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
        ctx.strokeStyle = `rgba(108,201,82,${alpha})`
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
