// ─────────────────────────────────────────────────────────────
//  Klosseland — WeatherSystem
//  Per-biome precipitation: rain, snow, sandstorm, petals, leaves.
//  Uses a single THREE.Points object with a pre-allocated pool.
//
//  Public API
//  ──────────
//  update(dt, px, py, pz)  — call every frame with player position
//  setBiome(biomeId)        — call when player enters a new biome
//  get currentWeather       — WEATHER constant for current state
//  dispose()
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { BIOME }  from '../data/constants.js'

// ── Weather type constants ────────────────────────────────────
export const WEATHER = {
  CLEAR:     0,
  RAIN:      1,
  SNOW:      2,
  SANDSTORM: 3,
  PETALS:    4,
  LEAVES:    5,
}

// ── Per-biome type ────────────────────────────────────────────
const BIOME_WEATHER_TYPE = {
  [BIOME.MEADOW]:      WEATHER.RAIN,
  [BIOME.FOREST]:      WEATHER.RAIN,
  [BIOME.SNOWY_PEAKS]: WEATHER.SNOW,
  [BIOME.DESERT]:      WEATHER.SANDSTORM,
  [BIOME.JUNGLE]:      WEATHER.RAIN,
  [BIOME.MUSHROOM]:    WEATHER.CLEAR,
  [BIOME.CANDY]:       WEATHER.PETALS,
  [BIOME.AUTUMN]:      WEATHER.LEAVES,
  [BIOME.CHERRY]:      WEATHER.PETALS,
}

// Chance (0–1) that weather starts when the cycle timer fires.
// Candy/Autumn/Cherry are treated as infinite-duration so they
// effectively always have their effect.
const BIOME_WEATHER_CHANCE = {
  [BIOME.MEADOW]:      0.30,
  [BIOME.FOREST]:      0.50,
  [BIOME.SNOWY_PEAKS]: 0.75,
  [BIOME.DESERT]:      0.25,
  [BIOME.JUNGLE]:      0.70,
  [BIOME.MUSHROOM]:    0.00,
  [BIOME.CANDY]:       1.00,
  [BIOME.AUTUMN]:      1.00,
  [BIOME.CHERRY]:      1.00,
}

// Biomes whose weather never stops (aesthetic always-on effect)
const ALWAYS_ON = new Set([BIOME.CANDY, BIOME.AUTUMN, BIOME.CHERRY])

const MAX_PARTICLES = 600
const SPAWN_RADIUS  = 22   // XZ half-extent of spawn box around player
const SPAWN_ABOVE   = 18   // spawn Y above player feet

// ── Per-type particle config ──────────────────────────────────
const TYPE_CONFIG = {
  [WEATHER.RAIN]: {
    count:    450,
    size:     0.07,  sizeVar:  0.02,
    r: 0.72,  g: 0.82, b: 0.95,
    vy:       -14,   vyVar:    3,
    vxBase:   -0.8,  vxVar:    0.6,
    vzBase:   -0.4,  vzVar:    0.5,
    opacity:  0.50,
    fadeTime: 3,
  },
  [WEATHER.SNOW]: {
    count:    260,
    size:     0.20,  sizeVar:  0.08,
    r: 0.95,  g: 0.97, b: 1.00,
    vy:       -1.6,  vyVar:    0.6,
    vxBase:   0,     vxVar:    0.35,
    vzBase:   0,     vzVar:    0.35,
    opacity:  0.82,
    fadeTime: 4,
    oscillate: true,
  },
  [WEATHER.SANDSTORM]: {
    count:    520,
    size:     0.05,  sizeVar:  0.03,
    r: 0.84,  g: 0.67, b: 0.38,
    vy:       -0.8,  vyVar:    0.5,
    vxBase:   7,     vxVar:    2.5,
    vzBase:   2,     vzVar:    1.5,
    opacity:  0.40,
    fadeTime: 5,
  },
  [WEATHER.PETALS]: {
    count:    180,
    size:     0.22,  sizeVar:  0.08,
    r: 1.00,  g: 0.80, b: 0.88,
    vy:       -0.9,  vyVar:    0.4,
    vxBase:   0,     vxVar:    0.30,
    vzBase:   0,     vzVar:    0.30,
    opacity:  0.75,
    fadeTime: 4,
    oscillate: true,
  },
  [WEATHER.LEAVES]: {
    count:    200,
    size:     0.24,  sizeVar:  0.10,
    r: 0.84,  g: 0.46, b: 0.14,
    vy:       -1.3,  vyVar:    0.6,
    vxBase:   0.6,   vxVar:    0.9,
    vzBase:   0.3,   vzVar:    0.7,
    opacity:  0.70,
    fadeTime: 4,
    oscillate: true,
  },
}

