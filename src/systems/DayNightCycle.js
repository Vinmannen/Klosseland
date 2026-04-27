// ─────────────────────────────────────────────────────────────
//  Klosseland — DayNightCycle
//  Owns the passage of time (t ∈ [0,1)) and keeps sky, sun arc,
//  and moon mesh in sync with it.
//
//  t mapping:  0 = midnight  0.25 = dawn  0.5 = noon  0.75 = dusk
//
//  Emits named events: 'dawn' | 'noon' | 'dusk' | 'midnight'
//  Consumed by SoundSystem for ambient mood transitions.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

const SUN_RADIUS  = 170   // offset radius for sun light placement
const MOON_RADIUS = 150   // offset radius for moon mesh placement

export class DayNightCycle {
  /**
   * @param {import('../engine/Renderer.js').Renderer} renderer
   * @param {number} [initialT=0.35]  Starting time (0=midnight … 0.5=noon)
   */
  constructor(renderer, initialT = 0.35) {
    this._renderer  = renderer
    this.t          = initialT
    this._listeners = {}

    // Moon — small white/cream sphere, no light emission
    const moonGeo  = new THREE.SphereGeometry(3.5, 8, 8)
    const moonMat  = new THREE.MeshBasicMaterial({ color: 0xEEEECC })
    this._moon     = new THREE.Mesh(moonGeo, moonMat)
    this._moon.visible = false
    renderer.scene.add(this._moon)

    // Apply initial state without advancing time
    renderer.updateSky(initialT)
    this._syncPositions(0, 0, 0)
  }

  // ── Public accessors ─────────────────────────────────────

  /** True when the world is in nighttime (t < 0.2 or t > 0.8). */
  get isNight() { return this.t < 0.2 || this.t > 0.8 }

  // ── Event system ─────────────────────────────────────────

  /**
   * Register a listener for a named day event.
   * @param {'dawn'|'noon'|'dusk'|'midnight'} event
   * @param {() => void} cb
   */
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(cb)
    return this
  }

  _emit(event) {
    this._listeners[event]?.forEach(cb => cb())
  }

  // ── Per-frame update ─────────────────────────────────────

  /**
   * @param {number} dt                  Frame delta (seconds)
   * @param {number} cycleLengthSeconds  Full-cycle duration. 0 = always day.
   * @param {number} px                  Player world X
   * @param {number} py                  Player world Y
   * @param {number} pz                  Player world Z
   */
  update(dt, cycleLengthSeconds, px, py, pz) {
    if (cycleLengthSeconds <= 0) {
      // "Always day" — lock at noon
      if (this.t !== 0.5) {
        this.t = 0.5
        this._renderer.updateSky(0.5)
      }
      this._syncPositions(px, py, pz)
      return
    }

    const prev = this.t
    this.t = (this.t + dt / cycleLengthSeconds) % 1

    // Emit events when crossing key thresholds
    this._checkCross('dawn',     0.25, prev)
    this._checkCross('noon',     0.50, prev)
    this._checkCross('dusk',     0.75, prev)
    this._checkCross('midnight', 0.00, prev)  // wrap-around special case

    this._renderer.updateSky(this.t)
    this._syncPositions(px, py, pz)
  }

  // ── Sun arc + shadow camera + moon mesh ───────────────────

  _syncPositions(px, py, pz) {
    const t = this.t
    // angle = 0 at t=0.25 (dawn/east horizon), PI/2 at t=0.5 (noon/top),
    //         PI at t=0.75 (dusk/west horizon), -PI/2 at t=0 (midnight/bottom)
    const sunAngle = (t - 0.25) * Math.PI * 2
    const R = SUN_RADIUS

    const sunOffX = Math.cos(sunAngle) * R * 0.7   // east–west arc
    const sunOffY = Math.sin(sunAngle) * R          // height arc
    const sunOffZ = 30                              // slight north-south tilt

    const sun = this._renderer.sunLight
    sun.position.set(px + sunOffX, py + sunOffY, pz + sunOffZ)
    sun.target.position.set(px, py, pz)
    sun.target.updateMatrixWorld()

    // Moon — opposite the sun
    const moonAngle = sunAngle + Math.PI
    const mR = MOON_RADIUS
    const moonOffX = Math.cos(moonAngle) * mR * 0.7
    const moonOffY = Math.sin(moonAngle) * mR

    this._moon.position.set(px + moonOffX, py + moonOffY, pz + sunOffZ)
    // Show moon only when it clears the horizon
    this._moon.visible = moonOffY > 15
  }

  // ── Threshold crossing detection ──────────────────────────

  _checkCross(name, threshold, prev) {
    const curr = this.t
    if (threshold === 0) {
      // Midnight wraps around — detect prev near 1, curr near 0
      if (prev > 0.95 && curr < 0.05) this._emit(name)
    } else {
      if (prev < threshold && curr >= threshold) this._emit(name)
    }
  }

  // ── Cleanup ───────────────────────────────────────────────

  dispose() {
    this._renderer.scene.remove(this._moon)
    this._moon.geometry.dispose()
    this._moon.material.dispose()
    this._listeners = {}
  }
}
