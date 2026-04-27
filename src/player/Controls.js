// ─────────────────────────────────────────────────────────────
//  Klosseland — Controls
//  Handles keyboard, mouse pointer-lock, and touch joysticks.
//  Emits a simple state object consumed by Player + Camera.
// ─────────────────────────────────────────────────────────────

const DOUBLE_TAP_MS = 300

export class Controls {
  constructor(canvas) {
    this._canvas = canvas

    // ── Enabled flag (false = pause / menus active) ─────────
    this.enabled = true

    // ── Raw input state ─────────────────────────────────────
    this._keys = new Set()

    // Mouse delta (pointer-lock)
    this._mouseX = 0
    this._mouseY = 0
    this.pointerLocked = false

    // Touch joystick state
    this._leftStick  = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 }
    this._rightStick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 }
    this._touchJump  = false

    // Double-tap space for fly toggle
    this._lastSpaceTime = 0
    this.flyToggled = false

    // Mouse button state
    this._lmbDown  = false
    this._rmbDown  = false
    this._mmbDown  = false
    this.lmbJustDown = false
    this.rmbJustDown = false
    this.mmbJustDown = false   // middle-click (eyedropper)

    // Scroll wheel (inventory)
    this._wheelDelta = 0

    // Hotbar slot key (1-9), -1 = none this frame
    this._slotKey = -1

    // Single-shot key events (consumed by consumeKey)
    this._keyJustPressed = new Set()

    // ── Bind handlers so they can be removed in dispose() ───
    this._onKeyDown          = this._handleKeyDown.bind(this)
    this._onKeyUp            = this._handleKeyUp.bind(this)
    this._onPointerLockChange = this._handlePointerLockChange.bind(this)
    this._onMouseMove        = this._handleMouseMove.bind(this)
    this._onMouseDown        = this._handleMouseDown.bind(this)
    this._onMouseUp          = this._handleMouseUp.bind(this)
    this._onContextMenu      = e => e.preventDefault()
    this._onWheel            = this._handleWheel.bind(this)
    this._onCanvasClick      = this._handleCanvasClick.bind(this)

    this._bindKeyboard()
    this._bindPointerLock(canvas)
    this._buildTouchUI()
    this._bindTouchUI()
  }

  // ── Keyboard ──────────────────────────────────────────────
  _bindKeyboard() {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup',   this._onKeyUp)
  }

  _handleKeyDown(e) {
    if (e.repeat) return
    this._keys.add(e.code)

    if (e.code === 'Space') {
      const now = performance.now()
      if (now - this._lastSpaceTime < DOUBLE_TAP_MS) this.flyToggled = true
      this._lastSpaceTime = now
    }

    // Hotbar slot keys 1-9
    const n = parseInt(e.key)
    if (!isNaN(n) && n >= 1 && n <= 9) this._slotKey = n - 1

    // Single-shot key events for tools
    this._keyJustPressed.add(e.code)
  }

  _handleKeyUp(e) {
    this._keys.delete(e.code)
  }

  // ── Pointer lock + mouse look ─────────────────────────────
  _bindPointerLock(canvas) {
    canvas.addEventListener('mousedown',   this._onMouseDown)
    canvas.addEventListener('mouseup',     this._onMouseUp)
    canvas.addEventListener('contextmenu', this._onContextMenu)
    canvas.addEventListener('wheel',       this._onWheel, { passive: true })

    document.addEventListener('click',            this._onCanvasClick)
    document.addEventListener('pointerlockchange', this._onPointerLockChange)
    document.addEventListener('mousemove',         this._onMouseMove)
  }

  _handleCanvasClick() {
    if (this.enabled && !this.pointerLocked) {
      const p = this._canvas.requestPointerLock()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }
  }

  _handlePointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this._canvas
  }

  _handleMouseMove(e) {
    if (!this.pointerLocked || !this.enabled) return
    this._mouseX += e.movementX
    this._mouseY += e.movementY
  }

  _handleMouseDown(e) {
    if (!this.enabled) return
    if (e.button === 0) { this._lmbDown = true;  this.lmbJustDown = true }
    if (e.button === 2) { this._rmbDown = true;  this.rmbJustDown = true }
    if (e.button === 1) { this._mmbDown = true;  this.mmbJustDown = true; e.preventDefault() }
  }

  _handleMouseUp(e) {
    if (e.button === 0) this._lmbDown = false
    if (e.button === 2) this._rmbDown = false
    if (e.button === 1) this._mmbDown = false
  }

  _handleWheel(e) {
    this._wheelDelta = e.deltaY > 0 ? 1 : -1
  }

  // ── Pause / Resume ─────────────────────────────────────────
  /** Call when opening a menu — releases pointer lock, stops input. */
  unlock() {
    this.enabled = false
    this._keys.clear()
    this._keyJustPressed.clear()
    this._wheelDelta = 0
    this._slotKey    = -1
    this.lmbJustDown = false
    this.rmbJustDown = false
    this.mmbJustDown = false
    document.exitPointerLock()
  }

  /** Call when resuming play — input resumes; pointer lock re-acquired on click. */
  lock() {
    this._keys.clear()
    this._keyJustPressed.clear()
    this.lmbJustDown = false
    this.rmbJustDown = false
    this.mmbJustDown = false
    this._wheelDelta = 0
    this._slotKey = -1
    this.enabled = true
  }

  // ── Cleanup ───────────────────────────────────────────────
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup',   this._onKeyUp)
    document.removeEventListener('click',             this._onCanvasClick)
    document.removeEventListener('pointerlockchange', this._onPointerLockChange)
    document.removeEventListener('mousemove',         this._onMouseMove)
    this._canvas.removeEventListener('mousedown',   this._onMouseDown)
    this._canvas.removeEventListener('mouseup',     this._onMouseUp)
    this._canvas.removeEventListener('contextmenu', this._onContextMenu)
    this._canvas.removeEventListener('wheel',       this._onWheel)
    if (document.pointerLockElement === this._canvas) document.exitPointerLock()

    // Remove touch UI elements
    this._leftZone?.remove()
    this._rightZone?.remove()
    this._jumpBtn?.remove()
    this._placeBtn?.remove()
    this._removeBtn?.remove()
    this._flyBtn?.remove()
  }

  // ── Virtual touch UI ──────────────────────────────────────
  _buildTouchUI() {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    if (!isTouchDevice) return

    const css = `
      position:fixed; border-radius:50%; background:rgba(255,255,255,0.15);
      border:2px solid rgba(255,255,255,0.3); touch-action:none; user-select:none;
    `
    this._leftZone = Object.assign(document.createElement('div'), {
      id: 'joy-left',
      style: `${css} width:120px; height:120px; left:24px; bottom:24px;`,
    })
    this._leftKnob = Object.assign(document.createElement('div'), {
      style: `position:absolute; width:48px; height:48px; border-radius:50%;
              background:rgba(255,255,255,0.4); left:36px; top:36px; pointer-events:none;`,
    })
    this._leftZone.appendChild(this._leftKnob)

    this._rightZone = Object.assign(document.createElement('div'), {
      id: 'joy-right',
      style: `${css} width:120px; height:120px; right:24px; bottom:24px;`,
    })
    this._rightKnob = Object.assign(document.createElement('div'), {
      style: `position:absolute; width:48px; height:48px; border-radius:50%;
              background:rgba(255,255,255,0.4); left:36px; top:36px; pointer-events:none;`,
    })
    this._rightZone.appendChild(this._rightKnob)

    this._jumpBtn = Object.assign(document.createElement('button'), {
      textContent: '▲',
      style: `position:fixed; right:160px; bottom:34px; width:56px; height:56px;
              border-radius:50%; background:rgba(100,200,80,0.7); border:none;
              font-size:20px; color:#fff; touch-action:none;`,
    })

    this._placeBtn = Object.assign(document.createElement('button'), {
      textContent: '+',
      style: `position:fixed; right:230px; bottom:100px; width:56px; height:56px;
              border-radius:50%; background:rgba(80,160,255,0.7); border:none;
              font-size:24px; color:#fff; touch-action:none;`,
    })
    this._removeBtn = Object.assign(document.createElement('button'), {
      textContent: '✕',
      style: `position:fixed; right:160px; bottom:110px; width:56px; height:56px;
              border-radius:50%; background:rgba(255,80,80,0.7); border:none;
              font-size:20px; color:#fff; touch-action:none;`,
    })

    this._flyBtn = Object.assign(document.createElement('button'), {
      textContent: '✈',
      style: `position:fixed; right:100px; bottom:34px; width:48px; height:48px;
              border-radius:50%; background:rgba(200,150,255,0.7); border:none;
              font-size:18px; color:#fff; touch-action:none;`,
    })

    const ui = document.getElementById('ui-root')
    ui.append(this._leftZone, this._rightZone, this._jumpBtn,
              this._placeBtn, this._removeBtn, this._flyBtn)
  }

  _bindTouchUI() {
    if (!this._leftZone) return

    const joystickEvents = (zone, stick, knob) => {
      const RADIUS = 36
      zone.addEventListener('pointerdown', e => {
        if (stick.active) return
        zone.setPointerCapture(e.pointerId)
        const r = zone.getBoundingClientRect()
        stick.active = true; stick.id = e.pointerId
        stick.ox = r.left + r.width / 2; stick.oy = r.top + r.height / 2
        stick.dx = 0; stick.dy = 0
      })
      zone.addEventListener('pointermove', e => {
        if (!stick.active || e.pointerId !== stick.id) return
        const dx = e.clientX - stick.ox
        const dy = e.clientY - stick.oy
        const len = Math.hypot(dx, dy)
        const clamped = Math.min(len, RADIUS)
        const ang = Math.atan2(dy, dx)
        stick.dx = Math.cos(ang) * clamped / RADIUS
        stick.dy = Math.sin(ang) * clamped / RADIUS
        knob.style.left = `${36 + stick.dx * RADIUS}px`
        knob.style.top  = `${36 + stick.dy * RADIUS}px`
      })
      const end = e => {
        if (!stick.active || e.pointerId !== stick.id) return
        stick.active = false; stick.dx = 0; stick.dy = 0
        knob.style.left = '36px'; knob.style.top = '36px'
      }
      zone.addEventListener('pointerup',     end)
      zone.addEventListener('pointercancel', end)
    }

    joystickEvents(this._leftZone,  this._leftStick,  this._leftKnob)
    joystickEvents(this._rightZone, this._rightStick, this._rightKnob)

    this._jumpBtn.addEventListener('pointerdown',  () => { this._touchJump = true })
    this._jumpBtn.addEventListener('pointerup',    () => { this._touchJump = false })
    this._placeBtn.addEventListener('pointerdown', () => { this.lmbJustDown = true })
    this._removeBtn.addEventListener('pointerdown',() => { this.rmbJustDown = true })
    this._flyBtn.addEventListener('pointerdown',   () => { this.flyToggled  = true })
  }

  // ── Consumed state getters ────────────────────────────────

  /** Movement axes { forward, right } — each -1..1 */
  getMovement() {
    if (!this.enabled) return { forward: 0, right: 0 }
    const kFwd  = (this._keys.has('KeyW') || this._keys.has('ArrowUp'))    ? 1 : 0
    const kBack = (this._keys.has('KeyS') || this._keys.has('ArrowDown'))  ? 1 : 0
    const kR    = (this._keys.has('KeyD') || this._keys.has('ArrowRight')) ? 1 : 0
    const kL    = (this._keys.has('KeyA') || this._keys.has('ArrowLeft'))  ? 1 : 0

    const forward = kFwd - kBack - this._leftStick.dy
    const right   = kR   - kL   + this._leftStick.dx
    const len = Math.hypot(forward, right)
    if (len > 1) return { forward: forward / len, right: right / len }
    return { forward, right }
  }

  /** Camera rotation delta this frame (pixels). Resets after read. */
  getMouseDelta() {
    const dx = this._mouseX + this._rightStick.dx * 4
    const dy = this._mouseY + this._rightStick.dy * 2
    this._mouseX = 0; this._mouseY = 0
    return { dx, dy }
  }

  /** Scroll wheel delta for inventory. Resets after read. */
  getWheelDelta() {
    const d = this._wheelDelta
    this._wheelDelta = 0
    return d
  }

  /**
   * Hotbar slot key (0-8) pressed this frame, or -1 if none.
   * Resets after read.
   */
  getSlotKey() {
    const k = this._slotKey
    this._slotKey = -1
    return k
  }

  isJumping()    { return this.enabled && (this._keys.has('Space')     || this._touchJump) }
  isDescending() { return this.enabled && (this._keys.has('ShiftLeft') || this._keys.has('ShiftRight')) }
  isSprinting()  { return this.enabled &&  this._keys.has('ShiftLeft') }
  isLMBHeld()    { return this.enabled && this._lmbDown }

  /** Consume the fly toggle (returns true only once per double-tap). */
  consumeFlyToggle() {
    if (this.flyToggled) { this.flyToggled = false; return true }
    return false
  }

  /** Consume left/right/middle mouse just-pressed events. */
  consumeLMB() { if (this.lmbJustDown) { this.lmbJustDown = false; return true } return false }
  consumeRMB() { if (this.rmbJustDown) { this.rmbJustDown = false; return true } return false }
  consumeMMB() { if (this.mmbJustDown) { this.mmbJustDown = false; return true } return false }

  /**
   * Returns true once per press of the given key code.
   * Consumed — will not return true again until the key is pressed again.
   */
  consumeKey(code) {
    if (!this.enabled) return false
    if (this._keyJustPressed.has(code)) { this._keyJustPressed.delete(code); return true }
    return false
  }

  /** True while a key is physically held down. */
  isHeld(code) { return this.enabled && this._keys.has(code) }
}
