// ─────────────────────────────────────────────────────────────
//  Klosseland — Animal
//  Single animal entity: position, AI state machine, Three.js mesh.
//  All mesh builders and per-type behavior functions live here.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { BIOME } from '../data/constants.js'

// ── Mesh primitive ─────────────────────────────────────────────
function b(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  )
  m.position.set(x, y, z)
  return m
}

// ── Angle helpers ──────────────────────────────────────────────
function angleDiff(a, b) {
  let d = a - b
  d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2
  return d
}

// ── Mesh builders ──────────────────────────────────────────────
// Convention: local y=0 = ground. Animals face +Z. Rotation.y = yaw on group.
// legs[] order: [BL, BR, FL, FR]  (B=back, F=front, L=left, R=right)
// Diagonal gait pairs: A = FL[2]+BR[1], B = FR[3]+BL[0]

function buildSheep() {
  const g = new THREE.Group()
  const WHITE = 0xE8E8E8, DARK = 0x444444
  const legs = [[-0.20, -0.10], [0.20, -0.10], [-0.20, 0.10], [0.20, 0.10]]
    .map(([lx, lz]) => { const l = b(0.11, 0.26, 0.11, DARK, lx, 0.13, lz); g.add(l); return l })
  g.add(b(0.64, 0.44, 0.36, WHITE, 0, 0.50, 0))
  const head = b(0.26, 0.26, 0.26, WHITE, 0, 0.52, 0.28)
  g.add(head)
  return { group: g, head, legs }
}

function buildRabbit() {
  const g = new THREE.Group()
  const TAN = 0xC8A87A, PINK = 0xFFAAAA
  g.add(b(0.26, 0.28, 0.22, TAN, 0, 0.14, 0))
  const head = b(0.18, 0.18, 0.16, TAN, 0, 0.34, 0.09)
  g.add(head)
  g.add(b(0.06, 0.22, 0.04, TAN,  -0.05, 0.52, 0.06))
  g.add(b(0.06, 0.22, 0.04, TAN,   0.05, 0.52, 0.06))
  g.add(b(0.04, 0.16, 0.02, PINK, -0.05, 0.52, 0.055))
  g.add(b(0.04, 0.16, 0.02, PINK,  0.05, 0.52, 0.055))
  g.add(b(0.08, 0.08, 0.06, 0xFFFFFF, 0, 0.18, -0.14))
  return { group: g, head }
}

function buildFox() {
  const g = new THREE.Group()
  const ORANGE = 0xFF6622, WHITE = 0xFFFFFF
  const legs = [[-0.15, -0.08], [0.15, -0.08], [-0.15, 0.08], [0.15, 0.08]]
    .map(([lx, lz]) => { const l = b(0.10, 0.22, 0.10, 0x222222, lx, 0.11, lz); g.add(l); return l })
  g.add(b(0.44, 0.28, 0.22, ORANGE, 0, 0.36, 0))
  g.add(b(0.10, 0.28, 0.08, ORANGE,  0, 0.38, -0.22))
  g.add(b(0.08, 0.10, 0.06, WHITE,   0, 0.20, -0.28))
  const head = b(0.22, 0.22, 0.22, ORANGE, 0, 0.42, 0.20)
  g.add(head)
  g.add(b(0.12, 0.10, 0.08, WHITE, 0, 0.38, 0.30))
  return { group: g, head, legs }
}

function buildPolarBear() {
  const g = new THREE.Group()
  const CREAM = 0xF0EDE0
  const legs = [[-0.24, -0.13], [0.24, -0.13], [-0.24, 0.13], [0.24, 0.13]]
    .map(([lx, lz]) => { const l = b(0.16, 0.30, 0.16, CREAM, lx, 0.15, lz); g.add(l); return l })
  g.add(b(0.66, 0.46, 0.44, CREAM, 0, 0.58, 0))
  const head = b(0.34, 0.30, 0.30, CREAM, 0, 0.68, 0.34)
  g.add(head)
  g.add(b(0.18, 0.14, 0.10, 0xEEE8D8, 0, 0.63, 0.46))
  g.add(b(0.06, 0.04, 0.04, 0x111111, 0, 0.70, 0.51))
  return { group: g, head, legs }
}

function buildPenguin() {
  const g = new THREE.Group()
  const BLACK = 0x111111, WHITE = 0xEEEEEE, ORANGE = 0xFF8800
  const body = b(0.28, 0.38, 0.20, BLACK, 0, 0.19, 0)
  g.add(body)
  g.add(b(0.18, 0.28, 0.04, WHITE, 0, 0.22, 0.10))
  const head = b(0.22, 0.20, 0.18, BLACK, 0, 0.44, 0)
  g.add(head)
  g.add(b(0.07, 0.05, 0.07, ORANGE, 0, 0.43, 0.12))
  g.add(b(0.04, 0.04, 0.02, WHITE, -0.07, 0.48, 0.09))
  g.add(b(0.04, 0.04, 0.02, WHITE,  0.07, 0.48, 0.09))
  g.add(b(0.12, 0.04, 0.10, ORANGE, -0.07, 0.02, 0.05))
  g.add(b(0.12, 0.04, 0.10, ORANGE,  0.07, 0.02, 0.05))
  return { group: g, head, body }
}

