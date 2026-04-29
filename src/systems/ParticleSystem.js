// ─────────────────────────────────────────────────────────────
//  Klosseland — ParticleSystem
//
//  Pre-allocates 256 particle slots backed by a THREE.Points
//  object with a custom ShaderMaterial.
//
//  Burst emitters (called from game events):
//    emitBlockBreak(bx,by,bz, r,g,b)   — 8 coloured debris
//    emitFootstep(x,y,z)               — 2-3 dust puffs
//    emitWaterSplash(x,y,z)            — 4-6 droplet sprays
//
//  Ambient emitters (driven by update):
//    Pass world + player position to update() — the system
//    periodically scans nearby luminous / magic blocks and
//    emits atmospheric particles from them continuously.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

const MAX = 256

// Ambient scan settings
const SCAN_RADIUS   = 14   // XZ block radius
const SCAN_Y_DOWN   = 4    // blocks below player
const SCAN_Y_UP     = 8    // blocks above player
const SCAN_INTERVAL = 3.0  // seconds between full rescans

// ── Ambient emitter config (keyed by block ID) ────────────────
// type:     particle behaviour  crystal | sparkle | rainbow | ember | wisp | petal
// r,g,b:    base colour [0–1]   (rainbow randomises hue per particle)
// count:    particles per burst
// interval: seconds between bursts from one block
const EMITTER_CONFIG = {
  // Crystals ──────────────────────────────────────────────────
  140: { type: 'crystal', r: 0.25, g: 0.78, b: 1.00, count: 1, interval: 1.2 }, // blue crystal
  141: { type: 'crystal', r: 0.78, g: 0.25, b: 1.00, count: 1, interval: 1.2 }, // purple crystal
  142: { type: 'crystal', r: 0.25, g: 1.00, b: 0.69, count: 1, interval: 1.2 }, // green crystal
  143: { type: 'crystal', r: 1.00, g: 0.25, b: 0.38, count: 1, interval: 1.2 }, // red crystal
  144: { type: 'crystal', r: 1.00, g: 0.82, b: 0.25, count: 1, interval: 1.2 }, // yellow crystal

  // Fantasy blocks ────────────────────────────────────────────
  145: { type: 'rainbow', r: 1.00, g: 0.69, b: 1.00, count: 2, interval: 0.7  }, // rainbow block
  146: { type: 'sparkle', r: 1.00, g: 0.91, b: 0.25, count: 1, interval: 1.0  }, // star block
  150: { type: 'wisp',    r: 0.75, g: 0.63, b: 1.00, count: 1, interval: 1.5  }, // magic dirt
  151: { type: 'ember',   r: 1.00, g: 0.85, b: 0.44, count: 1, interval: 0.6  }, // glowstone
  176: { type: 'ember',   r: 1.00, g: 0.38, b: 0.06, count: 3, interval: 0.25 }, // lava (decorative)

  // Furniture lights ──────────────────────────────────────────
  163: { type: 'ember',   r: 1.00, g: 0.75, b: 0.38, count: 1, interval: 0.6  }, // lantern
  164: { type: 'ember',   r: 1.00, g: 0.50, b: 0.19, count: 2, interval: 0.3  }, // campfire
  166: { type: 'ember',   r: 1.00, g: 0.56, b: 0.19, count: 1, interval: 0.5  }, // jack-o-lantern

  // Gem / precious ─────────────────────────────────────────────
  177: { type: 'crystal', r: 0.50, g: 0.91, b: 1.00, count: 1, interval: 1.5  }, // diamond block
  178: { type: 'sparkle', r: 1.00, g: 0.82, b: 0.38, count: 1, interval: 1.2  }, // gold block
  179: { type: 'crystal', r: 0.25, g: 0.91, b: 0.50, count: 1, interval: 1.5  }, // emerald block
  182: { type: 'wisp',    r: 0.25, g: 0.85, b: 0.82, count: 1, interval: 1.3  }, // prismarine
  183: { type: 'crystal', r: 0.75, g: 0.60, b: 0.91, count: 1, interval: 1.3  }, // amethyst block
  184: { type: 'sparkle', r: 0.91, g: 0.72, b: 0.19, count: 1, interval: 1.5  }, // honeycomb block

  // Fairy woodland (B7) ───────────────────────────────────────
  195: { type: 'wisp',    r: 0.50, g: 1.00, b: 0.69, count: 1, interval: 1.2  }, // glowing mushroom
  202: { type: 'wisp',    r: 0.13, g: 0.75, b: 0.78, count: 1, interval: 1.0  }, // fairy mushroom
  203: { type: 'wisp',    r: 1.00, g: 0.96, b: 0.63, count: 1, interval: 1.0  }, // fairy lantern
  204: { type: 'wisp',    r: 0.56, g: 0.88, b: 0.38, count: 1, interval: 1.5  }, // enchanted moss
  205: { type: 'petal',   r: 0.88, g: 0.32, b: 0.85, count: 1, interval: 1.2  }, // fairy flower
  206: { type: 'wisp',    r: 0.75, g: 0.91, b: 1.00, count: 2, interval: 0.8  }, // wisp light

  // Seasonal ───────────────────────────────────────────────────
  186: { type: 'sparkle', r: 1.00, g: 0.25, b: 0.25, count: 1, interval: 1.2  }, // christmas ornament
}

