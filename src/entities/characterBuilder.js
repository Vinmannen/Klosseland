// ─────────────────────────────────────────────────────────────
//  Klosseland — characterBuilder  (chibi proportions)
//
//  Body layout (world Y, ground = 0):
//    0.00  ground / foot bottoms
//    0.42  leg tops / hip pivot
//    0.63  torso center   (height 0.42, top 0.84)
//    0.78  arm pivots
//    0.84  head pivot / torso top
//    1.18  head sphere center  (radius 0.38)
//    1.56  top of head
//
//  Head occupies ~49 % of total height → recognisable chibi silhouette.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

// ── Shared constants ─────────────────────────────────────────
const HEAD_R   = 0.38   // head sphere radius
const HEAD_CY  = 0.34   // sphere center Y within headGroup
const HEAD_TOP = HEAD_CY + HEAD_R  // 0.72 — hat sits here

// ── Default character data ────────────────────────────────────
export const CHAR_DEFAULTS = {
  gender:     'male',
  species:    'human',       // 'human'|'bunny'|'cat'|'fox'|'bear'|'frog'|'raccoon'
  skinColor:  0xD4956A,
  hairColor:  0x5C3A1E,
  hairStyle:  'short',
  furPattern: 'solid',       // 'solid'|'spotted'|'striped'
  shirtColor: 0x4A7EC7,
  pantsColor: 0x2E4A80,
  name:       '',
  face:       'normal',
  hat:        'none',
  hatColor:   0x8B4513,
  cloak:      'none',
  cloakColor: 0x8B0000,
  shoulders:  'none',
  boots:      'none',
  pet:        'none',
}

