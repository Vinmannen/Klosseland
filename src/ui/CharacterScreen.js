// ─────────────────────────────────────────────────────────────
//  Klosseland — CharacterScreen
//  Full-screen character creation overlay.
//  Saves to localStorage as 'klosseland_character'.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { t, onLanguageChange } from '../i18n/index.js'
import { buildCharacterGroup, buildHairGroup, CHAR_DEFAULTS } from '../entities/characterBuilder.js'
import { PET_DEFS } from '../data/petDefinitions.js'

const CHAR_KEY = 'klosseland_character'

// ── Colour palettes ───────────────────────────────────────────
// Body/fur colors — covers human skin tones and common animal fur
const BODY_COLORS  = [0xFFD5B0, 0xD4956A, 0xA0694E, 0x5C3317, 0xF5F5F0, 0xC8C8C8, 0xFF8C42, 0x7AAA60]
const HAIR_COLORS  = [0x1A1A1A, 0x5C3A1E, 0xD4A017, 0xC0392B, 0x888888, 0xF5F5F5]
const SHIRT_COLORS = [0x4A7EC7, 0xE74C3C, 0x2ECC71, 0xF39C12, 0x9B59B6, 0xEEEEEE]
const PANTS_COLORS = [0x2E4A80, 0x1A1A1A, 0x5D4037, 0x546E7A]
const HAT_COLORS   = [0x8B4513, 0x1A1A1A, 0xD4A017, 0x5C3A1E]
const CLOAK_COLORS = [0x8B0000, 0x1A1A80, 0x2D5A1B, 0x1A1A1A]

const MALE_HAIR_STYLES   = ['short', 'side', 'spiky', 'wavy']
const FEMALE_HAIR_STYLES = ['bun', 'ponytail', 'long', 'braids']

const SPECIES = [
  { id: 'human',   emoji: '🧍', labelKey: 'char_species_human' },
  { id: 'bunny',   emoji: '🐰', labelKey: 'char_species_bunny' },
  { id: 'cat',     emoji: '🐱', labelKey: 'char_species_cat'   },
  { id: 'fox',     emoji: '🦊', labelKey: 'char_species_fox'   },
  { id: 'bear',    emoji: '🐻', labelKey: 'char_species_bear'  },
  { id: 'frog',    emoji: '🐸', labelKey: 'char_species_frog'  },
  { id: 'raccoon', emoji: '🦝', labelKey: 'char_species_raccoon' },
]

function toHex(n) { return '#' + n.toString(16).padStart(6, '0') }

