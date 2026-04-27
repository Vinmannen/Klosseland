// ─────────────────────────────────────────────────────────────
//  Klosseland — TitleScreen
//  Shown on startup. Resolves with 'solo' | 'host' | 'join'.
// ─────────────────────────────────────────────────────────────
import { t, setLanguage, getLanguage, onLanguageChange } from '../i18n/index.js'
import { LANGUAGES } from '../data/constants.js'

export class TitleScreen {
  constructor() {
    this._el      = null
    this._resolve = null
    this._unsub   = null
  }

  /** Shows the screen; returns a Promise that resolves with the chosen action. */
  show() {
    return new Promise(resolve => {
      this._resolve = resolve
      this._el = document.createElement('div')
      this._el.id = 'title-screen'
      this._build()
      document.getElementById('ui-root').appendChild(this._el)
      this._unsub = onLanguageChange(() => this._build())
    })
  }

  _build() {
    const lang = getLanguage()
    this._el.innerHTML = `
      <div class="title-content">
        <h1 class="title-logo">Klosseland</h1>
        <p class="title-tagline">${t('title_tagline')}</p>
        <div class="title-buttons">
          <button class="kl-btn kl-btn-primary kl-btn-wide" data-action="solo">${t('title_solo')}</button>
          <button class="kl-btn kl-btn-wide" data-action="character">${t('char_title')}</button>
          <button class="kl-btn kl-btn-wide" data-action="host">${t('title_host')}</button>
          <button class="kl-btn kl-btn-wide" data-action="join">${t('title_join')}</button>
        </div>
        <div class="lang-toggle">
          ${Object.entries(LANGUAGES).map(([code, name]) =>
            `<button class="kl-lang-btn${lang === code ? ' active' : ''}" data-lang="${code}">${name}</button>`
          ).join('')}
        </div>
      </div>
    `

    this._el.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        this._unsub?.()
        this._resolve(btn.dataset.action)
      }
    })
    this._el.querySelectorAll('[data-lang]').forEach(btn => {
      btn.onclick = () => setLanguage(btn.dataset.lang)
    })
  }

  hide() {
    this._unsub?.()
    if (!this._el) return
    this._el.classList.add('kl-fade-out')
    setTimeout(() => { this._el?.remove(); this._el = null }, 500)
  }
}
