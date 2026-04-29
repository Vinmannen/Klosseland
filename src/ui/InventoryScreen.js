// ─────────────────────────────────────────────────────────────
//  Klosseland — InventoryScreen
//  Tab opens a full grid view of all blocks, grouped by category.
//  Clicking a block assigns it to the correct bar based on its type:
//    isTool    → tool bar   (selected tool slot)
//    isProduce → produce bar (selected produce slot)
//    else      → hotbar     (selected hotbar slot)
//  Close with Tab or Esc.
// ─────────────────────────────────────────────────────────────
import { BLOCKS } from '../data/blockDefinitions.js'
import { atlas }  from '../engine/TextureAtlas.js'

const RECENT_KEY = 'kl_recent_blocks'
const RECENT_MAX = 8

// Small inline SVG icons for each category tab (14×14, currentColor)
const CAT_ICONS = {
  recent: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
    <polyline points="7,4 7,7 9.5,8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  nature: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M1 12 L5 4 L7 7 L10 2 L13 12" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,
  wood: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="7" cy="7" r="3"   stroke="currentColor" stroke-width="1"/>
    <circle cx="7" cy="7" r="1"   fill="currentColor"/>
  </svg>`,
  stone: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1 L13 4 L7 7 L1 4 Z"    stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M1 4 L1 10 L7 13 L7 7"     stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M13 4 L13 10 L7 13"        stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`,
  minerals: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1 L12 5.5 L7 13 L2 5.5 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <line x1="2" y1="5.5" x2="12" y2="5.5" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="1" x2="7" y2="5.5" stroke="currentColor" stroke-width="0.9"/>
  </svg>`,
  plants: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <line x1="7" y1="13" x2="7" y2="6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M7 9 Q4 7 4 4 Q7 5 7 8" fill="currentColor"/>
    <path d="M7 7 Q10 5 10 2 Q7 4 7 7" fill="currentColor"/>
  </svg>`,
  fantasy: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1 L8.3 5.7 L13 7 L8.3 8.3 L7 13 L5.7 8.3 L1 7 L5.7 5.7 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`,
  furniture: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="1" y="4" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/>
    <line x1="3" y1="10" x2="3" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="11" y1="10" x2="11" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,
  special: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M9 1 L4 8 L7.5 8 L5 13 L10 6 L6.5 6 Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" fill="currentColor" fill-opacity="0.25"/>
  </svg>`,
  seasonal: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1 L7 13 M1 7 L13 7 M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.1"/>
  </svg>`,
  colors: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="4.5" cy="4.5" r="3" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="0.8"/>
    <circle cx="9.5" cy="4.5" r="3" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="0.8"/>
    <circle cx="7"   cy="9"   r="3" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="0.8"/>
  </svg>`,
  food: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="8" r="4.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M5 4 Q7 1 9 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/>
    <line x1="7" y1="3.5" x2="7" y2="1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,
  farming: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <line x1="7" y1="13" x2="7" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="4" y1="13" x2="4" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="10" y1="13" x2="10" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M5 7 Q7 4 9 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <path d="M2 9 Q4 6 6 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/>
    <path d="M8 9 Q10 6 12 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  </svg>`,
}

const CATEGORIES = [
  { key: 'nature',      en: 'Nature',      no: 'Natur'       },
  { key: 'wood',        en: 'Wood',        no: 'Tre'          },
  { key: 'stone',       en: 'Stone',       no: 'Stein'        },
  { key: 'minerals',    en: 'Minerals',    no: 'Mineraler'    },
  { key: 'plants',      en: 'Plants',      no: 'Planter'      },
  { key: 'fantasy',     en: 'Fantasy',     no: 'Fantasi'      },
  { key: 'furniture',   en: 'Furniture',   no: 'Møbler'       },
  { key: 'special',     en: 'Special',     no: 'Spesial'      },
  { key: 'seasonal',    en: 'Seasonal',    no: 'Sesong'       },
  { key: 'colors',      en: 'Colors',      no: 'Farger'       },
  { key: 'food',        en: 'Food',        no: 'Mat'          },
  { key: 'farming',     en: 'Farming',     no: 'Gård'         },
  { key: 'decoration',  en: 'Decoration',  no: 'Dekorasjon'   },
]

