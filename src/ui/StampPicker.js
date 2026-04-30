// ─────────────────────────────────────────────────────────────
//  Klosseland — StampPicker (Phase 24)
//  Modal grid of building templates the player can select.
//  Returns the chosen template object (or null on cancel).
// ─────────────────────────────────────────────────────────────
import { TEMPLATES }  from '../data/buildingTemplates.js'
import { atlas }      from '../engine/TextureAtlas.js'

export class StampPicker {
  constructor() {
    this._el      = null
    this._resolve = null
  }

  /**
   * Show the picker and return a Promise that resolves with the
   * selected template, or null if the player cancelled.
   */
  show() {
    return new Promise(resolve => {
      this._resolve = resolve
      this._build()
    })
  }

  _build() {
    const lang = localStorage.getItem('kl_lang') || 'en'

    const overlay = document.createElement('div')
    overlay.id        = 'stamp-picker-overlay'
    overlay.className = 'kl-overlay'

    const panel = document.createElement('div')
    panel.className = 'kl-panel stamp-picker-panel'

    const title = document.createElement('h2')
    title.className   = 'stamp-picker-title'
    title.textContent = lang === 'no' ? 'Byggemaler' : 'Building Templates'
    panel.appendChild(title)

    const subtitle = document.createElement('p')
    subtitle.className   = 'stamp-picker-subtitle'
    subtitle.textContent = lang === 'no'
      ? 'Velg en mal — klikk i verden for å plassere'
      : 'Choose a template — click in the world to place'
    panel.appendChild(subtitle)

    const grid = document.createElement('div')
    grid.className = 'stamp-picker-grid'

    for (const tpl of TEMPLATES) {
      const tile = document.createElement('button')
      tile.className = 'stamp-tile'
      tile.type      = 'button'

      const canvas  = document.createElement('canvas')
      canvas.width  = 64
      canvas.height = 64
      canvas.style.imageRendering = 'pixelated'
      const ctx = canvas.getContext('2d')

      // Background
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, 64, 64)

      // Draw representative texture tile
      if (tpl.iconStyle) {
        try { atlas.drawTile(ctx, 4, 4, 56, tpl.iconStyle) } catch (_) { /* atlas may not be built */ }
      }

      tile.appendChild(canvas)

      const label       = document.createElement('span')
      label.textContent = lang === 'no' ? tpl.nameNo : tpl.nameEn
      tile.appendChild(label)

      const size       = document.createElement('small')
      size.textContent = `${tpl.size[0]}×${tpl.size[1]}×${tpl.size[2]}`
      tile.appendChild(size)

      tile.addEventListener('click', () => this._close(tpl))
      grid.appendChild(tile)
    }

    panel.appendChild(grid)

    const cancelBtn       = document.createElement('button')
    cancelBtn.type        = 'button'
    cancelBtn.className   = 'kl-btn stamp-picker-cancel'
    cancelBtn.textContent = lang === 'no' ? 'Avbryt' : 'Cancel'
    cancelBtn.addEventListener('click', () => this._close(null))
    panel.appendChild(cancelBtn)

    overlay.appendChild(panel)
    overlay.addEventListener('click', e => { if (e.target === overlay) this._close(null) })

    document.getElementById('ui-root').appendChild(overlay)
    this._el = overlay
  }

  _close(template) {
    this._el?.remove()
    this._el = null
    const res = this._resolve
    this._resolve = null
    res?.(template)
  }
}
