// ─────────────────────────────────────────────────────────────
//  Klosseland — Firework entity
//
//  Lifecycle:
//    launch phase  (0 → LAUNCH_DURATION s)
//      Sphere mesh rises at 12 blocks/s with slight XZ drift.
//      Trail particles emitted every ~50 ms.
//      Whistle sound rising from 300 → 1800 Hz.
//
//    burst phase   (on apex)
//      Mesh hidden. 60 particles scatter in a sphere.
//      Rainbow variant: 6 waves of 10 particles staggered 80 ms.
//      Bang + crackle sounds fire.
//
//  Call update(dt) each frame; it returns true when the
//  firework is fully done and can be disposed.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

const LAUNCH_DURATION  = 1.5   // seconds to apex
const LAUNCH_SPEED     = 12    // blocks/s upward
const TRAIL_INTERVAL   = 0.05  // seconds between trail emits
const RAINBOW_WAVES    = 6     // total waves for rainbow burst
const RAINBOW_STAGGER  = 0.08  // seconds between rainbow waves
const BURST_LIFETIME   = 2.2   // seconds to keep the entity alive after burst

export class Firework {
  /**
   * @param {import('three').Scene} scene
   * @param {import('../systems/ParticleSystem.js').ParticleSystem} particles
   * @param {import('../systems/SoundSystem.js').SoundSystem|null} sound
   * @param {number} wx  launch world X
   * @param {number} wy  launch world Y
   * @param {number} wz  launch world Z
   * @param {string[]|'rainbow'} colors  burst colour array or 'rainbow'
   */
  constructor(scene, particles, sound, wx, wy, wz, colors) {
    this._particles   = particles
    this._sound       = sound
    this._colors      = colors
    this._isRainbow   = (colors === 'rainbow')

    this._x = wx
    this._y = wy
    this._z = wz

    // Slight random XZ drift so multiple fireworks spread apart
    this._vx = (Math.random() - 0.5) * 0.4
    this._vz = (Math.random() - 0.5) * 0.4

    this._phase      = 'launch'
    this._timer      = 0
    this._trailTimer = 0
    this._nextWave   = 1   // rainbow: next wave index to emit (0 fired at burst)

    // Rocket mesh — small glowing sphere
    const geo = new THREE.SphereGeometry(0.12, 6, 4)
    const col = this._isRainbow
      ? new THREE.Color('#FFD020')
      : new THREE.Color(colors[0])
    const mat = new THREE.MeshBasicMaterial({ color: col })
    this._mesh = new THREE.Mesh(geo, mat)
    this._mesh.position.set(wx, wy, wz)
    this._mesh.frustumCulled = false
    scene.add(this._mesh)

    sound?.playFireworkWhistle()
  }

  /**
   * Advance the firework simulation.
   * @param {number} dt  frame delta in seconds
   * @returns {boolean}  true when fully done — caller should dispose() and remove
   */
  update(dt) {
    if (this._phase === 'done') return true

    this._timer += dt

    if (this._phase === 'launch') {
      this._y += LAUNCH_SPEED * dt
      this._x += this._vx * dt
      this._z += this._vz * dt
      this._mesh.position.set(this._x, this._y, this._z)

      this._trailTimer += dt
      if (this._trailTimer >= TRAIL_INTERVAL) {
        this._trailTimer = 0
        this._particles.emitFireworkTrail(this._x, this._y, this._z)
      }

      if (this._timer >= LAUNCH_DURATION) {
        this._burst()
        this._phase      = 'burst'
        this._timer      = 0
        this._mesh.visible = false
      }
    } else if (this._phase === 'burst') {
      // Rainbow: emit subsequent waves on a stagger
      if (this._isRainbow && this._nextWave < RAINBOW_WAVES) {
        if (this._timer >= this._nextWave * RAINBOW_STAGGER) {
          const hue = this._nextWave / RAINBOW_WAVES
          const [r, g, b] = _hslToRgb(hue, 1.0, 0.65)
          for (let i = 0; i < 10; i++) {
            this._particles.emitFireworkBurst(this._x, this._y, this._z, r, g, b)
          }
          this._nextWave++
        }
      }

      if (this._timer >= BURST_LIFETIME) {
        this._phase = 'done'
        return true
      }
    }

    return false
  }

  dispose() {
    this._mesh.parent?.remove(this._mesh)
    this._mesh.geometry.dispose()
    this._mesh.material.dispose()
  }

  // ── Private ───────────────────────────────────────────────

  _burst() {
    this._sound?.playFireworkBang()

    if (this._isRainbow) {
      // First wave (hue = 0, red)
      const [r, g, b] = _hslToRgb(0, 1.0, 0.65)
      for (let i = 0; i < 10; i++) {
        this._particles.emitFireworkBurst(this._x, this._y, this._z, r, g, b)
      }
    } else {
      // 60 particles cycling through the color array
      for (let i = 0; i < 60; i++) {
        const hex = this._colors[i % this._colors.length]
        const [r, g, b] = _hexToRgb01(hex)
        this._particles.emitFireworkBurst(this._x, this._y, this._z, r, g, b)
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────

function _hexToRgb01(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

function _hslToRgb(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [_hue2rgb(p, q, h + 1/3), _hue2rgb(p, q, h), _hue2rgb(p, q, h - 1/3)]
}

function _hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1/6) return p + (q - p) * 6 * t
  if (t < 1/2) return q
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
  return p
}
