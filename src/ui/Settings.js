// ─────────────────────────────────────────────────────────────
//  Klosseland — Settings panel
//  Modal overlay: language, day duration, FPS toggle.
//  Accepts a live `gameSettings` object and mutates it on Apply.
// ─────────────────────────────────────────────────────────────
import { t, setLanguage, getLanguage, onLanguageChange } from '../i18n/index.js'
import { LANGUAGES, DAY_DURATIONS_MIN } from '../data/constants.js'

const STORAGE_KEY = 'kl_settings'

export const DEFAULT_SETTINGS = {
  dayDurationMin:  20,
  showFPS:         false,
  volume:          0.8,
  sfxVolume:       1.0,
  ambientVolume:   0.45,
  farmGrowthDays:  1,   // in-game days per crop stage (1=fast, 2=normal, 3=slow)
}

export function loadSettings() {
  try   { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } }
  catch { return { ...DEFAULT_SETTINGS } }
}
export function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

// Day-label map (indices match DAY_DURATIONS_MIN)
const DAY_LABEL_KEYS = ['settings_day_5', 'settings_day_10', 'settings_day_20', 'settings_day_always']

const CONTROLS = [
  { key: 'WASD',          label: 'ctrl_move'      },
  { key: 'Mouse',         label: 'ctrl_look'       },
  { key: 'Space',         label: 'ctrl_jump'       },
  { key: 'Space×2',       label: 'ctrl_fly'        },
  { key: 'LMB',           label: 'ctrl_place'      },
  { key: 'RMB',           label: 'ctrl_remove'     },
  { key: 'MMB',           label: 'ctrl_hotbar'     },
  { key: 'Tab',           label: 'ctrl_inventory'  },
  { key: 'M',             label: 'ctrl_map'        },
  { key: 'P',             label: 'ctrl_pets'       },
  { key: 'Ctrl+Z',        label: 'ctrl_undo'       },
  { key: 'Ctrl+Y',        label: 'ctrl_redo'       },
  { key: 'F2',            label: 'ctrl_screenshot' },
  { key: 'F5',            label: 'ctrl_camera'     },
  { key: 'Esc',           label: 'ctrl_pause'      },
]
const CTRL_MULTIPLAYER = { key: 'T', label: 'ctrl_chat' }

export class Settings {
  /**
   * @param {object}  gameSettings  Live settings object shared with the game loop.
   *                                May be {} when shown outside a running game.
   * @param {boolean} multiplayer   Show chat key row when true.
   */
  constructor(gameSettings, multiplayer = false) {
    this._settings    = gameSettings
    this._multiplayer = multiplayer
    this._el          = null
    this._unsub       = null
  }

  /** Returns a Promise that resolves when the user clicks Apply / Close. */
  show() {
    return new Promise(resolve => {
      this._el = document.createElement('div')
      this._el.className = 'kl-overlay'
      this._build(resolve)
      document.getElementById('ui-root').appendChild(this._el)
      this._unsub = onLanguageChange(() => this._build(resolve))
    })
  }