// ── Colour helpers ────────────────────────────────────────────
function darkenColor(c, factor) {
  const r = Math.floor(((c >> 16) & 0xff) * factor)
  const g = Math.floor(((c >>  8) & 0xff) * factor)
  const b = Math.floor(( c        & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

// ─────────────────────────────────────────────────────────────
export function buildCharacterGroup(data) {
  const group = new THREE.Group()
  group.frustumCulled = false

  const mat      = color => new THREE.MeshLambertMaterial({ color })
  const skinMat  = mat(data.skinColor)
  const hairMat  = mat(data.hairColor)
  const shirtMat = mat(data.shirtColor)
  const pantsMat = mat(data.pantsColor)
  const darkMat  = mat(0x111111)
  const whiteMat = mat(0xffffff)

  const isFemale = data.gender === 'female'
  const species  = data.species ?? 'human'
  const tw       = isFemale ? 0.46 : 0.52   // torso width
  const legX     = isFemale ? 0.085 : 0.100  // leg spread

  // ── Legs ─────────────────────────────────────────────────────
  // CapsuleGeometry(radius, length): total height = length + 2*radius
  // = 0.20 + 0.21 = 0.41.  Mesh center at y = -0.205 within leg group.
  // With leg pivot at y=0.42: foot bottom at world y ≈ 0.
  const legGeo  = new THREE.CapsuleGeometry(0.105, 0.20, 4, 8)
  const footGeo = new THREE.SphereGeometry(0.118, 7, 5)

  const legL = new THREE.Group()
  legL.position.set(-legX, 0.42, 0)
  const legLMesh = new THREE.Mesh(legGeo, pantsMat)
  legLMesh.position.y = -0.205
  legLMesh.castShadow = true
  legL.add(legLMesh)
  const footL = new THREE.Mesh(footGeo, pantsMat)
  footL.position.set(0, -0.375, 0.038)
  footL.scale.set(0.92, 0.56, 1.38)
  footL.castShadow = true
  legL.add(footL)
  group.add(legL)

  const legR = new THREE.Group()
  legR.position.set(legX, 0.42, 0)
  const legRMesh = new THREE.Mesh(legGeo, pantsMat)
  legRMesh.position.y = -0.205
  legRMesh.castShadow = true
  legR.add(legRMesh)
  const footR = new THREE.Mesh(footGeo, pantsMat)
  footR.position.set(0, -0.375, 0.038)
  footR.scale.set(0.92, 0.56, 1.38)
  footR.castShadow = true
  legR.add(footR)
  group.add(legR)

  if (data.boots !== 'none') {
    _buildBoots(legL, legR, data.boots)
  }

  // ── Torso ─────────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.42, 0.26), shirtMat)
  torso.position.set(0, 0.63, 0)
  torso.castShadow = true
  group.add(torso)

  // Waistband
  const belt = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.01, 0.045, 0.28), darkMat)
  belt.position.set(0, 0.423, 0)
  group.add(belt)

  // Cloak (pivot at collar)
  let cloakGroup = null
  if (data.cloak !== 'none') {
    const cloakMat = new THREE.MeshLambertMaterial({ color: data.cloakColor, side: THREE.DoubleSide })
    cloakGroup = _buildCloak(group, data.cloak, cloakMat)
  }

  // ── Arms ──────────────────────────────────────────────────────
  // CapsuleGeometry(0.090, 0.17): total 0.35.  Pivot at y=0.78.
  // Arm bottom at world y ≈ 0.43 (short, stubby arms).
  const armX      = tw / 2 + 0.090
  const shlRadius = isFemale ? 0.108 : 0.122
  const shlGeo    = new THREE.SphereGeometry(shlRadius, 8, 6)
  const handGeo   = new THREE.SphereGeometry(0.095, 7, 5)

  const armL = new THREE.Group()
  armL.position.set(-armX, 0.78, 0)
  const armLMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.090, 0.17, 4, 8), skinMat)
  armLMesh.position.y = -0.175
  armLMesh.castShadow = true
  armL.add(armLMesh)
  const shlL = new THREE.Mesh(shlGeo, shirtMat)
  shlL.castShadow = true
  armL.add(shlL)
  const handL = new THREE.Mesh(handGeo, skinMat)
  handL.position.y = -0.330
  handL.scale.set(1.20, 0.72, 1.05)
  handL.castShadow = true
  armL.add(handL)
  group.add(armL)

  const armR = new THREE.Group()
  armR.position.set(armX, 0.78, 0)
  const armRMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.090, 0.17, 4, 8), skinMat)
  armRMesh.position.y = -0.175
  armRMesh.castShadow = true
  armR.add(armRMesh)
  const shlR = new THREE.Mesh(shlGeo, shirtMat)
  shlR.castShadow = true
  armR.add(shlR)
  const handR = new THREE.Mesh(handGeo, skinMat)
  handR.position.y = -0.330
  handR.scale.set(1.20, 0.72, 1.05)
  handR.castShadow = true
  armR.add(handR)
  group.add(armR)

  if (data.shoulders !== 'none') {
    _buildShoulders(group, armX, data.shoulders, mat(data.shirtColor))
  }

  // ── Neck ──────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.094, 0.10, 8), skinMat)
  neck.position.set(0, 0.88, 0)
  neck.castShadow = true
  group.add(neck)

  // ── Head ──────────────────────────────────────────────────────
  // Head pivot at y=0.84 (torso top).
  // Sphere center at HEAD_CY=0.34 within group → world y=1.18.
  const head = new THREE.Group()
  head.position.set(0, 0.84, 0)

  let hairGroup = null
  if (species === 'human') {
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 14, 10), skinMat)
    headMesh.position.y = HEAD_CY
    headMesh.castShadow = true
    head.add(headMesh)

    hairGroup = _buildHair(data.hairStyle ?? 'short', hairMat)
    head.add(hairGroup)

    _buildHumanFace(head, data.face, skinMat, darkMat, whiteMat)
  } else {
    _buildAnimalHead(species, head, data, skinMat, darkMat, whiteMat)
  }

  if (data.hat !== 'none') {
    _buildHat(head, data.hat, mat(data.hatColor))
  }

  group.add(head)

  group.traverse(obj => { obj.frustumCulled = false })

  return { group, head, hairGroup, torso, armL, armR, legL, legR, cloakGroup }
}

// ─────────────────────────────────────────────────────────────
//  Human face
//  Sphere: radius HEAD_R=0.38, center at y=HEAD_CY=0.34 within headGroup.
//  At eye level y=0.28: z_surface ≈ sqrt(0.38²-0.06²) ≈ 0.375
// ─────────────────────────────────────────────────────────────