// Food subcategory order and labels
const FOOD_SUBS = [
  { key: 'utensils',    en: 'Utensils',    no: 'Redskaper'    },
  { key: 'ingredients', en: 'Ingredients', no: 'Ingredienser' },
  { key: 'dishes',      en: 'Dishes',      no: 'Retter'       },
]

// Furniture subcategory order and labels
const FURNITURE_SUBS = [
  { key: 'living',   en: 'Living Room', no: 'Stue'        },
  { key: 'bedroom',  en: 'Bedroom',     no: 'Soverom'     },
  { key: 'kitchen',  en: 'Kitchen',     no: 'Kjøkken'     },
  { key: 'bathroom', en: 'Bathroom',    no: 'Bad'         },
  { key: 'garden',   en: 'Garden',      no: 'Hage'        },
  { key: 'storage',  en: 'Storage',     no: 'Oppbevaring' },
  { key: 'decor',    en: 'Decoration',  no: 'Dekorasjon'  },
]

// Pre-group blocks by category (air excluded via null category, hidden variants excluded)
const BLOCKS_BY_CAT = new Map(
  CATEGORIES.map(c => [c.key, BLOCKS.filter(b => b.category === c.key && !b.hidden)])
)

const TILE_SIZE = 56

function topStyle(def) {
  if (!def?.tex) return null
  return def.tex.all ?? def.tex.top ?? def.tex.side ?? null
}

function lang() {
  return localStorage.getItem('kl_lang') || 'en'
}

function blockName(def) {
  return (lang() === 'no' ? def.nameNo : null) ?? def.nameEn
}

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveRecent(ids) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids))
}

export class InventoryScreen {
  constructor(inventory) {
    this._inv        = inventory
    this._el         = null
    this._visible    = false
    this._activeCat  = CATEGORIES[0].key
    this._searchTerm = ''
    this._recentIds  = loadRecent()
  }

  get visible() { return this._visible }

  show() {
    if (this._visible) return
    this._visible = true

    this._el = document.createElement('div')
    this._el.className = 'kl-overlay inv-overlay'
    this._render()
    document.getElementById('ui-root').appendChild(this._el)
  }

  hide() {
    this._el?.remove()
    this._el      = null
    this._visible = false
  }

  // ── Full re-render ────────────────────────────────────────
  _render() {
    const isNo = lang() === 'no'

    this._el.innerHTML = `
      <div class="inv-panel">
        <div class="inv-header">
          <span class="inv-title">${isNo ? 'Blokker' : 'Blocks'}</span>
          <span class="inv-close-hint">${isNo ? 'Tab / Esc for å lukke' : 'Tab / Esc to close'}</span>
        </div>
        <div class="inv-bars-wrap" id="inv-bars-wrap"></div>
        <div class="inv-search-wrap">
          <input class="inv-search" id="inv-search" type="text"
            placeholder="${isNo ? 'Søk etter blokk...' : 'Search blocks...'}"
            value="${this._searchTerm.replace(/"/g, '&quot;')}"
            autocomplete="off" spellcheck="false">
        </div>
        <div class="inv-tabs" id="inv-tabs"></div>
        <div class="inv-grid-wrap">
          <div class="inv-grid" id="inv-grid"></div>
        </div>
      </div>
    `

    const searchEl = this._el.querySelector('#inv-search')
    searchEl.addEventListener('input', e => {
      this._searchTerm = e.target.value
      this._renderGrid()
    })
    searchEl.addEventListener('keydown', e => {
      if (e.key !== 'Tab' && e.key !== 'Escape') e.stopPropagation()
    })

    this._renderBars()
    this._renderTabs()
    this._renderGrid()
  }