function buildCamel() {
  const g = new THREE.Group()
  const TAN = 0xD4A85C
  const legs = [[-0.24, -0.13], [0.24, -0.13], [-0.24, 0.13], [0.24, 0.13]]
    .map(([lx, lz]) => { const l = b(0.12, 0.44, 0.12, TAN, lx, 0.22, lz); g.add(l); return l })
  g.add(b(0.62, 0.38, 0.34, TAN, 0, 0.64, 0))
  g.add(b(0.26, 0.24, 0.20, TAN, 0, 0.88, -0.05))
  g.add(b(0.14, 0.34, 0.12, TAN, 0, 0.78, 0.24))
  const head = b(0.18, 0.22, 0.16, TAN, 0, 0.88, 0.38)
  g.add(head)
  return { group: g, head, legs }
}

function buildParrot() {
  const g = new THREE.Group()
  const GREEN = 0x44BB44, RED = 0xFF3333, YELLOW = 0xFFCC00
  g.add(b(0.14, 0.18, 0.10, GREEN, 0, 0.09, 0))
  const wL = b(0.04, 0.14, 0.10, 0x228822, -0.10, 0.10, 0)
  const wR = b(0.04, 0.14, 0.10, 0x228822,  0.10, 0.10, 0)
  g.add(wL); g.add(wR)
  g.add(b(0.06, 0.14, 0.04, YELLOW, 0, 0.04, -0.09))
  const head = b(0.12, 0.12, 0.10, RED, 0, 0.24, 0.02)
  g.add(head)
  g.add(b(0.05, 0.06, 0.05, YELLOW, 0, 0.22, 0.09))
  return { group: g, head, wings: [wL, wR] }
}

function buildMonkey() {
  const g = new THREE.Group()
  const BROWN = 0x7B4F2A, TAN = 0xC8916A
  g.add(b(0.11, 0.22, 0.11, BROWN, -0.12, 0.11, 0))
  g.add(b(0.11, 0.22, 0.11, BROWN,  0.12, 0.11, 0))
  g.add(b(0.36, 0.30, 0.22, BROWN, 0, 0.38, 0))
  g.add(b(0.08, 0.24, 0.08, BROWN, -0.24, 0.38, 0))
  g.add(b(0.08, 0.24, 0.08, BROWN,  0.24, 0.38, 0))
  g.add(b(0.06, 0.30, 0.06, BROWN, 0.06, 0.36, -0.18))
  const head = b(0.24, 0.24, 0.22, BROWN, 0, 0.58, 0.02)
  g.add(head)
  g.add(b(0.18, 0.16, 0.06, TAN, 0, 0.56, 0.12))
  g.add(b(0.06, 0.08, 0.06, BROWN, -0.14, 0.60, 0))
  g.add(b(0.06, 0.08, 0.06, BROWN,  0.14, 0.60, 0))
  return { group: g, head }
}

function buildMushroomSprite() {
  const g = new THREE.Group()
  const PINK = 0xFFCCCC, RED = 0xDD2222, WHITE = 0xFFFFFF
  g.add(b(0.10, 0.12, 0.10, PINK, -0.08, 0.06, 0))
  g.add(b(0.10, 0.12, 0.10, PINK,  0.08, 0.06, 0))
  g.add(b(0.22, 0.24, 0.18, PINK, 0, 0.24, 0))
  const head = b(0.20, 0.16, 0.20, PINK, 0, 0.38, 0)
  g.add(head)
  g.add(b(0.38, 0.16, 0.38, RED, 0, 0.50, 0))
  g.add(b(0.07, 0.04, 0.07, WHITE, -0.10, 0.52,  0.10))
  g.add(b(0.07, 0.04, 0.07, WHITE,  0.10, 0.52, -0.08))
  return { group: g, head }
}

function buildCandyBunny() {
  const g = new THREE.Group()
  const PINK = 0xFF99CC, LPINK = 0xFFCCEE
  g.add(b(0.26, 0.28, 0.22, PINK, 0, 0.14, 0))
  const head = b(0.18, 0.18, 0.16, PINK, 0, 0.34, 0.09)
  g.add(head)
  g.add(b(0.06, 0.22, 0.04, PINK,  -0.05, 0.52, 0.06))
  g.add(b(0.06, 0.22, 0.04, PINK,   0.05, 0.52, 0.06))
  g.add(b(0.04, 0.16, 0.02, LPINK, -0.05, 0.52, 0.055))
  g.add(b(0.04, 0.16, 0.02, LPINK,  0.05, 0.52, 0.055))
  g.add(b(0.08, 0.08, 0.06, 0xFFFFFF, 0, 0.18, -0.14))
  return { group: g, head }
}

