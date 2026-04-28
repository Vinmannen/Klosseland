// ─────────────────────────────────────────────────────────────
//  Klosseland — WorldGen
//  Procedural terrain + biome placement via simplex noise.
// ─────────────────────────────────────────────────────────────
import { createNoise2D } from 'simplex-noise'
import { CHUNK_W, CHUNK_H, SEA_LEVEL, BIOME } from '../data/constants.js'
import { fbm, seededRandom } from '../utils/math.js'
import { BLOCK_BY_KEY } from '../data/blockDefinitions.js'

// ── Block ID shorthands (resolved once at module load) ────────
const B = {}
const KEYS = [
  'air','grass','dirt','stone','sand','gravel','snow_block','ice',
  'oak_log','oak_planks','oak_leaves',
  'pine_log','pine_leaves',
  'birch_log','birch_leaves',
  'jungle_log','jungle_leaves',
  'cherry_log','cherry_leaves',
  'autumn_leaves',
  'mushroom_red','mushroom_brown','mushroom_stem',
  'giant_mushroom_top',
  'sandstone','cobblestone','clay',
  'cactus','bamboo','tall_grass','flower_red','flower_yellow',
  'flower_blue','flower_pink','flower_white','flower_purple',
  'candy_pink','candy_yellow','cloud_block','crystal_blue',
  'crystal_purple','crystal_green','glowstone','fern','vine',
  'obsidian', 'basalt',
  // B1 — Autumn
  'pumpkin', 'leaf_pile',
  // B2 — Desert
  'dead_bush', 'terracotta', 'cracked_sandstone',
  // B3 — Snowy Peaks
  'powder_snow',
  // B4 — Mushroom
  'mycelium', 'glowing_mushroom',
  // B5 — Candy
  'candy_red', 'candy_mint', 'frosted_log',
  // B6 — Jungle
  'tropical_flower',
  // B7 — Fairy Woodland
  'willow_log', 'willow_leaves',
  'fairy_mushroom', 'fairy_lantern',
  'enchanted_moss', 'fairy_flower', 'wisp_light',
  // B8 — Meadow
  'mossy_stone', 'wildflower_patch',
  // B9 — Cherry
  'petal_carpet', 'stone_lantern',
  // B10 — Blodmark
  'blood_water', 'blood_water_flow',
  'crimson_moss', 'dark_stone',
  'bloodwood_log', 'bloodwood_leaves',
  'dark_thorns', 'blood_crystal',
  // Terrain / fluid (used in _fillColumn; must be explicit here)
  'water', 'waterFlow', 'packed_ice',
]
for (const k of KEYS) { const b = BLOCK_BY_KEY.get(k); if (b) B[k] = b.id }

// Non-solid, non-liquid decoration IDs — tree trunks overwrite these during generation
const SURFACE_DECO = new Set(
  [...BLOCK_BY_KEY.values()]
    .filter(b => b.solid === false && !b.liquid && b.id !== 0)
    .map(b => b.id)
)

// ─────────────────────────────────────────────────────────────
export class WorldGen {
  /**
   * @param {number} seed
   * @param {number} halfBlocks  Half-width of the world in blocks (Infinity for endless worlds)
   */
  constructor(seed = 0, halfBlocks = Infinity) {
    this.seed       = seed
    this.halfBlocks = halfBlocks
    this._infinite  = !isFinite(halfBlocks)
    const off = seededRandom(seed) * 10000

    // Seeded PRNG for reproducible noise per seed
    const mkRng = n => {
      let s = (seed + n * 97317) >>> 0
      return () => { s = Math.imul(1664525, s) + 1013904223 | 0; return (s >>> 0) / 4294967296 }
    }

    // Terrain height (broad + fine detail)
    this._nHeight  = createNoise2D(mkRng(0))
    this._nDetail  = createNoise2D(mkRng(1))

    // Domain-warp axes (repurposed from old temp/humid — same smooth noise, new role)
    this._nWarp1   = createNoise2D(mkRng(2))
    this._nWarp2   = createNoise2D(mkRng(3))

    // mkRng(4) was _nSpecial — slot kept empty so existing seeds produce the same terrain noise

    // Tree/decoration placement
    this._nDeco    = createNoise2D(mkRng(5))

    // Secondary shaped noise for biome-specific terrain (B1+)
    this._nHeight2 = createNoise2D(mkRng(6))
    this._nRidge   = createNoise2D(mkRng(7))  // ridged/dune shapes

    // Coordinate offset so same noise looks unique per seed
    this._ox = off
    this._oz = seededRandom(seed + 1) * 10000

    // Pre-place biome seed points (one per biome guaranteed + extras for variety)
    this._biomeSeeds = this._generateBiomeSeeds(mkRng(88), halfBlocks)
  }

  // ── Biome at world (x, z) ──────────────────────────────────
  // Grid-Voronoi approach: each block's biome = nearest pre-placed seed point.
  // Coordinates are domain-warped first so biome boundaries look organic, not grid-aligned.
  // All 9 biomes are guaranteed to have a seed point, ensuring full biome coverage.
  getBiome(x, z) {
    // Domain warp — shift lookup coords with smooth noise → natural-looking borders
    const warpStrength = this._infinite ? 60 : Math.min(60, this.halfBlocks * 0.25)
    const wx = x + this._nWarp1(x * 0.004 + this._ox,       z * 0.004 + this._oz)       * warpStrength
    const wz = z + this._nWarp2(x * 0.004 + this._ox * 0.7, z * 0.004 + this._oz * 0.7) * warpStrength

    let minDist2 = Infinity
    let nearest  = BIOME.MEADOW

    // Check all pre-placed anchor seeds (covers finite worlds fully; covers spawn area for infinite)
    for (const s of this._biomeSeeds) {
      const d = (wx - s.px) ** 2 + (wz - s.pz) ** 2
      if (d < minDist2) { minDist2 = d; nearest = s.biome }
    }

    // For infinite worlds: also check nearby procedural grid cells beyond the anchor zone
    if (this._infinite) {
      const CELL = 256
      const gcx  = Math.floor(wx / CELL)
      const gcz  = Math.floor(wz / CELL)
      for (let dgx = -2; dgx <= 2; dgx++) {
        for (let dgz = -2; dgz <= 2; dgz++) {
          const cx2 = gcx + dgx, cz2 = gcz + dgz
          if (Math.abs(cx2) <= 1 && Math.abs(cz2) <= 1) continue  // anchor zone already covered
          const [px, pz, biome] = this._cellSeed(cx2, cz2)
          const d = (wx - px) ** 2 + (wz - pz) ** 2
          if (d < minDist2) { minDist2 = d; nearest = biome }
        }
      }
    }

    return nearest
  }

  // ── Deterministic biome seed point for a procedural grid cell ──
  // Used only by infinite worlds beyond the anchor zone.
  _cellSeed(cx, cz) {
    const CELL = 256
    const h  = (Math.imul(cx, 2654435761) ^ Math.imul(cz, 2246822519) ^ this.seed) >>> 0
    const h2 = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0
    const px = cx * CELL + (h  % CELL)
    const pz = cz * CELL + (h2 % CELL)
    return [px, pz, h % 10]
  }

