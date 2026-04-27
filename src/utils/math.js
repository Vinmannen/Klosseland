// ─────────────────────────────────────────────────────────────
//  Klosseland — Math Utilities
// ─────────────────────────────────────────────────────────────

export const DEG2RAD = Math.PI / 180
export const RAD2DEG = 180 / Math.PI
export const TWO_PI  = Math.PI * 2

/** Clamp n between lo and hi. */
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t

/** Smooth step. */
export const smoothstep = (a, b, t) => lerp(a, b, t * t * (3 - 2 * t))

/** World block position → chunk coordinate. */
export const worldToChunk = (w, size) => Math.floor(w / size)

/** World block position → local position within its chunk. */
export const worldToLocal = (w, size) => ((w % size) + size) % size

/** World block position (float) → integer block index. */
export const worldToBlock = (f) => Math.floor(f)

/** Seeded pseudo-random number (0–1). Good enough for terrain offsets. */
export function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123
  return x - Math.floor(x)
}

/**
 * Simple FBM (Fractal Brownian Motion) helper.
 * noise2D must be a function(x,z) → -1..1.
 */
export function fbm(noise2D, x, z, {
  octaves     = 4,
  persistence = 0.5,
  lacunarity  = 2.0,
  scale       = 0.008,
  offsetX     = 0,
  offsetZ     = 0,
} = {}) {
  let value = 0
  let amplitude = 1
  let frequency = scale
  let maxValue  = 0

  for (let i = 0; i < octaves; i++) {
    value    += noise2D((x + offsetX) * frequency, (z + offsetZ) * frequency) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  return value / maxValue   // normalised -1 to 1
}

/** AABB overlap test. Returns true if boxes overlap. */
export function aabbOverlap(
  ax, ay, az, aw, ah, ad,  // box A origin + size
  bx, by, bz, bw, bh, bd   // box B
) {
  return (
    ax < bx + bw && ax + aw > bx &&
    ay < by + bh && ay + ah > by &&
    az < bz + bd && az + ad > bz
  )
}
