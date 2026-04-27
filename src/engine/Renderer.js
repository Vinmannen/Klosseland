// ─────────────────────────────────────────────────────────────
//  Klosseland — Renderer
//  Owns the Three.js scene, camera, lights, sky, and materials.
//
//  Phase 7 additions:
//    • Shadow mapping (PCFSoftShadow, 1024 map, frustum follows player)
//    • vertexColors on all block materials (enables baked AO)
//    • Per-biome fog colour with smooth 3-second transitions
//    • Animated water texture (scrolling wave shimmer)
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { FAR_PLANE, FOG_NEAR, FOG_FAR, BIOME } from '../data/constants.js'
import { atlas }        from './TextureAtlas.js'
import { animateWater, animateWaterFlow } from './TextureGenerator.js'

// ── Sky colours ───────────────────────────────────────────────
export const SKY_COLORS = {
  dawn:    new THREE.Color(0xFFC87A),
  morning: new THREE.Color(0x87CEEB),
  noon:    new THREE.Color(0x5BBFFF),
  evening: new THREE.Color(0xFFAA55),
  dusk:    new THREE.Color(0xFF6640),
  night:   new THREE.Color(0x0A0F2E),
}

// ── Per-biome daytime fog colours ─────────────────────────────
const BIOME_FOG = {
  [BIOME.MEADOW]:      new THREE.Color(0xBFD9A8),  // warm golden-green (B8)
  [BIOME.FOREST]:      new THREE.Color(0x4A7A6A),  // deep enchanted teal (B7)
  [BIOME.SNOWY_PEAKS]: new THREE.Color(0xDCEEFF),  // near-white
  [BIOME.DESERT]:      new THREE.Color(0xC4894A),  // dusty warm orange (B2)
  [BIOME.JUNGLE]:      new THREE.Color(0x2A6820),  // humid deep green (B6)
  [BIOME.MUSHROOM]:    new THREE.Color(0x7A4A9A),  // bioluminescent purple
  [BIOME.CANDY]:       new THREE.Color(0xF0A0C8),  // cotton-candy pink (B5)
  [BIOME.AUTUMN]:      new THREE.Color(0xC8622A),  // warm amber-orange (B1)
  [BIOME.CHERRY]:      new THREE.Color(0xF0D0D8),  // soft cherry-blossom pink-white (B9)
}

// ── Per-biome fog near/far (null → use FOG_NEAR/FOG_FAR defaults) ─
const BIOME_FOG_RANGE = {
  [BIOME.MEADOW]:   [80, 300],  // open pastoral — widest view of all natural biomes (B8)
  [BIOME.AUTUMN]:   [60, 220],  // slightly denser autumn haze (B1)
  [BIOME.DESERT]:   [50, 180],  // dense heat-haze — shortest view distance (B2)
  [BIOME.MUSHROOM]: [40, 160],  // spore-fog — most enclosed feel of all biomes (B4)
  [BIOME.CANDY]:    [65, 240],  // clear-ish — candy world is open and inviting (B5)
  [BIOME.FOREST]:   [45, 170],  // fairy woodland — dense canopy, mysterious sightlines (B7)
  [BIOME.JUNGLE]:   [35, 150],  // densest tree cover — shortest sightlines of natural biomes (B6)
  [BIOME.CHERRY]:   [75, 270],  // airy and open — light filters gently through blossoms (B9)
}