function _buildHumanFace(headGroup, style, skinMat, darkMat, whiteMat) {
  const blushMat  = new THREE.MeshLambertMaterial({ color: 0xFFB3A7 })
  const eyeY      = style === 'cool' ? 0.270 : 0.282
  const scaleY    = style === 'cool' ? 0.48 : style === 'happy' ? 0.68 : 1.0

  // ── Eyes (sclera + iris + highlight) ─────────────────────────
  ;[[-0.118, 1], [0.118, -1]].forEach(([ex, side]) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), whiteMat)
    sclera.scale.y = scaleY
    sclera.position.set(ex, eyeY, 0.335)
    headGroup.add(sclera)

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.076, 7, 6), darkMat)
    iris.scale.y = scaleY
    iris.position.set(ex, eyeY, 0.360)
    headGroup.add(iris)

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), whiteMat)
    dot.position.set(ex + side * 0.022, eyeY + 0.026, 0.392)
    headGroup.add(dot)
  })

  // ── Cheek blush ───────────────────────────────────────────────
  ;[-1, 1].forEach(side => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.076, 6, 4), blushMat)
    blush.position.set(side * 0.228, 0.222, 0.296)
    blush.scale.set(1.40, 0.90, 0.20)
    headGroup.add(blush)
  })

  // ── Nose ──────────────────────────────────────────────────────
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), skinMat)
  nose.position.set(0, 0.200, 0.374)
  headGroup.add(nose)

  // ── Mouth ─────────────────────────────────────────────────────
  _buildMouth(headGroup, style, darkMat)
}

function _buildMouth(headGroup, style, darkMat) {
  let mouth
  if (style === 'happy') {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.090,  0.012, 0),
      new THREE.Vector3( 0,     -0.058, 0),
      new THREE.Vector3( 0.090,  0.012, 0),
    )
    mouth = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.016, 4, false), darkMat)
    mouth.position.set(0, 0.150, 0.295)

  } else if (style === 'cool') {
    mouth = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.028, 0.026), darkMat)
    mouth.position.set(0.028, 0.148, 0.352)
    mouth.rotation.z = -0.22

  } else {
    mouth = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.026, 0.026), darkMat)
    mouth.position.set(0, 0.150, 0.362)
  }
  headGroup.add(mouth)
}

// ─────────────────────────────────────────────────────────────
//  Animal head
//  Same sphere radius as human (HEAD_R=0.38, center HEAD_CY=0.34)
//  so hats/glasses/accessories fit both species types.
//  Scale from old animal radius 0.28 → new 0.38: factor ≈ 1.357
//  Y transform: y_new = y_old * 1.357 - 0.040
// ─────────────────────────────────────────────────────────────

function _buildAnimalHead(species, headGroup, data, skinMat, darkMat, whiteMat) {
  const mat = c => new THREE.MeshLambertMaterial({ color: c })

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 14, 10), skinMat)
  headMesh.position.y = HEAD_CY
  headMesh.castShadow = true

  if (species === 'frog') headMesh.scale.y = 0.82

  headGroup.add(headMesh)

  switch (species) {
    case 'bunny':   _addBunnyEars(headGroup, skinMat); break
    case 'cat':     _addCatEars(headGroup, skinMat);   break
    case 'fox':     _addFoxEars(headGroup, skinMat);   break
    case 'bear':    _addBearEars(headGroup, skinMat, mat); break
    case 'raccoon': _addRaccoonEars(headGroup, skinMat); break
    // frog: no ears, handled below
  }

  if (data.furPattern === 'spotted') _addSpots(headGroup, data.skinColor, mat)
  else if (data.furPattern === 'striped') _addStripes(headGroup, data.skinColor, mat)

  _buildAnimalFace(species, headGroup, data.face, skinMat, darkMat, whiteMat, mat)
}

// ── Animal ear helpers ────────────────────────────────────────

function _addBunnyEars(headGroup, furMat) {
  const innerMat = new THREE.MeshLambertMaterial({ color: 0xFFAFAF })
  ;[-1, 1].forEach(side => {
    const ex = side * 0.136
    const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.079, 0.490, 4, 8), furMat)
    outer.position.set(ex, 1.022, -0.027)
    outer.rotation.z = side * 0.08
    outer.castShadow = true
    headGroup.add(outer)
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.380, 4, 6), innerMat)
    inner.position.set(ex, 1.000, 0.014)
    inner.rotation.z = side * 0.08
    headGroup.add(inner)
  })
}