// Round-dot particle sprite via discard
const VERT = `
attribute float pSize;
attribute vec3  pColor;
varying   vec3  vColor;
void main() {
  vColor = pColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // world-space size: pSize world-units, attenuated by distance
  gl_PointSize = max(1.0, pSize * (200.0 / -mv.z));
  gl_Position  = projectionMatrix * mv;
}
`
const FRAG = `
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  if (dot(d,d) > 0.25) discard;
  gl_FragColor = vec4(vColor, 1.0);
}
`

export class ParticleSystem {
  constructor(scene) {
    // Particle state array — each slot holds one in-flight particle
    this._p = Array.from({ length: MAX }, () => ({
      active:    false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      r: 1, g: 1, b: 1,
      life: 0, maxLife: 1,
      gravity:   12,
      startSize: 0.18,
    }))

    // GPU buffers
    this._pos   = new Float32Array(MAX * 3)
    this._col   = new Float32Array(MAX * 3)
    this._sizes = new Float32Array(MAX)

    const geo = new THREE.BufferGeometry()
    this._posAttr  = new THREE.BufferAttribute(this._pos,   3)
    this._colAttr  = new THREE.BufferAttribute(this._col,   3)
    this._sizeAttr = new THREE.BufferAttribute(this._sizes, 1)
    geo.setAttribute('position', this._posAttr)
    geo.setAttribute('pColor',   this._colAttr)
    geo.setAttribute('pSize',    this._sizeAttr)

    // Park all particles far below to start
    this._pos.fill(0)
    for (let i = 0; i < MAX; i++) this._pos[i * 3 + 1] = -10000

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
    })

    this._points = new THREE.Points(geo, mat)
    this._points.renderOrder = 2
    this._points.frustumCulled = false
    scene.add(this._points)

    // Ambient emitter state
    this._scanAccum      = SCAN_INTERVAL  // trigger first scan immediately
    this._activeEmitters = []             // [{x, y, z, cfg, timer}]
    this._prevHadActive  = false          // GPU upload guard
  }

  // ── Public burst emitters ─────────────────────────────────

  /**
   * Block break — 8 small cube-coloured particles scatter outward.
   */
  emitBlockBreak(bx, by, bz, r, g, b) {
    for (let i = 0; i < 8; i++) {
      this._spawn(
        bx + 0.5, by + 0.5, bz + 0.5,
        (Math.random() - 0.5) * 5,
        Math.random() * 3.5 + 0.5,
        (Math.random() - 0.5) * 5,
        r, g, b, 0.45,
      )
    }
  }

  /**
   * Footstep dust — 2-3 flat puffs rising from the ground.
   */
  emitFootstep(x, y, z) {
    const count = 2 + (Math.random() < 0.5 ? 1 : 0)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      this._spawn(
        x + Math.cos(angle) * 0.3,
        y,
        z + Math.sin(angle) * 0.3,
        (Math.random() - 0.5) * 1.2,
        Math.random() * 1.0 + 0.3,
        (Math.random() - 0.5) * 1.2,
        0.76, 0.66, 0.51, 0.25,
      )
    }
  }

  /**
   * Water splash — 4-6 blue droplets fly up and arc back down.
   */
  emitWaterSplash(x, y, z) {
    const count = 4 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const speed = Math.random() * 2.5 + 1.0
      this._spawn(
        x + Math.cos(angle) * 0.2,
        y,
        z + Math.sin(angle) * 0.2,
        Math.cos(angle) * speed,
        Math.random() * 4.0 + 2.0,
        Math.sin(angle) * speed,
        0.28, 0.56, 0.9, 0.4,
      )
    }
  }

  emitFireworkTrail(x, y, z) {
    for (let i = 0; i < 2; i++) {
      this._spawnEx(
        x + (Math.random() - 0.5) * 0.15, y, z + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.6, -(Math.random() * 1.5), (Math.random() - 0.5) * 0.6,
        1.0, 0.85, 0.4, 0.15, 0.10, 3,
      )
    }
  }

  emitFireworkBurst(x, y, z, r, g, b) {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const speed = 8 + Math.random() * 6
    this._spawnEx(
      x, y, z,
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      r, g, b, 1.8, 0.18, 6,
    )
  }

  // ── Per-frame update ──────────────────────────────────────

  /**
   * @param {number} dt    frame delta seconds
   * @param {number} px    player X (world coords)
   * @param {number} py    player Y (world coords)
   * @param {number} pz    player Z (world coords)
   * @param {object} world World instance (null = skip ambient emitters)
   */
  update(dt, px = 0, py = 0, pz = 0, world = null) {
    // ── Ambient block emitters ─────────────────────────────
    if (world) {
      this._scanAccum += dt
      if (this._scanAccum >= SCAN_INTERVAL) {
        this._scanAccum = 0
        this._rescanEmitters(px, py, pz, world)
      }
      this._tickEmitters(dt)
    }

    // ── Particle physics ───────────────────────────────────
    let hasActive = false

    for (let i = 0; i < MAX; i++) {
      const p  = this._p[i]
      const i3 = i * 3

      if (!p.active) {
        // Only write the hide-below-world value once (when the particle just died).
        // Skipping the write every frame avoids 256 array stores when pool is empty.
        if (this._prevHadActive && this._pos[i3 + 1] !== -10000) {
          this._pos[i3 + 1] = -10000
          this._sizes[i]    = 0
        }
        continue
      }

      p.life -= dt
      if (p.life <= 0) {
        p.active             = false
        this._pos[i3 + 1]   = -10000
        this._sizes[i]       = 0
        continue
      }

      hasActive = true
      p.vy -= p.gravity * dt
      p.x  += p.vx * dt
      p.y  += p.vy * dt
      p.z  += p.vz * dt

      const t = p.life / p.maxLife          // 1→0 as particle ages
      this._pos[i3]     = p.x
      this._pos[i3 + 1] = p.y
      this._pos[i3 + 2] = p.z
      this._col[i3]     = p.r * t
      this._col[i3 + 1] = p.g * t
      this._col[i3 + 2] = p.b * t
      this._sizes[i]    = p.startSize * t   // shrinks as it fades
    }

    // Only sync GPU buffers when there are (or just were) active particles.
    // When the pool is empty this avoids uploading 3 typed arrays every frame.
    if (hasActive || this._prevHadActive) {
      this._posAttr.needsUpdate  = true
      this._colAttr.needsUpdate  = true
      this._sizeAttr.needsUpdate = true
    }
    this._prevHadActive = hasActive
  }

  // ── Cleanup ───────────────────────────────────────────────

  dispose() {
    this._points.geometry.dispose()
    this._points.material.dispose()
    this._points.parent?.remove(this._points)
  }

  // ── Ambient internals ─────────────────────────────────────

  /** Full block scan around the player — runs every SCAN_INTERVAL seconds. */
  _rescanEmitters(px, py, pz, world) {
    this._activeEmitters = []
    const ox = Math.floor(px), oy = Math.floor(py), oz = Math.floor(pz)
    const R2 = SCAN_RADIUS * SCAN_RADIUS
    for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
      for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
        if (dx * dx + dz * dz > R2) continue
        for (let dy = -SCAN_Y_DOWN; dy <= SCAN_Y_UP; dy++) {
          const id  = world.getBlock(ox + dx, oy + dy, oz + dz)
          const cfg = EMITTER_CONFIG[id]
          if (cfg) {
            this._activeEmitters.push({
              x: ox + dx, y: oy + dy, z: oz + dz,
              cfg,
              timer: Math.random() * cfg.interval,  // stagger initial fires
            })
          }
        }
      }
    }
  }

  /** Tick each active emitter and fire when its timer expires. */
  _tickEmitters(dt) {
    for (const em of this._activeEmitters) {
      em.timer -= dt
      if (em.timer > 0) continue
      em.timer = em.cfg.interval * (0.7 + Math.random() * 0.6)  // ±30% jitter
      this._emitAmbient(em)
    }
  }

  /** Emit one burst from a registered ambient emitter block. */
  _emitAmbient(em) {
    const { x, y, z, cfg } = em
    for (let i = 0; i < cfg.count; i++) {
      const ox = (Math.random() - 0.5) * 0.6
      const oz = (Math.random() - 0.5) * 0.6

      switch (cfg.type) {
        case 'crystal':
          // Small shards drift sideways from within the block
          this._spawnEx(
            x + 0.5 + ox,
            y + 0.5 + (Math.random() - 0.5) * 0.6,
            z + 0.5 + oz,
            (Math.random() - 0.5) * 1.0,
            Math.random() * 1.5 + 0.3,
            (Math.random() - 0.5) * 1.0,
            cfg.r, cfg.g, cfg.b,
            0.6 + Math.random() * 0.5,   // life
            0.14,                         // size
            8,                            // gravity (moderate)
          )
          break

        case 'sparkle': {
          // Quick burst outward in random direction
          const a = Math.random() * Math.PI * 2
          const s = Math.random() * 2.0 + 0.5
          this._spawnEx(
            x + 0.5 + ox,
            y + 0.7 + Math.random() * 0.3,
            z + 0.5 + oz,
            Math.cos(a) * s,
            Math.random() * 2.0 + 0.5,
            Math.sin(a) * s,
            cfg.r, cfg.g, cfg.b,
            0.4 + Math.random() * 0.3,
            0.16, 10,
          )
          break
        }

        case 'rainbow': {
          // Random hue per particle
          const [r, g, b] = _hslToRgb(Math.random(), 1.0, 0.65)
          const a = Math.random() * Math.PI * 2
          const s = Math.random() * 1.5 + 0.5
          this._spawnEx(
            x + 0.5 + ox,
            y + 0.5 + Math.random() * 0.5,
            z + 0.5 + oz,
            Math.cos(a) * s,
            Math.random() * 1.5 + 0.5,
            Math.sin(a) * s,
            r, g, b,
            0.5 + Math.random() * 0.4,
            0.15, 9,
          )
          break
        }

        case 'ember':
          // Rise upward from the top face; low gravity so they float before fading
          this._spawnEx(
            x + 0.5 + ox * 0.8,
            y + 0.88 + Math.random() * 0.12,
            z + 0.5 + oz * 0.8,
            (Math.random() - 0.5) * 0.5,
            Math.random() * 1.5 + 0.8,
            (Math.random() - 0.5) * 0.5,
            cfg.r, cfg.g, cfg.b,
            0.4 + Math.random() * 0.4,
            0.12,
            5,    // low gravity — embers rise before fading
          )
          break

        case 'wisp':
          // Gentle orbs that float upward (negative gravity)
          this._spawnEx(
            x + 0.5 + ox,
            y + 0.5 + Math.random() * 0.5,
            z + 0.5 + oz,
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.4 + 0.1,
            (Math.random() - 0.5) * 0.4,
            cfg.r, cfg.g, cfg.b,
            1.2 + Math.random() * 0.8,
            0.28,
            -1.5,  // negative gravity — wisps float upward
          )
          break

        case 'petal':
          // Petals drift sideways with a gentle fall
          this._spawnEx(
            x + 0.5 + ox,
            y + 0.6 + Math.random() * 0.4,
            z + 0.5 + oz,
            (Math.random() - 0.5) * 0.8,
            Math.random() * 0.8 + 0.2,
            (Math.random() - 0.5) * 0.8,
            cfg.r, cfg.g, cfg.b,
            1.0 + Math.random() * 0.5,
            0.20,
            2.5,   // low gravity — petals drift gently
          )
          break
      }
    }
  }

  // ── Internal spawn helpers ────────────────────────────────

  /** Standard burst particle — gravity 12, startSize 0.18. */
  _spawn(x, y, z, vx, vy, vz, r, g, b, life) {
    this._spawnEx(x, y, z, vx, vy, vz, r, g, b, life, 0.18, 12)
  }

  /** Full-featured spawn with per-particle size and gravity. */
  _spawnEx(x, y, z, vx, vy, vz, r, g, b, life, size = 0.18, gravity = 12) {
    // Find first inactive slot
    for (let i = 0; i < MAX; i++) {
      const p = this._p[i]
      if (!p.active) {
        p.active = true
        p.x = x;  p.y = y;  p.z = z
        p.vx = vx; p.vy = vy; p.vz = vz
        p.r = r;  p.g = g;  p.b = b
        p.life = life; p.maxLife = life
        p.gravity   = gravity
        p.startSize = size
        return
      }
    }
    // Pool exhausted — overwrite slot 0 (oldest will be near-dead anyway)
    const p = this._p[0]
    p.active = true
    p.x = x;  p.y = y;  p.z = z
    p.vx = vx; p.vy = vy; p.vz = vz
    p.r = r;  p.g = g;  p.b = b
    p.life = life; p.maxLife = life
    p.gravity   = gravity
    p.startSize = size
  }
}

// ── Module-level helpers ──────────────────────────────────────

/** HSL → RGB, all channels in [0, 1]. */
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