// ─────────────────────────────────────────────────────────────
export class WeatherSystem {
  constructor(scene) {
    this._scene   = scene
    this._biome   = BIOME.MEADOW
    this._type    = WEATHER.CLEAR

    // Fade state (0..1 actual rendered intensity)
    this._intensity       = 0
    this._weatherActive   = false
    this._weatherTimer    = 0
    this._weatherDuration = 0

    // Countdown until next weather check (seconds)
    this._cycleTimer = 20 + Math.random() * 40

    // CPU particle data
    this._velX  = new Float32Array(MAX_PARTICLES)
    this._velY  = new Float32Array(MAX_PARTICLES)
    this._velZ  = new Float32Array(MAX_PARTICLES)
    this._phase = new Float32Array(MAX_PARTICLES)

    // GPU-side geometry attributes
    this._positions = new Float32Array(MAX_PARTICLES * 3)
    this._colors    = new Float32Array(MAX_PARTICLES * 3)
    this._sizes     = new Float32Array(MAX_PARTICLES)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(this._colors, 3))
    geo.setAttribute('size',     new THREE.BufferAttribute(this._sizes, 1))
    this._geo = geo

    this._mat = new THREE.PointsMaterial({
      size:            0.15,
      map:             this._makeTexture(),
      vertexColors:    true,
      transparent:     true,
      opacity:         0,
      depthWrite:      false,
      sizeAttenuation: true,
      alphaTest:       0.01,
    })

    this._points = new THREE.Points(geo, this._mat)
    this._points.frustumCulled = false
    scene.add(this._points)