function _addCatEars(headGroup, furMat) {
  const innerMat = new THREE.MeshLambertMaterial({ color: 0xFFAFAF })
  ;[-1, 1].forEach(side => {
    const ex = side * 0.224
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.122, 0.238, 4), furMat)
    outer.position.set(ex, 0.840, 0)
    outer.rotation.y = Math.PI / 4
    outer.rotation.z = side * 0.14
    outer.castShadow = true
    headGroup.add(outer)
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.073, 0.163, 4), innerMat)
    inner.position.set(ex, 0.840, 0.012)
    inner.rotation.y = Math.PI / 4
    inner.rotation.z = side * 0.14
    headGroup.add(inner)
  })
}

function _addFoxEars(headGroup, furMat) {
  const innerMat = new THREE.MeshLambertMaterial({ color: 0xFFD0A0 })
  ;[-1, 1].forEach(side => {
    const ex = side * 0.206
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.130, 0.292, 4), furMat)
    outer.position.set(ex, 0.853, 0)
    outer.rotation.y = Math.PI / 4
    outer.rotation.z = side * 0.11
    outer.castShadow = true
    headGroup.add(outer)
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.081, 0.210, 4), innerMat)
    inner.position.set(ex, 0.853, 0.012)
    inner.rotation.y = Math.PI / 4
    inner.rotation.z = side * 0.11
    headGroup.add(inner)
  })
}

function _addBearEars(headGroup, furMat, mat) {
  ;[-1, 1].forEach(side => {
    const ex = side * 0.285
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.129, 8, 6), furMat)
    ear.position.set(ex, 0.682, -0.052)
    ear.scale.set(1, 1, 0.62)
    ear.castShadow = true
    headGroup.add(ear)
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.081, 7, 5), mat(0xC09070))
    inner.position.set(ex, 0.682, -0.010)
    inner.scale.set(1, 1, 0.38)
    headGroup.add(inner)
  })
}

function _addRaccoonEars(headGroup, furMat) {
  ;[-1, 1].forEach(side => {
    const ex = side * 0.266
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.109, 7, 5), furMat)
    ear.position.set(ex, 0.671, -0.043)
    ear.scale.set(1, 1.18, 0.68)
    ear.castShadow = true
    headGroup.add(ear)
  })
}

// ── Fur patterns ──────────────────────────────────────────────

function _addSpots(headGroup, baseColor, mat) {
  const spotMat = mat(darkenColor(baseColor, 0.60))
  ;[
    { x: -0.251, y: 0.333, z: 0.292 },
    { x:  0.251, y: 0.333, z: 0.292 },
    { x:  0.000, y: 0.584, z: 0.278 },
  ].forEach(({ x, y, z }) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.079, 6, 5), spotMat)
    s.position.set(x, y, z)
    s.scale.set(1.30, 0.90, 0.30)
    headGroup.add(s)
  })
}

function _addStripes(headGroup, baseColor, mat) {
  const stripeMat = mat(darkenColor(baseColor, 0.62))
  ;[
    { y: 0.564, w: 0.407 },
    { y: 0.483, w: 0.353 },
    { y: 0.401, w: 0.299 },
  ].forEach(({ y, w }) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w, 0.034, 0.022), stripeMat)
    stripe.position.set(0, y, 0.323)
    headGroup.add(stripe)
  })
}

// ── Animal face ───────────────────────────────────────────────
// Eye surface: sphere r=0.38, center y=0.34; at y=0.28 → z ≈ 0.375