  // ── Three-bar preview section ─────────────────────────────
  _renderBars() {
    const wrap = this._el.querySelector('#inv-bars-wrap')
    wrap.innerHTML = ''
    const inv  = this._inv
    const isNo = lang() === 'no'

    // Helper: build one row section (label + slots)
    const makeSection = (labelText, accentClass) => {
      const section = document.createElement('div')
      section.className = 'inv-bar-section'
      const lbl = document.createElement('span')
      lbl.className   = `inv-bar-label ${accentClass}`
      lbl.textContent = labelText
      section.appendChild(lbl)
      const row = document.createElement('div')
      row.className = 'inv-bar-row'
      section.appendChild(row)
      return { section, row }
    }

    // ── Tool slots ──────────────────────────────────────────
    const { section: toolSec, row: toolRow } = makeSection(
      isNo ? 'Verktøy' : 'Tools', 'inv-bar-label--tool'
    )
    toolRow.id = 'inv-tool-row'
    for (let i = 0; i < inv.toolSlots.length; i++) {
      const slot = this._makeBarSlot(inv.toolSlots[i], i === inv.selectedToolSlot, 'tool', i)
      slot.id = `inv-tool-slot-${i}`
      toolRow.appendChild(slot)
    }
    wrap.appendChild(toolSec)

    // ── Produce slots ───────────────────────────────────────
    const { section: prodSec, row: prodRow } = makeSection(
      isNo ? 'Råvarer' : 'Produce', 'inv-bar-label--produce'
    )
    prodRow.id = 'inv-produce-row'
    for (let i = 0; i < inv.produceSlots.length; i++) {
      const slot = this._makeBarSlot(inv.produceSlots[i], i === inv.selectedProduceSlot, 'produce', i)
      slot.id = `inv-produce-slot-${i}`
      prodRow.appendChild(slot)
    }
    wrap.appendChild(prodSec)

    // ── Hotbar slots ────────────────────────────────────────
    const { section: hbSec, row: hbRow } = makeSection(
      isNo ? 'Blokker' : 'Blocks', 'inv-bar-label--blocks'
    )
    hbRow.id = 'inv-hotbar-row'
    for (let i = 0; i < inv.slots.length; i++) {
      const def      = BLOCKS.find(b => b.id === inv.slots[i])
      const selected = i === inv.selectedSlot
      const wrap2    = document.createElement('div')
      wrap2.className = `inv-hb-slot${selected ? ' inv-hb-selected' : ''}`
      wrap2.id        = `inv-hb-slot-${i}`
      wrap2.title     = def ? blockName(def) : ''
      if (def) {
        const style = topStyle(def)
        if (style) {
          const c = document.createElement('canvas')
          c.width = c.height = 40
          atlas.drawTile(c.getContext('2d'), 0, 0, 40, style)
          wrap2.appendChild(c)
        }
      }
      const num = document.createElement('span')
      num.className   = 'inv-hb-num'
      num.textContent = String(i + 1)
      wrap2.appendChild(num)
      wrap2.addEventListener('click', () => {
        inv.selectSlot(i)
        this._renderBars()
        this._renderGrid()
      })
      hbRow.appendChild(wrap2)
    }
    wrap.appendChild(hbSec)
  }

  // Build a single slot element for the tool or produce bar rows
  _makeBarSlot(blockId, selected, barType, index) {
    const def = blockId ? BLOCKS.find(b => b.id === blockId) : null
    const wrap = document.createElement('div')
    const selClass = barType === 'tool' ? 'inv-hb-selected--tool'
                   : barType === 'produce' ? 'inv-hb-selected--produce'
                   : 'inv-hb-selected'
    wrap.className = `inv-hb-slot${selected ? ` inv-hb-selected ${selClass}` : ''}`
    wrap.title     = def ? blockName(def) : ''

    if (def) {
      const style = topStyle(def)
      if (style) {
        const c = document.createElement('canvas')
        c.width = c.height = 40
        atlas.drawTile(c.getContext('2d'), 0, 0, 40, style)
        wrap.appendChild(c)
      }
    }

    const num = document.createElement('span')
    num.className   = 'inv-hb-num'
    num.textContent = String(index + 1)
    wrap.appendChild(num)

    wrap.addEventListener('click', () => {
      if (barType === 'tool')    this._inv.selectToolSlot(index)
      else                       this._inv.selectProduceSlot(index)
      this._renderBars()
      this._renderGrid()
    })

    return wrap
  }