function loadCharData() {
  try {
    const raw = localStorage.getItem(CHAR_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

// ─────────────────────────────────────────────────────────────
export class CharacterScreen {
  constructor() {
    this._el        = null
    this._resolve   = null
    this._unsub     = null
    this._raf       = null
    this._renderer  = null
    this._scene     = null
    this._camera    = null
    this._charGroup = null
    this._headGroup = null
    this._hairGroup = null
    this._petGroup  = null
    this._angle     = 0.4
    this._previewMode = 'character'

    const saved = loadCharData()
    this._data = {
      ...CHAR_DEFAULTS,
      ...saved,
      face:       saved.face       ?? CHAR_DEFAULTS.face,
      hairStyle:  saved.hairStyle  ?? CHAR_DEFAULTS.hairStyle,
      hat:        saved.hat        ?? CHAR_DEFAULTS.hat,
      hatColor:   saved.hatColor   ?? CHAR_DEFAULTS.hatColor,
      cloak:      saved.cloak      ?? CHAR_DEFAULTS.cloak,
      cloakColor: saved.cloakColor ?? CHAR_DEFAULTS.cloakColor,
      shoulders:  saved.shoulders  ?? CHAR_DEFAULTS.shoulders,
      boots:      saved.boots      ?? CHAR_DEFAULTS.boots,
      pet:        saved.pet        ?? CHAR_DEFAULTS.pet,
      species:    saved.species    ?? CHAR_DEFAULTS.species,
      furPattern: saved.furPattern ?? CHAR_DEFAULTS.furPattern,
    }
  }

  show() {
    return new Promise(resolve => {
      this._resolve = resolve
      this._el = document.createElement('div')
      this._el.id = 'char-screen'
      document.getElementById('ui-root').appendChild(this._el)
      this._build()
      this._unsub = onLanguageChange(() => {
        const angle = this._angle
        this._stopPreview()
        this._build()
        this._angle = angle
        this._previewMode = 'character'
        this._startPreview()
      })
    })
  }

  // ── Build HTML ────────────────────────────────────────────
  _build() {
    const d = this._data

    this._el.innerHTML = `
      <div class="char-panel">
        <h2>${t('char_title')}</h2>
        <div class="char-body">

          <div class="char-options">

            <div class="char-tabs">
              <button class="char-tab active" data-tab="appearance">${t('char_tab_appearance')}</button>
              <button class="char-tab" data-tab="face">${t('char_tab_face')}</button>
              <button class="char-tab" data-tab="outfit">${t('char_tab_outfit')}</button>
              <button class="char-tab" data-tab="accessories">${t('char_tab_accessories')}</button>
              <button class="char-tab" data-tab="pets">${t('char_tab_pets')}</button>
            </div>

            <div class="char-tab-panel" data-panel="appearance">
              ${this._buildAppearancePanel()}
            </div>

            <div class="char-tab-panel" data-panel="face" style="display:none">
              ${this._toggleRow('char_face', 'face', [
                ['normal', t('char_face_normal')],
                ['happy',  t('char_face_happy')],
                ['cool',   t('char_face_cool')],
              ], d.face)}
            </div>

            <div class="char-tab-panel" data-panel="outfit" style="display:none">
              ${this._swatchRow('char_shirt', 'shirt', SHIRT_COLORS, d.shirtColor)}
              ${this._swatchRow('char_pants', 'pants', PANTS_COLORS, d.pantsColor)}
              ${this._toggleRow('char_boots', 'boots', [
                ['none',    t('char_boots_none')],
                ['leather', t('char_boots_leather')],
                ['metal',   t('char_boots_metal')],
              ], d.boots)}
              ${this._toggleRow('char_cloak', 'cloak', [
                ['none',  t('char_cloak_none')],
                ['short', t('char_cloak_short')],
                ['long',  t('char_cloak_long')],
              ], d.cloak)}
              <div id="char-cloak-color-row" ${d.cloak === 'none' ? 'style="display:none"' : ''}>
                ${this._swatchRow('char_cloak_color', 'cloakColor', CLOAK_COLORS, d.cloakColor)}
              </div>
              ${this._toggleRow('char_shoulders', 'shoulders', [
                ['none',  t('char_shoulders_none')],
                ['small', t('char_shoulders_small')],
                ['large', t('char_shoulders_large')],
              ], d.shoulders)}
            </div>

            <div class="char-tab-panel" data-panel="accessories" style="display:none">
              ${this._toggleRow('char_hat', 'hat', [
                ['none',   t('char_hat_none')],
                ['cap',    t('char_hat_cap')],
                ['wizard', t('char_hat_wizard')],
                ['crown',  t('char_hat_crown')],
              ], d.hat)}
              <div id="char-hat-color-row" ${d.hat === 'none' ? 'style="display:none"' : ''}>
                ${this._swatchRow('char_hat_color', 'hatColor', HAT_COLORS, d.hatColor)}
              </div>
            </div>

            <div class="char-tab-panel" data-panel="pets" style="display:none">
              ${this._petGrid()}
            </div>

            <div class="char-footer">
              <div class="char-row char-name-row">
                <span class="char-label">${t('char_name')}</span>
                <input class="kl-input" id="char-name-input" type="text" maxlength="16"
                       placeholder="${t('char_name_hint')}" value="${this._escAttr(d.name)}"
                       autocomplete="off" spellcheck="false">
              </div>
              <button class="kl-btn kl-btn-primary kl-btn-wide" id="char-done">${t('char_done')}</button>
            </div>

          </div>

          <div class="char-preview">
            <canvas id="char-preview-canvas" width="256" height="400"></canvas>
            <p class="char-preview-hint">${t('char_preview_drag')}</p>
          </div>

        </div>
      </div>
    `

    this._bindEvents()
    this._startPreview()
  }

  // ── Appearance panel HTML (also used for in-place refresh) ──
  _buildAppearancePanel() {
    const d        = this._data
    const isAnimal = d.species !== 'human'
    return `
      ${this._speciesGrid(d.species)}
      ${this._toggleRow('char_gender', 'gender', [
        ['male',   t('char_gender_male')],
        ['female', t('char_gender_female')],
      ], d.gender)}
      ${this._swatchRow(isAnimal ? 'char_furcolor' : 'char_skin', 'skin', BODY_COLORS, d.skinColor)}
      ${isAnimal ? '' : this._swatchRow('char_hair', 'hair', HAIR_COLORS, d.hairColor)}
      ${isAnimal ? '' : this._hairStyleRow(d.gender, d.hairStyle)}
      ${isAnimal ? this._toggleRow('char_furpattern', 'furPattern', [
        ['solid',   t('char_furpattern_solid')],
        ['spotted', t('char_furpattern_spotted')],
        ['striped', t('char_furpattern_striped')],
      ], d.furPattern) : ''}
    `
  }

  /** Re-render the appearance tab in place without rebuilding the whole screen. */
  _refreshAppearancePanel() {
    const panel = this._el?.querySelector('[data-panel="appearance"]')
    if (!panel) return
    panel.innerHTML = this._buildAppearancePanel()
    this._bindAppearanceEvents()
  }

  _bindEvents() {
    // ── Tab switching ─────────────────────────────────────────
    this._el.querySelectorAll('.char-tab').forEach(tab => {
      tab.onclick = () => {
        const target = tab.dataset.tab
        this._el.querySelectorAll('.char-tab').forEach(t => t.classList.toggle('active', t === tab))
        this._el.querySelectorAll('.char-tab-panel').forEach(p => {
          p.style.display = p.dataset.panel === target ? '' : 'none'
        })
        if (target === 'pets') {
          if (this._data.pet !== 'none') this._switchToPetPreview()
        } else if (this._previewMode === 'pet') {
          this._switchToCharPreview()
        }
      }
    })

    this._bindAppearanceEvents()

    // ── Toggle / style rows (face, hat, cloak, shoulders, boots) ──
    this._el.querySelectorAll('[data-toggle-group]').forEach(container => {
      const key = container.dataset.toggleGroup
      if (key === 'species' || key === 'gender' || key === 'hairStyle' || key === 'furPattern') return
      container.querySelectorAll('[data-value]').forEach(btn => {
        btn.onclick = () => {
          const val = btn.dataset.value
          this._data[key] = val
          container.querySelectorAll('[data-value]').forEach(b =>
            b.classList.toggle('active', b.dataset.value === val))
          if (key === 'hat') {
            document.getElementById('char-hat-color-row').style.display = val === 'none' ? 'none' : ''
          }
          if (key === 'cloak') {
            document.getElementById('char-cloak-color-row').style.display = val === 'none' ? 'none' : ''
          }
          this._rebuildCharGroup()
        }
      })
    })

    // ── Colour swatch rows (shirt, pants, hatColor, cloakColor) ──
    const colorMap = {
      shirt:      { arr: SHIRT_COLORS, key: 'shirtColor' },
      pants:      { arr: PANTS_COLORS, key: 'pantsColor' },
      hatColor:   { arr: HAT_COLORS,   key: 'hatColor'   },
      cloakColor: { arr: CLOAK_COLORS, key: 'cloakColor' },
    }
    this._el.querySelectorAll('[data-swatch-group]').forEach(container => {
      const groupId = container.dataset.swatchGroup
      if (groupId === 'skin' || groupId === 'hair') return
      const entry = colorMap[groupId]
      if (!entry) return
      container.querySelectorAll('.char-swatch').forEach((btn, i) => {
        btn.onclick = () => {
          this._data[entry.key] = entry.arr[i]
          container.querySelectorAll('.char-swatch').forEach((b, j) =>
            b.classList.toggle('active', j === i))
          this._rebuildCharGroup()
        }
      })
    })

    // ── Pet cards ─────────────────────────────────────────────
    this._el.querySelectorAll('[data-pet-id]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.petId
        this._data.pet = id
        this._el.querySelectorAll('[data-pet-id]').forEach(b =>
          b.classList.toggle('active', b.dataset.petId === id))
        if (id === 'none') this._switchToCharPreview()
        else                this._switchToPetPreview()
      }
    })

    // ── Name field ───────────────────────────────────────────
    this._el.querySelector('#char-name-input').oninput = e => {
      this._data.name = e.target.value
    }

    // ── Done ──────────────────────────────────────────────────
    this._el.querySelector('#char-done').onclick = () => {
      this._data.name = this._el.querySelector('#char-name-input').value.trim()
      localStorage.setItem(CHAR_KEY, JSON.stringify(this._data))
      this._unsub?.()
      this._stopPreview()
      this._resolve()
    }
  }

  /** Bind only the appearance-panel controls (species, gender, hair, fur). */
  _bindAppearanceEvents() {
    // Species grid
    this._el.querySelectorAll('[data-toggle-group="species"] [data-value]').forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.value
        this._data.species = val
        this._refreshAppearancePanel()
        this._rebuildCharGroup()
      }
    })

    // Gender toggle
    const genderContainer = this._el.querySelector('[data-toggle-group="gender"]')
    if (genderContainer) {
      genderContainer.querySelectorAll('[data-value]').forEach(btn => {
        btn.onclick = () => {
          const val = btn.dataset.value
          this._data.gender = val
          genderContainer.querySelectorAll('[data-value]').forEach(b =>
            b.classList.toggle('active', b.dataset.value === val))
          const styles = val === 'female' ? FEMALE_HAIR_STYLES : ['short', 'side', 'spiky', 'wavy']
          this._data.hairStyle = styles[0]
          this._refreshAppearancePanel()
          this._rebuildCharGroup()
        }
      })
    }

    // Body/fur color swatch
    const skinContainer = this._el.querySelector('[data-swatch-group="skin"]')
    if (skinContainer) {
      skinContainer.querySelectorAll('.char-swatch').forEach((btn, i) => {
        btn.onclick = () => {
          this._data.skinColor = BODY_COLORS[i]
          skinContainer.querySelectorAll('.char-swatch').forEach((b, j) =>
            b.classList.toggle('active', j === i))
          this._rebuildCharGroup()
        }
      })
    }

    // Hair color swatch (human only)
    const hairColorContainer = this._el.querySelector('[data-swatch-group="hair"]')
    if (hairColorContainer) {
      hairColorContainer.querySelectorAll('.char-swatch').forEach((btn, i) => {
        btn.onclick = () => {
          this._data.hairColor = HAIR_COLORS[i]
          hairColorContainer.querySelectorAll('.char-swatch').forEach((b, j) =>
            b.classList.toggle('active', j === i))
          this._rebuildHair()
        }
      })
    }

    // Hair style (human only)
    const hairStyleContainer = this._el.querySelector('[data-toggle-group="hairStyle"]')
    if (hairStyleContainer) {
      hairStyleContainer.querySelectorAll('[data-value]').forEach(btn => {
        btn.onclick = () => {
          this._data.hairStyle = btn.dataset.value
          hairStyleContainer.querySelectorAll('[data-value]').forEach(b =>
            b.classList.toggle('active', b.dataset.value === btn.dataset.value))
          this._rebuildHair()
        }
      })
    }

    // Fur pattern (animals only)
    const furPatternContainer = this._el.querySelector('[data-toggle-group="furPattern"]')
    if (furPatternContainer) {
      furPatternContainer.querySelectorAll('[data-value]').forEach(btn => {
        btn.onclick = () => {
          this._data.furPattern = btn.dataset.value
          furPatternContainer.querySelectorAll('[data-value]').forEach(b =>
            b.classList.toggle('active', b.dataset.value === btn.dataset.value))
          this._rebuildCharGroup()
        }
      })
    }
  }

  // ── HTML helpers ──────────────────────────────────────────

  _toggleRow(labelKey, groupKey, options, currentVal) {
    return `
      <div class="char-row">
        <span class="char-label">${t(labelKey)}</span>
        <div class="char-toggle" data-toggle-group="${groupKey}">
          ${options.map(([val, label]) =>
            `<button data-value="${val}" class="${val === currentVal ? 'active' : ''}">${label}</button>`
          ).join('')}
        </div>
      </div>
    `
  }

  _swatchRow(labelKey, groupId, colors, selectedColor) {
    return `
      <div class="char-row">
        <span class="char-label">${t(labelKey)}</span>
        <div class="char-swatches" data-swatch-group="${groupId}">
          ${colors.map((c, i) =>
            `<button class="char-swatch${c === selectedColor ? ' active' : ''}"
                     data-idx="${i}" style="background:${toHex(c)}" title="${toHex(c)}"></button>`
          ).join('')}
        </div>
      </div>
    `
  }

  _hairStyleRow(gender, currentStyle) {
    const styles = gender === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES
    return `
      <div class="char-row" id="char-hairstyle-row">
        <span class="char-label">${t('char_hairstyle')}</span>
        <div class="char-toggle" data-toggle-group="hairStyle">
          ${styles.map(s =>
            `<button data-value="${s}" class="${s === currentStyle ? 'active' : ''}">${t('char_hairstyle_' + s)}</button>`
          ).join('')}
        </div>
      </div>
    `
  }

  _speciesGrid(currentSpecies) {
    return `
      <div class="char-row">
        <span class="char-label">${t('char_species')}</span>
        <div class="char-species-grid" data-toggle-group="species">
          ${SPECIES.map(s => `
            <button class="char-species-btn${s.id === currentSpecies ? ' active' : ''}"
                    data-value="${s.id}">
              <span class="species-emoji">${s.emoji}</span>
              <span>${t(s.labelKey)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `
  }

  _petGrid() {
    return `
      <div class="char-pet-grid">
        ${PET_DEFS.map(def => `
          <button class="char-pet-card${this._data.pet === def.id ? ' active' : ''}"
                  data-pet-id="${def.id}">
            <span class="pet-icon">${def.emoji}</span>
            <span>${t(def.labelKey)}</span>
          </button>
        `).join('')}
      </div>
    `
  }

  _escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;')
  }

  // ── Three.js preview ─────────────────────────────────────
  _startPreview() {
    const canvas = this._el?.querySelector('#char-preview-canvas')
    if (!canvas || this._renderer) return

    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this._renderer.setSize(256, 400, false)
    this._renderer.setPixelRatio(1)
    this._renderer.setClearColor(0x000000, 0)

    this._scene  = new THREE.Scene()
    this._camera = new THREE.PerspectiveCamera(42, 256 / 400, 0.1, 50)
    this._camera.position.set(0, 0.86, 3.0)
    this._camera.lookAt(0, 0.78, 0)

    this._scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const sun = new THREE.DirectionalLight(0xffffff, 0.85)
    sun.position.set(3, 5, 4)
    this._scene.add(sun)
    const fill = new THREE.DirectionalLight(0x8fc0ff, 0.25)
    fill.position.set(-3, 1, -2)
    this._scene.add(fill)

    this._charGroup = this._buildCharGroup()
    this._charGroup.rotation.y = this._angle
    this._scene.add(this._charGroup)

    this._setupDragRotation(canvas)

    const animate = () => {
      if (!this._renderer) return
      this._raf = requestAnimationFrame(animate)
      this._renderer.render(this._scene, this._camera)
    }
    animate()
  }

  _setupDragRotation(canvas) {
    let dragging = false
    let lastX    = 0

    const onDown = e => {
      dragging = true
      lastX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      canvas.style.cursor = 'grabbing'
    }
    const onMove = e => {
      if (!dragging) return
      const grp = this._previewMode === 'pet' ? this._petGroup : this._charGroup
      if (!grp) return
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      this._angle += (x - lastX) * 0.012
      lastX = x
      grp.rotation.y = this._angle
    }
    const onUp = () => { dragging = false; canvas.style.cursor = 'grab' }

    canvas.addEventListener('mousedown',  onDown)
    canvas.addEventListener('mousemove',  onMove)
    canvas.addEventListener('mouseup',    onUp)
    canvas.addEventListener('mouseleave', onUp)
    canvas.style.cursor = 'grab'
  }

  _stopPreview() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null }
    if (this._scene) {
      this._scene.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose() })
    }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null }
    this._scene = this._camera = this._charGroup = this._headGroup =
      this._hairGroup = this._petGroup = null
    this._previewMode = 'character'
  }

  // ── Preview mode switching ────────────────────────────────

  _switchToPetPreview() {
    if (!this._scene || !this._camera) return
    this._previewMode = 'pet'
    if (this._charGroup) this._charGroup.visible = false
    this._destroyPetGroup()
    const def = PET_DEFS.find(d => d.id === this._data.pet)
    if (def?.build) {
      const { group } = def.build()
      this._petGroup = group
      this._petGroup.rotation.y = this._angle
      this._scene.add(this._petGroup)
    }
    this._camera.position.set(0, 0.55, 2.3)
    this._camera.lookAt(0, 0.55, 0)
  }

  _switchToCharPreview() {
    if (!this._scene || !this._camera) return
    this._previewMode = 'character'
    this._destroyPetGroup()
    if (this._charGroup) this._charGroup.visible = true
    this._camera.position.set(0, 0.86, 3.0)
    this._camera.lookAt(0, 0.78, 0)
  }

  _destroyPetGroup() {
    if (!this._petGroup) return
    this._petGroup.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose() })
    this._scene?.remove(this._petGroup)
    this._petGroup = null
  }

  _rebuildCharGroup() {
    if (!this._scene || !this._charGroup) return
    const old = this._charGroup
    this._scene.remove(old)
    old.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose() })
    this._charGroup = this._buildCharGroup()
    this._charGroup.rotation.y = this._angle
    this._scene.add(this._charGroup)
    if (this._previewMode === 'pet') this._charGroup.visible = false
  }

  _rebuildHair() {
    if (!this._headGroup) { this._rebuildCharGroup(); return }
    if (this._hairGroup) {
      this._headGroup.remove(this._hairGroup)
      this._hairGroup.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose() })
    }
    const newHair = buildHairGroup(this._data.hairStyle, this._data.hairColor)
    this._hairGroup = newHair
    this._headGroup.add(newHair)
  }

  _buildCharGroup() {
    const { group, head, hairGroup } = buildCharacterGroup(this._data)
    this._headGroup = head
    this._hairGroup = hairGroup
    return group
  }

  hide() {
    this._unsub?.()
    this._stopPreview()
    if (!this._el) return
    this._el.classList.add('kl-fade-out')
    setTimeout(() => { this._el?.remove(); this._el = null }, 500)
  }
}