    // Player position cache
    this._px = 0; this._py = 0; this._pz = 0
  }

  // ── Soft round-dot sprite texture ─────────────────────────
  _makeTexture() {
    const sz  = 32
    const c   = document.createElement('canvas')
    c.width   = sz; c.height = sz
    const ctx = c.getContext('2d')
    const r   = sz / 2
    const g   = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0.0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.9)')
    g.addColorStop(1.0, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, sz, sz)
    return new THREE.CanvasTexture(c)
  }

  // ── Reset one particle to a fresh spawn position ──────────
  _spawnOne(i, px, py, pz) {
    const cfg = TYPE_CONFIG[this._type]
    if (!cfg) { this._park(i, py); return }

    const rx = (Math.random() - 0.5) * 2 * SPAWN_RADIUS
    const rz = (Math.random() - 0.5) * 2 * SPAWN_RADIUS

    this._positions[i*3]   = px + rx
    this._positions[i*3+1] = py + Math.random() * SPAWN_ABOVE
    this._positions[i*3+2] = pz + rz

    this._velX[i]  = cfg.vxBase + (Math.random() - 0.5) * 2 * cfg.vxVar
    this._velY[i]  = cfg.vy - Math.random() * cfg.vyVar
    this._velZ[i]  = cfg.vzBase + (Math.random() - 0.5) * 2 * cfg.vzVar
    this._phase[i] = Math.random() * Math.PI * 2

    this._sizes[i]   = Math.max(0.01, cfg.size + (Math.random() - 0.5) * cfg.sizeVar)
    this._colors[i*3]   = cfg.r
    this._colors[i*3+1] = cfg.g
    this._colors[i*3+2] = cfg.b
  }

  // ── Move a particle far below ground so it is invisible ───
  _park(i, py) {
    this._positions[i*3+1] = py - 500
    this._sizes[i]          = 0
  }

  // ── Scatter all active particles across the full spawn volume ─
  _spawnAll(px, py, pz) {
    const cfg   = TYPE_CONFIG[this._type]
    const count = cfg ? cfg.count : 0

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < count) {
        // Distribute across full height so there's no sudden "wall" appearing
        const rx = (Math.random() - 0.5) * 2 * SPAWN_RADIUS
        const ry = (Math.random() - 0.5) * SPAWN_ABOVE * 1.8
        const rz = (Math.random() - 0.5) * 2 * SPAWN_RADIUS

        this._positions[i*3]   = px + rx
        this._positions[i*3+1] = py + ry
        this._positions[i*3+2] = pz + rz

        this._velX[i]  = cfg.vxBase + (Math.random() - 0.5) * 2 * cfg.vxVar
        this._velY[i]  = cfg.vy - Math.random() * cfg.vyVar
        this._velZ[i]  = cfg.vzBase + (Math.random() - 0.5) * 2 * cfg.vzVar
        this._phase[i] = Math.random() * Math.PI * 2

        this._sizes[i]      = Math.max(0.01, cfg.size + (Math.random() - 0.5) * cfg.sizeVar)
        this._colors[i*3]   = cfg.r
        this._colors[i*3+1] = cfg.g
        this._colors[i*3+2] = cfg.b
      } else {
        this._park(i, py)
      }
    }

    this._geo.attributes.position.needsUpdate = true
    this._geo.attributes.color.needsUpdate    = true
    this._geo.attributes.size.needsUpdate     = true
  }

  // ── Weather cycle control ─────────────────────────────────
  _startWeather() {
    const type = BIOME_WEATHER_TYPE[this._biome] ?? WEATHER.CLEAR
    if (type === WEATHER.CLEAR) return

    this._type            = type
    this._weatherActive   = true
    this._weatherTimer    = 0
    this._weatherDuration = ALWAYS_ON.has(this._biome)
      ? Infinity
      : 60 + Math.random() * 120

    this._spawnAll(this._px, this._py, this._pz)
  }

  _stopWeather() {
    this._weatherActive = false
    // Random clear-weather break before potentially starting again
    this._cycleTimer = 45 + Math.random() * 90
  }

  // ── setBiome: called whenever the player's biome changes ──
  setBiome(biome) {
    if (biome === this._biome) return
    this._biome = biome

    const newType = BIOME_WEATHER_TYPE[biome] ?? WEATHER.CLEAR

    if (this._weatherActive && newType !== this._type) {
      // Different weather type in new biome — stop current effect immediately
      this._stopWeather()
    }

    // For always-on biomes, kick off weather straight away
    if (ALWAYS_ON.has(biome) && !this._weatherActive) {
      this._cycleTimer = 0
    }
  }

  // ── Main update ───────────────────────────────────────────
  update(dt, px, py, pz) {
    this._px = px; this._py = py; this._pz = pz

    // ── Weather cycle ────────────────────────────────────
    if (!this._weatherActive) {
      this._cycleTimer -= dt
      if (this._cycleTimer <= 0) {
        const chance = BIOME_WEATHER_CHANCE[this._biome] ?? 0
        if (Math.random() < chance) {
          this._startWeather()
        } else {
          this._cycleTimer = 30 + Math.random() * 60
        }
      }
    } else if (isFinite(this._weatherDuration)) {
      this._weatherTimer += dt
      if (this._weatherTimer >= this._weatherDuration) {
        this._stopWeather()
      }
    }

    // ── Fade in / out ────────────────────────────────────
    const cfg        = TYPE_CONFIG[this._type]
    const targetOpac = this._weatherActive && cfg ? cfg.opacity : 0
    const fadeSpeed  = cfg ? dt / cfg.fadeTime : dt / 3

    this._intensity += (targetOpac - this._intensity) * Math.min(fadeSpeed * 3, 1)
    this._mat.opacity = Math.max(0, this._intensity)

    // Skip per-particle updates if fully faded out
    if (this._mat.opacity < 0.005 && !this._weatherActive) return
    if (!cfg) return

    // ── Move active particles ────────────────────────────
    const count      = cfg.count
    const oscillate  = cfg.oscillate ?? false
    const wrapY      = py - 5           // Y below which particle respawns
    const wrapR2     = (SPAWN_RADIUS + 10) ** 2

    for (let i = 0; i < count; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2

      let vx = this._velX[i]
      if (oscillate) {
        this._phase[i] += dt * 0.7
        vx += Math.sin(this._phase[i]) * 0.5
      }

      this._positions[ix] += vx * dt
      this._positions[iy] += this._velY[i] * dt
      this._positions[iz] += this._velZ[i] * dt

      // Respawn if fallen below floor or drifted too far away
      const fell   = this._positions[iy] < wrapY
      const dx     = this._positions[ix] - px
      const dz     = this._positions[iz] - pz
      const tooFar = dx * dx + dz * dz > wrapR2

      if (fell || tooFar) {
        this._spawnOne(i, px, py, pz)
      }
    }

    this._geo.attributes.position.needsUpdate = true
  }

  // ── Accessors ─────────────────────────────────────────────
  get currentWeather() {
    return this._weatherActive ? this._type : WEATHER.CLEAR
  }

  get isRaining() {
    return this._weatherActive && this._type === WEATHER.RAIN && this._intensity > 0.3
  }

  dispose() {
    this._scene.remove(this._points)
    this._geo.dispose()
    this._mat.map?.dispose()
    this._mat.dispose()
  }
}
