// ─────────────────────────────────────────────────────────────
//  Klosseland — Hotbar HUD
//  Canvas-rendered 9-slot hotbar at the bottom of the screen.
//  Draws block thumbnail textures directly from the atlas.
// ─────────────────────────────────────────────────────────────
import { HOTBAR_SLOTS } from '../data/constants.js'
import { BLOCKS }       from '../data/blockDefinitions.js'
import { atlas }        from '../engine/TextureAtlas.js'

// Quick lookup map: blockId → blockDef
const BLOCK_BY_ID = new Map(BLOCKS.map(b => [b.id, b]))

const SLOT_SIZE     = 52
const SLOT_GAP      = 4
const PADDING       = 6
const CORNER_R      = 6
const BOTTOM_MARGIN = 20   // px from bottom of viewport

// The produce bar sits above the hotbar; push the label above both.
const PRODUCE_BAR_H = SLOT_SIZE + PADDING * 2   // same height as hotbar (64 px)
const BAR_GAP       = 6
const LABEL_BOTTOM  = BOTTOM_MARGIN + (SLOT_SIZE + PADDING * 2) + BAR_GAP + PRODUCE_BAR_H + BAR_GAP

/** Returns the style name to use as the block thumbnail (top or all face). */
function getTopStyle(blockDef) {
  if (!blockDef?.tex) return null
  return blockDef.tex.all || blockDef.tex.top || blockDef.tex.side || null
}

export class Hotbar {
  constructor(inventory) {
    this._inv = inventory

    const W = HOTBAR_SLOTS * SLOT_SIZE + (HOTBAR_SLOTS - 1) * SLOT_GAP + PADDING * 2
    const H = SLOT_SIZE + PADDING * 2

    // ── Main hotbar canvas ────────────────────────────────
    this._canvas = document.createElement('canvas')
    this._canvas.id     = 'hud-hotbar'
    this._canvas.width  = W
    this._canvas.height = H
    Object.assign(this._canvas.style, {
      position:       'fixed',
      bottom:         `${BOTTOM_MARGIN}px`,
      left:           '50%',
      transform:      'translateX(-50%)',
      imageRendering: 'pixelated',
      pointerEvents:  'none',
      zIndex:         '10',
    })

    // ── Block-name label above produce bar ──────────────
    this._label = document.createElement('div')
    this._label.id = 'hud-hotbar-label'
    Object.assign(this._label.style, {
      position:   'fixed',
      bottom:     `${LABEL_BOTTOM}px`,
      left:       '50%',
      transform:  'translateX(-50%)',
      fontSize:   '0.8rem',
      fontWeight: '700',
      color:      'rgba(255,255,255,0.85)',
      textShadow: '0 1px 4px rgba(0,0,0,0.7)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex:     '10',
    })

    document.getElementById('ui-root').append(this._canvas, this._label)
    this._ctx = this._canvas.getContext('2d')

    this._t = 0
    inventory.onChange(() => this.render())
    this.render()
  }

  /** Call every frame with elapsed seconds for the selection pulse animation. */
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

    // ── Background bar ────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.50)'
    this._roundRect(ctx, 0, 0, W, H, CORNER_R)
    ctx.fill()

    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const x        = PADDING + i * (SLOT_SIZE + SLOT_GAP)
      const y        = PADDING
      const blockId  = inv.slots[i]
      const blockDef = BLOCK_BY_ID.get(blockId)
      const selected = i === inv.selectedSlot

      // Slot background
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.25)'
      this._roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4)
      ctx.fill()

      // Animated pulsing glow behind selected slot
      if (selected) {
        const pulse = 0.5 + 0.5 * Math.sin(this._t * Math.PI * 2)  // 0..1
        const glow  = Math.round(pulse * 48)   // alpha 0..48
        ctx.fillStyle = `rgba(255,208,74,${(glow / 255).toFixed(3)})`
        this._roundRect(ctx, x - 1, y - 1, SLOT_SIZE + 2, SLOT_SIZE + 2, 5)
        ctx.fill()
      }

      // Block texture thumbnail
      if (blockDef) {
        const style = getTopStyle(blockDef)
        if (style) {
          // Clip to slot so texture doesn't overflow rounded corners
          ctx.save()
          this._roundRect(ctx, x + 2, y + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 3)
          ctx.clip()
          atlas.drawTile(ctx, x + 2, y + 2, SLOT_SIZE - 4, style)
          ctx.restore()
        }
      }

      // Slot border / selection highlight
      if (selected) {
        const pulse = 0.5 + 0.5 * Math.sin(this._t * Math.PI * 2)
        const alpha = (0.70 + 0.30 * pulse).toFixed(3)
        ctx.strokeStyle = `rgba(255,208,74,${alpha})`
        ctx.lineWidth   = 2.5
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth   = 1
      }
      this._roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4)
      ctx.stroke()

      // Slot number (top-left corner)
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.38)'
      ctx.font      = '700 10px monospace'
      ctx.fillText(String(i + 1), x + 4, y + 12)
    }

    // ── Block name label ──────────────────────────────────
    const selDef = BLOCK_BY_ID.get(inv.slots[inv.selectedSlot])
    this._label.textContent = selDef?.nameEn ?? ''
  }

  // ── Utility: draw a rounded rectangle path ────────────
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
