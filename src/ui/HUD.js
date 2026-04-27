// ─────────────────────────────────────────────────────────────
//  Klosseland — HUD  (Phase 16.2 + 16.3)
//  Compass strip: thin bar at top-centre, scrolls with yaw.
//  Coordinates: top-left, toggled with F3.
// ─────────────────────────────────────────────────────────────

// Compass direction labels in clockwise order starting at South.
// yaw=0 = facing +Z (south); yaw increases clockwise.
const DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']
const STEP  = 40    // px between adjacent labels on the tape
const TAPE_W = STEP * DIRS.length   // 320 px for one full revolution

const COMPASS_W = 300
const COMPASS_H = 22

export class HUD {
  constructor() {
    this._compassWrap  = null
    this._compassCanvas = null
    this._compassCtx   = null
    this._coordsEl     = null
    this._coordsVisible = (localStorage.getItem('kl_coords') ?? 'false') === 'true'
  }

  mount() {
    // ── Compass ───────────────────────────────────────────────
    this._compassWrap = document.createElement('div')
    this._compassWrap.id = 'hud-compass-wrap'

    this._compassCanvas        = document.createElement('canvas')
    this._compassCanvas.width  = COMPASS_W
    this._compassCanvas.height = COMPASS_H
    this._compassCtx = this._compassCanvas.getContext('2d')

    this._compassWrap.appendChild(this._compassCanvas)
    document.getElementById('ui-root').appendChild(this._compassWrap)

    // ── Coordinates ───────────────────────────────────────────
    this._coordsEl = document.createElement('div')
    this._coordsEl.id = 'hud-coords'
    document.getElementById('ui-root').appendChild(this._coordsEl)
    if (!this._coordsVisible) this._coordsEl.style.display = 'none'
  }

  toggleCoords() {
    this._coordsVisible = !this._coordsVisible
    localStorage.setItem('kl_coords', String(this._coordsVisible))
    if (this._coordsEl) this._coordsEl.style.display = this._coordsVisible ? '' : 'none'
  }

  get coordsVisible() { return this._coordsVisible }

  // ── Main update (call every frame) ───────────────────────
  update(player) {
    this._drawCompass(player.yaw)
    if (this._coordsVisible && this._coordsEl) {
      this._coordsEl.innerHTML =
        `X: ${player.x.toFixed(1)}<br>Y: ${player.y.toFixed(1)}<br>Z: ${player.z.toFixed(1)}`
    }
  }

  // ── Draw compass tape ─────────────────────────────────────
  _drawCompass(yaw) {
    if (!this._compassCtx) return
    const ctx = this._compassCtx
    const cx  = COMPASS_W / 2

    ctx.clearRect(0, 0, COMPASS_W, COMPASS_H)

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    try {
      ctx.beginPath()
      ctx.roundRect(0, 0, COMPASS_W, COMPASS_H, 5)
      ctx.fill()
    } catch {
      ctx.fillRect(0, 0, COMPASS_W, COMPASS_H)
    }

    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < DIRS.length; i++) {
      // Angle of this direction label on the tape
      const dirAngle = i * (Math.PI * 2 / DIRS.length)

      // Signed angular difference (yaw relative to label), wrapped [-PI, PI]
      let diff = dirAngle - yaw
      diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI

      // Map to pixel offset from centre
      const x = cx + (diff / (Math.PI * 2)) * TAPE_W

      if (x < -20 || x > COMPASS_W + 20) continue

      const isCardinal = i % 2 === 0        // S, E, N, W
      const isNorth    = i === 4            // N — gold highlight
      ctx.globalAlpha = isCardinal ? 1.0 : 0.55
      ctx.fillStyle   = isNorth ? '#FFD04A' : '#FFFFFF'
      ctx.fillText(DIRS[i], x, COMPASS_H / 2)
    }

    ctx.globalAlpha = 1.0

    // Centre tick mark
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, 1)
    ctx.lineTo(cx, 6)
    ctx.stroke()
  }

  dispose() {
    this._compassWrap?.remove()
    this._coordsEl?.remove()
    this._compassWrap   = null
    this._compassCanvas = null
    this._compassCtx    = null
    this._coordsEl      = null
  }
}