function buildSquirrel() {
  const g = new THREE.Group()
  const RUST = 0xCC5500
  g.add(b(0.08, 0.14, 0.08, RUST, -0.08, 0.07, 0))
  g.add(b(0.08, 0.14, 0.08, RUST,  0.08, 0.07, 0))
  g.add(b(0.22, 0.24, 0.18, RUST, 0, 0.24, 0))
  g.add(b(0.12, 0.28, 0.10, 0xDD7722, 0, 0.34, -0.16))
  g.add(b(0.10, 0.08, 0.08, 0xFFCCAA, 0, 0.50, -0.14))
  const head = b(0.16, 0.16, 0.14, RUST, 0, 0.40, 0.06)
  g.add(head)
  g.add(b(0.05, 0.07, 0.04, RUST, -0.05, 0.52, 0.04))
  g.add(b(0.05, 0.07, 0.04, RUST,  0.05, 0.52, 0.04))
  return { group: g, head }
}

function buildVampireBat() {
  const g    = new THREE.Group()
  const DARK = 0x1A0808, MID = 0x3A1010, RED = 0x8B0000
  // Body
  const body = b(0.28, 0.14, 0.20, DARK, 0, 0.07, 0)
  g.add(body)
  // Head with small snout
  const head = b(0.16, 0.14, 0.14, DARK, 0, 0.20, 0.10)
  g.add(head)
  g.add(b(0.08, 0.08, 0.06, MID, 0, 0.17, 0.17))   // snout
  // Red eyes
  g.add(b(0.04, 0.04, 0.02, RED, -0.05, 0.22, 0.16))
  g.add(b(0.04, 0.04, 0.02, RED,  0.05, 0.22, 0.16))
  // Pointed ears
  g.add(b(0.06, 0.10, 0.04, DARK, -0.07, 0.28, 0.06))
  g.add(b(0.06, 0.10, 0.04, DARK,  0.07, 0.28, 0.06))
  // Wings — large flat panels, hinge at body sides
  const wL = b(0.40, 0.04, 0.22, MID, -0.34, 0.10, -0.02)
  const wR = b(0.40, 0.04, 0.22, MID,  0.34, 0.10, -0.02)
  g.add(wL); g.add(wR)
  // Wing membrane accent (thin dark stripe)
  g.add(b(0.38, 0.02, 0.04, DARK, -0.34, 0.10,  0.08))
  g.add(b(0.38, 0.02, 0.04, DARK,  0.34, 0.10,  0.08))
  return { group: g, head, body, wings: [wL, wR] }
}

function buildDeer() {
  const g = new THREE.Group()
  const BROWN = 0x8B5E3C, CREAM = 0xF4D8B5, ANTLER = 0x6B4226
  const legs = [[-0.17, -0.10], [0.17, -0.10], [-0.17, 0.10], [0.17, 0.10]]
    .map(([lx, lz]) => { const l = b(0.10, 0.36, 0.10, BROWN, lx, 0.18, lz); g.add(l); return l })
  g.add(b(0.50, 0.36, 0.28, BROWN, 0, 0.56, 0))
  g.add(b(0.20, 0.20, 0.06, CREAM, 0, 0.54, -0.16))
  g.add(b(0.13, 0.28, 0.12, BROWN, 0, 0.72, 0.20))
  const head = b(0.18, 0.18, 0.16, BROWN, 0, 0.84, 0.30)
  g.add(head)
  g.add(b(0.10, 0.10, 0.08, CREAM, 0, 0.80, 0.39))
  g.add(b(0.06, 0.10, 0.05, BROWN, -0.12, 0.90, 0.28))
  g.add(b(0.06, 0.10, 0.05, BROWN,  0.12, 0.90, 0.28))
  g.add(b(0.04, 0.18, 0.04, ANTLER, -0.10, 1.02, 0.28))
  g.add(b(0.04, 0.18, 0.04, ANTLER,  0.10, 1.02, 0.28))
  g.add(b(0.10, 0.04, 0.04, ANTLER, -0.13, 1.12, 0.28))
  g.add(b(0.10, 0.04, 0.04, ANTLER,  0.13, 1.12, 0.28))
  return { group: g, head, legs }
}

// ── Per-type behavior functions ────────────────────────────────
// Signature: (animal, dt, distSq, playerX, playerZ, otherAnimals, playerSpeedSq)
// Responsibility: state transitions only. Movement is handled by _moveByState().