  _build(resolve) {
    const lang = getLanguage()
    const s    = this._settings

    const dayRows = DAY_DURATIONS_MIN.map((min, i) => `
      <label class="radio-label">
        <input type="radio" name="day" value="${min}" ${(s.dayDurationMin ?? 20) === min ? 'checked' : ''}>
        ${t(DAY_LABEL_KEYS[i])}
      </label>`).join('')

    const volPct    = Math.round((s.volume        ?? 0.80) * 100)
    const sfxPct    = Math.round((s.sfxVolume     ?? 1.00) * 100)
    const ambPct    = Math.round((s.ambientVolume ?? 0.45) * 100)

    this._el.innerHTML = `
      <div class="kl-panel settings-panel">
        <h2>${t('settings_title')}</h2>

        <section class="settings-section">
          <h3>${t('settings_language')}</h3>
          <div class="lang-toggle">
            ${Object.entries(LANGUAGES).map(([code, name]) =>
              `<button class="kl-lang-btn${lang === code ? ' active' : ''}" data-lang="${code}">${name}</button>`
            ).join('')}
          </div>
        </section>

        <section class="settings-section">
          <h3>${t('settings_vol_master')}</h3>
          <label class="slider-row">
            <input type="range" id="sld-vol" min="0" max="100" value="${volPct}">
            <span id="lbl-vol">${volPct}%</span>
          </label>
          <label class="slider-row">
            <span>${t('settings_vol_sfx')}</span>
            <input type="range" id="sld-sfx" min="0" max="100" value="${sfxPct}">
            <span id="lbl-sfx">${sfxPct}%</span>
          </label>
          <label class="slider-row">
            <span>${t('settings_vol_ambient')}</span>
            <input type="range" id="sld-amb" min="0" max="100" value="${ambPct}">
            <span id="lbl-amb">${ambPct}%</span>
          </label>
        </section>

        <section class="settings-section">
          <h3>${t('settings_day_duration')}</h3>
          <div class="radio-group">${dayRows}</div>
        </section>

        <section class="settings-section">
          <h3>${t('settings_farm_speed')}</h3>
          <div class="radio-group">
            ${[1, 2, 3].map((days, i) => `
              <label class="radio-label">
                <input type="radio" name="farmdays" value="${days}" ${(s.farmGrowthDays ?? 1) === days ? 'checked' : ''}>
                ${t(['settings_farm_fast', 'settings_farm_normal', 'settings_farm_slow'][i])}
              </label>`).join('')}
          </div>
        </section>

        <section class="settings-section">
          <label class="toggle-row">
            <span>${t('settings_show_fps')}</span>
            <input type="checkbox" id="chk-fps" ${s.showFPS ? 'checked' : ''}>
          </label>
        </section>

        <section class="settings-section">
          <h3>${t('settings_controls')}</h3>
          <div class="ctrl-grid">
            ${[...CONTROLS, ...(this._multiplayer ? [CTRL_MULTIPLAYER] : [])].map(c => `
              <kbd class="ctrl-key">${c.key}</kbd>
              <span class="ctrl-desc">${t(c.label)}</span>
            `).join('')}
          </div>
        </section>

        <div class="panel-footer">
          <button class="kl-btn kl-btn-primary kl-btn-wide" id="btn-apply">${t('settings_apply')}</button>
        </div>
      </div>
    `

    // Language buttons — live change, re-renders panel
    this._el.querySelectorAll('[data-lang]').forEach(btn => {
      btn.onclick = () => setLanguage(btn.dataset.lang)
    })

    // Volume sliders — live label update
    const bindSlider = (id, lblId) => {
      const sld = this._el.querySelector(`#${id}`)
      const lbl = this._el.querySelector(`#${lblId}`)
      if (sld && lbl) sld.oninput = () => { lbl.textContent = `${sld.value}%` }
    }
    bindSlider('sld-vol', 'lbl-vol')
    bindSlider('sld-sfx', 'lbl-sfx')
    bindSlider('sld-amb', 'lbl-amb')

    this._el.querySelector('#btn-apply').onclick = () => {
      const checkedDay   = this._el.querySelector('input[name="day"]:checked')
      const dayMin       = checkedDay ? parseInt(checkedDay.value, 10) : 20
      const showFPS      = this._el.querySelector('#chk-fps').checked
      const volume       = parseInt(this._el.querySelector('#sld-vol').value, 10) / 100
      const sfxVolume    = parseInt(this._el.querySelector('#sld-sfx').value, 10) / 100
      const ambientVolume= parseInt(this._el.querySelector('#sld-amb').value, 10) / 100

      const checkedFarm  = this._el.querySelector('input[name="farmdays"]:checked')
      const farmGrowthDays = checkedFarm ? parseInt(checkedFarm.value, 10) : 1

      Object.assign(this._settings, { dayDurationMin: dayMin, showFPS, volume, sfxVolume, ambientVolume, farmGrowthDays })
      saveSettings(this._settings)

      this._unsub?.()
      this._el.remove()
      this._el = null
      resolve()
    }
  }

  hide() {
    this._unsub?.()
    this._el?.remove()
    this._el = null
  }
}