  // ── Category tab row ──────────────────────────────────────
  _renderTabs() {
    const tabs = this._el.querySelector('#inv-tabs')
    tabs.innerHTML = ''
    const isNo = lang() === 'no'

    if (this._recentIds.length > 0) {
      const btn = document.createElement('button')
      btn.className = `inv-tab${this._activeCat === '__recent' ? ' inv-tab-active' : ''}`
      btn.innerHTML = `<span class="inv-tab-icon">${CAT_ICONS.recent}</span>${isNo ? 'Nylige' : 'Recent'}`
      btn.addEventListener('click', () => {
        this._activeCat  = '__recent'
        this._searchTerm = ''
        this._el.querySelector('#inv-search').value = ''
        this._renderTabs()
        this._renderGrid()
      })
      tabs.appendChild(btn)
    }

    for (const cat of CATEGORIES) {
      const count = BLOCKS_BY_CAT.get(cat.key)?.length ?? 0
      const btn = document.createElement('button')
      btn.className = `inv-tab${cat.key === this._activeCat ? ' inv-tab-active' : ''}`
      btn.innerHTML = `<span class="inv-tab-icon">${CAT_ICONS[cat.key] ?? ''}</span>${isNo ? cat.no : cat.en}<span class="inv-tab-count">${count}</span>`
      btn.addEventListener('click', () => {
        this._activeCat  = cat.key
        this._searchTerm = ''
        this._el.querySelector('#inv-search').value = ''
        this._renderTabs()
        this._renderGrid()
      })
      tabs.appendChild(btn)
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  _makeBlockSlot(def, inAnyBar) {
    const style = topStyle(def)

    const wrap = document.createElement('div')
    wrap.className = `inv-block-slot${inAnyBar ? ' inv-block-in-hotbar' : ''}`
    wrap.title     = blockName(def)

    const thumb = document.createElement('div')
    thumb.className = 'inv-block-thumb'
    if (style) {
      const c  = document.createElement('canvas')
      c.width  = TILE_SIZE
      c.height = TILE_SIZE
      atlas.drawTile(c.getContext('2d'), 0, 0, TILE_SIZE, style)
      thumb.appendChild(c)
    }
    wrap.appendChild(thumb)

    const label = document.createElement('span')
    label.className   = 'inv-block-label'
    label.textContent = blockName(def)
    wrap.appendChild(label)

    wrap.addEventListener('click', () => {
      this._pushRecent(def.id)

      if (def.isTool) {
        const slot = this._inv.selectedToolSlot
        this._inv.setToolSlot(slot, def.id)
        this._renderBars()
        this._renderGrid()
        this._flashBarSlot('tool', slot, blockName(def))
      } else if (def.isProduce) {
        const slot = this._inv.selectedProduceSlot
        this._inv.setProduceSlot(slot, def.id)
        this._renderBars()
        this._renderGrid()
        this._flashBarSlot('produce', slot, blockName(def))
      } else {
        const slot = this._inv.selectedSlot
        this._inv.setSlot(slot, def.id)
        this._renderBars()
        this._renderGrid()
        this._flashBarSlot('hotbar', slot, blockName(def))
      }
    })

    return wrap
  }

  _makeSectionHeader(text) {
    const h = document.createElement('div')
    h.className   = 'inv-section-header'
    h.textContent = text
    return h
  }

  _makeEmptyEl(isNo) {
    const el = document.createElement('div')
    el.className   = 'inv-empty'
    el.textContent = isNo ? 'Ingen blokker funnet' : 'No blocks found'
    return el
  }

  // ── Block grid ────────────────────────────────────────────
  _renderGrid() {
    const grid      = this._el.querySelector('#inv-grid')
    grid.innerHTML  = ''
    const isNo      = lang() === 'no'
    const term      = this._searchTerm.trim().toLowerCase()

    // Merge all bar contents for the "already placed" indicator
    const inAnyBar = new Set([
      ...this._inv.slots,
      ...this._inv.toolSlots.filter(Boolean),
      ...this._inv.produceSlots.filter(Boolean),
    ])

    if (term.length > 0) {
      const blocks = BLOCKS.filter(b => b.category && !b.hidden && blockName(b).toLowerCase().includes(term))
      for (const def of blocks) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
      if (blocks.length === 0) grid.appendChild(this._makeEmptyEl(isNo))
      return
    }

    if (this._activeCat === '__recent') {
      const blocks = this._recentIds.map(id => BLOCKS.find(b => b.id === id)).filter(Boolean)
      for (const def of blocks) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
      if (blocks.length === 0) grid.appendChild(this._makeEmptyEl(isNo))
      return
    }

    if (this._activeCat === 'furniture') {
      const all = BLOCKS_BY_CAT.get('furniture') ?? []
      for (const sub of FURNITURE_SUBS) {
        const subBlocks = all.filter(b => b.sub === sub.key)
        if (subBlocks.length === 0) continue
        grid.appendChild(this._makeSectionHeader(isNo ? sub.no : sub.en))
        for (const def of subBlocks) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
      }
      const unsorted = all.filter(b => !b.sub)
      for (const def of unsorted) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
      if (grid.children.length === 0) grid.appendChild(this._makeEmptyEl(isNo))
      return
    }

    if (this._activeCat === 'food') {
      const all = BLOCKS_BY_CAT.get('food') ?? []
      for (const sub of FOOD_SUBS) {
        const subBlocks = all.filter(b => b.sub === sub.key)
        if (subBlocks.length === 0) continue
        grid.appendChild(this._makeSectionHeader(isNo ? sub.no : sub.en))
        for (const def of subBlocks) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
      }
      const unsorted = all.filter(b => !b.sub)
      for (const def of unsorted) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
      if (grid.children.length === 0) grid.appendChild(this._makeEmptyEl(isNo))
      return
    }

    const blocks = BLOCKS_BY_CAT.get(this._activeCat) ?? []
    for (const def of blocks) grid.appendChild(this._makeBlockSlot(def, inAnyBar.has(def.id)))
    if (blocks.length === 0) grid.appendChild(this._makeEmptyEl(isNo))
  }

  // ── Recent list ───────────────────────────────────────────
  _pushRecent(id) {
    this._recentIds = [id, ...this._recentIds.filter(x => x !== id)].slice(0, RECENT_MAX)
    saveRecent(this._recentIds)
  }

  // ── Placement feedback ────────────────────────────────────
  _flashBarSlot(barType, slotIndex, name) {
    const rowId  = barType === 'tool'    ? `inv-tool-slot-${slotIndex}`
                 : barType === 'produce' ? `inv-produce-slot-${slotIndex}`
                 : `inv-hb-slot-${slotIndex}`
    const slotEl = this._el.querySelector(`#${rowId}`)
    if (!slotEl) return

    slotEl.classList.add('inv-hb-flash')
    setTimeout(() => slotEl.classList.remove('inv-hb-flash'), 400)

    // Floating name label — attach to the containing row
    const row = slotEl.parentElement
    if (!row) return
    const float = document.createElement('div')
    float.className   = 'inv-float-label'
    float.textContent = name
    row.appendChild(float)

    const slotRect = slotEl.getBoundingClientRect()
    const rowRect  = row.getBoundingClientRect()
    float.style.left = `${slotRect.left - rowRect.left + slotRect.width / 2}px`

    requestAnimationFrame(() => float.classList.add('inv-float-label--go'))
    setTimeout(() => float.remove(), 700)
  }
}