function _buildAnimalFace(species, headGroup, style, skinMat, darkMat, whiteMat, mat) {
  const blushMat = new THREE.MeshLambertMaterial({ color: 0xFFB3A7 })
  const eyeY     = style === 'cool' ? 0.270 : 0.282
  const scaleY   = style === 'cool' ? 0.48 : style === 'happy' ? 0.68 : 1.0

  if (species === 'frog') {
    _addFrogFace(headGroup, style, skinMat, darkMat, whiteMat)
    return
  }

  // Eye x spread: cat/raccoon wider
  const eyeXArr = (species === 'cat' || species === 'raccoon') ? [-0.142, 0.142] : [-0.125, 0.125]

  eyeXArr.forEach((ex, i) => {
    const side = i === 0 ? 1 : -1

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.090, 8, 6), whiteMat)
    sclera.scale.y = scaleY
    sclera.position.set(ex, eyeY, 0.334)
    headGroup.add(sclera)

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.072, 7, 6), darkMat)
    iris.scale.y = scaleY
    // Cat/fox: horizontal slit pupil
    if (species === 'cat' || species === 'fox') iris.scale.x = 0.70
    iris.position.set(ex, eyeY, 0.358)
    headGroup.add(iris)

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), whiteMat)
    dot.position.set(ex + side * 0.020, eyeY + 0.022, 0.383)
    headGroup.add(dot)
  })

  // Cheek blush
  ;[-1, 1].forEach(side => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.076, 6, 4), blushMat)
    blush.position.set(side * 0.228, 0.220, 0.290)
    blush.scale.set(1.40, 0.90, 0.20)
    headGroup.add(blush)
  })

  // Species-specific nose
  switch (species) {
    case 'bunny': {
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.049, 6, 5), mat(0xFF9999))
      nose.position.set(0, 0.208, 0.375)
      headGroup.add(nose)
      break
    }
    case 'cat': {
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.033, 0.022), mat(0xFF6B8A))
      nose.position.set(0, 0.210, 0.373)
      headGroup.add(nose)
      ;[-1, 1].forEach(side => {
        ;[0.016, -0.014].forEach(offsetY => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(0.217, 0.009, 0.007), darkMat)
          w.position.set(side * 0.192, 0.205 + offsetY, 0.348)
          w.rotation.z = side * offsetY * 0.8
          headGroup.add(w)
        })
      })
      break
    }
    case 'fox': {
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.041, 5, 4), darkMat)
      nose.position.set(0, 0.205, 0.375)
      headGroup.add(nose)
      break
    }
    case 'bear': {
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.149, 9, 7), mat(0xE0C0A0))
      snout.scale.set(1.00, 0.64, 0.70)
      snout.position.set(0, 0.190, 0.265)
      headGroup.add(snout)
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.049, 6, 4), darkMat)
      nose.position.set(0, 0.220, 0.325)
      headGroup.add(nose)
      break
    }
    case 'raccoon': {
      // Dark eye mask patches
      ;[-0.138, 0.138].forEach(ex => {
        const mask = new THREE.Mesh(new THREE.SphereGeometry(0.090, 7, 5), mat(0x222222))
        mask.scale.set(1.42, 0.86, 0.36)
        mask.position.set(ex, eyeY, 0.310)
        headGroup.add(mask)
      })
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.041, 5, 4), darkMat)
      nose.position.set(0, 0.205, 0.375)
      headGroup.add(nose)
      break
    }
  }

  _buildMouth(headGroup, style, darkMat)
}

function _addFrogFace(headGroup, style, skinMat, darkMat, whiteMat) {
  const blushMat = new THREE.MeshLambertMaterial({ color: 0xBEE4A0 })
  ;[[-0.251, 1], [0.251, -1]].forEach(([ex, side]) => {
    const stalk = new THREE.Mesh(new THREE.SphereGeometry(0.100, 8, 6), skinMat)
    stalk.position.set(ex, 0.490, 0.196)
    headGroup.add(stalk)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.064, 7, 6), darkMat)
    iris.position.set(ex, 0.514, 0.270)
    headGroup.add(iris)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.020, 5, 4), whiteMat)
    dot.position.set(ex + side * 0.016, 0.530, 0.291)
    headGroup.add(dot)
    // Light cheek tint for frogs
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.070, 6, 4), blushMat)
    blush.position.set(side * -0.200, 0.310, 0.290)
    blush.scale.set(1.30, 0.90, 0.20)
    headGroup.add(blush)
  })
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.237, 0.030, 0.028), darkMat)
  mouth.position.set(0, 0.175, 0.326)
  headGroup.add(mouth)
}

