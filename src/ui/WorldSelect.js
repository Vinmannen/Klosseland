// ─────────────────────────────────────────────────────────────
//  Klosseland — WorldSelect
//  Two views: world list and new-world creation form.
//  Resolves with a world config object, or null when the user
//  clicks Back (so the caller can return to the title screen).
// ─────────────────────────────────────────────────────────────
import { t, getLanguage, onLanguageChange } from '../i18n/index.js'
import { WORLD_SIZES } from '../data/constants.js'
import { WorldSave }   from '../world/WorldSave.js'

// Ordered biome list for the Starting Biome dropdown
const BIOME_OPTIONS = [
  { value: 'MEADOW',      i18nKey: 'biome_meadow'   },
  { value: 'FOREST',      i18nKey: 'biome_forest'   },
  { value: 'SNOWY_PEAKS', i18nKey: 'biome_snowy'    },
  { value: 'DESERT',      i18nKey: 'biome_desert'   },
  { value: 'JUNGLE',      i18nKey: 'biome_jungle'   },
  { value: 'MUSHROOM',    i18nKey: 'biome_mushroom' },
  { value: 'CANDY',       i18nKey: 'biome_candy'    },
  { value: 'AUTUMN',      i18nKey: 'biome_autumn'   },
  { value: 'CHERRY',      i18nKey: 'biome_cherry'   },
  { value: 'VENTHYR',    i18nKey: 'biome_venthyr'  },
]

const STORAGE_KEY = 'kl_worlds'

// ── localStorage helpers ──────────────────────────────────────
export function loadWorlds() {
  try   { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}
export function saveWorlds(worlds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds))
}
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h) % 99999
}

export class WorldSelect {
  constructor() {
    this._el      = null
    this._resolve = null
    this._unsub   = null
    this._view    = 'list' // 'list' | 'create'
  }

  show() {
    return new Promise(resolve => {
      this._resolve = resolve
      this._view    = 'list'
      this._el      = document.createElement('div')
      this._el.id   = 'world-select'
      this._build()
      document.getElementById('ui-root').appendChild(this._el)
      this._unsub = onLanguageChange(() => this._build())
    })
  }

  // ── Routing ───────────────────────────────────────────────
  _build() {
    if (this._view === 'list') this._buildList()
    else                       this._buildCreate()
  }