// Sheep: graze, loose flocking, flee at 6m — nearby sheep copy the panic
function behaviorSheep(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') {
    if (distSq > 81 || a.stateTimer <= 0) {
      a.state = 'idle'; a.stateTimer = 2 + Math.random() * 3; a._turnDir = 0
    }
    return
  }

  // Flee trigger at 6m
  if (distSq < 36) {
    a.state = 'flee'; a.stateTimer = 3.0; a._turnDir = 0
    // Nearby sheep (< 8m) copy the panic
    for (const o of others) {
      if (o === a || o.def.key !== 'sheep' || o.state === 'flee') continue
      const dx = o.x - a.x, dz = o.z - a.z
      if (dx * dx + dz * dz < 64) { o.state = 'flee'; o.stateTimer = 3.0; o._turnDir = 0 }
    }
    return
  }

  // Loose flocking: gently steer toward nearest sheep while wandering
  if (a.state === 'wander') {
    let nearSq = 64, nearYaw = a.yaw
    for (const o of others) {
      if (o === a || o.def.key !== 'sheep') continue
      const dx = o.x - a.x, dz = o.z - a.z
      const sq = dx * dx + dz * dz
      if (sq < nearSq) { nearSq = sq; nearYaw = Math.atan2(dx, dz) }
    }
    if (nearSq < 64) a.yaw += angleDiff(nearYaw, a.yaw) * dt * 0.4
  }

  if (a.stateTimer > 0) return
  if (a.state === 'idle' || a.state === 'graze') {
    if (Math.random() < 0.4) {
      a.state = 'graze'; a.stateTimer = 3 + Math.random() * 4
    } else {
      a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
      a.stateTimer = 2 + Math.random() * 2; a._turnDir = 0
    }
  } else {
    a.state = Math.random() < 0.5 ? 'idle' : 'graze'
    a.stateTimer = 2 + Math.random() * 3
  }
}

// Rabbit: freeze at 8m for 1-2s, then bolt; flees far
function behaviorRabbit(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') {
    if (distSq > 144 || a.stateTimer <= 0) {
      a.state = 'idle'; a.stateTimer = 2 + Math.random() * 3; a._turnDir = 0
    }
    return
  }
  if (a.state === 'freeze') {
    if (a.stateTimer <= 0) { a.state = 'flee'; a.stateTimer = 4.0; a._turnDir = 0 }
    return
  }
  if (distSq < 64) { // 8m
    a.state = 'freeze'; a.stateTimer = 1 + Math.random()
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 1.5 + Math.random() * 1.5; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 2 + Math.random() * 3
  }
}

// Fox: curious at 12m → approaches → pause at 3m → retreats (flee state, short timer)
function behaviorFox(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') { // retreat phase
    if (a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 3 + Math.random() * 3; a._turnDir = 0 }
    return
  }
  if (a.state === 'pause') {
    if (a.stateTimer <= 0) { a.state = 'flee'; a.stateTimer = 2.5; a._turnDir = 0 }
    return
  }
  if (a.state === 'curious') {
    if (distSq < 9) { a.state = 'pause'; a.stateTimer = 1.5; return } // 3m — pause
    if (a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 3 + Math.random() * 3 } // gave up
    return
  }
  if (distSq < 144) { // 12m — become curious
    a.state = 'curious'; a.stateTimer = 6.0
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 2 + Math.random() * 2; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 3 + Math.random() * 3
  }
}

// Polar bear: charge at 6m, back off at 2m
function behaviorPolarBear(a, dt, distSq, px, pz, others) {
  if (a.state === 'charge') {
    if (distSq < 4) { // 2m — back off
      a.state = 'flee'; a.stateTimer = 2.0; a._turnDir = 0
      return
    }
    if (a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 3 + Math.random() * 3 }
    return
  }
  if (a.state === 'flee') {
    if (a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 3 + Math.random() * 3; a._turnDir = 0 }
    return
  }
  if (distSq < 36) { // 6m — charge
    a.state = 'charge'; a.stateTimer = 4.0
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 3 + Math.random() * 3; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 4 + Math.random() * 4
  }
}

// Penguin: always tries to flock; flees if player gets too close
function behaviorPenguin(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') {
    if (distSq > 64 || a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 1 + Math.random() * 2; a._turnDir = 0 }
    return
  }
  if (distSq < 16) { // 4m — flee
    a.state = 'flee'; a.stateTimer = 2.5; a._turnDir = 0
    return
  }

  // Flock toward nearest other penguin within 16m
  let nearSq = 256, nearX = 0, nearZ = 0
  for (const o of others) {
    if (o === a || o.def.key !== 'penguin') continue
    const dx = o.x - a.x, dz = o.z - a.z
    const sq = dx * dx + dz * dz
    if (sq < nearSq) { nearSq = sq; nearX = o.x; nearZ = o.z }
  }
  if (nearSq < 256 && nearSq > 4) { // found a target and not already close
    a.state = 'flock'
    a.yaw = Math.atan2(nearX - a.x, nearZ - a.z)
    a.stateTimer = 1.0
    return
  }

  if (a.state === 'flock') { a.state = 'idle'; a.stateTimer = 1.5 + Math.random() * 2 }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 1.5 + Math.random() * 1.5; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 1.5 + Math.random() * 2
  }
}

// Camel: stoic — turns very slowly, very long idles, ignores player entirely
function behaviorCamel(a, dt, distSq, px, pz, others) {
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 4 + Math.random() * 5; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 6 + Math.random() * 8
  }
}

