// ─────────────────────────────────────────────────────────────
//  Klosseland — Global Constants
// ─────────────────────────────────────────────────────────────

// World geometry
export const BLOCK_SIZE    = 1          // metres per block
export const CHUNK_W       = 16         // blocks wide/deep per chunk
export const CHUNK_H       = 64         // blocks tall per chunk (build height)
export const SEA_LEVEL     = 12         // Y of base terrain surface
export const BUILD_LIMIT   = 63         // max Y players can build to

// Texture atlas
export const TEX_SIZE      = 16         // pixels per block face
export const ATLAS_COLS    = 16         // block faces per atlas row
export const ATLAS_ROWS    = 32         // rows in atlas  (512 faces total)

// Rendering
export const VIEW_DIST_CHUNKS = 8       // chunks rendered around player
export const FAR_PLANE        = 400     // three.js camera far clipping
export const FOG_NEAR         = 80
export const FOG_FAR          = 320

// World sizes (in chunks along each horizontal axis)
export const WORLD_SIZES = {
  small:    {  chunks: 16,       label: 'Small (256²)',   labelNo: 'Liten (256²)'   }, //  256×256 blocks
  medium:   {  chunks: 32,       label: 'Medium (512²)',  labelNo: 'Middels (512²)' }, //  512×512
  large:    {  chunks: 64,       label: 'Large (1024²)',  labelNo: 'Stor (1024²)'   }, // 1024×1024
  infinite: {  chunks: Infinity, label: 'Infinite',       labelNo: 'Uendelig'       }, // no bounds
}

// Day / Night cycle
export const DAY_DURATIONS_MIN = [5, 10, 20, 0] // options; 0 = always day
export const DEFAULT_DAY_DURATION_MIN = 20
export const TICKS_PER_SECOND  = 20

// Networking (LAN)
export const WS_PORT       = 3001
export const MAX_PLAYERS   = 4
export const SYNC_RATE_HZ  = 20        // position updates per second

// Player
export const PLAYER_HEIGHT   = 1.8
export const PLAYER_WIDTH    = 0.6
export const WALK_SPEED      = 5.0     // blocks / second
export const FLY_SPEED       = 10.0
export const JUMP_VELOCITY   = 8.0
export const GRAVITY         = -20.0
export const REACH_DISTANCE  = 10      // blocks (ray from camera; ~5 effective reach past player)

// Camera (third-person)
export const CAM_DISTANCE    = 5       // default orbit distance
export const CAM_MIN_DIST    = 2
export const CAM_MAX_DIST    = 12
export const CAM_MIN_POLAR   = -0.35  // radians (negative = camera below player, looking up)
export const CAM_MAX_POLAR   = 1.5

// Inventory
export const HOTBAR_SLOTS    = 9
export const TOOL_SLOTS      = 6   // 2-column × 3-row tool panel (left HUD)
export const PRODUCE_SLOTS   = 6   // produce quick-access row (above hotbar)
export const UNDO_STACK_SIZE = 100

// Pets
export const MAX_ACTIVE_PETS = 3
export const PET_FOLLOW_DIST = 3      // follow player within this distance
export const PET_IDLE_DIST   = 6      // stay near player within this

// Biome IDs
export const BIOME = {
  MEADOW:       0,
  FOREST:       1,
  SNOWY_PEAKS:  2,
  DESERT:       3,
  JUNGLE:       4,
  MUSHROOM:     5,
  CANDY:        6,
  AUTUMN:       7,
  CHERRY:       8,
  BLODMARK:     9,
}

// Languages
export const LANGUAGES = {
  en: 'English',
  no: 'Norsk',
}

// Block face indices (used in mesh building)
export const FACE = {
  TOP:    0,
  BOTTOM: 1,
  NORTH:  2,
  SOUTH:  3,
  EAST:   4,
  WEST:   5,
}

// Sound groups
export const SOUND_GROUP = {
  GRASS:  'grass',
  DIRT:   'dirt',
  STONE:  'stone',
  WOOD:   'wood',
  SAND:   'sand',
  SNOW:   'snow',
  GLASS:  'glass',
  LEAVES: 'leaves',
  LIQUID: 'liquid',
  SOFT:   'soft',
}