  // ── World List ────────────────────────────────────────────
  _buildList() {
    const worlds = loadWorlds()
    const lang   = getLanguage()

    const worldItems = worlds.length === 0
      ? `<p class="worlds-empty">${t('worlds_empty')}</p>`
      : worlds
          .slice()
          .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
          .map(w => {
            const sizeLabel = WORLD_SIZES[w.sizeKey]?.[lang === 'no' ? 'labelNo' : 'label'] ?? w.sizeKey
            const date      = new Date(w.lastPlayed || w.created).toLocaleDateString()
            return `
              <div class="world-entry">
                <div class="world-info">
                  <strong>${_esc(w.name)}</strong>
                  <span>${sizeLabel} · ${date}</span>
                </div>
                <div class="world-actions">
                  <button class="kl-btn kl-btn-primary kl-btn-sm" data-action="load" data-id="${w.id}">${t('worlds_load')}</button>
                  <button class="kl-btn kl-btn-sm" data-action="export" data-id="${w.id}">${t('worlds_export')}</button>
                  <button class="kl-btn kl-btn-sm kl-btn-danger" data-action="delete" data-id="${w.id}">${t('worlds_delete')}</button>
                </div>
              </div>`
          }).join('')

    this._el.innerHTML = `
      <div class="kl-panel world-panel">
        <h2>${t('worlds_title')}</h2>
        <div class="world-list">${worldItems}</div>
        <div class="panel-footer">
          <button class="kl-btn" id="ws-back">${t('back')}</button>
          <label class="kl-btn" id="ws-import-label" style="cursor:pointer">${t('worlds_import')}<input type="file" id="ws-import-file" accept=".json" style="display:none"></label>
          <button class="kl-btn kl-btn-primary" id="ws-new">${t('worlds_new')}</button>
        </div>
      </div>
    `

    this._el.querySelector('#ws-back').onclick = () => {
      this._unsub?.()
      this._resolve(null) // null = go back to title
    }
    this._el.querySelector('#ws-new').onclick = () => {
      this._view = 'create'
      this._build()
    }
    this._el.querySelectorAll('[data-action="load"]').forEach(btn => {
      btn.onclick = () => {
        const worlds = loadWorlds()
        const world  = worlds.find(w => w.id === btn.dataset.id)
        if (!world) return
        world.lastPlayed = Date.now()
        saveWorlds(worlds)
        this._unsub?.()
        this._resolve(world)
      }
    })
    this._el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.onclick = () => {
        if (!confirm(t('worlds_confirm_delete'))) return
        const id = btn.dataset.id
        WorldSave.deleteWorld(id)
        saveWorlds(loadWorlds().filter(w => w.id !== id))
        this._build()
      }
    })

    this._el.querySelectorAll('[data-action="export"]').forEach(btn => {
      btn.onclick = async () => {
        const worlds = loadWorlds()
        const world  = worlds.find(w => w.id === btn.dataset.id)
        if (!world) return
        try {
          const data = await WorldSave.exportToObject(world)
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
          const url  = URL.createObjectURL(blob)
          const a    = document.createElement('a')
          a.href     = url
          a.download = `${world.name.replace(/[^a-z0-9]/gi, '_')}.klosseland.json`
          a.click()
          URL.revokeObjectURL(url)
        } catch (e) {
          alert('Export failed: ' + e.message)
        }
      }
    })

    const importFile = this._el.querySelector('#ws-import-file')
    importFile.onchange = async () => {
      const file = importFile.files[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const world = await WorldSave.importFromObject(data)
        const worlds = loadWorlds()
        worlds.push(world)
        saveWorlds(worlds)
        this._build()
      } catch (e) {
        alert('Import failed: ' + e.message)
      }
    }
  }

  // ── New World Form ────────────────────────────────────────
  _buildCreate() {
    const lang = getLanguage()
    const sizeOptions = Object.entries(WORLD_SIZES)
      .map(([key, val]) =>
        `<option value="${key}"${key === 'medium' ? ' selected' : ''}>${lang === 'no' ? val.labelNo : val.label}</option>`
      ).join('')

    const biomeOptions = [
      `<option value="random">${t('create_biome_random')}</option>`,
      ...BIOME_OPTIONS.map(b => `<option value="${b.value}">${t(b.i18nKey)}</option>`),
    ].join('')

    this._el.innerHTML = `
      <div class="kl-panel world-panel">
        <h2>${t('create_title')}</h2>
        <div class="create-form">
          <label class="form-row">
            <span>${t('create_name')}</span>
            <input id="inp-wname" type="text" maxlength="32" placeholder="${t('create_name_hint')}" />
          </label>
          <label class="form-row">
            <span>${t('create_size')}</span>
            <select id="inp-size">${sizeOptions}</select>
          </label>
          <div class="form-row">
            <span>${t('create_terrain')}</span>
            <div class="radio-group">
              <label><input type="radio" name="terrain" value="flat"> ${t('create_terrain_flat')}</label>
              <label><input type="radio" name="terrain" value="hills" checked> ${t('create_terrain_hills')}</label>
            </div>
          </div>
          <label class="form-row">
            <span>${t('create_biome')}</span>
            <select id="inp-biome">${biomeOptions}</select>
          </label>
          <label class="form-row">
            <span>${t('create_seed')}</span>
            <input id="inp-seed" type="text" placeholder="${t('create_seed_hint')}" />
          </label>
        </div>
        <div class="panel-footer">
          <button class="kl-btn" id="ws-back-create">${t('back')}</button>
          <button class="kl-btn kl-btn-primary" id="ws-create-go">${t('create_go')}</button>
        </div>
      </div>
    `

    this._el.querySelector('#ws-back-create').onclick = () => {
      this._view = 'list'
      this._build()
    }
    this._el.querySelector('#ws-create-go').onclick = () => {
      const nameRaw      = this._el.querySelector('#inp-wname').value.trim()
      const name         = nameRaw || t('create_name_hint')
      const sizeKey      = this._el.querySelector('#inp-size').value
      const terrain      = this._el.querySelector('input[name="terrain"]:checked')?.value || 'hills'
      const gameMode     = 'creative'
      const startingBiome = this._el.querySelector('#inp-biome').value
      const seedRaw      = this._el.querySelector('#inp-seed').value.trim()
      const seed         = seedRaw
        ? (parseInt(seedRaw, 10) || hashStr(seedRaw))
        : Math.floor(Math.random() * 99999)

      const world = { id: makeId(), name, sizeKey, terrainType: terrain, gameMode, startingBiome, seed, created: Date.now(), lastPlayed: Date.now() }
      const worlds = loadWorlds()
      worlds.push(world)
      saveWorlds(worlds)

      this._unsub?.()
      this._resolve(world)
    }
  }

  hide() {
    this._unsub?.()
    if (!this._el) return
    this._el.classList.add('kl-fade-out')
    setTimeout(() => { this._el?.remove(); this._el = null }, 500)
  }
}

function _esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