// Parrot: follow if player approaches slowly; flee if player moves fast
function behaviorParrot(a, dt, distSq, px, pz, others, playerSpeedSq) {
  if (a.state === 'flee') {
    if (distSq > 64 || a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 2 + Math.random() * 3; a._turnDir = 0 }
    return
  }
  if (distSq < 81) { // within 9m
    if (playerSpeedSq > 6) { // fast movement → fly away
      a.state = 'flee'; a.stateTimer = 3.0; a._turnDir = 0
      return
    }
    if (distSq > 2.25 && playerSpeedSq < 4) { // slow approach, not yet close → follow
      a.state = 'follow'; a.stateTimer = 0.5
      return
    }
    if (distSq <= 2.25) { // 1.5m — close enough, rest
      a.state = 'idle'; a.stateTimer = 2 + Math.random() * 2
    }
  }
  if (a.state === 'follow' && a.stateTimer <= 0 && distSq > 81) {
    a.state = 'idle'; a.stateTimer = 2 + Math.random() * 2
  }
  if (a.state !== 'follow' && a.state !== 'flee' && a.stateTimer <= 0) {
    if (a.state === 'idle') {
      a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
      a.stateTimer = 2 + Math.random() * 2; a._turnDir = 0
    } else {
      a.state = 'idle'; a.stateTimer = 2 + Math.random() * 3
    }
  }
}

// Monkey: curious → approach → orbit at 4m with random direction flips
function behaviorMonkey(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') {
    if (distSq > 100 || a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 1.5 + Math.random() * 2; a._turnDir = 0 }
    return
  }
  if (a.state === 'orbit') {
    if (distSq > 100) { a.state = 'idle'; a.stateTimer = 2 + Math.random() * 2; return }
    if (a.stateTimer <= 0) { // quick direction flip
      a._orbitDir = -a._orbitDir
      a.stateTimer = 1.5 + Math.random() * 2
    }
    return
  }
  if (a.state === 'curious') {
    if (distSq < 16) { // 4m — switch to orbit
      a.state = 'orbit'; a.stateTimer = 2.0
      a._orbitRadius = 4.0; a._orbitDir = Math.random() < 0.5 ? 1 : -1
      a._orbitAngle = Math.atan2(a.x - px, a.z - pz)
      return
    }
    if (a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 2 + Math.random() * 3 }
    return
  }
  if (distSq < 100) { // 10m — become curious
    a.state = 'curious'; a.stateTimer = 5.0
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 1.5 + Math.random() * 1.5; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 1.5 + Math.random() * 2
  }
}

// Mushroom sprite: always orbit the player at 3m with bouncy movement
function behaviorMushroomSprite(a, dt, distSq, px, pz, others) {
  if (a.state !== 'orbit') {
    a.state = 'orbit'; a._orbitRadius = 3.0
    a._orbitDir = Math.random() < 0.5 ? 1 : -1
    a._orbitAngle = Math.atan2(a.x - px, a.z - pz)
  }
}

// Candy bunny: always friendly — hops toward player until 1.5m, never flees
function behaviorCandyBunny(a, dt, distSq, px, pz, others) {
  if (distSq < 100 && distSq > 2.25) { // within 10m but not too close
    a.state = 'follow'; a.stateTimer = 0.5
    return
  }
  if (distSq <= 2.25) { // close enough
    a.state = 'idle'; a.stateTimer = 1 + Math.random()
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 1.5 + Math.random() * 1.5; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 1.5 + Math.random() * 2
  }
}

// Squirrel: very short wander bursts, freeze at 6m like rabbit
function behaviorSquirrel(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') {
    if (distSq > 81 || a.stateTimer <= 0) { a.state = 'idle'; a.stateTimer = 1.5 + Math.random() * 2; a._turnDir = 0 }
    return
  }
  if (a.state === 'freeze') {
    if (a.stateTimer <= 0) { a.state = 'flee'; a.stateTimer = 3.0; a._turnDir = 0 }
    return
  }
  if (distSq < 36) { // 6m — freeze
    a.state = 'freeze'; a.stateTimer = 1 + Math.random()
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 0.8 + Math.random() * 0.8; a._turnDir = 0 // very short burst
  } else {
    a.state = 'idle'; a.stateTimer = 0.8 + Math.random() * 1.5
  }
}

// Deer: alert radius 12m, slow head raise, then sprint far
function behaviorDeer(a, dt, distSq, px, pz, others) {
  if (a.state === 'flee') {
    if (distSq > 400 || a.stateTimer <= 0) { // flees to 20m
      a.state = 'idle'; a.stateTimer = 3 + Math.random() * 4; a._turnDir = 0
    }
    return
  }
  if (a.state === 'alert') {
    a._alertTimer += dt
    if (a._alertTimer > 0.8) { // flee after head-raise pause
      a.state = 'flee'; a.stateTimer = 5.0; a._turnDir = 0; a._alertTimer = 0
    }
    return
  }
  if (distSq < 144) { // 12m — alert
    a.state = 'alert'; a._alertTimer = 0
    return
  }
  if (a.stateTimer > 0) return
  if (a.state === 'idle') {
    a.state = 'wander'; a.yaw = Math.random() * Math.PI * 2
    a.stateTimer = 2.5 + Math.random() * 2.5; a._turnDir = 0
  } else {
    a.state = 'idle'; a.stateTimer = 3 + Math.random() * 4
  }
}

