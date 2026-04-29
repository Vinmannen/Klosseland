// ─────────────────────────────────────────────────────────────
//  Klosseland — FarmSystem
//  Tracks planted crops, drives time-based growth tied to the
//  day/night cycle, and handles harvest.
//
//  Growth model:
//    Each in-game day, every planted crop accumulates 1.0
//    "dayFraction". When it reaches daysPerStage, the crop
//    advances to the next growth stage.
//
//  API:
//    init()                      — restore from WorldSave on load
//    onCropPlaced(bx, by, bz)    — register newly placed stage-1 crop
//    harvestCrop(bx, by, bz, def)— break + give food if mature
//    removeCrop(bx, by, bz)      — remove without giving food
//    water(bx, by, bz)           — instantly advance by 1 stage
//    update(dt, cycleSec, days)  — call every frame
// ─────────────────────────────────────────────────────────────
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'

export class FarmSystem {
  /**
   * @param {object} opts
   * @param {import('../world/World.js').World}         opts.world
   * @param {import('../world/WorldSave.js').WorldSave} opts.worldSave
   * @param {import('../player/Inventory.js').Inventory} opts.inventory
   * @param {import('./ParticleSystem.js').ParticleSystem} [opts.particleSystem]
   */
  constructor({ world, worldSave, inventory, particleSystem }) {
    this._world     = world
    this._save      = worldSave
    this._inventory = inventory
    this._particles = particleSystem

    // "bx,by,bz" → { dayFraction: float }
    this._crops = new Map()

    // Called on every stage advance: (bx, by, bz, newId) => void
    this._advanceCb = null
  }

  /** Register a callback fired after every stage advance. */
  onAdvanceStage(cb) { this._advanceCb = cb }

  // ── Lifecycle ────────────────────────────────────────────

  /** Restore tracked crops from the saved world. Call after save.load(). */
  init() {
    if (!this._save) return
    this._save.eachSavedBlock((bx, by, bz, id) => {
      const def = BLOCK_BY_ID.get(id)
      if (!def?.isCrop) return
      const meta = this._save.getMeta(bx, by, bz)
      this._crops.set(`${bx},${by},${bz}`, { dayFraction: meta?.dayFraction ?? 0 })
    })
  }

  // ── Events from main.js ──────────────────────────────────

  /** Called right after a stage-1 crop block is placed. */
  onCropPlaced(bx, by, bz) {
    const key = `${bx},${by},${bz}`
    this._crops.set(key, { dayFraction: 0 })
    this._save?.setMeta(bx, by, bz, { dayFraction: 0 })
  }

  /**
   * Called when the player breaks a crop block directly.
   * If mature (stage 3) gives the harvest food to inventory.
   * @returns {number|null} harvestId if food given, else null
   */
  harvestCrop(bx, by, bz, def) {
    this._crops.delete(`${bx},${by},${bz}`)
    this._save?.deleteMeta(bx, by, bz)
    if (def.cropStage === 3 && def.harvestId) return def.harvestId
    return null
  }

  /** Called when a crop is removed without harvesting (e.g. farmland broken). */
  removeCrop(bx, by, bz) {
    const key = `${bx},${by},${bz}`
    this._crops.delete(key)
    this._save?.deleteMeta(bx, by, bz)
  }

  /**
   * Water a crop: advance it by one stage immediately.
   * @returns {boolean} true if watering was applied
   */
  water(bx, by, bz) {
    const id  = this._world.getBlock(bx, by, bz)
    const def = BLOCK_BY_ID.get(id)
    if (!def?.isCrop) return false
    if (def.cropStage === 3) return false  // already mature

    this._advance(bx, by, bz, def)
    // Blue water-splash sparkle
    this._particles?.emitBlockBreak(bx + 0.5, by + 0.8, bz + 0.5, 0.2, 0.6, 1.0)
    return true
  }

  // ── Per-frame update ─────────────────────────────────────

  /**
   * @param {number} dt                Frame delta (seconds)
   * @param {number} cycleLengthSec    Full day-night cycle length in seconds (0 = always day)
   * @param {number} daysPerStage      In-game days required for one growth stage (1, 2, or 3)
   */
  update(dt, cycleLengthSec, daysPerStage) {
    if (!this._crops.size) return

    // When always-day is set, treat as a 4-minute "virtual" day
    const effectiveCycle = cycleLengthSec > 0 ? cycleLengthSec : 240
    const ratePerSec = 1.0 / (effectiveCycle * daysPerStage)

    for (const [key, data] of this._crops) {
      const parts = key.split(',')
      const bx = +parts[0], by = +parts[1], bz = +parts[2]

      const id  = this._world.getBlock(bx, by, bz)
      const def = BLOCK_BY_ID.get(id)
      if (!def?.isCrop || def.cropStage === 3) continue

      data.dayFraction += dt * ratePerSec
      if (data.dayFraction >= 1) {
        data.dayFraction = 0
        this._advance(bx, by, bz, def)
      }
    }
  }

  // ── Internal ─────────────────────────────────────────────

  _advance(bx, by, bz, def) {
    const newId = def.nextStageId
    this._world.setBlock(bx, by, bz, newId)

    const key = `${bx},${by},${bz}`
    const existing = this._crops.get(key)
    if (existing) existing.dayFraction = 0
    else this._crops.set(key, { dayFraction: 0 })

    // Persist the stage advance
    this._save?.recordDelta(bx, by, bz, newId)
    this._save?.setMeta(bx, by, bz, { dayFraction: 0 })

    // Green grow sparkle
    this._particles?.emitBlockBreak(bx + 0.5, by + 0.9, bz + 0.5, 0.2, 0.8, 0.25)

    // Notify main.js (lighting, network)
    this._advanceCb?.(bx, by, bz, newId)
  }
}
