// ─────────────────────────────────────────────────────────────
//  Klosseland — AnimalSystem
//  Manages spawning, despawning, and per-frame update of all
//  active animals.  One instance per game session.
// ─────────────────────────────────────────────────────────────
import { Animal, ANIMAL_DEFS } from '../entities/Animal.js'
import { CHUNK_W } from '../data/constants.js'
import { worldToChunk, worldToBlock } from '../utils/math.js'

const MAX_ANIMALS       = 20
const SPAWN_RADIUS_MIN  = 10
const SPAWN_RADIUS_MAX  = 25
const DESPAWN_DIST_SQ   = 50 * 50
const SPAWN_INTERVAL    = 3.0   // seconds between spawn attempts

export class AnimalSystem {
  /** @param {import('three').Scene} scene */
  constructor(scene) {
    this.scene   = scene
    this.animals = []
    this._spawnTimer = SPAWN_INTERVAL
  }

  /**
   * Call every frame from the game loop.
   * @param {number} dt
   * @param {import('../player/Player.js').Player} player
   * @param {import('../world/World.js').World} world
   * @param {boolean} [isNight=false]  When true, animals sleep (idle only)
   */
  update(dt, player, world, isNight = false) {
    // Spawn
    this._spawnTimer -= dt
    if (this._spawnTimer <= 0) {
      this._spawnTimer = SPAWN_INTERVAL
      this._trySpawn(player, world)
    }

    // Update all animals — pass player speed, peer list, and night flag
    const playerSpeedSq = player.vx * player.vx + player.vz * player.vz
    for (const a of this.animals) {
      a.update(dt, player.x, player.z, world, playerSpeedSq, this.animals, isNight)
    }

    // Despawn those that wandered too far
    this._despawnFar(player)
  }

  // ── Spawn ──────────────────────────────────────────────────
  _trySpawn(player, world) {
    if (this.animals.length >= MAX_ANIMALS) return

    // Pick a random position in a ring around the player
    const angle = Math.random() * Math.PI * 2
    const dist  = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN)
    const wx    = player.x + Math.cos(angle) * dist
    const wz    = player.z + Math.sin(angle) * dist

    // Only spawn in already-loaded chunks (avoids pops from unseen areas)
    const cx = worldToChunk(worldToBlock(wx), CHUNK_W)
    const cz = worldToChunk(worldToBlock(wz), CHUNK_W)
    if (!world.getChunk(cx, cz)) return

    const biome = world.getBiomeAt(wx, wz)
    const candidates = ANIMAL_DEFS.filter(d => d.biomes.includes(biome))
    if (candidates.length === 0) return

    const def = candidates[Math.floor(Math.random() * candidates.length)]
    const sy  = world.getSurfaceY(wx, wz)
    if (sy <= 0) return   // empty / below-ground column

    const animal = new Animal(def, wx, sy + 1 + def.groundOffset, wz)
    animal.createMesh()
    this.scene.add(animal.mesh)
    this.animals.push(animal)
  }

  // ── Despawn ────────────────────────────────────────────────
  _despawnFar(player) {
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a  = this.animals[i]
      const dx = a.x - player.x
      const dz = a.z - player.z
      if (dx * dx + dz * dz > DESPAWN_DIST_SQ) {
        this.scene.remove(a.mesh)
        a.dispose()
        this.animals.splice(i, 1)
      }
    }
  }

  // ── Cleanup ────────────────────────────────────────────────
  dispose() {
    for (const a of this.animals) {
      if (a.mesh) this.scene.remove(a.mesh)
      a.dispose()
    }
    this.animals = []
  }
}