// Vampire bat: circles area continuously, orbiting loosely around the player
function behaviorVampireBat(a, dt, distSq, px, pz) {
  if (a.stateTimer > 0) return
  switch (a.state) {
    case 'orbit':
      a.state = Math.random() < 0.25 ? 'wander' : 'orbit'
      a.stateTimer = 5 + Math.random() * 7
      if (a.state === 'orbit') {
        a._orbitRadius = 4 + Math.random() * 6
        a._orbitDir    = Math.random() < 0.5 ? 1 : -1
      } else {
        a.yaw = Math.random() * Math.PI * 2
      }
      break
    case 'wander':
      a.yaw += (Math.random() - 0.5) * Math.PI * 0.8
      a.state = Math.random() < 0.65 ? 'orbit' : 'idle'
      a.stateTimer = 2 + Math.random() * 4
      if (a.state === 'orbit') {
        a._orbitRadius = 4 + Math.random() * 6
        a._orbitDir    = Math.random() < 0.5 ? 1 : -1
      }
      break
    default:
      a.state = 'orbit'
      a.stateTimer = 6 + Math.random() * 6
      a._orbitRadius = 5 + Math.random() * 5
      a._orbitDir    = Math.random() < 0.5 ? 1 : -1
  }
}

// ── Definition registry ────────────────────────────────────────
export const ANIMAL_DEFS = [
  {
    key: 'sheep',
    biomes: [BIOME.MEADOW, BIOME.FOREST, BIOME.AUTUMN, BIOME.CHERRY],
    speed: 1.2, fleeSpeed: 3.5, groundOffset: 0, turnRate: 3,
    buildMesh: buildSheep, behavior: behaviorSheep,
  },
  {
    key: 'rabbit',
    biomes: [BIOME.MEADOW, BIOME.CHERRY],
    speed: 1.5, fleeSpeed: 5.0, groundOffset: 0, turnRate: 4,
    buildMesh: buildRabbit, behavior: behaviorRabbit,
  },
  {
    key: 'fox',
    biomes: [BIOME.FOREST, BIOME.AUTUMN],
    speed: 1.8, fleeSpeed: 2.5, groundOffset: 0, turnRate: 2,
    buildMesh: buildFox, behavior: behaviorFox,
  },
  {
    key: 'polar_bear',
    biomes: [BIOME.SNOWY_PEAKS],
    speed: 1.0, fleeSpeed: 4.5, groundOffset: 0, turnRate: 3,
    buildMesh: buildPolarBear, behavior: behaviorPolarBear,
  },
  {
    key: 'penguin',
    biomes: [BIOME.SNOWY_PEAKS],
    speed: 0.8, fleeSpeed: 2.5, groundOffset: 0, turnRate: 3,
    buildMesh: buildPenguin, behavior: behaviorPenguin,
  },
  {
    key: 'camel',
    biomes: [BIOME.DESERT],
    speed: 1.0, fleeSpeed: 2.5, groundOffset: 0, turnRate: 0.5,
    buildMesh: buildCamel, behavior: behaviorCamel,
  },
  {
    key: 'parrot',
    biomes: [BIOME.JUNGLE],
    speed: 1.2, fleeSpeed: 3.5, groundOffset: 0, turnRate: 3,
    buildMesh: buildParrot, behavior: behaviorParrot,
  },
  {
    key: 'monkey',
    biomes: [BIOME.JUNGLE],
    speed: 2.0, fleeSpeed: 4.5, groundOffset: 0, turnRate: 4,
    buildMesh: buildMonkey, behavior: behaviorMonkey,
  },
  {
    key: 'mushroom_sprite',
    biomes: [BIOME.MUSHROOM],
    speed: 0.8, fleeSpeed: 2.0, groundOffset: 0, turnRate: 3,
    buildMesh: buildMushroomSprite, behavior: behaviorMushroomSprite,
  },
  {
    key: 'candy_bunny',
    biomes: [BIOME.CANDY],
    speed: 1.5, fleeSpeed: 4.5, groundOffset: 0, turnRate: 4,
    buildMesh: buildCandyBunny, behavior: behaviorCandyBunny,
  },
  {
    key: 'squirrel',
    biomes: [BIOME.AUTUMN, BIOME.FOREST],
    speed: 2.0, fleeSpeed: 5.0, groundOffset: 0, turnRate: 5,
    buildMesh: buildSquirrel, behavior: behaviorSquirrel,
  },
  {
    key: 'deer',
    biomes: [BIOME.FOREST, BIOME.CHERRY, BIOME.MEADOW],
    speed: 1.5, fleeSpeed: 5.0, groundOffset: 0, turnRate: 3,
    buildMesh: buildDeer, behavior: behaviorDeer,
  },
  {
    key: 'vampire_bat',
    biomes: [BIOME.BLODMARK],
    speed: 2.2, fleeSpeed: 4.5, groundOffset: 3, turnRate: 5,
    flapAlways: true,
    buildMesh: buildVampireBat, behavior: behaviorVampireBat,
  },
]