  // ── Generate the pre-placed anchor + variety seeds ────────────
  // Layout: 9 biomes arranged in a shuffled 3×3 grid covering the world,
  // plus extra seeds scaled to world size for additional variety.
  _generateBiomeSeeds(rng, halfBlocks) {
    const ALL = [
      BIOME.MEADOW, BIOME.FOREST, BIOME.SNOWY_PEAKS, BIOME.DESERT,
      BIOME.JUNGLE, BIOME.MUSHROOM, BIOME.CANDY, BIOME.AUTUMN, BIOME.CHERRY,
      BIOME.BLODMARK,
    ]

    // How far from origin to spread the 3×3 anchor grid
    const spread = isFinite(halfBlocks) ? halfBlocks * 0.78 : 320

    // Shuffle biome order so each seed produces a different spatial arrangement
    const shuffled = [...ALL]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Place one anchor per biome in a 3×3 grid with slight random jitter
    const seeds = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cellW = (spread * 2) / 3
        const px = -spread + (col + 0.5) * cellW + (rng() - 0.5) * cellW * 0.5
        const pz = -spread + (row + 0.5) * cellW + (rng() - 0.5) * cellW * 0.5
        seeds.push({ px, pz, biome: shuffled[row * 3 + col] })
      }
    }

    // Place the 10th biome that doesn't fit the 3×3 grid
    for (let k = 9; k < shuffled.length; k++) {
      const angle = rng() * Math.PI * 2
      const dist  = spread * (0.3 + rng() * 0.5)
      seeds.push({ px: Math.cos(angle) * dist, pz: Math.sin(angle) * dist, biome: shuffled[k] })
    }

    // Add extra seeds for variety — more seeds = smaller average biome regions
    const extra = isFinite(halfBlocks) ? Math.round(halfBlocks / 64) : 12
    for (let i = 0; i < extra; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = rng() * spread * 0.9
      seeds.push({
        px:    Math.cos(angle) * dist,
        pz:    Math.sin(angle) * dist,
        biome: ALL[Math.floor(rng() * ALL.length)],
      })
    }

    return seeds
  }

  // ── Surface height at world (x, z) ─────────────────────────
  // Blends heights near biome borders so cliffs never form at boundaries.
  getSurfaceY(x, z) {
    const biome = this.getBiome(x, z)
    const rawY  = this._rawSurfaceY(x, z, biome)

    // Sample 8 points at BLEND_R distance; neighbours in a different biome
    // pull the height toward their own, creating a smooth transition ramp.
    const BLEND_R = 40
    const DIAG    = BLEND_R * 0.7 | 0
    const offsets = [
      [BLEND_R, 0], [-BLEND_R, 0], [0, BLEND_R], [0, -BLEND_R],
      [DIAG, DIAG], [-DIAG, DIAG], [DIAG, -DIAG], [-DIAG, -DIAG],
    ]

    let totalWeight = 1
    let blendedY    = rawY

    for (const [dx, dz] of offsets) {
      const nb = this.getBiome(x + dx, z + dz)
      if (nb !== biome) {
        blendedY    += this._rawSurfaceY(x + dx, z + dz, nb)
        totalWeight += 1
      }
    }

    // Never lower terrain at biome borders — only raise low terrain toward high neighbours.
    // This prevents the "pit" that appears when mountain blocks get averaged down to meadow level.
    const blended = totalWeight > 1 ? Math.floor(blendedY / totalWeight) : rawY
    return Math.max(rawY, blended)
  }

  // ── Raw (unblended) height for a given biome at (x, z) ─────
  _rawSurfaceY(x, z, biome) {
    // Base height from FBM
    let base = fbm(this._nHeight, x, z, {
      octaves: 5, persistence: 0.55, lacunarity: 2.1, scale: 0.006,
      offsetX: this._ox, offsetZ: this._oz,
    })

    // Fine detail
    const detail = this._nDetail(x * 0.04 + this._ox, z * 0.04 + this._oz) * 0.15

    base = (base + 1) * 0.5   // 0..1
    base += detail * 0.5

    let amplitude, floor
    switch (biome) {
      case BIOME.MEADOW: {
        // Smooth rolling hills — low-frequency blend suppresses jagginess
        const roll = this._nHeight2(x * 0.004 + this._ox * 1.1, z * 0.004 + this._oz * 1.1) * 0.35
        base = base * 0.5 + roll * 0.5
        amplitude = 9
        floor     = SEA_LEVEL + 2
        break
      }
      case BIOME.FOREST: {
        // Gently rolling woodland floor — secondary noise adds soft undulation
        base += this._nHeight2(x * 0.004 + this._ox * 1.1, z * 0.004 + this._oz * 1.1) * 0.18
        amplitude = 10
        floor     = SEA_LEVEL + 3   // slightly elevated — feels deeper, more enclosed
        break
      }
      case BIOME.SNOWY_PEAKS: {
        // Natural slopes — no plateau so the mountain rises gradually from its base.
        // Ridge noise adds dramatic cliff faces on the upper half.
        const ridgeN = this._nRidge(x * 0.012 + this._ox, z * 0.012 + this._oz)
        base = Math.max(0, Math.min(1, base * 0.85 + (1 - Math.abs(ridgeN)) * 0.15))
        amplitude = 30
        floor     = SEA_LEVEL + 2   // same floor as meadow — foothills blend naturally
        break
      }
      case BIOME.DESERT: {
        // Ridged noise: 1 - |noise| creates sharp dune-ridge shapes
        const ridge = 1 - Math.abs(this._nRidge(x * 0.008 + this._ox * 0.5, z * 0.008 + this._oz * 0.5))
        base = base * 0.4 + ridge * 0.6   // blend smooth base with ridged dunes
        amplitude = 9
        floor     = SEA_LEVEL + 1
        break
      }
      case BIOME.JUNGLE: {
        // Lifted plateau with secondary noise for dramatic cliffs
        const lift = this._nHeight2(x * 0.004 + this._ox * 0.9, z * 0.004 + this._oz * 0.9) * 0.3
        base = base * 0.6 + (base + lift) * 0.4
        amplitude = 14
        floor     = SEA_LEVEL + 4
        break
      }
      case BIOME.MUSHROOM: {
        // Eerie sinusoidal undulation — alien regularity instead of noise hills
        const sineWave = Math.sin(x * 0.18) * Math.cos(z * 0.18) * 0.4
                       + Math.sin(x * 0.07 + z * 0.05) * 0.25
        base = base * 0.3 + (sineWave + 1) * 0.35
        amplitude = 7
        floor     = SEA_LEVEL + 1
        break
      }
      case BIOME.CANDY: {
        // Quantize to steps of 2 — creates flat terraces separated by 1-block drops
        const rawH = (SEA_LEVEL + 2) + base * 8
        return Math.round(rawH / 2) * 2
      }
      case BIOME.AUTUMN:
        amplitude = 10
        floor     = SEA_LEVEL + 2
        // Broader, rolling hills via low-frequency secondary noise
        base += this._nHeight2(x * 0.003 + this._ox * 1.3, z * 0.003 + this._oz * 1.3) * 0.25
        break
      case BIOME.CHERRY: {
        // Low-frequency smooth hills — cherry groves fill valley floors
        const soft = this._nHeight2(x * 0.003 + this._ox * 0.8, z * 0.003 + this._oz * 0.8) * 0.4
        base = base * 0.3 + soft * 0.7   // dominated by smooth component
        amplitude = 6
        floor     = SEA_LEVEL + 2
        break
      }
      case BIOME.BLODMARK: {
        // Dramatic ridged cliffs with low blood-soaked valleys
        const ridge = 1 - Math.abs(this._nRidge(x * 0.009 + this._ox * 0.6, z * 0.009 + this._oz * 0.6))
        base = base * 0.45 + ridge * 0.55
        amplitude = 18
        floor     = SEA_LEVEL + 1
        break
      }
      default:                amplitude = 8;  floor = SEA_LEVEL + 2
    }

    return Math.floor(floor + base * amplitude)
  }

  // ── Fill a Chunk with blocks ───────────────────────────────
  /**
   * @param {import('./Chunk.js').Chunk} chunk
   */
  generateChunk(chunk) {
    const { cx, cz } = chunk
    const worldX0 = cx * CHUNK_W
    const worldZ0 = cz * CHUNK_W

    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = worldX0 + lx
        const wz = worldZ0 + lz
        const biome   = this.getBiome(wx, wz)
        const surface = this.getSurfaceY(wx, wz)

        this._fillColumn(chunk, lx, lz, wx, wz, biome, surface)
      }
    }

    // Second pass: decorations (trees, flowers, etc.)
    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = worldX0 + lx
        const wz = worldZ0 + lz
        const biome   = this.getBiome(wx, wz)
        const surface = this.getSurfaceY(wx, wz)
        this._placeDeco(chunk, lx, lz, wx, wz, biome, surface)
      }
    }

    // Third pass: jungle waterfall columns pre-baked as static waterFlow.
    // We fill the open-air column beside the cliff face instead of placing
    // a source block — same visual, but WaterSystem never sees it and it
    // cannot overflow or flood the jungle floor.
    const CARDINALS = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = worldX0 + lx
        const wz = worldZ0 + lz
        if (this.getBiome(wx, wz) !== BIOME.JUNGLE) continue
        const surface = this.getSurfaceY(wx, wz)
        if (surface <= SEA_LEVEL + 10) continue

        for (const [dx, dz] of CARDINALS) {
          const nlx = lx + dx, nlz = lz + dz
          if (nlx < 0 || nlx >= CHUNK_W || nlz < 0 || nlz >= CHUNK_W) continue
          const nSurface = this.getSurfaceY(worldX0 + nlx, worldZ0 + nlz)
          if (surface - nSurface <= 5) continue

          // Lip block on the high side (where water appears to spill over)
          if (chunk.getBlock(lx, surface + 1, lz) === 0) {
            chunk.setBlock(lx, surface + 1, lz, B.waterFlow)
          }
          // Fill the open-air drop column in the low neighbour from its
          // ground level up to the cliff top — this IS the visible waterfall.
          for (let wy = nSurface + 1; wy <= surface; wy++) {
            if (chunk.getBlock(nlx, wy, nlz) === 0) {
              chunk.setBlock(nlx, wy, nlz, B.waterFlow)
            }
          }

          // Plunge pool at the waterfall base: 5×5 (corners clipped) static pool.
          // Water surface = nSurface (flush with the low side), clay floor 1 below.
          // Only covers columns that are at or below pool level so it never floods uphill.
          const poolWaterY = nSurface
          for (let poolX = -2; poolX <= 2; poolX++) {
            for (let poolZ = -2; poolZ <= 2; poolZ++) {
              if (Math.abs(poolX) === 2 && Math.abs(poolZ) === 2) continue  // clip corners
              const plx = nlx + poolX, plz = nlz + poolZ
              if (plx < 0 || plx >= CHUNK_W || plz < 0 || plz >= CHUNK_W) continue
              const ps = this.getSurfaceY(worldX0 + plx, worldZ0 + plz)
              if (ps > poolWaterY) continue  // higher terrain — don't flood
              chunk.setBlock(plx, ps - 1, plz, B.clay)        // carved floor
              for (let wy = ps; wy <= poolWaterY; wy++) {
                if (chunk.getBlock(plx, wy, plz) === 0) {
                  chunk.setBlock(plx, wy, plz, B.waterFlow)
                }
              }
            }
          }

          break  // one waterfall per column is enough
        }
      }
    }
  }

  // ── Column fill ────────────────────────────────────────────
  _fillColumn(chunk, lx, lz, wx, wz, biome, surface) {
    for (let y = 0; y < CHUNK_H; y++) {
      let id = 0

      if (y === 0) {
        id = B.obsidian   // bedrock
      } else if (y < surface - 4) {
        id = B.stone
      } else if (y < surface) {
        id = this._subsoil(biome, surface - y, surface)
      } else if (y === surface) {
        id = this._surfaceBlock(biome, y, wx, wz)
      }
      // y > surface → air (id stays 0)

      // Mushroom biome: glowstone veins 2–3 blocks below surface (8% probability)
      if (biome === BIOME.MUSHROOM && (y === surface - 2 || y === surface - 3)) {
        if (this._nDetail(wx * 0.15 + 777, wz * 0.15 + 777) > 0.84) id = B.glowstone
      }

      if (id) chunk.setBlock(lx, y, lz, id)
    }

    // MEADOW: shallow ponds in genuine depressions (static fill — not a source).
    // Water is placed AT surface level (not above it) by carving 1 block deeper for
    // the clay floor — so water sits flush with or below surrounding terrain.
    // At least 4 of 8 sampled neighbours must be strictly higher (real bowl, not flat plain).
    if (biome === BIOME.MEADOW && surface < SEA_LEVEL + 3) {
      const NOFFSETS = [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]]
      let higherCount = 0
      for (const [dx, dz] of NOFFSETS) {
        if (this.getSurfaceY(wx + dx, wz + dz) > surface) higherCount++
      }
      if (higherCount >= 4) {
        chunk.setBlock(lx, surface - 1, lz, B.clay)   // pond floor 1 block deeper
        chunk.setBlock(lx, surface,     lz, B.waterFlow)  // water flush with surface level
      }
    }

    // DESERT: oasis water pockets in the lowest dune valleys (static fill — not a source).
    // Same local-minimum logic: neighbours must be strictly higher (inter-dune hollow).
    if (biome === BIOME.DESERT && surface <= SEA_LEVEL + 2) {
      if (this._nHeight2(wx * 0.06 + this._ox, wz * 0.06 + this._oz) > 0.62) {
        const NOFFSETS = [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2],[2,2]]
        let higherCount = 0
        for (const [dx, dz] of NOFFSETS) {
          if (this.getSurfaceY(wx + dx, wz + dz) > surface) higherCount++
        }
        if (higherCount >= 4) {
          chunk.setBlock(lx, surface, lz, B.clay)
          chunk.setBlock(lx, surface + 1, lz, B.waterFlow)
        }
      }
    }

    // BLODMARK: blood pools in valleys — placed as source blocks so BloodWaterSystem can flow them
    if (biome === BIOME.BLODMARK && surface <= SEA_LEVEL + 3) {
      const poolN = this._nHeight2(wx * 0.08 + this._ox * 0.5, wz * 0.08 + this._oz * 0.5)
      if (poolN > 0.50) {
        chunk.setBlock(lx, surface, lz, B.dark_stone)
        chunk.setBlock(lx, surface + 1, lz, B.blood_water)
      }
    }

    // CHERRY: stream channels through low valleys (static fill — not a source).
    // Same sunken approach: clay floor 1 below, water AT surface level.
    // At least 2 cardinal neighbours must be strictly higher (column sits in a channel).
    if (biome === BIOME.CHERRY && surface <= SEA_LEVEL + 3) {
      if (this._nRidge(wx * 0.05, wz * 0.05) > 0.88) {
        let higherCount = 0
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if (this.getSurfaceY(wx + dx, wz + dz) > surface) higherCount++
        }
        if (higherCount >= 2) {
          chunk.setBlock(lx, surface - 1, lz, B.clay)
          chunk.setBlock(lx, surface,     lz, B.waterFlow)
        }
      }
    }

    // Clear dirty flag — mesher will re-set it when needed
    // (don't reset here; World calls markDirty after gen)
  }

  _subsoil(biome, depth, surface = 0) {
    switch (biome) {
      case BIOME.DESERT:      return depth < 5 ? B.sand : (depth % 3 === 0 ? B.terracotta : B.sandstone)
      case BIOME.SNOWY_PEAKS: return (depth < 2 && surface > SEA_LEVEL + 16) ? B.packed_ice : B.stone
      case BIOME.MUSHROOM:    return depth < 2 ? B.mycelium : depth < 5 ? B.dirt : B.stone
      case BIOME.CANDY:       return depth < 3 ? B.cloud_block : depth < 5 ? B.candy_mint : B.stone
      case BIOME.FOREST:      return depth < 3 ? B.magic_dirt : B.stone
      case BIOME.BLODMARK:     return depth < 3 ? B.dark_stone : B.stone
      default:                return depth < 4 ? B.dirt : B.stone
    }
  }

  _surfaceBlock(biome, y, wx = 0, wz = 0) {
    switch (biome) {
      case BIOME.MEADOW:      return B.grass
      case BIOME.FOREST:      return B.enchanted_moss
      case BIOME.AUTUMN:      return B.grass
      case BIOME.SNOWY_PEAKS: return y > SEA_LEVEL + 14 ? B.snow_block : B.stone
      case BIOME.DESERT:      return this._nDetail(wx * 0.07, wz * 0.07) > 0.4 ? B.gravel : B.sand
      case BIOME.JUNGLE:      return B.grass
      case BIOME.MUSHROOM:    return B.mycelium
      case BIOME.CANDY:       return B.candy_pink
      case BIOME.CHERRY:      return B.grass
      case BIOME.BLODMARK:     return this._nDetail(wx * 0.09 + 13, wz * 0.09 + 13) > 0.55
                                ? B.dark_stone : B.crimson_moss
      default:                return B.grass
    }
  }

  // ── Decoration placement ───────────────────────────────────
  _placeDeco(chunk, lx, lz, wx, wz, biome, surface) {
    const sy = surface + 1   // first air block above surface
    if (sy >= CHUNK_H - 5) return

    // Use noise for placement density — only place where noise > threshold
    const n = this._nDeco(wx * 0.15, wz * 0.15)

    switch (biome) {
      case BIOME.MEADOW: {
        // meadowN clusters wildflowers into dense patches, leaving plain grass between
        const meadowN = this._nHeight2(wx * 0.06 + this._ox * 0.7, wz * 0.06 + this._oz * 0.7)
        if      (n > 0.84) this._placeTree(chunk, lx, sy, lz, 'oak')
        else if (n > 0.75) this._placeBoulderCluster(chunk, lx, sy, lz)
        else if (n > 0.62 && meadowN > 0.1) this._safeSet(chunk, lx, sy, lz, B.wildflower_patch)
        else if (n > 0.54) this._placeFlower(chunk, lx, sy, lz)
        else if (n > 0.45) this._safeSet(chunk, lx, sy, lz, B.tall_grass)
        break
      }

      case BIOME.AUTUMN: {
        // pileN groups leaf drifts into clusters; open areas stay as plain grass
        const pileN = this._nHeight2(wx * 0.08 + this._ox * 0.5, wz * 0.08 + this._oz * 0.5)
        let placedTree = false
        if (n > 0.82) {
          this._placeTree(chunk, lx, sy, lz, 'oak_autumn')
          placedTree = true
        } else if (n > 0.72) {
          this._placeTree(chunk, lx, sy, lz, 'oak')
          placedTree = true
        }
        if (placedTree && Math.random() < 0.4) {
          this._placeFallenLog(chunk, lx, sy, lz)
        }
        if (!placedTree) {
          if (pileN > 0.25) {
            // Leaf drift zone — clusters of piles with breathing room
            if      (n > 0.55) this._placeLeafPileCluster(chunk, lx, sy, lz)
            else if (n > 0.38) this._safeSet(chunk, lx, sy, lz, B.leaf_pile)
          } else {
            // Open ground — rare pumpkins and scattered flowers
            if      (n > 0.70) this._safeSet(chunk, lx, sy, lz, B.pumpkin)
            else if (n > 0.50) this._placeFlower(chunk, lx, sy, lz, 'pink')
          }
        }
        break
      }

      case BIOME.FOREST: {
        // groveN splits the biome into dense fairy groves and open enchanted glades
        const groveN = this._nHeight2(wx * 0.05 + this._ox * 0.6, wz * 0.05 + this._oz * 0.6)
        if (groveN > 0) {
          // Dense grove — trees, crystals, flowers. Below 0.38 = bare enchanted moss floor
          if      (n > 0.86) this._placeMegaFairyTree(chunk, lx, sy, lz)
          else if (n > 0.72) this._placeWillowTree(chunk, lx, sy, lz)
          else if (n > 0.60) this._placeTree(chunk, lx, sy, lz, 'birch')
          else if (n > 0.50) this._placeFairyCrystalCluster(chunk, lx, sy, lz)
          else if (n > 0.38) this._safeSet(chunk, lx, sy, lz, B.fairy_flower)
        } else {
          // Open glade — wisp lights and fairy rings over bare enchanted moss
          if      (n > 0.80) this._placeFairyRingWoodland(chunk, lx, sy, lz)
          else if (n > 0.55) this._placeWispLight(chunk, lx, sy, lz)
          else if (n > 0.42) this._safeSet(chunk, lx, sy, lz, B.fairy_flower)
        }
        break
      }

      case BIOME.SNOWY_PEAKS: {
        const isAlpine = surface > SEA_LEVEL + 18
        if (isAlpine) {
          // High alpine zone: no trees, only ice formations and powder drifts
          if      (n > 0.78) this._placeIceSpike(chunk, lx, sy, lz, n)
          else if (n > 0.55) this._safeSet(chunk, lx, sy, lz, B.powder_snow)
          else if (n > 0.40) this._safeSet(chunk, lx, sy, lz, B.packed_ice)
        } else {
          // Subalpine zone: sparse pines + powder snow drifts
          if (n > 0.80) {
            this._placeTree(chunk, lx, sy, lz, 'pine')
          } else if (n > 0.65) {
            // Small powder snow drift cluster (2–3 blocks).
            // Use _safeSetGrounded so offset blocks don't float on slopes.
            const clumpSize = n > 0.73 ? 3 : 2
            for (let i = 0; i < clumpSize; i++) {
              const dx = Math.floor((n * 17.3 + i * 7) % 3) - 1
              const dz = Math.floor((n * 13.7 + i * 5) % 3) - 1
              this._safeSetGrounded(chunk, lx + dx, sy, lz + dz, B.powder_snow)
            }
          }
        }
        break
      }

      case BIOME.DESERT: {
        // Oasis rim: tall grass around low-lying water pockets (water placed in _fillColumn)
        const oasisN = this._nHeight2(wx * 0.06 + this._ox, wz * 0.06 + this._oz)
        if (surface <= SEA_LEVEL + 3 && oasisN > 0.45 && oasisN < 0.62) {
          if (n > 0.45) this._safeSet(chunk, lx, sy, lz, B.tall_grass)
          break
        }
        if      (n > 0.92) this._placeSandstonePillar(chunk, lx, sy, lz, n)
        else if (n > 0.84) this._placeDesertRuin(chunk, lx, sy, lz)
        else if (n > 0.76) this._placeCactus(chunk, lx, sy, lz)
        else if (n > 0.60) this._safeSet(chunk, lx, sy, lz, B.dead_bush)
        break
      }

      case BIOME.JUNGLE: {
        if      (n > 0.65) this._placeJungleMegaTree(chunk, lx, sy, lz)
        else if (n > 0.52) this._placeTree(chunk, lx, sy, lz, 'jungle')
        else if (n > 0.40) {
          // Bamboo only in cluster zones — dense groves, not uniform scatter
          const bambooN = this._nRidge(wx * 0.1 + this._ox * 0.3, wz * 0.1 + this._oz * 0.3)
          if (bambooN > 0.1) {
            const bambooH = 2 + Math.floor(((n * 31.7) % 1) * 5)   // 2–6 blocks tall
            for (let dy = 0; dy < bambooH; dy++) this._safeSet(chunk, lx, sy + dy, lz, B.bamboo)
          } else {
            this._safeSet(chunk, lx, sy, lz, B.fern)   // non-bamboo zones get ground ferns
          }
        }
        else if (n > 0.30) this._safeSet(chunk, lx, sy, lz, B.tropical_flower)
        else if (n > 0.20) this._safeSet(chunk, lx, sy, lz, B.fern)
        break
      }

      case BIOME.MUSHROOM: {
        // clusterN separates dense groves from bare eerie mycelium flats
        const clusterN = this._nHeight2(wx * 0.04 + this._ox * 1.5, wz * 0.04 + this._oz * 1.5)
        if (clusterN > 0.15) {
          // Dense mushroom grove
          if      (n > 0.88) this._placeMushroomTree(chunk, lx, sy, lz)
          else if (n > 0.75) this._placeFairyRing(chunk, lx, sy, lz)
          else if (n > 0.60) chunk.setBlock(lx, sy, lz, B.glowing_mushroom)
          else if (n > 0.48) chunk.setBlock(lx, sy, lz, B.mushroom_red)
          // below 0.48 → bare mycelium
        } else {
          // Open mycelium flat — eerie emptiness with rare landmarks
          if      (n > 0.88) this._placeMushroomTree(chunk, lx, sy, lz)
          else if (n > 0.72) chunk.setBlock(lx, sy, lz, B.mushroom_brown)
          // below 0.72 → bare mycelium
        }
        break
      }

      case BIOME.CHERRY: {
        // groveN > 0.4 = cherry grove (tighter than before → wider clearings between)
        // isHilltop = elevated ground where stone lanterns mark the skyline
        const groveN     = this._nHeight2(wx * 0.06, wz * 0.06)
        const isHilltop  = surface > SEA_LEVEL + 4
        if (groveN > 0.4) {
          // Blooming grove — trees, petals, flowers
          if (n > 0.60) {
            this._placeTree(chunk, lx, sy, lz, 'cherry')
            // 60% chance: scatter 2–4 petal_carpet blocks within ±2 of trunk base
            if (Math.random() < 0.60) {
              const count = 2 + Math.floor(Math.random() * 3)
              for (let i = 0; i < count; i++) {
                const dx = Math.floor((n * 17.3 + i * 7.1) % 5) - 2
                const dz = Math.floor((n * 13.7 + i * 5.3) % 5) - 2
                this._safeSetGrounded(chunk, lx + dx, sy, lz + dz, B.petal_carpet)
              }
            }
          }
          else if (n > 0.40) this._safeSet(chunk, lx, sy, lz, B.petal_carpet)
          else if (n > 0.28) this._placeFlower(chunk, lx, sy, lz, 'pink')
        } else {
          // Quiet clearing — stone lanterns appear more densely on elevated hilltops
          const lanternT = isHilltop ? 0.55 : 0.72
          if      (n > lanternT) this._safeSet(chunk, lx, sy, lz, B.stone_lantern)
          else if (n > 0.40)     this._safeSet(chunk, lx, sy, lz, B.petal_carpet)
          else if (n > 0.20)     this._placeFlower(chunk, lx, sy, lz, 'pink')
        }
        break
      }

      case BIOME.BLODMARK: {
        // darkN divides the biome: dense groves vs. open blighted wastes
        const darkN = this._nHeight2(wx * 0.05 + this._ox * 0.8, wz * 0.05 + this._oz * 0.8)
        if (darkN > 0.1) {
          // Blood grove — trees, crystal clusters, hanging thorns
          if      (n > 0.82) this._placeBloodwoodTree(chunk, lx, sy, lz)
          else if (n > 0.68) this._placeBloodCrystalCluster(chunk, lx, sy, lz)
          else if (n > 0.52) this._safeSet(chunk, lx, sy, lz, B.dark_thorns)
          else if (n > 0.38) this._safeSet(chunk, lx, sy, lz, B.blood_crystal)
        } else {
          // Open blight — sparse thorns and lone crystals on barren dark stone
          if      (n > 0.78) this._placeBloodCrystalCluster(chunk, lx, sy, lz)
          else if (n > 0.58) this._safeSet(chunk, lx, sy, lz, B.blood_crystal)
          else if (n > 0.42) this._safeSet(chunk, lx, sy, lz, B.dark_thorns)
          // below 0.42 → bare crimson moss / dark stone
        }
        break
      }

      case BIOME.CANDY: {
        // zoneN splits candy into three themed districts so each feels distinct
        const zoneN = this._nHeight2(wx * 0.03 + this._ox * 0.4, wz * 0.03 + this._oz * 0.4)
        if (zoneN < -0.3) {
          // Cloud district — floating platforms and candy canes
          if      (n > 0.72) this._placeCloudPlatform(chunk, lx, sy, lz)
          else if (n > 0.52) this._placeCandyCane(chunk, lx, sy, lz)
          // else bare candy_pink floor
        } else if (zoneN > 0.3) {
          // Crystal field — crystals and glowstone accents
          if (n > 0.62) {
            const crystalId = this._nDetail(wx * 0.3, wz * 0.3) > 0 ? B.crystal_blue : B.crystal_purple
            this._safeSet(chunk, lx, sy, lz, crystalId)
          } else if (n > 0.45) {
            chunk.setBlock(lx, sy, lz, B.glowstone)
          }
          // else bare candy_pink floor
        } else {
          // Lollipop forest — the candy heartland
          if      (n > 0.88) this._placeLollipopTree(chunk, lx, sy, lz)
          else if (n > 0.75) this._placeCandyCane(chunk, lx, sy, lz)
          else if (n > 0.58) this._placeCottonCandyBush(chunk, lx, sy, lz)
          // else bare candy_pink floor
        }
        break
      }
    }
  }

  // ── Tree types ─────────────────────────────────────────────
  _placeTree(chunk, lx, by, lz, type = 'oak') {
    let logId, leavesId, trunkH, crownR
    switch (type) {
      case 'oak':        logId = B.oak_log;    leavesId = B.oak_leaves;    trunkH = 4; crownR = 2; break
      case 'oak_autumn': logId = B.oak_log;    leavesId = B.autumn_leaves; trunkH = 4; crownR = 2; break
      case 'pine':       logId = B.pine_log;   leavesId = B.pine_leaves;   trunkH = 6; crownR = 1; break
      case 'birch':  logId = B.birch_log;  leavesId = B.birch_leaves;  trunkH = 5; crownR = 2; break
      case 'jungle': logId = B.jungle_log; leavesId = B.jungle_leaves; trunkH = 7; crownR = 3; break
      case 'cherry': logId = B.cherry_log; leavesId = B.cherry_leaves; trunkH = 4; crownR = 2; break
      default:       logId = B.oak_log;    leavesId = B.oak_leaves;    trunkH = 4; crownR = 2
    }

    // Trunk
    for (let dy = 0; dy < trunkH; dy++) {
      this._forceSet(chunk, lx, by + dy, lz, logId)
    }

    // Crown of leaves
    const ty = by + trunkH  // top of trunk / centre of leaves
    if (type === 'pine') {
      // Pointy pine shape — layers decreasing in radius going up
      for (let dy = -1; dy <= 3; dy++) {
        const r = 2 - Math.floor((dy + 1) * 0.6)
        if (r < 0) continue
        this._leafRing(chunk, lx, ty + dy, lz, r, leavesId)
      }
    } else {
      // Rounded canopy
      for (let dy = -1; dy <= 1; dy++) {
        this._leafRing(chunk, lx, ty + dy, lz, crownR, leavesId)
      }
      // Top cap
      this._leafRing(chunk, lx, ty + 2, lz, 1, leavesId)
    }
  }

  _leafRing(chunk, cx, cy, cz, r, leavesId) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r) continue  // clip corners
        this._safeSet(chunk, cx + dx, cy, cz + dz, leavesId)
      }
    }
  }

  _placeCactus(chunk, lx, by, lz) {
    const h = 2 + Math.floor(Math.random() * 2)
    for (let dy = 0; dy < h; dy++) this._forceSet(chunk, lx, by + dy, lz, B.cactus)
  }

  _placeMushroomTree(chunk, lx, by, lz) {
    const h = 4 + Math.floor(Math.random() * 3)
    for (let dy = 0; dy < h; dy++) this._forceSet(chunk, lx, by + dy, lz, B.mushroom_stem)
    // Cap
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue
        this._safeSet(chunk, lx + dx, by + h, lz + dz, B.giant_mushroom_top)
      }
    }
    // Glowing mushroom cluster at the base — bioluminescent undergrowth
    const baseRing = [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]]
    for (const [dx, dz] of baseRing) {
      if (Math.random() < 0.5) this._forceSet(chunk, lx + dx, by, lz + dz, B.glowing_mushroom)
    }
  }

  _placeFairyRing(chunk, lx, by, lz) {
    // Rasterized circle at radius 3 (16 positions), every other placed for visual gaps
    const ring = [
      [ 3, 0],[ 3, 1],[ 2, 2],[ 1, 3],[ 0, 3],[-1, 3],[-2, 2],[-3, 1],
      [-3, 0],[-3,-1],[-2,-2],[-1,-3],[ 0,-3],[ 1,-3],[ 2,-2],[ 3,-1],
    ]
    for (let i = 0; i < ring.length; i += 2) {
      const [dx, dz] = ring[i]
      this._safeSet(chunk, lx + dx, by, lz + dz, B.mushroom_red)
    }
    if (Math.random() < 0.5) this._safeSet(chunk, lx, by, lz, B.glowing_mushroom)
  }

  _placeFlower(chunk, lx, by, lz, color) {
    const options = color
      ? (color === 'pink' ? [B.flower_pink, B.flower_white] : [B.flower_red, B.flower_pink])
      : [B.flower_red, B.flower_yellow, B.flower_blue, B.flower_pink, B.flower_white, B.flower_purple]
    const pick = options[Math.floor(Math.random() * options.length)]
    this._safeSet(chunk, lx, by, lz, pick)
  }

  // B8 — Meadow helpers ────────────────────────────────────────

  /** Place 3–6 mossy_stone blocks in an irregular 3×3 footprint (some piled 1 high). */
  _placeBoulderCluster(chunk, lx, sy, lz) {
    const count = 3 + Math.floor(Math.random() * 4)
    const offsets = [
      [0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],
    ]
    // Shuffle deterministically with noise-seeded pseudo-random
    const shuffled = offsets.slice().sort(() => Math.random() - 0.5)
    for (let i = 0; i < count; i++) {
      const [dx, dz] = shuffled[i]
      const height = Math.random() < 0.35 ? sy + 1 : sy  // 35% chance of stacked block
      this._safeSet(chunk, lx + dx, height, lz + dz, B.mossy_stone)
    }
  }

  // B7 — Fairy Woodland helpers ─────────────────────────────────

  /**
   * Very tall fairy tree — single birch trunk 12–16 blocks, wide spherical crown (r 4–5),
   * glowstone heart in the crown centre, fairy lanterns dangling beneath the canopy.
   */
  _placeMegaFairyTree(chunk, lx, by, lz) {
    const trunkH = 12 + Math.floor(Math.random() * 5)   // 12–16
    const crownR = 4  + Math.floor(Math.random() * 2)   // 4–5

    // Tall birch trunk
    for (let dy = 0; dy < trunkH; dy++) {
      this._forceSet(chunk, lx, by + dy, lz, B.birch_log)
    }

    // Spherical crown of birch leaves
    const cy = by + trunkH
    for (let dx = -crownR; dx <= crownR; dx++) {
      for (let dy = -crownR; dy <= crownR; dy++) {
        for (let dz = -crownR; dz <= crownR; dz++) {
          if (dx * dx + dy * dy + dz * dz <= crownR * crownR + 2) {
            this._safeSet(chunk, lx + dx, cy + dy, lz + dz, B.birch_leaves)
          }
        }
      }
    }

    // Glowstone heart — magical glow source inside the crown
    this._safeSet(chunk, lx, cy, lz, B.glowstone)

    // Fairy lanterns hanging beneath the canopy rim
    const hangRing = [[-2,0],[2,0],[0,-2],[0,2],[-2,-1],[2,1],[-1,2],[1,-2]]
    for (const [dx, dz] of hangRing) {
      if (Math.random() < 0.55) {
        // Place lantern 1 block below the canopy equator
        this._safeSet(chunk, lx + dx, cy - 1, lz + dz, B.fairy_lantern)
      }
    }
  }

  /**
   * Weeping willow — willow_log trunk 8–11 blocks, rounded canopy (r 3),
   * drooping leaf curtains hang 2–4 blocks down from canopy edges.
   */
  _placeWillowTree(chunk, lx, by, lz) {
    const trunkH  = 8 + Math.floor(Math.random() * 4)   // 8–11
    const canopyR = 3

    // Trunk
    for (let dy = 0; dy < trunkH; dy++) {
      this._forceSet(chunk, lx, by + dy, lz, B.willow_log)
    }

    // Rounded canopy (slightly flattened — squash Y by ~0.7)
    const cy = by + trunkH
    for (let dx = -canopyR; dx <= canopyR; dx++) {
      for (let dz = -canopyR; dz <= canopyR; dz++) {
        for (let dy = -1; dy <= 2; dy++) {
          const dist2 = dx * dx + (dy / 0.7) * (dy / 0.7) * (dy < 0 ? 1 : 0.6) + dz * dz
          if (dist2 <= canopyR * canopyR + 1) {
            this._safeSet(chunk, lx + dx, cy + dy, lz + dz, B.willow_leaves)
          }
        }
      }
    }

    // Drooping curtains — outer ring of canopy trails leaf strands downward
    const dropOffsets = [
      [-3,0],[3,0],[0,-3],[0,3],
      [-2,-2],[2,-2],[-2,2],[2,2],
      [-3,-1],[3,1],[-1,-3],[1,3],
    ]
    for (const [dx, dz] of dropOffsets) {
      const dropLen = 2 + Math.floor(Math.random() * 3)   // 2–4 blocks
      for (let dy = 1; dy <= dropLen; dy++) {
        this._safeSet(chunk, lx + dx, cy - dy, lz + dz, B.willow_leaves)
      }
    }
  }

  /**
   * Crystal cluster — 2–5 crystals (blue / purple / green) of height 1–2,
   * packed in a ±1 radius scatter.
   */
  _placeFairyCrystalCluster(chunk, lx, by, lz) {
    const palette  = [B.crystal_blue, B.crystal_purple, B.crystal_green]
    const offsets  = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
    const count    = 2 + Math.floor(Math.random() * 4)   // 2–5 crystals
    for (let i = 0; i < count; i++) {
      const [dx, dz] = offsets[i % offsets.length]
      const h        = 1 + (Math.random() < 0.4 ? 1 : 0)
      const crystal  = palette[Math.floor(Math.random() * palette.length)]
      for (let dy = 0; dy < h; dy++) {
        this._safeSet(chunk, lx + dx, by + dy, lz + dz, crystal)
      }
    }
    // 30% chance: wisp light hovers above the cluster
    if (Math.random() < 0.3) {
      this._safeSet(chunk, lx, by + 2, lz, B.wisp_light)
    }
  }

  /**
   * Fairy ring — a circle of fairy_mushrooms at radius 2,
   * optional wisp_light at the centre.
   */
  _placeFairyRingWoodland(chunk, lx, by, lz) {
    const ring = [
      [2,0],[2,1],[1,2],[0,2],[-1,2],[-2,1],
      [-2,0],[-2,-1],[-1,-2],[0,-2],[1,-2],[2,-1],
    ]
    for (let i = 0; i < ring.length; i++) {
      if (i % 3 !== 1) {   // skip every third position — keeps it organic
        const [dx, dz] = ring[i]
        this._safeSetGrounded(chunk, lx + dx, by, lz + dz, B.fairy_mushroom)
      }
    }
    if (Math.random() < 0.65) {
      this._safeSet(chunk, lx, by, lz, B.wisp_light)
    }
  }

  /**
   * Wisp light — a glowing orb floating 1–3 blocks above the ground.
   */
  _placeWispLight(chunk, lx, by, lz) {
    const height = 1 + Math.floor(Math.random() * 3)   // 1–3 above surface
    this._safeSet(chunk, lx, by + height, lz, B.wisp_light)
  }

  // B2 — Desert helpers ────────────────────────────────────────

  /**
   * Tall sandstone column with a cracked_sandstone cap.
   * 20% chance to place a shorter companion pillar 2 blocks away.
   */
  _placeSandstonePillar(chunk, lx, sy, lz, n) {
    const height = Math.min(9, 3 + Math.floor((n - 0.92) * 60))
    for (let dy = 0; dy < height - 1; dy++) {
      this._forceSet(chunk, lx, sy + dy, lz, B.sandstone)
    }
    this._forceSet(chunk, lx, sy + height - 1, lz, B.cracked_sandstone)

    if (Math.random() < 0.2) {
      const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]]
      const [dx, dz] = dirs[Math.floor(Math.random() * 4)]
      const h2 = Math.max(2, height - 2)
      for (let dy = 0; dy < h2 - 1; dy++) {
        this._forceSet(chunk, lx + dx, sy + dy, lz + dz, B.sandstone)
      }
      this._forceSet(chunk, lx + dx, sy + h2 - 1, lz + dz, B.cracked_sandstone)
    }
  }

  /**
   * Half-buried terracotta wall remnant (3×1 or 1×3, height 1–3).
   * Starts one block below air (at surface level) to look embedded.
   * Scatters 1–2 sandstone rubble blocks nearby.
   */
  _placeDesertRuin(chunk, lx, sy, lz) {
    const wallH = 1 + Math.floor(Math.random() * 3)
    const isNS  = Math.random() < 0.5
    for (let i = 0; i < 3; i++) {
      const dlx = isNS ? 0 : i - 1
      const dlz = isNS ? i - 1 : 0
      const nlx = lx + dlx, nlz = lz + dlz
      if (nlx < 0 || nlx >= CHUNK_W || nlz < 0 || nlz >= CHUNK_W) continue
      for (let dy = 0; dy < wallH; dy++) {
        const y = sy - 1 + dy    // sy-1 = surface block → goes up into air
        if (y >= 0 && y < CHUNK_H) chunk.setBlock(nlx, y, nlz, B.terracotta)
      }
    }
    // Rubble: 1–2 sandstone blocks scattered at surface level
    const rubble = 1 + Math.floor(Math.random() * 2)
    for (let r = 0; r < rubble; r++) {
      const rx = lx + Math.floor(Math.random() * 5) - 2
      const rz = lz + Math.floor(Math.random() * 5) - 2
      if (rx >= 0 && rx < CHUNK_W && rz >= 0 && rz < CHUNK_W && sy - 1 >= 0) {
        chunk.setBlock(rx, sy - 1, rz, B.sandstone)
      }
    }
  }

  // B1 — Autumn helpers ────────────────────────────────────────

  /** Scatter 1–3 leaf_pile blocks in a ±1 radius cluster. */
  _placeLeafPileCluster(chunk, lx, sy, lz) {
    const count = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const dx = Math.floor(Math.random() * 3) - 1
      const dz = Math.floor(Math.random() * 3) - 1
      this._safeSet(chunk, lx + dx, sy, lz + dz, B.leaf_pile)
    }
  }

  /** Place a 3-block fallen oak log in a random cardinal direction. */
  _placeFallenLog(chunk, lx, sy, lz) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    const [dx, dz] = dirs[Math.floor(Math.random() * 4)]
    for (let i = 0; i < 3; i++) {
      this._safeSet(chunk, lx + dx * i, sy, lz + dz * i, B.oak_log)
    }
  }

  // B3 — Snowy Peaks helpers ───────────────────────────────────

  /** Packed-ice pillar 3–7 tall, ice cap on top.  30% chance of companion spike. */
  _placeIceSpike(chunk, lx, sy, lz, n) {
    const h = 3 + Math.floor(((n * 17.3) % 1) * 5)
    for (let dy = 0; dy < h; dy++) this._forceSet(chunk, lx, sy + dy, lz, B.packed_ice)
    this._safeSet(chunk, lx, sy + h, lz, B.ice)

    if (((n * 31.7) % 1) > 0.7) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      const [dx, dz] = dirs[Math.floor(((n * 7.3) % 1) * 4)]
      const clx = lx + dx, clz = lz + dz
      if (clx >= 0 && clx < CHUNK_W && clz >= 0 && clz < CHUNK_W) {
        // Scan down from sy+h to find the companion column's actual surface.
        // This prevents the companion spike from floating on slopes.
        let companionBase = sy
        const scanTop = Math.min(CHUNK_H - 1, sy + h)
        for (let scanY = scanTop; scanY >= 0; scanY--) {
          if (chunk.getBlock(clx, scanY, clz) !== 0) { companionBase = scanY + 1; break }
        }
        const h2 = Math.max(2, h - 2)
        for (let dy = 0; dy < h2; dy++) this._safeSet(chunk, clx, companionBase + dy, clz, B.packed_ice)
        this._safeSet(chunk, clx, companionBase + h2, clz, B.ice)
      }
    }
  }

  // B5 — Candy helpers ─────────────────────────────────────────

  /** Lollipop tree: frosted_log trunk + crystal sphere crown + glowstone tip. */
  _placeLollipopTree(chunk, lx, sy, lz) {
    for (let dy = 0; dy < 4; dy++) {
      this._forceSet(chunk, lx, sy + dy, lz, B.frosted_log)
    }
    const top    = sy + 4
    const headId = this._nDetail(lx * 0.5, lz * 0.5) > 0 ? B.crystal_green : B.crystal_blue
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          this._safeSet(chunk, lx + dx, top + dy, lz + dz, headId)
        }
      }
    }
    this._safeSet(chunk, lx, top + 2, lz, B.glowstone)
  }

  /** Candy-cane pole: alternating candy_red / cloud_block, 4–7 blocks tall. */
  _placeCandyCane(chunk, lx, sy, lz) {
    const h = 4 + Math.floor(Math.random() * 4)
    for (let dy = 0; dy < h; dy++) {
      this._forceSet(chunk, lx, sy + dy, lz, (dy % 2 === 0) ? B.candy_red : B.cloud_block)
    }
  }

  /** Floating cloud platform: 3×3 or 5×5 of cloud_block, 2–3 above surface. */
  _placeCloudPlatform(chunk, lx, sy, lz) {
    const rise = 2 + Math.floor(Math.random() * 2)
    const r    = Math.random() < 0.5 ? 1 : 2
    const py   = sy + rise
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        this._safeSet(chunk, lx + dx, py, lz + dz, B.cloud_block)
      }
    }
  }

  /** Cotton candy bush: 2-block candy_yellow trunk + 3×3×2 cloud_block top. */
  _placeCottonCandyBush(chunk, lx, sy, lz) {
    this._forceSet(chunk, lx, sy,     lz, B.candy_yellow)
    this._forceSet(chunk, lx, sy + 1, lz, B.candy_yellow)
    const top = sy + 2
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          this._safeSet(chunk, lx + dx, top + dy, lz + dz, B.cloud_block)
        }
      }
    }
  }

  // B6 — Jungle helpers ────────────────────────────────────────

  /**
   * 2×2 trunk mega-tree with a large spherical canopy and hanging vines.
   * Trunk height 9–13, crown radius 4–5.
   */
  _placeJungleMegaTree(chunk, lx, by, lz) {
    const trunkH = 9 + Math.floor(Math.random() * 5)   // 9–13
    const crownR = 4 + Math.floor(Math.random() * 2)   // 4–5

    // 2×2 trunk footprint
    for (let dy = 0; dy < trunkH; dy++) {
      for (let tx = 0; tx <= 1; tx++) {
        for (let tz = 0; tz <= 1; tz++) {
          this._forceSet(chunk, lx + tx, by + dy, lz + tz, B.jungle_log)
        }
      }
    }

    // Spherical crown centred one block inside the canopy top
    const cy = by + trunkH
    for (let dx = -crownR; dx <= crownR; dx++) {
      for (let dy = -crownR; dy <= crownR; dy++) {
        for (let dz = -crownR; dz <= crownR; dz++) {
          if (dx * dx + dy * dy + dz * dz <= crownR * crownR + 1) {
            this._safeSet(chunk, lx + dx, cy + dy, lz + dz, B.jungle_leaves)
          }
        }
      }
    }

    // Hanging vines on each of the 4 trunk sides at 3 heights
    const vineHeights = [trunkH - 2, trunkH - 4, trunkH - 6]
    const vineSides = [[-1, 0], [2, 0], [0, -1], [0, 2]]   // one cell outside 2×2 footprint
    for (const [dx, dz] of vineSides) {
      for (const vy of vineHeights) {
        const wy = by + vy
        if (wy >= 0 && wy < CHUNK_H) {
          this._safeSet(chunk, lx + dx, wy, lz + dz, B.vine)
        }
      }
    }
  }

  // B10 — Blodmark helpers ──────────────────────────────────────

  /**
   * Bloodwood tree — very tall dark trunk (8–13), wide drooping crimson canopy (r 3–4)
   * with hanging vine-like thorn curtains beneath the outer canopy rim.
   */
  _placeBloodwoodTree(chunk, lx, by, lz) {
    const trunkH  = 8 + Math.floor(Math.random() * 6)   // 8–13
    const crownR  = 3 + Math.floor(Math.random() * 2)   // 3–4

    // Trunk
    for (let dy = 0; dy < trunkH; dy++) {
      this._forceSet(chunk, lx, by + dy, lz, B.bloodwood_log)
    }

    // Spherical crown of bloodwood leaves (slightly squashed Y)
    const cy = by + trunkH
    for (let dx = -crownR; dx <= crownR; dx++) {
      for (let dz = -crownR; dz <= crownR; dz++) {
        for (let dy = -1; dy <= 2; dy++) {
          const dist2 = dx * dx + (dy * 1.4) * (dy * 1.4) + dz * dz
          if (dist2 <= crownR * crownR + 1) {
            this._safeSet(chunk, lx + dx, cy + dy, lz + dz, B.bloodwood_leaves)
          }
        }
      }
    }

    // Hanging dark-thorn curtains from canopy rim
    const hangOffsets = [
      [-crownR, 0], [crownR, 0], [0, -crownR], [0, crownR],
      [-crownR+1, -crownR+1], [crownR-1, crownR-1],
    ]
    for (const [dx, dz] of hangOffsets) {
      const dropLen = 2 + Math.floor(Math.random() * 3)
      for (let dy = 1; dy <= dropLen; dy++) {
        this._safeSet(chunk, lx + dx, cy - dy, lz + dz, B.bloodwood_leaves)
      }
    }

    // Blood crystal at the heart of the crown
    if (Math.random() < 0.55) {
      this._safeSet(chunk, lx, cy, lz, B.blood_crystal)
    }
  }

  /**
   * Blood crystal cluster — 3–6 crimson crystals of height 1–3 packed in ±1 radius,
   * with an optional larger central spire.
   */
  _placeBloodCrystalCluster(chunk, lx, by, lz) {
    const offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
    const count   = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const [dx, dz] = offsets[i % offsets.length]
      const h = 1 + Math.floor(Math.random() * 3)
      for (let dy = 0; dy < h; dy++) {
        this._safeSet(chunk, lx + dx, by + dy, lz + dz, B.blood_crystal)
      }
    }
  }

  /** Set block only if within chunk bounds and target is currently air. */
  _safeSet(chunk, lx, y, lz, id) {
    if (lx < 0 || lx >= CHUNK_W || lz < 0 || lz >= CHUNK_W) return
    if (y < 0 || y >= CHUNK_H) return
    if (chunk.getBlock(lx, y, lz) === 0) chunk.setBlock(lx, y, lz, id)
  }

  /** Like _safeSet but also overwrites surface decorations — used for tree trunks. */
  _forceSet(chunk, lx, y, lz, id) {
    if (lx < 0 || lx >= CHUNK_W || lz < 0 || lz >= CHUNK_W) return
    if (y < 0 || y >= CHUNK_H) return
    const existing = chunk.getBlock(lx, y, lz)
    if (existing === 0 || SURFACE_DECO.has(existing)) chunk.setBlock(lx, y, lz, id)
  }

  /** Like _safeSet but also requires a solid block directly below — prevents floating on slopes. */
  _safeSetGrounded(chunk, lx, y, lz, id) {
    if (lx < 0 || lx >= CHUNK_W || lz < 0 || lz >= CHUNK_W) return
    if (y < 1 || y >= CHUNK_H) return
    if (chunk.getBlock(lx, y, lz) !== 0) return
    if (chunk.getBlock(lx, y - 1, lz) === 0) return  // nothing below — skip
    chunk.setBlock(lx, y, lz, id)
  }
}