// ─────────────────────────────────────────────────────────────
//  Hair  (scaled for new head: radius 0.38, center y=0.34)
//  All hair geometry values = old * 1.46,  y = old_y * 1.46 - 0.07
// ─────────────────────────────────────────────────────────────

function _buildHair(style, hairMat) {
  const g = new THREE.Group()
  g.userData.isHairGroup = true

  // mkCap builds a cylinder cap sitting at the top of the head sphere
  const mkCap = (rTop, rBot, h, y) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 10), hairMat)
    m.position.y = y
    return m
  }

  // All key hair-top caps start at the sphere top ≈ y=0.66
  if (style === 'short') {
    g.add(mkCap(0.41, 0.39, 0.19, 0.66))

  } else if (style === 'side') {
    g.add(mkCap(0.40, 0.39, 0.15, 0.65))
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.095, 0.22), hairMat)
    flap.position.set(0.25, 0.71, 0.15)
    flap.rotation.z = 0.22
    flap.rotation.x = -0.18
    g.add(flap)

  } else if (style === 'spiky') {
    g.add(mkCap(0.37, 0.39, 0.10, 0.65))
    ;[
      { x:  0,     z:  0,     rx:  0,    rz:  0    },
      { x:  0.146, z:  0.088, rx: -0.35, rz:  0.45 },
      { x: -0.146, z:  0.088, rx: -0.35, rz: -0.45 },
      { x:  0.073, z: -0.161, rx:  0.40, rz:  0.18 },
      { x: -0.073, z: -0.161, rx:  0.40, rz: -0.18 },
    ].forEach(({ x, z, rx, rz }) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.076, 0.292, 5), hairMat)
      cone.position.set(x, 0.864, z)
      cone.rotation.x = rx
      cone.rotation.z = rz
      g.add(cone)
    })

  } else if (style === 'wavy') {
    g.add(mkCap(0.42, 0.39, 0.25, 0.68))
    ;[-1, 1].forEach(s => {
      const v = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 5), hairMat)
      v.position.set(s * 0.37, 0.60, -0.09)
      g.add(v)
    })
    const bk = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), hairMat)
    bk.position.set(0, 0.57, -0.29)
    g.add(bk)

  } else if (style === 'bun') {
    g.add(mkCap(0.41, 0.39, 0.19, 0.66))
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), hairMat)
    bun.position.set(0, 0.81, -0.12)
    g.add(bun)

  } else if (style === 'ponytail') {
    g.add(mkCap(0.41, 0.39, 0.19, 0.66))
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.47, 4, 7), hairMat)
    tail.position.set(0, 0.24, -0.38)
    tail.rotation.x = 0.28
    g.add(tail)

  } else if (style === 'long') {
    g.add(mkCap(0.41, 0.39, 0.19, 0.66))
    ;[
      { y:  0.54, z: -0.25, r: 0.31, sx: 1.10, sy: 0.65, sz: 0.64 },
      { y:  0.31, z: -0.32, r: 0.29, sx: 1.05, sy: 0.82, sz: 0.60 },
      { y:  0.05, z: -0.32, r: 0.26, sx: 0.98, sy: 0.90, sz: 0.55 },
      { y: -0.22, z: -0.31, r: 0.23, sx: 0.88, sy: 0.95, sz: 0.50 },
      { y: -0.45, z: -0.29, r: 0.19, sx: 0.76, sy: 1.00, sz: 0.45 },
    ].forEach(({ y, z, r, sx, sy, sz }) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), hairMat)
      s.position.set(0, y, z)
      s.scale.set(sx, sy, sz)
      g.add(s)
    })
    ;[-1, 1].forEach(side => {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.080, 0.47, 4, 6), hairMat)
      strand.position.set(side * 0.35, 0.13, -0.09)
      strand.rotation.x = 0.12
      g.add(strand)
    })

  } else if (style === 'braids') {
    g.add(mkCap(0.42, 0.39, 0.15, 0.66))
    ;[-1, 1].forEach(side => {
      const bx = side * 0.387
      ;[
        { y:  0.332, z:  0.000, r: 0.099, sx: 0.80, sy: 1.10, sz: 0.86 },
        { y:  0.200, z:  0.073, r: 0.105, sx: 0.82, sy: 1.06, sz: 0.88 },
        { y:  0.069, z: -0.073, r: 0.105, sx: 0.82, sy: 1.06, sz: 0.88 },
        { y: -0.063, z:  0.073, r: 0.102, sx: 0.80, sy: 1.06, sz: 0.85 },
        { y: -0.194, z: -0.073, r: 0.095, sx: 0.78, sy: 1.06, sz: 0.82 },
        { y: -0.318, z:  0.029, r: 0.079, sx: 0.72, sy: 1.12, sz: 0.74 },
      ].forEach(({ y, z, r, sx, sy, sz }) => {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), hairMat)
        seg.position.set(bx, y, z)
        seg.scale.set(sx, sy, sz)
        g.add(seg)
      })
    })

  } else {
    g.add(mkCap(0.41, 0.39, 0.19, 0.66))
  }

  return g
}