// ── Animal class ───────────────────────────────────────────────
export class Animal {
  constructor(def, x, y, z) {
    this.def = def
    this.x = x; this.y = y; this.z = z
    this.yaw = Math.random() * Math.PI * 2

    // AI state
    this.state      = 'idle'
    this.stateTimer = 1 + Math.random() * 3
    this._turnDir   = 0

    // Animation
    this._bobTime   = 0
    this._legTime   = 0
    this._alertTimer = 0
    this._orbitAngle = 0
    this._orbitRadius = 3
    this._orbitDir  = 1

    // Mesh parts (set in createMesh)
    this.mesh       = null
    this._head      = null
    this._headBaseY = 0
    this._legs      = null
    this._wings     = null
    this._body      = null
  }

  createMesh() {
    const parts = this.def.buildMesh()
    this.mesh       = parts.group
    this._head      = parts.head || null
    this._headBaseY = parts.head ? parts.head.position.y : 0
    this._legs      = parts.legs || null
    this._wings     = parts.wings || null
    this._body      = parts.body || null

    this.mesh.traverse(obj => {
      obj.frustumCulled = false
      if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true }
    })
    this.mesh.position.set(this.x, this.y, this.z)
    this.mesh.rotation.y = this.yaw
    return this.mesh
  }

  /**
   * @param {number} dt
   * @param {number} playerX
   * @param {number} playerZ
   * @param {import('../world/World.js').World} world
   * @param {number} playerSpeedSq  – player horizontal speed squared
   * @param {Animal[]} otherAnimals – all active animals this frame
   */
  update(dt, playerX, playerZ, world, playerSpeedSq, otherAnimals, isNight = false) {
    this.stateTimer -= dt

    const dx     = this.x - playerX
    const dz     = this.z - playerZ
    const distSq = dx * dx + dz * dz

    if (isNight) {
      // Animals sleep at night: force idle, skip behavior transitions
      if (this.state !== 'idle') {
        this.state = 'idle'
        this.stateTimer = 3 + Math.random() * 4
      }
    } else {
      // Per-type behavior handles all state transitions
      this.def.behavior(this, dt, distSq, playerX, playerZ, otherAnimals, playerSpeedSq)
    }

    // Movement based on current state
    this._moveByState(dt, playerX, playerZ, distSq, dx, dz, world)

    // Surface snap — only snap to surfaces at or near current Y to avoid
    // canopy pulls; cap at +2 blocks above current feet
    const sy = world.getSurfaceY(this.x, this.z)
    if (sy > 0 && sy <= this.y + 2) {
      const targetY = sy + 1 + this.def.groundOffset
      this.y += (targetY - this.y) * Math.min(1, dt * 12)
    }

    this._syncMesh(dt)
  }

  // ── Movement ────────────────────────────────────────────────
  _moveByState(dt, playerX, playerZ, distSq, dx, dz, world) {
    const turnRate = this.def.turnRate || 3
    let speed = 0

    switch (this.state) {
      // ── Orbit: circular path around player ──────────────────
      case 'orbit': {
        const angSpeed = this.def.speed / (this._orbitRadius || 3) * (this._orbitDir || 1)
        this._orbitAngle += angSpeed * dt
        const tx   = playerX + Math.sin(this._orbitAngle) * (this._orbitRadius || 3)
        const tz   = playerZ + Math.cos(this._orbitAngle) * (this._orbitRadius || 3)
        const odx  = tx - this.x, odz = tz - this.z
        const od   = Math.sqrt(odx * odx + odz * odz) || 0.001
        const spd  = Math.min(this.def.speed * 2, od * 8)
        this.yaw   = Math.atan2(odx, odz)
        this.x    += (odx / od) * spd * dt
        this.z    += (odz / od) * spd * dt
        return
      }

      // ── Away from player ─────────────────────────────────────
      case 'flee': {
        speed = this.def.fleeSpeed
        const fleeYaw = Math.atan2(dx, dz)
        this.yaw += angleDiff(fleeYaw, this.yaw) * Math.min(1, dt * turnRate)
        break
      }

      // ── Rush toward player ────────────────────────────────────
      case 'charge': {
        speed = this.def.fleeSpeed * 1.5
        const toYaw = Math.atan2(-dx, -dz)
        this.yaw += angleDiff(toYaw, this.yaw) * Math.min(1, dt * turnRate * 2)
        break
      }

      // ── Slowly toward player ──────────────────────────────────
      case 'curious':
      case 'follow': {
        speed = this.def.speed * 0.5
        const toYaw = Math.atan2(-dx, -dz)
        this.yaw += angleDiff(toYaw, this.yaw) * Math.min(1, dt * turnRate)
        break
      }

      // ── Along current yaw ────────────────────────────────────
      case 'wander':
      case 'flock':
        speed = this.def.speed
        break

      // ── Stationary states ────────────────────────────────────
      default:
        this._turnDir = 0
        return
    }

    // Probe-ahead obstacle avoidance
    const PROBE    = Math.max(speed * 0.35, 1.0)
    const probeX   = this.x + Math.sin(this.yaw) * PROBE
    const probeZ   = this.z + Math.cos(this.yaw) * PROBE
    const probeSy  = world.getSurfaceY(probeX, probeZ)
    const curSurf  = this.y - 1 - this.def.groundOffset
    const pathClear = probeSy > 0 && (probeSy - curSurf) <= 1.1

    if (pathClear) {
      this._turnDir = 0
      this.x += Math.sin(this.yaw) * speed * dt
      this.z += Math.cos(this.yaw) * speed * dt
    } else {
      if (this._turnDir === 0) this._turnDir = Math.random() < 0.5 ? 1 : -1
      this.yaw += this._turnDir * Math.PI * 1.5 * dt
    }
  }

  // ── Mesh animation ───────────────────────────────────────────
  _syncMesh(dt) {
    if (!this.mesh) return
    this.mesh.position.set(this.x, this.y, this.z)
    this.mesh.rotation.y = this.yaw

    const moving = this.state === 'wander'  || this.state === 'flee'   ||
                   this.state === 'flock'   || this.state === 'curious' ||
                   this.state === 'follow'  || this.state === 'charge'  ||
                   this.state === 'orbit'

    // ── 4-legged diagonal gait ────────────────────────────────
    if (this._legs) {
      if (moving) {
        const spd = this.state === 'flee' || this.state === 'charge'
          ? this.def.fleeSpeed
          : (this.state === 'curious' || this.state === 'follow' ? this.def.speed * 0.5 : this.def.speed)
        this._legTime += spd * dt * 3.5
        const swing = 0.4
        // Pair A: FL[2] + BR[1] — same phase
        this._legs[2].rotation.x = Math.sin(this._legTime) * swing
        this._legs[1].rotation.x = Math.sin(this._legTime) * swing
        // Pair B: FR[3] + BL[0] — opposite phase
        this._legs[3].rotation.x = Math.sin(this._legTime + Math.PI) * swing
        this._legs[0].rotation.x = Math.sin(this._legTime + Math.PI) * swing
      } else {
        for (const leg of this._legs) leg.rotation.x *= 0.85
        this._legTime = 0
      }
    }

    // ── Penguin body waddle ───────────────────────────────────
    if (this._body) {
      if (moving) {
        this._legTime += this.def.speed * dt * 4
        this._body.rotation.z = Math.sin(this._legTime) * 0.18
      } else {
        this._body.rotation.z *= 0.85
      }
    }

    // ── Wing flap ─────────────────────────────────────────────
    if (this._wings) {
      if (this.def.flapAlways) {
        // Bats: continuous flap at constant rate, faster when fleeing
        const rate = this.state === 'flee' ? 14 : 7
        this._legTime += dt * rate
        this._wings[0].rotation.z =  Math.sin(this._legTime) * 0.65
        this._wings[1].rotation.z = -Math.sin(this._legTime) * 0.65
      } else if (this.state === 'flee') {
        this._legTime += dt * 12
        this._wings[0].rotation.z =  Math.sin(this._legTime) * 0.8
        this._wings[1].rotation.z = -Math.sin(this._legTime) * 0.8
      } else if (this.state === 'follow') {
        this._legTime += dt * 4
        this._wings[0].rotation.z =  Math.sin(this._legTime) * 0.25
        this._wings[1].rotation.z = -Math.sin(this._legTime) * 0.25
      } else {
        this._wings[0].rotation.z *= 0.85
        this._wings[1].rotation.z *= 0.85
      }
    }

    // ── Mushroom sprite: bouncy y-offset ─────────────────────
    if (this.def.key === 'mushroom_sprite' && this.state === 'orbit') {
      this._legTime += dt * 3
      this.mesh.position.y = this.y + Math.abs(Math.sin(this._legTime)) * 0.2
    }

    // ── Head animations ───────────────────────────────────────
    if (this._head) {
      if (this.state === 'graze') {
        this._bobTime += dt * 0.8
        this._head.position.y = this._headBaseY + Math.sin(this._bobTime) * 0.06 - 0.08
      } else if (this.state === 'alert') {
        // Deer: head raises gradually during alert
        const t = Math.min(1, this._alertTimer / 0.8)
        this._head.position.y = this._headBaseY + t * 0.1
      } else if (this.state === 'idle') {
        this._bobTime += dt * 1.2
        this._head.position.y = this._headBaseY + Math.sin(this._bobTime) * 0.025
      } else {
        this._head.position.y = this._headBaseY
        if (!moving) this._bobTime = 0
      }
    }
  }

  dispose() {
    if (!this.mesh) return
    this.mesh.traverse(child => {
      if (child.isMesh) { child.geometry.dispose(); child.material.dispose() }
    })
  }
}