// ── Waving flora shader injection ────────────────────────────
// Patches a MeshLambertMaterial to read the `isWaving` vertex
// attribute and oscillate top-face vertices on the X axis.
function _injectWaving(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.vertexShader = [
      'attribute float isWaving;',
      'uniform   float uTime;',
      shader.vertexShader,
    ].join('\n').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.x += sin(uTime * 1.2 + position.x * 0.7) * 0.025 * isWaving;`,
    )
    material._shader = shader
  }
  // Ensure each material variant gets its own compiled program
  material.customProgramCacheKey = () => 'waving'
}

// ─────────────────────────────────────────────────────────────
export class Renderer {
  constructor(canvas) {
    // ── WebGL renderer ──────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.sortObjects = true

    // Shadow mapping — PCFSoft for smooth edges, 1024 map
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap

    // ── Scene ───────────────────────────────────────────────
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87CEEB)
    this.scene.fog = new THREE.Fog(0xBFD9A8, FOG_NEAR, FOG_FAR)

    // ── Camera ──────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      FAR_PLANE,
    )

    // ── Lights ──────────────────────────────────────────────
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45)
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 0.9)
    this.sunLight.position.set(80, 150, 60)

    // Shadow configuration
    this.sunLight.castShadow                     = true
    this.sunLight.shadow.mapSize.width           = 1024
    this.sunLight.shadow.mapSize.height          = 1024
    this.sunLight.shadow.camera.near             = 0.5
    this.sunLight.shadow.camera.far              = 250
    this.sunLight.shadow.camera.left             = -44
    this.sunLight.shadow.camera.right            = 44
    this.sunLight.shadow.camera.top              = 44
    this.sunLight.shadow.camera.bottom           = -44
    this.sunLight.shadow.bias                    = -0.0005

    this.scene.add(this.sunLight)
    this.scene.add(this.sunLight.target)  // target must be in scene

    // Gentle fill light from below
    this.fillLight = new THREE.DirectionalLight(0xADE0FF, 0.15)
    this.fillLight.position.set(-20, -50, -20)
    this.scene.add(this.fillLight)

    // ── Block materials ─────────────────────────────────────
    // vertexColors: true enables the baked AO stored in the color attribute
    const tex = atlas.texture
    tex.flipY          = false
    tex.generateMipmaps = false
    tex.magFilter      = THREE.NearestFilter
    tex.minFilter      = THREE.NearestFilter

    this.opaqueMat = new THREE.MeshLambertMaterial({
      map:          tex,
      transparent:  false,
      vertexColors: true,
    })

    this.transparentMat = new THREE.MeshLambertMaterial({
      map:          tex,
      transparent:  false,
      alphaTest:    0.5,
      depthWrite:   true,
      side:         THREE.DoubleSide,
      vertexColors: true,
    })

    this.crossMat = new THREE.MeshLambertMaterial({
      map:          tex,
      transparent:  false,
      alphaTest:    0.5,
      side:         THREE.DoubleSide,
      depthWrite:   true,
      vertexColors: true,
    })

    this.waterMat = new THREE.MeshLambertMaterial({
      map:          tex,
      transparent:  true,
      opacity:      0.72,
      depthWrite:   false,
      side:         THREE.DoubleSide,
      vertexColors: true,
    })

    // Emissive overlay — unlit, always full brightness regardless of sun/ambient.
    // Rendered in the transparent pass (after opaque) with depthWrite off so it
    // sits cleanly on top of the opaque face without corrupting the depth buffer.
    this.glowMat = new THREE.MeshBasicMaterial({
      map:                tex,
      vertexColors:       true,
      transparent:        true,   // ensures render after opaque depth fill
      opacity:            1.0,
      depthWrite:         false,
      polygonOffset:      true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits:  -1,
    })

    // Inject waving vertex animation into all block materials
    this._wavingMats = [this.opaqueMat, this.transparentMat, this.crossMat, this.waterMat]
    for (const mat of this._wavingMats) _injectWaving(mat)

    // ── Block selection highlight (LineSegments outline) ───
    const hlEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02))
    const hlMat   = new THREE.LineBasicMaterial({ color: 0x000000 })
    this.selectionBox = new THREE.LineSegments(hlEdges, hlMat)
    this.selectionBox.visible = false
    this.scene.add(this.selectionBox)

    // ── Block placement ghost ───────────────────────────────
    const ghostGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01)
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false,
    })
    this.placementGhost = new THREE.Mesh(ghostGeo, ghostMat)
    this.placementGhost.visible = false
    this.scene.add(this.placementGhost)

    // ── Crack overlay ──────────────────────────────────────
    this._crackCanvas      = document.createElement('canvas')
    this._crackCanvas.width = this._crackCanvas.height = 16
    this._crackCtx         = this._crackCanvas.getContext('2d')
    this._crackTex         = new THREE.CanvasTexture(this._crackCanvas)
    this._crackTex.magFilter = THREE.NearestFilter
    this._crackTex.minFilter = THREE.NearestFilter
    const crackMat = new THREE.MeshBasicMaterial({
      map: this._crackTex, transparent: true, depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.crackOverlay = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), crackMat)
    this.crackOverlay.renderOrder = 1
    this.crackOverlay.visible = false
    this.scene.add(this.crackOverlay)

    // ── Place animation ────────────────────────────────────
    const placeAnimMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false,
    })
    this._placeAnimMesh = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), placeAnimMat)
    this._placeAnimMesh.visible = false
    this._placeAnimT = -1
    this.scene.add(this._placeAnimMesh)

    // ── Stars ───────────────────────────────────────────────
    this._buildStars()

    // ── Biome fog state ─────────────────────────────────────
    this._biomeFogBase   = new THREE.Color(0xBFD9A8)
    this._biomeFogTarget = new THREE.Color(0xBFD9A8)
    this._biomeFogNear   = FOG_NEAR
    this._biomeFogFar    = FOG_FAR

    // ── Water animation ─────────────────────────────────────
    this._waterCanvas = document.createElement('canvas')
    this._waterCanvas.width = this._waterCanvas.height = 16
    this._waterCtx = this._waterCanvas.getContext('2d')
    this._waterCtx.imageSmoothingEnabled = false

    this._waterFlowCanvas = document.createElement('canvas')
    this._waterFlowCanvas.width = this._waterFlowCanvas.height = 16
    this._waterFlowCtx = this._waterFlowCanvas.getContext('2d')
    this._waterFlowCtx.imageSmoothingEnabled = false
    this._lastWaterUpdate = -1   // throttle water animation to ~10 fps

    // ── Resize handler ──────────────────────────────────────
    window.addEventListener('resize', () => this._onResize())
  }

  // ── Stars ─────────────────────────────────────────────────
  _buildStars() {
    const count = 600
    const geo   = new THREE.BufferGeometry()
    const pos   = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 380
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = Math.abs(r * Math.cos(phi)) + 10
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta)
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.2, sizeAttenuation: true,
    }))
    this.stars.visible = false
    this.scene.add(this.stars)
  }

  // ── Day/night sky update ──────────────────────────────────
  /**
   * @param {number} t  – normalised time 0..1 (0=midnight, 0.5=noon)
   */
  updateSky(t) {
    let skyCol, fogCol, ambInt, sunInt

    if (t < 0.2) {
      const p = t / 0.2
      skyCol = SKY_COLORS.night.clone().lerp(SKY_COLORS.dawn, p)
      fogCol = skyCol.clone()
      ambInt = 0.05 + p * 0.25
      sunInt = 0.0  + p * 0.4
      this.stars.visible = t < 0.15
    } else if (t < 0.3) {
      const p = (t - 0.2) / 0.1
      skyCol = SKY_COLORS.dawn.clone().lerp(SKY_COLORS.morning, p)
      fogCol = skyCol.clone().lerp(this._biomeFogBase, p)
      ambInt = 0.3 + p * 0.15
      sunInt = 0.4 + p * 0.5
      this.stars.visible = false
    } else if (t < 0.7) {
      skyCol = (t < 0.5)
        ? SKY_COLORS.morning.clone().lerp(SKY_COLORS.noon,    (t-0.3)/0.2)
        : SKY_COLORS.noon.clone().lerp(SKY_COLORS.evening, (t-0.5)/0.2)
      fogCol = this._biomeFogBase.clone()   // use biome colour at full day
      ambInt = 0.45
      sunInt = 0.9
      this.stars.visible = false
    } else if (t < 0.8) {
      const p = (t - 0.7) / 0.1
      skyCol = SKY_COLORS.evening.clone().lerp(SKY_COLORS.dusk, p)
      fogCol = skyCol.clone().lerp(this._biomeFogBase, 1 - p)
      ambInt = 0.45 - p * 0.35
      sunInt = 0.9  - p * 0.85
      this.stars.visible = false
    } else {
      const p = (t - 0.8) / 0.2
      skyCol = SKY_COLORS.dusk.clone().lerp(SKY_COLORS.night, p)
      fogCol = skyCol.clone()
      ambInt = 0.1 - p * 0.05
      sunInt = 0.05
      this.stars.visible = p > 0.4
    }

    this.scene.background = skyCol
    this.scene.fog.color.copy(fogCol)
    this.ambientLight.intensity = ambInt
    this.sunLight.intensity     = sunInt
  }

  // ── Per-biome fog colour ──────────────────────────────────
  /**
   * Smoothly lerp the daytime fog colour toward the biome colour.
   * @param {number} biomeId   – BIOME constant
   * @param {number} dt        – frame delta seconds
   */
  updateBiomeFog(biomeId, dt) {
    const factor = Math.min(dt / 3, 1)

    // Lerp fog colour toward biome target
    const target = BIOME_FOG[biomeId] ?? BIOME_FOG[BIOME.MEADOW]
    this._biomeFogTarget.copy(target)
    this._biomeFogBase.lerp(this._biomeFogTarget, factor)

    // Lerp fog near/far toward biome target
    const [targetNear, targetFar] = BIOME_FOG_RANGE[biomeId] ?? [FOG_NEAR, FOG_FAR]
    this._biomeFogNear += (targetNear - this._biomeFogNear) * factor
    this._biomeFogFar  += (targetFar  - this._biomeFogFar)  * factor
    this.scene.fog.near = this._biomeFogNear
    this.scene.fog.far  = this._biomeFogFar
  }

  // ── Animated water ────────────────────────────────────────
  /**
   * Redraw the water atlas tile with a scrolling wave pattern.
   * @param {number} elapsed  – total elapsed seconds since game start
   */
  updateWater(elapsed) {
    // Throttle to ~10 fps — the 16×16 texture animation is imperceptible above that rate,
    // and skipping it avoids 128 fillRect calls + 2 GPU texture uploads at 60 fps.
    if (elapsed - this._lastWaterUpdate < 0.1) return
    this._lastWaterUpdate = elapsed

    this._waterCtx.clearRect(0, 0, 16, 16)
    animateWater(this._waterCtx, elapsed)
    atlas.patchTile('water', this._waterCanvas)

    this._waterFlowCtx.clearRect(0, 0, 16, 16)
    animateWaterFlow(this._waterFlowCtx, elapsed)
    atlas.patchTile('waterFlow', this._waterFlowCanvas)
  }

  // ── Animated flora ────────────────────────────────────────
  /**
   * Push the current elapsed time to waving-material uniforms.
   * @param {number} elapsed  – total seconds since game start
   */
  updateFlora(elapsed) {
    for (const mat of this._wavingMats) {
      if (mat._shader) mat._shader.uniforms.uTime.value = elapsed
    }
  }

  // ── Underwater fog override ───────────────────────────────
  /**
   * Call once per frame AFTER updateSky / updateBiomeFog.
   * If underwater, overrides fog to a deep-blue close range.
   * If not underwater, the CSS overlay is simply hidden.
   * @param {boolean} under
   */
  setUnderwater(under) {
    const overlay = document.getElementById('water-overlay')
    if (overlay) overlay.style.display = under ? 'block' : 'none'
    if (under) {
      this.scene.fog.color.setHex(0x1a4a8a)
      this.scene.fog.near = 1
      this.scene.fog.far  = 10
    }
  }

  // ── Crack overlay ─────────────────────────────────────────
  /**
   * Show or update the crack overlay on a targeted block face.
   * @param {object|null} ray      castRay result (needs hit, bx/by/bz, nx/ny/nz)
   * @param {number}      progress 0..1, or negative to hide
   */
  updateCrack(ray, progress) {
    if (!ray?.hit || progress < 0) {
      this.crackOverlay.visible = false
      return
    }
    const stage = Math.min(Math.floor(progress * 6), 5)
    this._drawCrackStage(stage)
    this._crackTex.needsUpdate = true

    const nx = ray.nx, ny = ray.ny, nz = ray.nz
    this.crackOverlay.position.set(
      ray.bx + 0.5 + nx * 0.502,
      ray.by + 0.5 + ny * 0.502,
      ray.bz + 0.5 + nz * 0.502,
    )
    this.crackOverlay.lookAt(
      ray.bx + 0.5 + nx * 1.5,
      ray.by + 0.5 + ny * 1.5,
      ray.bz + 0.5 + nz * 1.5,
    )
    this.crackOverlay.visible = true
  }

  _drawCrackStage(stage) {
    const ctx = this._crackCtx
    ctx.clearRect(0, 0, 16, 16)
    // Cumulative crack lines — each stage reveals all previous + new ones
    const allCracks = [
      [[8, 8, 11,  5]],
      [[8, 8,  5, 11], [11,  5, 13,  3]],
      [[5,11,  3, 13], [ 8,  8,  6,  4]],
      [[11,5, 14,  8], [ 5, 11,  2,  9]],
      [[ 6, 4,  4,  2], [14,  8, 13, 11]],
      [[ 4, 2,  2,  5], [13, 11, 15, 13]],
    ]
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let s = 0; s <= stage; s++) {
      for (const [x1, y1, x2, y2] of allCracks[s]) {
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
    }
    ctx.stroke()
  }

  // ── Place animation ────────────────────────────────────────
  triggerPlaceAnim(bx, by, bz) {
    this._placeAnimMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5)
    this._placeAnimMesh.scale.setScalar(0.75)
    this._placeAnimMesh.material.opacity = 0.4
    this._placeAnimMesh.visible = true
    this._placeAnimT = 0
  }

  updatePlaceAnim(dt) {
    if (this._placeAnimT < 0) return
    this._placeAnimT += dt / 0.08   // 80 ms duration
    if (this._placeAnimT >= 1) {
      this._placeAnimMesh.visible = false
      this._placeAnimT = -1
      return
    }
    this._placeAnimMesh.scale.setScalar(0.75 + 0.25 * this._placeAnimT)
    this._placeAnimMesh.material.opacity = 0.4 * (1 - this._placeAnimT)
  }

  // ── Render ────────────────────────────────────────────────
  render() {
    this.renderer.render(this.scene, this.camera)
  }

  // ── Resize ────────────────────────────────────────────────
  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }
}