export function buildHairGroup(style, color) {
  return _buildHair(style ?? 'short', new THREE.MeshLambertMaterial({ color }))
}

// ─────────────────────────────────────────────────────────────
//  Hat  — sits at HEAD_TOP = 0.72 within headGroup
// ─────────────────────────────────────────────────────────────

function _buildHat(headGroup, style, hatMat) {
  const hatGroup = new THREE.Group()
  hatGroup.position.y = HEAD_TOP  // 0.72

  if (style === 'cap') {
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.30, 0.24, 9), hatMat)
    dome.position.y = 0.12
    hatGroup.add(dome)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.044, 9), hatMat)
    brim.position.y = 0.022
    hatGroup.add(brim)

  } else if (style === 'wizard') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.055, 9), hatMat)
    brim.position.y = 0.028
    hatGroup.add(brim)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.56, 9), hatMat)
    cone.position.y = 0.335
    hatGroup.add(cone)

  } else if (style === 'crown') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.28, 0.11, 9), hatMat)
    ring.position.y = 0.055
    hatGroup.add(ring)
    const spikeGeo = new THREE.BoxGeometry(0.070, 0.175, 0.070)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const spike = new THREE.Mesh(spikeGeo, hatMat)
      spike.position.set(Math.sin(a) * 0.245, 0.200, Math.cos(a) * 0.245)
      hatGroup.add(spike)
    }
  }

  headGroup.add(hatGroup)
}

// ─────────────────────────────────────────────────────────────
//  Cloak  — pivot at collar
// ─────────────────────────────────────────────────────────────

function _buildCloak(group, style, cloakMat) {
  const height = style === 'long' ? 0.88 : 0.46
  const cloakGroup = new THREE.Group()
  cloakGroup.position.set(0, 0.82, -0.148)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.52, height), cloakMat)
  mesh.position.y = -(height / 2)
  cloakGroup.add(mesh)
  group.add(cloakGroup)
  return cloakGroup
}

// ─────────────────────────────────────────────────────────────
//  Shoulder pads
// ─────────────────────────────────────────────────────────────

function _buildShoulders(group, armX, style, mat) {
  const specs = { small: [0.10, 0.15, 0.10, 6], large: [0.12, 0.19, 0.13, 6] }
  const [rt, rb, h, seg] = specs[style] ?? specs.small
  const geo = new THREE.CylinderGeometry(rt, rb, h, seg)
  ;[-1, 1].forEach(side => {
    const s = new THREE.Mesh(geo, mat)
    s.position.set(side * (armX + 0.02), 0.78, 0)
    s.castShadow = true
    group.add(s)
  })
}

// ─────────────────────────────────────────────────────────────
//  Boots
// ─────────────────────────────────────────────────────────────
const BOOT_COLORS = { leather: 0x7A4012, metal: 0x9E9E9E }

function _buildBoots(legL, legR, style) {
  const bootMat = new THREE.MeshLambertMaterial({ color: BOOT_COLORS[style] ?? BOOT_COLORS.leather })
  const bootGeo = new THREE.BoxGeometry(0.26, 0.13, 0.34)
  ;[legL, legR].forEach(leg => {
    const b = new THREE.Mesh(bootGeo, bootMat)
    b.position.set(0, -0.370, 0.035)
    b.castShadow = true
    leg.add(b)
  })
}
