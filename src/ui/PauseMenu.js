// ─────────────────────────────────────────────────────────────
//  Klosseland — PauseMenu
//  Shown when the player presses Escape in-game.
//  Callbacks: onResume, onSettings, onQuit
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { t, onLanguageChange } from '../i18n/index.js'
import { PlayerMesh } from '../entities/PlayerMesh.js'

export class PauseMenu {
  constructor() {
    this._el         = null
    this._unsub      = null
    this._visible    = false
    this._callbacks  = {}
    this._previewRenderer = null
  }

  get visible() { return this._visible }

  show({ onResume, onSettings, onQuit, getPlayers, playerName } = {}) {
    if (this._visible) return
    this._visible   = true
    this._callbacks = { onResume, onSettings, onQuit, getPlayers, playerName }

    this._el = document.createElement('div')
    this._el.className = 'kl-overlay pause-overlay'
    this._build()
    document.getElementById('ui-root').appendChild(this._el)
    this._unsub = onLanguageChange(() => {
      this._stopPreview()
      this._build()
    })
  }

  _build() {
    const { onResume, onSettings, onQuit, getPlayers, playerName } = this._callbacks

    const players    = getPlayers?.() ?? []
    const playerHtml = players.length
      ? `<div class="pause-players">
           <div class="pause-players-title">${t('pause_players') ?? 'Players online'} (${players.length + 1})</div>
           ${players.map(p => `<div class="pause-player-name">• ${p.name}</div>`).join('')}
         </div>`
      : ''

    const name = playerName || localStorage.getItem('kl_player_name') || 'Player'

    this._el.innerHTML = `
      <div class="kl-panel pause-panel">
        <h2>${t('pause_title')}</h2>
        <div class="pause-player-preview">
          <canvas id="pm-char-canvas" width="64" height="96"></canvas>
          <div class="pause-playing-as">
            Playing as<strong>${name}</strong>
          </div>
        </div>
        ${playerHtml}
        <div class="pause-buttons">
          <button class="kl-btn kl-btn-primary kl-btn-wide" id="btn-resume">${t('pause_resume')}</button>
          <button class="kl-btn kl-btn-wide" id="btn-psettings">${t('pause_settings')}</button>
          <button class="kl-btn kl-btn-wide kl-btn-danger" id="btn-quit">${t('pause_quit')}</button>
        </div>
      </div>
    `
    this._el.querySelector('#btn-resume').onclick = () => {
      this.hide()
      onResume?.()
    }
    this._el.querySelector('#btn-psettings').onclick = () => onSettings?.()
    this._el.querySelector('#btn-quit').onclick = () => {
      if (confirm(t('pause_quit_confirm'))) onQuit?.()
    }

    this._startPreview()
  }

  // ── Three.js character preview ────────────────────────────
  _startPreview() {
    const canvas = this._el?.querySelector('#pm-char-canvas')
    if (!canvas || this._previewRenderer) return

    try {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(64, 96, false)
      renderer.setPixelRatio(1)
      renderer.setClearColor(0x000000, 0)

      const scene  = new THREE.Scene()
      scene.add(new THREE.AmbientLight(0xffffff, 0.9))
      const dir = new THREE.DirectionalLight(0xffffff, 0.6)
      dir.position.set(2, 4, 3)
      scene.add(dir)

      // PlayerMesh reads character data from localStorage automatically
      const mesh = new PlayerMesh(scene)

      const camera = new THREE.PerspectiveCamera(42, 64 / 96, 0.1, 50)
      camera.position.set(0, 1.0, 3.2)
      camera.lookAt(0, 0.9, 0)

      renderer.render(scene, camera)

      // Keep renderer alive so canvas stays painted
      this._previewRenderer = renderer
      this._previewMesh     = mesh
      this._previewScene    = scene
    } catch {
      // Silently skip if WebGL context limit is reached
    }
  }

  _stopPreview() {
    if (this._previewRenderer) {
      this._previewMesh?.dispose?.()
      this._previewRenderer.dispose()
      this._previewRenderer = null
      this._previewMesh     = null
      this._previewScene    = null
    }
  }

  hide() {
    this._stopPreview()
    this._unsub?.()
    this._el?.remove()
    this._el      = null
    this._visible = false
  }
}
