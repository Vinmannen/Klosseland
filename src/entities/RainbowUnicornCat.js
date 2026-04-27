// ─────────────────────────────────────────────────────────────
//  Klosseland — RainbowUnicornCat pet mesh
//  Based on a drawing by Vinkællen's daughter.
//  A chubby cat-bunny hybrid with a rainbow horn and rainbow tail.
//  Local y=0 = ground. Pet faces +Z.
//  Returns { group, legs }
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

// ── Shorthand box mesh (mirrors Animal.js convention) ─────────
function b(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  )
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

// ── Colours ───────────────────────────────────────────────────
const BODY    = 0xDDDDDD  // light grey (the heavily pencil-shaded white body)
const EAR_IN  = 0xBB66CC  // purple inner ear
const EYE     = 0x111111  // near-black scribbled eyes
const SHINE   = 0xFFFFFF  // eye highlight
const NOSE    = 0xDD2233  // red heart nose
const MOUTH   = 0x222222  // dark mouth line

// Rainbow palette — horn bottom→top, tail segments
const RAINBOW = [0xFF2222, 0xFF8800, 0xFFDD00, 0x44CC22, 0x2288FF, 0xAA44FF]

// ─────────────────────────────────────────────────────────────
/**
 * Build the Rainbow Unicorn Cat group.
 * @returns {{ group: THREE.Group, legs: THREE.Mesh[] }}
 */
export function buildRainbowUnicornCat() {
  const g = new THREE.Group()
  g.frustumCulled = false

  // ── Four short stubby legs ────────────────────────────────────
  // legs[]: [back-left, back-right, front-left, front-right]
  const legOffsets = [[-0.17, -0.13], [0.17, -0.13], [-0.17, 0.12], [0.17, 0.12]]
  const legs = legOffsets.map(([lx, lz]) => {
    const leg = b(0.12, 0.20, 0.12, BODY, lx, 0.10, lz)
    g.add(leg)
    return leg
  })

  // ── Chubby body ───────────────────────────────────────────────
  // bottom at y=0.20, top at y=0.50, center y=0.35
  g.add(b(0.52, 0.30, 0.34, BODY, 0, 0.35, 0))

  // ── Head (large round sphere = very prominent cute face) ──────
  // head center at world (0, 0.66, 0.10) — slightly forward of body
  const head = new THREE.Group()
  head.position.set(0, 0.66, 0.10)

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 8),
    new THREE.MeshLambertMaterial({ color: BODY }),
  )
  headMesh.castShadow = true
  head.add(headMesh)

  // ── Eyes: very large dark spheres (the drawing's most prominent feature) ──
  const eyeMat   = new THREE.MeshLambertMaterial({ color: EYE })
  const shineMat = new THREE.MeshLambertMaterial({ color: SHINE })
  ;[[-0.09, 0.06, 0.22], [0.09, 0.06, 0.22]].forEach(([ex, ey, ez]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 6), eyeMat)
    eye.position.set(ex, ey, ez)
    head.add(eye)
    // White highlight dot — offset toward upper-inner corner
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 5, 4), shineMat)
    dot.position.set(ex * 0.6, ey + 0.038, ez + 0.062)
    head.add(dot)
  })

  // ── Nose: small red sphere (heart shape approximated by slight squash) ───
  const noseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 7, 5),
    new THREE.MeshLambertMaterial({ color: NOSE }),
  )
  noseMesh.scale.set(1.25, 0.90, 1.0)   // wider than tall = heart suggestion
  noseMesh.position.set(0, -0.038, 0.244)
  head.add(noseMesh)

  // ── Big wide smile (QuadraticBezierCurve3 → TubeGeometry) ────
  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.095,  0.005, 0),
    new THREE.Vector3( 0,     -0.060, 0),
    new THREE.Vector3( 0.095,  0.005, 0),
  )
  const smileMesh = new THREE.Mesh(
    new THREE.TubeGeometry(smileCurve, 10, 0.013, 4, false),
    new THREE.MeshLambertMaterial({ color: MOUTH }),
  )
  smileMesh.position.set(0, -0.055, 0.218)
  head.add(smileMesh)

  // ── Ears (tall, slightly splayed, purple inner) ───────────────
  // The drawing shows long upright bunny-style ears with pink/purple inside
  const earOuterMat = new THREE.MeshLambertMaterial({ color: BODY })
  const earInnerMat = new THREE.MeshLambertMaterial({ color: EAR_IN })
  ;[-1, 1].forEach(side => {
    const tilt = side * 0.16   // slight outward splay
    const cx   = side * 0.12

    // Outer ear shell
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.33, 0.055), earOuterMat)
    outer.position.set(cx, 0.30, 0)
    outer.rotation.z = tilt
    outer.castShadow = true
    head.add(outer)

    // Purple inner surface (slightly smaller, pushed forward)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.25, 0.022), earInnerMat)
    inner.position.set(cx, 0.30, 0.023)
    inner.rotation.z = tilt
    head.add(inner)
  })

  // ── Rainbow unicorn horn (center between ears) ────────────────
  // 6 cylinder segments, each narrower toward the tip, each a rainbow colour.
  // Bottom segment at local y=0.245, total horn height = 6 × 0.065 = 0.390.
  const SEG_H    = 0.065
  const BASE_R   = 0.050
  const SEG_N    = 6
  for (let i = 0; i < SEG_N; i++) {
    const r1 = BASE_R * (1 - i / SEG_N)           // bottom radius of segment
    const r2 = BASE_R * (1 - (i + 1) / SEG_N)     // top radius
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r2, r1, SEG_H, 6),
      new THREE.MeshLambertMaterial({ color: RAINBOW[i] }),
    )
    seg.position.set(0, 0.245 + i * SEG_H + SEG_H * 0.5, 0)
    seg.castShadow = true
    head.add(seg)
  }

  g.add(head)

  // ── Rainbow tail (back-right of body, curling upward) ─────────
  // The drawing shows the tail prominently at the back right:
  // visible colour bands — red, orange, yellow, green.
  const tailRoot = new THREE.Group()
  tailRoot.position.set(0.16, 0.38, -0.20)

  const TAIL_COLORS = [0xFF2222, 0xFF8800, 0xFFDD00, 0x44CC22]
  for (let i = 0; i < 4; i++) {
    const r  = 0.052 - i * 0.009
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.72, r, 0.105, 6),
      new THREE.MeshLambertMaterial({ color: TAIL_COLORS[i] }),
    )
    // Arc upward: each segment slightly higher and angled back
    seg.position.set(
      Math.sin(i * 0.55) * 0.055,    // gentle sideways curve
      i * 0.092,                     // stacking upward
      -i * 0.040,                    // curling slightly back
    )
    seg.rotation.x = -i * 0.38      // tilt away from body
    seg.castShadow = true
    tailRoot.add(seg)
  }

  g.add(tailRoot)

  return { group: g, legs, head, tailRoot }
}
