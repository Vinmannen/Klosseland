// ─────────────────────────────────────────────────────────────
//  Klosseland — Block Definitions
//
//  Each block:
//    id          unique numeric ID (0 = air)
//    key         unique string key
//    nameEn      English display name
//    nameNo      Norwegian display name
//    category    inventory tab
//    tex         texture config (see TextureGenerator for style keys)
//    sound       SOUND_GROUP key
//    transparent block is see-through (no face-culling against it)
//    liquid      renders with liquid shader
//    luminance   0–15 glow level (0 = no glow)
//    solid       false means player passes through (flowers, etc.)
// ─────────────────────────────────────────────────────────────
import { SOUND_GROUP } from './constants.js'

const S = SOUND_GROUP

// Helper – single texture for all faces
function allFaces(style) { return { all: style } }
// Helper – different top / side / bottom
function topSideBottom(top, side, bottom) { return { top, side, bottom } }
// Helper – same on all sides but different top
function topAndSide(top, sides) { return { top, side: sides, bottom: sides } }

// ── Colour palette (hex) used by the texture generator ───────
export const PALETTE = {
  // Nature
  grassTop:     '#6CC952',
  grassSide:    '#5A9C3D',
  dirt:         '#A07048',
  dirtDark:     '#7A5030',
  stone:        '#9A9A9A',
  stoneDark:    '#787878',
  sand:         '#E8D495',
  sandDark:     '#C8B060',
  gravel:       '#8C8880',
  clay:         '#B89080',
  snow:         '#EEF2FF',
  snowDark:     '#C8D4EE',
  ice:          '#B0D0F0',
  iceDark:      '#80A8D8',
  water:        '#1a5282',   // deep natural water base
  waterLight:   '#52a8d0',   // surface ripple highlight

  // Wood — Oak
  oakBark:      '#8B6030',
  oakBarkDark:  '#6A4820',
  oakPlanks:    '#C8943A',
  oakPlanksDark:'#A87828',
  oakRings:     '#D4A858',

  // Wood — Pine
  pineBark:     '#5A3820',
  pineBarkDark: '#3C2410',
  pinePlanks:   '#8C6040',
  pinePlanksDark:'#6A4828',

  // Wood — Birch
  birchBark:    '#DCDCCC',
  birchBarkDark:'#A8A890',
  birchPlanks:  '#D4C890',
  birchPlanksDark:'#B0A870',

  // Wood — Jungle
  jungleBark:   '#4E7828',
  jungleBarkDk: '#385820',
  junglePlanks: '#8C7840',
  junglePlanks2:'#6C5C30',

  // Wood — Cherry
  cherryBark:   '#C06878',
  cherryBarkDk: '#904858',
  cherryPlanks: '#DCA0A8',
  cherryPlanks2:'#C07888',

  // Wood — Dark Oak
  darkBark:     '#2E1E0E',
  darkBarkLight:'#4A3020',
  darkPlanks:   '#40280E',
  darkPlanks2:  '#583A18',

  // Leaves
  leavesOak:    '#4A9030',
  leavesPine:   '#2A6820',
  leavesBirch:  '#70A840',
  leavesJungle: '#288020',
  leavesCherry: '#E880A0',
  leavesAutumn: '#D85818',

  // Stone & Brick
  cobble:       '#909090',
  cobbleDark:   '#686868',
  mossyCobble:  '#789060',
  bricks:       '#B86040',
  bricksDark:   '#904830',
  marble:       '#F0EEE8',
  marbleDark:   '#D0CECC',
  sandstone:    '#D8C880',
  sandstoneDk:  '#B8A860',
  basalt:       '#484848',
  basaltLight:  '#686868',
  obsidian:     '#201828',
  obsidianShine:'#402848',

  // Fantasy
  crystalB:     '#40C8FF',
  crystalBDark: '#0890C8',
  crystalP:     '#C840FF',
  crystalPDark: '#8800C8',
  crystalG:     '#40FFB0',
  crystalGDark: '#00C880',
  crystalR:     '#FF4060',
  crystalRDark: '#C80030',
  crystalY:     '#FFD040',
  crystalYDark: '#C89800',
  rainbowA:     '#FF5050',
  rainbowB:     '#50AAFF',
  starBlock:    '#FFE840',
  starDark:     '#C8A800',
  cloudBlock:   '#F0F8FF',
  cloudShadow:  '#C8D8F0',
  candyPink:    '#FF88C8',
  candyPink2:   '#FF50A0',
  candyYellow:  '#FFD848',
  candyYellow2: '#FFAA00',
  candyRed:     '#FF3050',
  candyRedDk:   '#CC1030',
  candyMint:    '#60F0B0',
  candyMintDk:  '#30C080',
  frostedLog:   '#F8F0F8',
  frostedLogPink:'#F0A0C8',

  // Furniture / misc
  bookshelf:    '#C89850',
  haybale:      '#D8B840',
  haybaleDk:    '#A88020',
  pumpkin:      '#E87820',
  pumpkinDk:    '#C05810',
  mushRed:      '#D03020',
  mushWhite:    '#F0F0F0',
  mushBrown:    '#887040',

  // Flowers
  flowerRed:    '#E83030',
  flowerYellow: '#F0D030',
  flowerBlue:   '#4080E8',
  flowerPink:   '#E870A8',
  flowerStem:   '#40A820',

  // Glowstone
  glowstone:    '#FFD870',
  glowstoneDk:  '#E0A840',

  // Stone variants
  stoneBrick:     '#8A8A8A',
  stoneBrickDk:   '#5E5E5E',
  quartzBlock:    '#F0EEEA',
  quartzBlockDk:  '#D0CCCA',

  // Metals
  copper:         '#CB8053',
  copperDk:       '#A05035',
  oxidized:       '#5A9D88',
  oxidizedDk:     '#3A7068',
  iron:           '#CECECE',
  ironDk:         '#9EA0A8',
  coal:           '#252525',
  coalShine:      '#404040',

  // Ocean / Gem
  prismarine:     '#4A9890',
  prismarineDk:   '#2A6860',
  amethyst:       '#9060C0',
  amethystDk:     '#60408A',
  amethystLight:  '#C098E8',

  // Misc
  honeycomb:      '#E8B830',
  honeycombDk:    '#B88010',

  // New furniture (Phase 18)
  chairCushion:   '#C89060',
  chairCushionDk: '#A07040',
  tableMetal:     '#B0B8B8',
  bedPillow:      '#F0ECE0',
  bedBlanket:     '#4880D0',
  bedBlanketDk:   '#2850A0',
  bedFrame:       '#C8943A',
  sofaFabric:     '#8A5038',
  sofaFabricDk:   '#5A3020',
  cabinetMetal:   '#888890',

  // Kitchen / Bathroom furniture
  stoveBody:    '#2E3238',
  stoveLight:   '#464C54',
  stoveGlow:    '#F04800',
  counterBase:  '#DDDAD2',
  counterEdge:  '#AEAAA2',
  tubSide:      '#F2EEE8',
  tubWater:     '#A0D8F4',
  toiletTop:    '#F4F0EC',
  fridgeTopBody:'#E8EAF0',

  // Food
  foodApple:    '#D83020',
  foodBread:    '#C88040',
  foodCarrot:   '#E87820',
  foodCookie:   '#C8A060',
  foodMushF:    '#E83020',
  foodMeat:     '#C04028',
  foodCooked:   '#8C4818',
  foodFish:     '#A0C8E0',
  foodFishC:    '#E8A040',

  // B7 — Fairy Woodland
  willowBark:     '#C0D0A8',
  willowBarkDk:   '#8AAA78',
  willowLeaves:   '#A0C870',
  willowLeavesDk: '#70A040',
  fairyMushCap:   '#20C0C8',
  fairyMushCapDk: '#108880',
  fairyMushStem:  '#E8F8F4',
  fairyLantern:   '#FFF4C0',
  fairyLanternDk: '#F0C840',
  enchMoss:       '#3A6828',
  enchMossLight:  '#60A040',
  enchMossGlow:   '#90E060',
  fairyFlower:    '#E050D8',
  fairyFlowerDk:  '#A020A0',
  fairyFlowerGlow:'#FFB8FF',
  wispLight:      '#A0EEFF',
  wispLightDk:    '#50C8F0',
  wispCore:       '#FFFFFF',

  // B8 — Meadow
  mossyStone:     '#7A8A60',
  mossyStoneHi:   '#909870',

  // B9 — Cherry
  petalBase:      '#F0D8E0',
  petalPink:      '#E8A8C0',
  petalWhite:     '#FFF0F4',
  petalGreen:     '#C8D8B0',
  stoneLantern:   '#484848',
  stoneLanternGlow: '#FFD870',

  // B10 — Blodmark (vampire)
  vBloodBase:     '#6B0000',
  vBloodLight:    '#9B2020',
  vCrimsonMoss:   '#4A0808',
  vCrimsonLight:  '#7A2020',
  vDarkStone:     '#1A0E18',
  vDarkCrack:     '#0A0810',
  vBloodBark:     '#1C0808',
  vBloodBarkLt:   '#3A1410',
  vBloodLeaves:   '#500018',
  vBloodCrystal:  '#CC0030',
  vBloodCrystDk:  '#880020',
  vThroneWood:    '#1A0808',
  vThroneBlood:   '#7A0000',
  vThroneGold:    '#7A5800',

  // Cooking stations
  chopBoardTop:   '#D4A574',
  chopBoardDk:    '#7A4F2A',
  chopBoardSide:  '#8B5E3C',
  bowlBody:       '#EDE8DF',
  bowlRim:        '#C8BEA8',
  bowlInner:      '#F5F2EA',
  bookCover:      '#8B4513',
  bookPage:       '#F8F4E8',
  bookText:       '#3C2010',

  // Utensils
  knifeBlade:     '#B8C4CC',
  knifeHandle:    '#6B3D2E',
  whiskWire:      '#C0C8D0',
  spatulaHead:    '#B0B8C0',
  potBody:        '#3C3C3C',
  potRim:         '#585858',
  panBody:        '#3C3C3C',
  panRim:         '#585858',

  // Raw ingredients
  ingEggShell:    '#F5F5F0',
  ingYolk:        '#F0C040',
  ingFlour:       '#F0EDE0',
  ingPotato:      '#C4A06A',
  ingTomato:      '#D03020',
  ingTomatoGrn:   '#3A8020',
  ingOnion:       '#9050B0',
  ingOnionWht:    '#F0E8F0',
  ingCheese:      '#E8C040',
  ingMilkBot:     '#F8F8F8',
  ingMilkCap:     '#D03020',

  // Cooked dishes
  dishPizzaSauce: '#C03020',
  dishCrust:      '#D4A060',
  dishCake:       '#8B4513',
  dishCakeCream:  '#F0EDE0',
  dishSoup:       '#C47818',
  dishOmelet:     '#E8C040',
  dishFries:      '#E8C840',
  dishPancake:    '#D4A060',
}

// ─────────────────────────────────────────────────────────────
//  Block list
// ─────────────────────────────────────────────────────────────
export const BLOCKS = [
  // ── AIR (id 0, never in inventory) ───────────────────────
  { id: 0, key: 'air',   nameEn: 'Air',    nameNo: 'Luft',   category: null,
    tex: null, sound: null, transparent: true, solid: false, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  NATURE
  // ══════════════════════════════════════════════════════════
  { id: 1, key: 'grass',
    nameEn: 'Grass',       nameNo: 'Gress',
    category: 'nature',
    tex: topSideBottom('grassTop', 'grassSide', 'dirt'),
    sound: S.GRASS, transparent: false, solid: true, luminance: 0 },

  { id: 2, key: 'dirt',
    nameEn: 'Dirt',        nameNo: 'Jord',
    category: 'nature',
    tex: allFaces('dirt'),
    sound: S.DIRT, transparent: false, solid: true, luminance: 0 },

  { id: 3, key: 'stone',
    nameEn: 'Stone',       nameNo: 'Stein',
    category: 'nature',
    tex: allFaces('stone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 4, key: 'sand',
    nameEn: 'Sand',        nameNo: 'Sand',
    category: 'nature',
    tex: allFaces('sand'),
    sound: S.SAND, transparent: false, solid: true, luminance: 0 },

  { id: 5, key: 'gravel',
    nameEn: 'Gravel',      nameNo: 'Grus',
    category: 'nature',
    tex: allFaces('gravel'),
    sound: S.SAND, transparent: false, solid: true, luminance: 0 },

  { id: 6, key: 'clay',
    nameEn: 'Clay',        nameNo: 'Leire',
    category: 'nature',
    tex: allFaces('clay'),
    sound: S.DIRT, transparent: false, solid: true, luminance: 0 },

  { id: 7, key: 'snow_block',
    nameEn: 'Snow',        nameNo: 'Snø',
    category: 'nature',
    tex: allFaces('snow'),
    sound: S.SNOW, transparent: false, solid: true, luminance: 0 },

  { id: 8, key: 'ice',
    nameEn: 'Ice',         nameNo: 'Is',
    category: 'nature',
    tex: allFaces('ice'),
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },

  { id: 9, key: 'packed_ice',
    nameEn: 'Packed Ice',  nameNo: 'Pakket is',
    category: 'nature',
    tex: allFaces('packedIce'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 10, key: 'water',
    nameEn: 'Water',       nameNo: 'Vann',
    category: 'special',
    tex: allFaces('water'),
    sound: S.LIQUID, transparent: true, liquid: true, solid: false, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  WOOD — OAK
  // ══════════════════════════════════════════════════════════
  { id: 11, key: 'oak_log',
    nameEn: 'Oak Log',     nameNo: 'Eiketresstamme',
    category: 'wood',
    tex: topAndSide('oakLogTop', 'oakLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 12, key: 'oak_planks',
    nameEn: 'Oak Planks',  nameNo: 'Eikebord',
    category: 'wood',
    tex: allFaces('oakPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ── PINE ─────────────────────────────────────────────────
  { id: 13, key: 'pine_log',
    nameEn: 'Pine Log',    nameNo: 'Furutresstamme',
    category: 'wood',
    tex: topAndSide('pineLogTop', 'pineLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 14, key: 'pine_planks',
    nameEn: 'Pine Planks', nameNo: 'Furubord',
    category: 'wood',
    tex: allFaces('pinePlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ── BIRCH ────────────────────────────────────────────────
  { id: 15, key: 'birch_log',
    nameEn: 'Birch Log',   nameNo: 'Bjørketresstamme',
    category: 'wood',
    tex: topAndSide('birchLogTop', 'birchLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 16, key: 'birch_planks',
    nameEn: 'Birch Planks',nameNo: 'Bjørkebord',
    category: 'wood',
    tex: allFaces('birchPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ── JUNGLE ───────────────────────────────────────────────
  { id: 17, key: 'jungle_log',
    nameEn: 'Jungle Log',  nameNo: 'Jungelstamme',
    category: 'wood',
    tex: topAndSide('jungleLogTop', 'jungleLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 18, key: 'jungle_planks',
    nameEn: 'Jungle Planks',nameNo: 'Jungelbord',
    category: 'wood',
    tex: allFaces('junglePlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ── CHERRY ───────────────────────────────────────────────
  { id: 19, key: 'cherry_log',
    nameEn: 'Cherry Log',  nameNo: 'Kirsebærstamme',
    category: 'wood',
    tex: topAndSide('cherryLogTop', 'cherryLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 20, key: 'cherry_planks',
    nameEn: 'Cherry Planks',nameNo: 'Kirsebærbord',
    category: 'wood',
    tex: allFaces('cherryPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ── DARK OAK ─────────────────────────────────────────────
  { id: 21, key: 'dark_oak_log',
    nameEn: 'Dark Oak Log',    nameNo: 'Mørk eiketresstamme',
    category: 'wood',
    tex: topAndSide('darkOakLogTop', 'darkOakLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 22, key: 'dark_oak_planks',
    nameEn: 'Dark Oak Planks', nameNo: 'Mørke eikebord',
    category: 'wood',
    tex: allFaces('darkOakPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  LEAVES & PLANTS
  // ══════════════════════════════════════════════════════════
  { id: 23, key: 'oak_leaves',
    nameEn: 'Oak Leaves',    nameNo: 'Eikeblader',
    category: 'plants',
    tex: allFaces('oakLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 24, key: 'pine_leaves',
    nameEn: 'Pine Needles',  nameNo: 'Furunåler',
    category: 'plants',
    tex: allFaces('pineLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 25, key: 'birch_leaves',
    nameEn: 'Birch Leaves',  nameNo: 'Bjørkeblader',
    category: 'plants',
    tex: allFaces('birchLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 26, key: 'jungle_leaves',
    nameEn: 'Jungle Leaves', nameNo: 'Jungelblader',
    category: 'plants',
    tex: allFaces('jungleLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 27, key: 'cherry_leaves',
    nameEn: 'Cherry Blossoms',nameNo: 'Kirsebærblomster',
    category: 'plants',
    tex: allFaces('cherryLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 28, key: 'autumn_leaves',
    nameEn: 'Autumn Leaves',  nameNo: 'Høstblader',
    category: 'plants',
    tex: allFaces('autumnLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 29, key: 'cactus',
    nameEn: 'Cactus',         nameNo: 'Kaktus',
    category: 'plants',
    tex: topSideBottom('cactusTop', 'cactusSide', 'cactusTop'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 0 },

  { id: 30, key: 'flower_red',
    nameEn: 'Red Flower',     nameNo: 'Rød blomst',
    category: 'plants',
    tex: allFaces('flowerRed'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 31, key: 'flower_yellow',
    nameEn: 'Yellow Flower',  nameNo: 'Gul blomst',
    category: 'plants',
    tex: allFaces('flowerYellow'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 32, key: 'flower_blue',
    nameEn: 'Blue Flower',    nameNo: 'Blå blomst',
    category: 'plants',
    tex: allFaces('flowerBlue'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 33, key: 'flower_pink',
    nameEn: 'Pink Flower',    nameNo: 'Rosa blomst',
    category: 'plants',
    tex: allFaces('flowerPink'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 34, key: 'flower_white',
    nameEn: 'White Flower',   nameNo: 'Hvit blomst',
    category: 'plants',
    tex: allFaces('flowerWhite'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 35, key: 'flower_purple',
    nameEn: 'Purple Flower',  nameNo: 'Lilla blomst',
    category: 'plants',
    tex: allFaces('flowerPurple'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 36, key: 'tall_grass',
    nameEn: 'Tall Grass',     nameNo: 'Høyt gress',
    category: 'plants',
    tex: allFaces('tallGrass'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 37, key: 'mushroom_red',
    nameEn: 'Red Mushroom',   nameNo: 'Rød sopp',
    category: 'plants',
    tex: allFaces('mushroomRed'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 38, key: 'mushroom_brown',
    nameEn: 'Brown Mushroom', nameNo: 'Brun sopp',
    category: 'plants',
    tex: allFaces('mushroomBrown'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 39, key: 'lily_pad',
    nameEn: 'Lily Pad',       nameNo: 'Lilje',
    category: 'plants',
    tex: allFaces('lilyPad'),
    sound: S.LEAVES, transparent: true, solid: false, luminance: 0 },

  { id: 40, key: 'vine',
    nameEn: 'Vine',           nameNo: 'Klatreplante',
    category: 'plants',
    tex: allFaces('vine'),
    sound: S.LEAVES, transparent: true, solid: false, luminance: 0 },

  { id: 41, key: 'fern',
    nameEn: 'Fern',           nameNo: 'Bregne',
    category: 'plants',
    tex: allFaces('fern'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 42, key: 'bamboo',
    nameEn: 'Bamboo',         nameNo: 'Bambus',
    category: 'plants',
    tex: topSideBottom('bambooTop', 'bambooSide', 'bambooTop'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 43, key: 'giant_mushroom_top',
    nameEn: 'Giant Mushroom Top',    nameNo: 'Kjempesopptopp',
    category: 'plants',
    tex: allFaces('giantMushroomTop'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 44, key: 'mushroom_stem',
    nameEn: 'Mushroom Stem',  nameNo: 'Soppstilk',
    category: 'plants',
    tex: allFaces('mushroomStem'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  // Flowing water — placed by WaterSystem, never in inventory
  { id: 45, key: 'waterFlow',
    nameEn: 'Flowing Water',  nameNo: 'Rennende vann',
    category: null,
    tex: allFaces('waterFlow'),
    sound: S.LIQUID, transparent: true, liquid: true, solid: false, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  COLOUR BLOCKS (16 × wool, concrete, stained glass,
  //  terracotta = generated programmatically below)
  // ══════════════════════════════════════════════════════════
  // IDs 50–113 are reserved for colour blocks (see generateColorBlocks)

  // ══════════════════════════════════════════════════════════
  //  STONE & BRICK  (start at 120)
  // ══════════════════════════════════════════════════════════
  { id: 120, key: 'cobblestone',
    nameEn: 'Cobblestone',    nameNo: 'Brostein',
    category: 'stone',
    tex: allFaces('cobblestone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 121, key: 'mossy_cobblestone',
    nameEn: 'Mossy Cobblestone',nameNo: 'Mosebevokst brostein',
    category: 'stone',
    tex: allFaces('mossyCobblestone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 122, key: 'bricks',
    nameEn: 'Bricks',         nameNo: 'Murstein',
    category: 'stone',
    tex: allFaces('bricks'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 123, key: 'mossy_bricks',
    nameEn: 'Mossy Bricks',   nameNo: 'Mosebevokst murstein',
    category: 'stone',
    tex: allFaces('mossyBricks'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 124, key: 'marble',
    nameEn: 'Marble',         nameNo: 'Marmor',
    category: 'stone',
    tex: allFaces('marble'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 125, key: 'sandstone',
    nameEn: 'Sandstone',      nameNo: 'Sandstein',
    category: 'stone',
    tex: topSideBottom('sandstoneTop','sandstoneSide','sandstoneBottom'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 126, key: 'basalt',
    nameEn: 'Basalt',         nameNo: 'Basalt',
    category: 'stone',
    tex: allFaces('basalt'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 127, key: 'obsidian',
    nameEn: 'Obsidian',       nameNo: 'Obsidian',
    category: 'stone',
    tex: allFaces('obsidian'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 128, key: 'polished_stone',
    nameEn: 'Polished Stone', nameNo: 'Polert stein',
    category: 'stone',
    tex: allFaces('polishedStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 129, key: 'cracked_stone',
    nameEn: 'Cracked Stone',  nameNo: 'Sprukket stein',
    category: 'stone',
    tex: allFaces('crackedStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 130, key: 'chiseled_stone',
    nameEn: 'Chiseled Stone', nameNo: 'Hugget stein',
    category: 'stone',
    tex: allFaces('chiseledStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 131, key: 'nether_brick',
    nameEn: 'Nether Brick',   nameNo: 'Mørkemurstein',
    category: 'stone',
    tex: allFaces('netherBrick'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 132, key: 'end_stone',
    nameEn: 'End Stone',      nameNo: 'Elfenbenstein',
    category: 'stone',
    tex: allFaces('endStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 133, key: 'stone_bricks',
    nameEn: 'Stone Bricks',   nameNo: 'Steinmur',
    category: 'stone',
    tex: allFaces('stoneBricks'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 134, key: 'cracked_stone_bricks',
    nameEn: 'Cracked Stone Bricks', nameNo: 'Sprukket steinmur',
    category: 'stone',
    tex: allFaces('crackedStoneBricks'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 135, key: 'mossy_stone_bricks',
    nameEn: 'Mossy Stone Bricks',   nameNo: 'Mosebevokst steinmur',
    category: 'stone',
    tex: allFaces('mossyStoneBricks'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 136, key: 'quartz_block',
    nameEn: 'Quartz Block',   nameNo: 'Kvartsblokkk',
    category: 'stone',
    tex: allFaces('quartzBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 137, key: 'smooth_stone',
    nameEn: 'Smooth Stone',   nameNo: 'Glatt stein',
    category: 'stone',
    tex: allFaces('smoothStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 138, key: 'copper_block',
    nameEn: 'Copper Block',   nameNo: 'Kobberblokk',
    category: 'minerals',
    tex: allFaces('copperBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 139, key: 'oxidized_copper',
    nameEn: 'Oxidized Copper',nameNo: 'Oksidert kobber',
    category: 'minerals',
    tex: allFaces('oxidizedCopper'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  FANTASY  (start at 140)
  // ══════════════════════════════════════════════════════════
  { id: 140, key: 'crystal_blue',
    nameEn: 'Blue Crystal',   nameNo: 'Blå krystall',
    category: 'fantasy',
    tex: allFaces('crystalBlue'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#40C8FF' },

  { id: 141, key: 'crystal_purple',
    nameEn: 'Purple Crystal', nameNo: 'Lilla krystall',
    category: 'fantasy',
    tex: allFaces('crystalPurple'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#C840FF' },

  { id: 142, key: 'crystal_green',
    nameEn: 'Green Crystal',  nameNo: 'Grønn krystall',
    category: 'fantasy',
    tex: allFaces('crystalGreen'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#40FFB0' },

  { id: 143, key: 'crystal_red',
    nameEn: 'Red Crystal',    nameNo: 'Rød krystall',
    category: 'fantasy',
    tex: allFaces('crystalRed'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#FF4060' },

  { id: 144, key: 'crystal_yellow',
    nameEn: 'Yellow Crystal', nameNo: 'Gul krystall',
    category: 'fantasy',
    tex: allFaces('crystalYellow'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#FFD040' },

  { id: 145, key: 'rainbow_block',
    nameEn: 'Rainbow Block',  nameNo: 'Regnbueblokk',
    category: 'fantasy',
    tex: allFaces('rainbowBlock'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 4, lightColor: '#FFB0FF' },

  { id: 146, key: 'star_block',
    nameEn: 'Star Block',     nameNo: 'Stjerneblokk',
    category: 'fantasy',
    tex: allFaces('starBlock'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 8, lightColor: '#FFE840' },

  { id: 147, key: 'cloud_block',
    nameEn: 'Cloud Block',    nameNo: 'Skyblokk',
    category: 'fantasy',
    tex: allFaces('cloudBlock'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 148, key: 'candy_pink',
    nameEn: 'Pink Candy Block',   nameNo: 'Rosa godteriblokk',
    category: 'fantasy',
    tex: allFaces('candyPink'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 149, key: 'candy_yellow',
    nameEn: 'Yellow Candy Block', nameNo: 'Gul godteriblokk',
    category: 'fantasy',
    tex: allFaces('candyYellow'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 150, key: 'magic_dirt',
    nameEn: 'Magic Dirt',     nameNo: 'Magisk jord',
    category: 'fantasy',
    tex: allFaces('magicDirt'),
    sound: S.DIRT, transparent: false, solid: true, luminance: 2, lightColor: '#C0A0FF' },

  { id: 151, key: 'glowstone',
    nameEn: 'Glowstone',      nameNo: 'Lysstein',
    category: 'fantasy',
    tex: allFaces('glowstone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 15, lightColor: '#FFD870' },

  // ══════════════════════════════════════════════════════════
  //  FURNITURE / MISC  (start at 160)
  // ══════════════════════════════════════════════════════════
  { id: 160, key: 'bookshelf',
    nameEn: 'Bookshelf',      nameNo: 'Bokhylle',
    category: 'furniture', sub: 'living',
    tex: topSideBottom('oakPlanks','bookshelf','oakPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 161, key: 'hay_bale',
    nameEn: 'Hay Bale',       nameNo: 'Høyballe',
    category: 'furniture', sub: 'garden',
    tex: topAndSide('hayBaleTop','hayBaleSide'),
    sound: S.GRASS, transparent: false, solid: true, luminance: 0 },

  { id: 162, key: 'barrel',
    nameEn: 'Barrel',         nameNo: 'Tønne',
    category: 'furniture', sub: 'storage',
    tex: topAndSide('barrelTop','barrelSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 163, key: 'lantern',
    nameEn: 'Lantern',        nameNo: 'Lykt',
    category: 'furniture', sub: 'garden',
    tex: allFaces('lantern'),
    sound: S.STONE, transparent: true, solid: false, luminance: 14, lightColor: '#FFC060' },

  { id: 164, key: 'campfire',
    nameEn: 'Campfire',       nameNo: 'Bål',
    category: 'furniture', sub: 'garden',
    tex: topSideBottom('campfireTop','campfireSide','oakPlanks'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 12, lightColor: '#FF8030',
    interactable: 'campfire' },

  { id: 165, key: 'pumpkin',
    nameEn: 'Pumpkin',        nameNo: 'Gresskar',
    category: 'seasonal',
    tex: topSideBottom('pumpkinTop','pumpkinSide','pumpkinTop'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 0 },

  { id: 166, key: 'jack_o_lantern',
    nameEn: 'Jack-o\'-Lantern',nameNo: 'Lysende gresskar',
    category: 'seasonal',
    tex: topSideBottom('pumpkinTop','jackOLantern','pumpkinTop'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 10, lightColor: '#FF9030' },

  { id: 167, key: 'melon',
    nameEn: 'Melon',          nameNo: 'Melon',
    category: 'furniture', sub: 'decor',
    tex: topSideBottom('melonTop','melonSide','melonTop'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 0 },

  { id: 168, key: 'sponge',
    nameEn: 'Sponge',         nameNo: 'Svamp',
    category: 'special',
    tex: allFaces('sponge'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 169, key: 'tnt_decorative',
    nameEn: 'Decorative TNT', nameNo: 'Dekorativ TNT',
    category: 'furniture', sub: 'decor',
    tex: topSideBottom('tntTop','tntSide','tntTop'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  SPECIAL / GLASS  (start at 175)
  // ══════════════════════════════════════════════════════════
  { id: 175, key: 'glass',
    nameEn: 'Glass',          nameNo: 'Glass',
    category: 'special',
    tex: allFaces('glass'),
    sound: S.GLASS, transparent: true, solid: true, luminance: 0 },

  { id: 176, key: 'lava_decorative',
    nameEn: 'Decorative Lava',nameNo: 'Dekorativ lava',
    category: 'special',
    tex: allFaces('lava'),
    sound: S.LIQUID, transparent: false, liquid: true, solid: false, luminance: 15, lightColor: '#FF6010' },

  { id: 177, key: 'diamond_block',
    nameEn: 'Diamond Block',  nameNo: 'Diamantblokk',
    category: 'minerals',
    tex: allFaces('diamondBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 4, lightColor: '#80E8FF' },

  { id: 178, key: 'gold_block',
    nameEn: 'Gold Block',     nameNo: 'Gullblokk',
    category: 'minerals',
    tex: allFaces('goldBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 2, lightColor: '#FFD060' },

  { id: 179, key: 'emerald_block',
    nameEn: 'Emerald Block',  nameNo: 'Smaragdblokk',
    category: 'minerals',
    tex: allFaces('emeraldBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 4, lightColor: '#40E880' },

  { id: 180, key: 'iron_block',
    nameEn: 'Iron Block',     nameNo: 'Jernblokk',
    category: 'minerals',
    tex: allFaces('ironBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 181, key: 'coal_block',
    nameEn: 'Coal Block',     nameNo: 'Kullblokk',
    category: 'minerals',
    tex: allFaces('coalBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 182, key: 'prismarine',
    nameEn: 'Prismarine',     nameNo: 'Prismarin',
    category: 'minerals',
    tex: allFaces('prismarine'),
    sound: S.STONE, transparent: false, solid: true, luminance: 2, lightColor: '#40D8D0' },

  { id: 183, key: 'amethyst_block',
    nameEn: 'Amethyst Block', nameNo: 'Ametystblokk',
    category: 'minerals',
    tex: allFaces('amethystBlock'),
    sound: S.STONE, transparent: false, solid: true, luminance: 4, lightColor: '#C098E8' },

  { id: 184, key: 'honeycomb_block',
    nameEn: 'Honeycomb Block',nameNo: 'Bikakeblokk',
    category: 'nature',
    tex: allFaces('honeycombBlock'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 2, lightColor: '#E8B830' },

  // ══════════════════════════════════════════════════════════
  //  SEASONAL  (start at 185)
  // ══════════════════════════════════════════════════════════
  { id: 185, key: 'christmas_gift',
    nameEn: 'Gift Box',       nameNo: 'Gaveeske',
    category: 'seasonal',
    tex: allFaces('giftBox'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 186, key: 'christmas_tree_block',
    nameEn: 'Christmas Ornament',nameNo: 'Julepynt',
    category: 'seasonal',
    tex: allFaces('christmasOrnament'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 4, lightColor: '#FF4040' },

  { id: 187, key: 'easter_egg_block',
    nameEn: 'Easter Egg',     nameNo: 'Påskeegg',
    category: 'seasonal',
    tex: allFaces('easterEgg'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 188, key: 'snowman_head',
    nameEn: 'Snowman Head',   nameNo: 'Snømannhode',
    category: 'seasonal',
    tex: allFaces('snowmanHead'),
    sound: S.SNOW, transparent: false, solid: true, luminance: 0 },

  // ── BIOME IDENTITY BLOCKS ────────────────────────────────────
  // B1 — Autumn
  { id: 189, key: 'leaf_pile',
    nameEn: 'Leaf Pile',      nameNo: 'Løvhaug',
    category: 'seasonal',
    tex: allFaces('leafPile'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 0 },

  // B2 — Desert
  { id: 190, key: 'dead_bush',
    nameEn: 'Dead Bush',      nameNo: 'Tørr busk',
    category: 'plants',
    tex: allFaces('deadBush'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 191, key: 'terracotta',
    nameEn: 'Terracotta',     nameNo: 'Terrakotta',
    category: 'stone',
    tex: topSideBottom('terracottaBiomeTop', 'terracottaBiomeSide', 'terracottaBiomeTop'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 192, key: 'cracked_sandstone',
    nameEn: 'Cracked Sandstone', nameNo: 'Sprukken sandstein',
    category: 'stone',
    tex: allFaces('crackedSandstone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  // ── B3: SNOWY PEAKS ──────────────────────────────────────────
  { id: 193, key: 'powder_snow',
    nameEn: 'Powder Snow',       nameNo: 'Løssnø',
    category: 'nature',
    tex: allFaces('powderSnow'),
    sound: S.SNOW, transparent: false, solid: true, luminance: 0 },

  // ── B4: MUSHROOM ─────────────────────────────────────────────
  { id: 194, key: 'mycelium',
    nameEn: 'Mycelium',          nameNo: 'Mycelium',
    category: 'nature',
    tex: topSideBottom('myceliumTop', 'myceliumSide', 'dirt'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 195, key: 'glowing_mushroom',
    nameEn: 'Glowing Mushroom',  nameNo: 'Lysende sopp',
    category: 'plants',
    tex: allFaces('glowingMushroom'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 10, lightColor: '#80FFB0' },

  // ── B5 — CANDY ───────────────────────────────────────────────
  { id: 196, key: 'candy_red',
    nameEn: 'Red Candy Block',   nameNo: 'Rød godteriblokk',
    category: 'fantasy',
    tex: allFaces('candyRed'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 197, key: 'candy_mint',
    nameEn: 'Mint Candy Block',  nameNo: 'Mintgrønn godteriblokk',
    category: 'fantasy',
    tex: allFaces('candyMint'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 198, key: 'frosted_log',
    nameEn: 'Frosted Log',       nameNo: 'Frostet stokk',
    category: 'fantasy',
    tex: topAndSide('frostedLogTop', 'frostedLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // ── JUNGLE (B6) ──────────────────────────────────────────────
  { id: 199, key: 'tropical_flower',
    nameEn: 'Tropical Flower',   nameNo: 'Tropisk blomst',
    category: 'plants',
    tex: allFaces('tropicalFlower'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  // ── FAIRY WOODLAND (B7) ──────────────────────────────────────
  { id: 200, key: 'willow_log',
    nameEn: 'Willow Log',        nameNo: 'Pilestokk',
    category: 'wood',
    tex: topAndSide('willowLogTop', 'willowLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 201, key: 'willow_leaves',
    nameEn: 'Willow Leaves',     nameNo: 'Pileblader',
    category: 'plants',
    tex: allFaces('willowLeaves'),
    sound: S.LEAVES, transparent: true, solid: false, luminance: 1, lightColor: '#A0C870' },

  { id: 202, key: 'fairy_mushroom',
    nameEn: 'Fairy Mushroom',    nameNo: 'Fesopp',
    category: 'plants',
    tex: allFaces('fairyMushroom'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 8, lightColor: '#20C0C8' },

  { id: 203, key: 'fairy_lantern',
    nameEn: 'Fairy Lantern',     nameNo: 'Felykt',
    category: 'fantasy',
    tex: allFaces('fairyLantern'),
    sound: S.GLASS, transparent: true, solid: false, luminance: 12, lightColor: '#FFF4A0' },

  { id: 204, key: 'enchanted_moss',
    nameEn: 'Enchanted Moss',    nameNo: 'Fortryllet mose',
    category: 'nature',
    tex: allFaces('enchantedMoss'),
    sound: S.GRASS, transparent: false, solid: true, luminance: 2, lightColor: '#90E060' },

  { id: 205, key: 'fairy_flower',
    nameEn: 'Fairy Flower',      nameNo: 'Feblomst',
    category: 'plants',
    tex: allFaces('fairyFlower'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 4, lightColor: '#FFB8FF' },

  { id: 206, key: 'wisp_light',
    nameEn: 'Wisp Light',        nameNo: 'Villedyr',
    category: 'fantasy',
    tex: allFaces('wispLight'),
    sound: S.GLASS, transparent: true, solid: false, luminance: 15, lightColor: '#C0E8FF' },

  // B8 — Meadow
  { id: 207, key: 'mossy_stone',
    nameEn: 'Mossy Stone',       nameNo: 'Mosestein',
    category: 'nature',
    tex: allFaces('mossyStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 208, key: 'wildflower_patch',
    nameEn: 'Wildflower Patch',  nameNo: 'Blomstereng',
    category: 'plants',
    tex: allFaces('wildflowerPatch'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  // B9 — Cherry
  { id: 209, key: 'petal_carpet',
    nameEn: 'Petal Carpet',      nameNo: 'Blomstertepper',
    category: 'plants',
    tex: allFaces('petalCarpet'),
    sound: S.GRASS, transparent: false, solid: true, luminance: 0 },

  { id: 210, key: 'stone_lantern',
    nameEn: 'Stone Lantern',     nameNo: 'Steinlykt',
    category: 'furniture', sub: 'garden',
    tex: allFaces('stoneLantern'),
    sound: S.STONE, transparent: false, solid: true, luminance: 6, lightColor: '#FFD060' },

  // ── Non-cube geometry blocks ──────────────────────────────
  { id: 211, key: 'fence',
    nameEn: 'Fence',             nameNo: 'Gjerde',
    category: 'furniture', sub: 'garden',
    tex: allFaces('fence'),
    shape: 'post',
    sound: S.WOOD, transparent: true, solid: true },

  { id: 212, key: 'trapdoor',
    nameEn: 'Trapdoor',          nameNo: 'Luke',
    category: 'wood',
    tex: topSideBottom('trapdoorTop', 'trapdoorSide', 'trapdoorTop'),
    shape: 'slab',
    sound: S.WOOD, transparent: true, solid: true },

  { id: 213, key: 'ladder',
    nameEn: 'Ladder',            nameNo: 'Stige',
    category: 'wood',
    tex: allFaces('ladder'),
    shape: 'ladder',
    sound: S.WOOD, transparent: true, solid: false },

  { id: 214, key: 'door',
    nameEn: 'Door',              nameNo: 'Dør',
    category: 'furniture', sub: 'garden',
    tex: topSideBottom('doorTop', 'doorSide', 'doorTop'),
    shape: 'panel',
    sound: S.WOOD, transparent: true, solid: false,
    multiBlock: { dx: 0, dy: 1, dz: 0, partId: 237 } },

  // ══════════════════════════════════════════════════════════
  //  FURNITURE — Phase 18  (custom shapes + directional facing)
  //  facing: 0=S (+Z front), 1=W (-X front), 2=N (-Z front), 3=E (+X front)
  //  dirGroup: [S, W, N, E] IDs — used by placement to pick the right variant
  // ══════════════════════════════════════════════════════════
  { id: 215, key: 'chair',
    nameEn: 'Chair',             nameNo: 'Stol',
    category: 'furniture', sub: 'living',
    tex: topSideBottom('chairTop', 'chairSide', 'chairBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'chair', facing: 0, dirGroup: [215, 221, 222, 223], interactable: 'sit' },

  { id: 216, key: 'table',
    nameEn: 'Table',             nameNo: 'Bord',
    category: 'furniture', sub: 'living',
    tex: topAndSide('tableTop', 'tableSide'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'table' },

  { id: 217, key: 'bed_block',
    nameEn: 'Bed',               nameNo: 'Seng',
    category: 'furniture', sub: 'bedroom',
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_furn', facing: 0, dirGroup: [217, 224, 225, 226],
    multiBlock: { dx: 0, dy: 0, dz: 1, partId: 233 }, interactable: 'bed' },

  { id: 218, key: 'chest_block',
    nameEn: 'Chest',             nameNo: 'Kiste',
    category: 'furniture', sub: 'storage',
    tex: topSideBottom('chestBlockTop', 'chestBlockSide', 'chestBlockBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'chest_furn', interactable: 'chest' },

  { id: 219, key: 'sofa',
    nameEn: 'Sofa',              nameNo: 'Sofa',
    category: 'furniture', sub: 'living',
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_l', facing: 0, dirGroup: [219, 227, 228, 229], interactable: 'sit',
    multiBlock: { dx: 1, dy: 0, dz: 0, partId: 275 } },

  { id: 220, key: 'cabinet',
    nameEn: 'Cabinet',           nameNo: 'Skap',
    category: 'furniture', sub: 'living',
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'cabinetFront', bottom: 'cabinetTop' },
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'cabinet_furn', facing: 0, dirGroup: [220, 230, 231, 232] },

  // ── Directional variants (hidden: never shown in inventory) ──

  // Chair W / N / E
  { id: 221, key: 'chair_w', nameEn: 'Chair', nameNo: 'Stol',
    category: 'furniture', hidden: true,
    tex: topSideBottom('chairTop', 'chairSide', 'chairBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'chair', facing: 1, interactable: 'sit' },
  { id: 222, key: 'chair_n', nameEn: 'Chair', nameNo: 'Stol',
    category: 'furniture', hidden: true,
    tex: topSideBottom('chairTop', 'chairSide', 'chairBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'chair', facing: 2, interactable: 'sit' },
  { id: 223, key: 'chair_e', nameEn: 'Chair', nameNo: 'Stol',
    category: 'furniture', hidden: true,
    tex: topSideBottom('chairTop', 'chairSide', 'chairBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'chair', facing: 3, interactable: 'sit' },

  // Bed W / N / E
  { id: 224, key: 'bed_block_w', nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_furn', facing: 1,
    multiBlock: { dx: -1, dy: 0, dz: 0, partId: 234 }, interactable: 'bed' },
  { id: 225, key: 'bed_block_n', nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_furn', facing: 2,
    multiBlock: { dx: 0, dy: 0, dz: -1, partId: 235 }, interactable: 'bed' },
  { id: 226, key: 'bed_block_e', nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_furn', facing: 3,
    multiBlock: { dx: 1, dy: 0, dz: 0, partId: 236 }, interactable: 'bed' },

  // Sofa W / N / E
  { id: 227, key: 'sofa_w', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_l', facing: 1, interactable: 'sit',
    multiBlock: { dx: 0, dy: 0, dz: 1, partId: 276 } },
  { id: 228, key: 'sofa_n', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_l', facing: 2, interactable: 'sit',
    multiBlock: { dx: -1, dy: 0, dz: 0, partId: 277 } },
  { id: 229, key: 'sofa_e', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_l', facing: 3, interactable: 'sit',
    multiBlock: { dx: 0, dy: 0, dz: -1, partId: 278 } },

  // Cabinet W / N / E
  { id: 230, key: 'cabinet_w', nameEn: 'Cabinet', nameNo: 'Skap',
    category: 'furniture', hidden: true,
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'cabinetFront', bottom: 'cabinetTop' },
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'cabinet_furn', facing: 1 },
  { id: 231, key: 'cabinet_n', nameEn: 'Cabinet', nameNo: 'Skap',
    category: 'furniture', hidden: true,
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'cabinetFront', bottom: 'cabinetTop' },
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'cabinet_furn', facing: 2 },
  { id: 232, key: 'cabinet_e', nameEn: 'Cabinet', nameNo: 'Skap',
    category: 'furniture', hidden: true,
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'cabinetFront', bottom: 'cabinetTop' },
    sound: S.WOOD, transparent: true, solid: true, luminance: 0,
    shape: 'cabinet_furn', facing: 3 },

  // ── Multi-block secondary blocks (hidden, placed automatically) ──

  // Bed foot — matching facing with head block
  { id: 233, key: 'bed_foot',
    nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_foot', facing: 0, isPart: true, partnerDelta: [0, 0, -1] },
  { id: 234, key: 'bed_foot_w',
    nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_foot', facing: 1, isPart: true, partnerDelta: [1, 0, 0] },
  { id: 235, key: 'bed_foot_n',
    nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_foot', facing: 2, isPart: true, partnerDelta: [0, 0, 1] },
  { id: 236, key: 'bed_foot_e',
    nameEn: 'Bed', nameNo: 'Seng',
    category: 'furniture', hidden: true,
    tex: topSideBottom('bedTop', 'bedSide', 'bedBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'bed_foot', facing: 3, isPart: true, partnerDelta: [-1, 0, 0] },

  // Door top — placed automatically above door
  { id: 237, key: 'door_top',
    nameEn: 'Door', nameNo: 'Dør',
    category: 'furniture', hidden: true,
    tex: topSideBottom('doorTop', 'doorSide', 'doorTop'),
    sound: S.WOOD, transparent: true, solid: false,
    shape: 'panel', isPart: true, partnerDelta: [0, -1, 0] },

  // ══════════════════════════════════════════════════════════
  //  B10 — BLODMARK (Vampire Biome)
  // ══════════════════════════════════════════════════════════

  { id: 238, key: 'blood_water',
    nameEn: 'Blood Water',       nameNo: 'Blodbad',
    category: 'special',
    tex: allFaces('bloodWater'),
    sound: S.LIQUID, transparent: true, liquid: true, solid: false, luminance: 0 },

  // Flowing blood — placed by BloodWaterSystem, never in inventory
  { id: 239, key: 'blood_water_flow',
    nameEn: 'Blood Water',       nameNo: 'Blodbad',
    category: null,
    tex: allFaces('bloodWaterFlow'),
    sound: S.LIQUID, transparent: true, liquid: true, solid: false, luminance: 0 },

  { id: 240, key: 'crimson_moss',
    nameEn: 'Crimson Moss',      nameNo: 'Karmosinmose',
    category: 'nature',
    tex: topSideBottom('crimsonMossTop', 'crimsonMossSide', 'vDarkStone'),
    sound: S.GRASS, transparent: false, solid: true, luminance: 0 },

  { id: 241, key: 'dark_stone',
    nameEn: 'Dark Stone',        nameNo: 'Mørk stein',
    category: 'stone',
    tex: allFaces('vDarkStone'),
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  { id: 242, key: 'bloodwood_log',
    nameEn: 'Bloodwood Log',     nameNo: 'Blodbark',
    category: 'wood',
    tex: topAndSide('bloodwoodLogTop', 'bloodwoodLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 243, key: 'bloodwood_leaves',
    nameEn: 'Bloodwood Leaves',  nameNo: 'Blodblader',
    category: 'plants',
    tex: allFaces('bloodwoodLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 244, key: 'dark_thorns',
    nameEn: 'Dark Thorns',       nameNo: 'Mørke torner',
    category: 'plants',
    tex: allFaces('darkThorns'),
    sound: S.LEAVES, transparent: true, solid: false, luminance: 0 },

  { id: 245, key: 'blood_crystal',
    nameEn: 'Blood Crystal',     nameNo: 'Blodkrystall',
    category: 'fantasy',
    tex: allFaces('bloodCrystal'),
    sound: S.GLASS, transparent: true, solid: false, luminance: 8, lightColor: '#CC0030' },

  // Vampire Throne — directional furniture (chair shape)
  { id: 246, key: 'vampire_throne',
    nameEn: 'Vampire Throne',    nameNo: 'Vampyrthron',
    category: 'furniture', sub: 'living',
    tex: topSideBottom('vampireThroneTop', 'vampireThroneSide', 'vampireThroneBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 4, lightColor: '#8B0000',
    shape: 'chair', facing: 0, dirGroup: [246, 247, 248, 249], interactable: 'sit' },

  { id: 247, key: 'vampire_throne_w', nameEn: 'Vampire Throne', nameNo: 'Vampyrthron',
    category: 'furniture', hidden: true,
    tex: topSideBottom('vampireThroneTop', 'vampireThroneSide', 'vampireThroneBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 4, lightColor: '#8B0000',
    shape: 'chair', facing: 1, interactable: 'sit' },

  { id: 248, key: 'vampire_throne_n', nameEn: 'Vampire Throne', nameNo: 'Vampyrthron',
    category: 'furniture', hidden: true,
    tex: topSideBottom('vampireThroneTop', 'vampireThroneSide', 'vampireThroneBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 4, lightColor: '#8B0000',
    shape: 'chair', facing: 2, interactable: 'sit' },

  { id: 249, key: 'vampire_throne_e', nameEn: 'Vampire Throne', nameNo: 'Vampyrthron',
    category: 'furniture', hidden: true,
    tex: topSideBottom('vampireThroneTop', 'vampireThroneSide', 'vampireThroneBottom'),
    sound: S.WOOD, transparent: true, solid: true, luminance: 4, lightColor: '#8B0000',
    shape: 'chair', facing: 3, interactable: 'sit' },

  // ══════════════════════════════════════════════════════════
  //  KITCHEN FURNITURE  (start at 250)
  // ══════════════════════════════════════════════════════════
  { id: 250, key: 'kitchen_counter',
    nameEn: 'Kitchen Counter', nameNo: 'Kjøkkenbenk',
    category: 'furniture', sub: 'kitchen',
    tex: topSideBottom('counterTop', 'counterSide', 'counterSide'),
    shape: 'slab',
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },

  { id: 251, key: 'stove',
    nameEn: 'Stove',           nameNo: 'Komfyr',
    category: 'furniture', sub: 'kitchen',
    tex: { top: 'stoveTop', side: 'stoveSide', front: 'stoveFront', bottom: 'stoveSide' },
    shape: 'cabinet_furn', facing: 0, dirGroup: [251, 252, 253, 254],
    sound: S.STONE, transparent: true, solid: true, luminance: 0, interactable: 'stove' },
  { id: 252, key: 'stove_w', nameEn: 'Stove', nameNo: 'Komfyr',
    category: 'furniture', hidden: true,
    tex: { top: 'stoveTop', side: 'stoveSide', front: 'stoveFront', bottom: 'stoveSide' },
    shape: 'cabinet_furn', facing: 1,
    sound: S.STONE, transparent: true, solid: true, luminance: 0, interactable: 'stove' },
  { id: 253, key: 'stove_n', nameEn: 'Stove', nameNo: 'Komfyr',
    category: 'furniture', hidden: true,
    tex: { top: 'stoveTop', side: 'stoveSide', front: 'stoveFront', bottom: 'stoveSide' },
    shape: 'cabinet_furn', facing: 2,
    sound: S.STONE, transparent: true, solid: true, luminance: 0, interactable: 'stove' },
  { id: 254, key: 'stove_e', nameEn: 'Stove', nameNo: 'Komfyr',
    category: 'furniture', hidden: true,
    tex: { top: 'stoveTop', side: 'stoveSide', front: 'stoveFront', bottom: 'stoveSide' },
    shape: 'cabinet_furn', facing: 3,
    sound: S.STONE, transparent: true, solid: true, luminance: 0, interactable: 'stove' },

  { id: 255, key: 'fridge',
    nameEn: 'Fridge',          nameNo: 'Kjøleskap',
    category: 'furniture', sub: 'kitchen',
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 0, dirGroup: [255, 256, 257, 258],
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 271 } },
  { id: 256, key: 'fridge_w', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 1,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 272 } },
  { id: 257, key: 'fridge_n', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 2,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 273 } },
  { id: 258, key: 'fridge_e', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 3,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 274 } },

  // ══════════════════════════════════════════════════════════
  //  BATHROOM FURNITURE  (start at 259)
  // ══════════════════════════════════════════════════════════
  { id: 259, key: 'toilet',
    nameEn: 'Toilet',          nameNo: 'Toalett',
    category: 'furniture', sub: 'bathroom',
    tex: topSideBottom('toiletTop', 'toiletSide', 'toiletSide'),
    shape: 'toilet', facing: 0, dirGroup: [259, 268, 269, 270],
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },

  { id: 260, key: 'bathtub',
    nameEn: 'Bathtub',         nameNo: 'Badekar',
    category: 'furniture', sub: 'bathroom',
    tex: { top: 'tubSide', bottom: 'tubSide', side: 'tubSide', front: 'tubWater' },
    shape: 'tub2', facing: 0, dirGroup: [260, 261, 262, 263],
    multiBlock: [{dx:1,dy:0,dz:0,partId:288},{dx:0,dy:0,dz:1,partId:289},{dx:1,dy:0,dz:1,partId:290}],
    interactable: 'bathtub',
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },
  { id: 261, key: 'bathtub_w', nameEn: 'Bathtub', nameNo: 'Badekar',
    category: 'furniture', hidden: true,
    tex: { top: 'tubSide', bottom: 'tubSide', side: 'tubSide', front: 'tubWater' },
    shape: 'tub2', facing: 1,
    multiBlock: [{dx:1,dy:0,dz:0,partId:288},{dx:0,dy:0,dz:1,partId:289},{dx:1,dy:0,dz:1,partId:290}],
    interactable: 'bathtub',
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },
  { id: 262, key: 'bathtub_n', nameEn: 'Bathtub', nameNo: 'Badekar',
    category: 'furniture', hidden: true,
    tex: { top: 'tubSide', bottom: 'tubSide', side: 'tubSide', front: 'tubWater' },
    shape: 'tub2', facing: 2,
    multiBlock: [{dx:1,dy:0,dz:0,partId:288},{dx:0,dy:0,dz:1,partId:289},{dx:1,dy:0,dz:1,partId:290}],
    interactable: 'bathtub',
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },
  { id: 263, key: 'bathtub_e', nameEn: 'Bathtub', nameNo: 'Badekar',
    category: 'furniture', hidden: true,
    tex: { top: 'tubSide', bottom: 'tubSide', side: 'tubSide', front: 'tubWater' },
    shape: 'tub2', facing: 3,
    multiBlock: [{dx:1,dy:0,dz:0,partId:288},{dx:0,dy:0,dz:1,partId:289},{dx:1,dy:0,dz:1,partId:290}],
    interactable: 'bathtub',
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },

  // ── Dresser (bedroom addition) ────────────────────────────
  { id: 264, key: 'dresser',
    nameEn: 'Dresser',         nameNo: 'Kommode',
    category: 'furniture', sub: 'bedroom',
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'dresserFront', bottom: 'cabinetTop' },
    shape: 'cabinet_furn', facing: 0, dirGroup: [264, 265, 266, 267],
    sound: S.WOOD, transparent: true, solid: true, luminance: 0 },
  { id: 265, key: 'dresser_w', nameEn: 'Dresser', nameNo: 'Kommode',
    category: 'furniture', hidden: true,
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'dresserFront', bottom: 'cabinetTop' },
    shape: 'cabinet_furn', facing: 1,
    sound: S.WOOD, transparent: true, solid: true, luminance: 0 },
  { id: 266, key: 'dresser_n', nameEn: 'Dresser', nameNo: 'Kommode',
    category: 'furniture', hidden: true,
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'dresserFront', bottom: 'cabinetTop' },
    shape: 'cabinet_furn', facing: 2,
    sound: S.WOOD, transparent: true, solid: true, luminance: 0 },
  { id: 267, key: 'dresser_e', nameEn: 'Dresser', nameNo: 'Kommode',
    category: 'furniture', hidden: true,
    tex: { top: 'cabinetTop', side: 'cabinetTop', front: 'dresserFront', bottom: 'cabinetTop' },
    shape: 'cabinet_furn', facing: 3,
    sound: S.WOOD, transparent: true, solid: true, luminance: 0 },

  // ── Toilet directional variants (hidden) ─────────────────
  { id: 268, key: 'toilet_w', nameEn: 'Toilet', nameNo: 'Toalett',
    category: 'furniture', hidden: true,
    tex: topSideBottom('toiletTop', 'toiletSide', 'toiletSide'),
    shape: 'toilet', facing: 1,
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },
  { id: 269, key: 'toilet_n', nameEn: 'Toilet', nameNo: 'Toalett',
    category: 'furniture', hidden: true,
    tex: topSideBottom('toiletTop', 'toiletSide', 'toiletSide'),
    shape: 'toilet', facing: 2,
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },
  { id: 270, key: 'toilet_e', nameEn: 'Toilet', nameNo: 'Toalett',
    category: 'furniture', hidden: true,
    tex: topSideBottom('toiletTop', 'toiletSide', 'toiletSide'),
    shape: 'toilet', facing: 3,
    sound: S.STONE, transparent: true, solid: true, luminance: 0 },

  // ── Fridge top (hidden, placed automatically above fridge) ─
  { id: 271, key: 'fridge_top', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 0,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },
  { id: 272, key: 'fridge_top_w', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 1,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },
  { id: 273, key: 'fridge_top_n', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 2,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },
  { id: 274, key: 'fridge_top_e', nameEn: 'Fridge', nameNo: 'Kjøleskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 3,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },

  // ── Sofa right companion (hidden, placed automatically) ───
  { id: 275, key: 'sofa_r', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_r', facing: 0, interactable: 'sit',
    isPart: true, partnerDelta: [-1, 0, 0] },
  { id: 276, key: 'sofa_r_w', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_r', facing: 1, interactable: 'sit',
    isPart: true, partnerDelta: [0, 0, -1] },
  { id: 277, key: 'sofa_r_n', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_r', facing: 2, interactable: 'sit',
    isPart: true, partnerDelta: [1, 0, 0] },
  { id: 278, key: 'sofa_r_e', nameEn: 'Sofa', nameNo: 'Sofa',
    category: 'furniture', hidden: true,
    tex: topSideBottom('sofaTop', 'sofaSide', 'sofaBottom'),
    sound: S.SOFT, transparent: true, solid: true, luminance: 0,
    shape: 'sofa_r', facing: 3, interactable: 'sit',
    isPart: true, partnerDelta: [0, 0, 1] },

  // ══════════════════════════════════════════════════════════
  //  FOOD ITEMS (IDs 279–287)
  //  cross shape = small sprite, placeable as decoration
  //  isFood: true — can be eaten by pressing R
  // ══════════════════════════════════════════════════════════
  { id: 279, key: 'food_apple',
    nameEn: 'Apple',           nameNo: 'Eple',
    category: 'food',
    tex: allFaces('foodApple'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 2 },
  { id: 280, key: 'food_bread',
    nameEn: 'Bread',           nameNo: 'Brød',
    category: 'food',
    tex: allFaces('foodBread'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },
  { id: 281, key: 'food_carrot',
    nameEn: 'Carrot',          nameNo: 'Gulrot',
    category: 'food',
    tex: allFaces('foodCarrot'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 2 },
  { id: 282, key: 'food_cookie',
    nameEn: 'Cookie',          nameNo: 'Kjeks',
    category: 'food',
    tex: allFaces('foodCookie'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 1 },
  { id: 283, key: 'food_mushroom',
    nameEn: 'Mushroom Soup',   nameNo: 'Soppesuppe',
    category: 'food',
    tex: allFaces('foodMushF'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },
  { id: 284, key: 'food_beef_raw',
    nameEn: 'Raw Beef',        nameNo: 'Rått kjøtt',
    category: 'food',
    tex: allFaces('foodMeat'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 0, rawFood: true, cookedId: 285 },
  { id: 285, key: 'food_beef_cooked',
    nameEn: 'Cooked Beef',     nameNo: 'Stekt kjøtt',
    category: 'food',
    tex: allFaces('foodCooked'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },
  { id: 286, key: 'food_fish_raw',
    nameEn: 'Raw Fish',        nameNo: 'Rå fisk',
    category: 'food',
    tex: allFaces('foodFish'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 0, rawFood: true, cookedId: 287 },
  { id: 287, key: 'food_fish_cooked',
    nameEn: 'Cooked Fish',     nameNo: 'Stekt fisk',
    category: 'food',
    tex: allFaces('foodFishC'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },

  // ── Bathtub companion blocks (invisible, solid) ───────────────
  { id: 288, key: 'tub_part_xn',
    nameEn: 'Bathtub Part', nameNo: 'Badekar Del',
    category: 'furniture', hidden: true,
    tex: allFaces('tubSide'), shape: 'invisible',
    isPart: true, partnerDelta: [-1, 0, 0],
    interactable: 'bathtub',
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },
  { id: 289, key: 'tub_part_zn',
    nameEn: 'Bathtub Part', nameNo: 'Badekar Del',
    category: 'furniture', hidden: true,
    tex: allFaces('tubSide'), shape: 'invisible',
    isPart: true, partnerDelta: [0, 0, -1],
    interactable: 'bathtub',
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },
  { id: 290, key: 'tub_part_xnzn',
    nameEn: 'Bathtub Part', nameNo: 'Badekar Del',
    category: 'furniture', hidden: true,
    tex: allFaces('tubSide'), shape: 'invisible',
    isPart: true, partnerDelta: [-1, 0, -1],
    interactable: 'bathtub',
    sound: S.STONE, transparent: false, solid: true, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  COOKING STATIONS (IDs 291–293)
  // ══════════════════════════════════════════════════════════
  { id: 291, key: 'chopping_board',
    nameEn: 'Chopping Board',  nameNo: 'Skjærebrett',
    category: 'furniture', sub: 'kitchen',
    tex: { top: 'chopBoardTop', side: 'chopBoardSide', bottom: 'chopBoardSide' },
    shape: 'slab',
    sound: S.WOOD, transparent: true, solid: true, luminance: 0, interactable: 'chopbench' },

  { id: 292, key: 'mixing_bowl',
    nameEn: 'Mixing Bowl',     nameNo: 'Miksebolle',
    category: 'furniture', sub: 'kitchen',
    tex: { top: 'bowlTop', side: 'bowlSide', bottom: 'bowlSide' },
    shape: 'bowl',
    sound: S.STONE, transparent: true, solid: true, luminance: 0, interactable: 'mixbowl' },

  { id: 293, key: 'recipe_book',
    nameEn: 'Recipe Book',     nameNo: 'Kokebok',
    category: 'furniture', sub: 'kitchen',
    tex: { top: 'bookTop', side: 'bookSide', bottom: 'bookSide' },
    shape: 'slab',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0, interactable: 'recipebook' },

  // ══════════════════════════════════════════════════════════
  //  KITCHEN UTENSILS (IDs 294–298)
  //  cross-sprite items — reusable, not consumed
  // ══════════════════════════════════════════════════════════
  { id: 294, key: 'tool_knife',
    nameEn: 'Knife',     nameNo: 'Kniv',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolKnife'), shape: 'cross',
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 295, key: 'tool_whisk',
    nameEn: 'Whisk',     nameNo: 'Visp',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolWhisk'), shape: 'cross',
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 296, key: 'tool_spatula',
    nameEn: 'Spatula',   nameNo: 'Stekespade',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolSpatula'), shape: 'cross',
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 297, key: 'tool_pot',
    nameEn: 'Pot',       nameNo: 'Gryte',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolPot'), shape: 'cross',
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 298, key: 'tool_pan',
    nameEn: 'Frying Pan', nameNo: 'Stekepanne',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolPan'), shape: 'cross',
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  // ══════════════════════════════════════════════════════════
  //  RAW INGREDIENTS (IDs 299–305)
  // ══════════════════════════════════════════════════════════
  { id: 299, key: 'food_egg',
    nameEn: 'Egg',       nameNo: 'Egg',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingEgg'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 300, key: 'food_flour',
    nameEn: 'Flour',     nameNo: 'Mel',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingFlour'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 301, key: 'food_potato',
    nameEn: 'Potato',    nameNo: 'Potet',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingPotato'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 302, key: 'food_tomato',
    nameEn: 'Tomato',    nameNo: 'Tomat',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingTomato'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 303, key: 'food_onion',
    nameEn: 'Onion',     nameNo: 'Løk',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingOnion'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 304, key: 'food_cheese',
    nameEn: 'Cheese',    nameNo: 'Ost',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingCheese'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 305, key: 'food_milk',
    nameEn: 'Milk',      nameNo: 'Melk',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingMilk'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  PREPPED VARIANTS (IDs 306–310) — hidden, only from stations
  // ══════════════════════════════════════════════════════════
  { id: 306, key: 'food_potato_chopped',
    nameEn: 'Chopped Potato', nameNo: 'Hakket potet',
    category: 'food', hidden: true,
    tex: allFaces('prepPotatoChopped'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 307, key: 'food_carrot_sliced',
    nameEn: 'Sliced Carrot',  nameNo: 'Skivet gulrot',
    category: 'food', hidden: true,
    tex: allFaces('prepCarrotSliced'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 308, key: 'food_onion_diced',
    nameEn: 'Diced Onion',    nameNo: 'Hakket løk',
    category: 'food', hidden: true,
    tex: allFaces('prepOnionDiced'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 309, key: 'food_cheese_shredded',
    nameEn: 'Shredded Cheese', nameNo: 'Revet ost',
    category: 'food', hidden: true,
    tex: allFaces('prepCheeseShredded'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 310, key: 'food_egg_cracked',
    nameEn: 'Cracked Egg',    nameNo: 'Knekt egg',
    category: 'food', hidden: true,
    tex: allFaces('prepEggCracked'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  // ══════════════════════════════════════════════════════════
  //  COOKED DISHES (IDs 311–316)
  // ══════════════════════════════════════════════════════════
  { id: 311, key: 'food_pizza',
    nameEn: 'Pizza',     nameNo: 'Pizza',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishPizza'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 5 },

  { id: 312, key: 'food_cake',
    nameEn: 'Cake',      nameNo: 'Kake',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishCake'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },

  { id: 313, key: 'food_soup',
    nameEn: 'Vegetable Soup', nameNo: 'Grønnsakssuppe',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishSoup'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },

  { id: 314, key: 'food_omelette',
    nameEn: 'Omelette',  nameNo: 'Omelett',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishOmelet'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },

  { id: 315, key: 'food_fries',
    nameEn: 'Fries',     nameNo: 'Pommes frites',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishFries'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },

  { id: 316, key: 'food_pancakes',
    nameEn: 'Pancakes',  nameNo: 'Pannekaker',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishPancakes'), shape: 'cross',
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },
]

// ─────────────────────────────────────────────────────────────
//  Generate the 64 colour blocks (16 colours × 4 types)
//  IDs 50–113
// ─────────────────────────────────────────────────────────────
export const COLORS_16 = [
  { key: 'white',      en: 'White',       no: 'Hvit',         hex: '#F0F0F0' },
  { key: 'orange',     en: 'Orange',      no: 'Oransje',      hex: '#F08020' },
  { key: 'magenta',    en: 'Magenta',     no: 'Magenta',      hex: '#D040C0' },
  { key: 'light_blue', en: 'Light Blue',  no: 'Lyseblå',      hex: '#60B0E8' },
  { key: 'yellow',     en: 'Yellow',      no: 'Gul',          hex: '#F0D020' },
  { key: 'lime',       en: 'Lime',        no: 'Limegrønn',    hex: '#70D820' },
  { key: 'pink',       en: 'Pink',        no: 'Rosa',         hex: '#F080A0' },
  { key: 'gray',       en: 'Gray',        no: 'Grå',          hex: '#606060' },
  { key: 'light_gray', en: 'Light Gray',  no: 'Lysegrå',      hex: '#A0A0A0' },
  { key: 'cyan',       en: 'Cyan',        no: 'Turkis',       hex: '#20C0D0' },
  { key: 'purple',     en: 'Purple',      no: 'Lilla',        hex: '#8020C0' },
  { key: 'blue',       en: 'Blue',        no: 'Blå',          hex: '#3050D0' },
  { key: 'brown',      en: 'Brown',       no: 'Brun',         hex: '#804818' },
  { key: 'green',      en: 'Green',       no: 'Grønn',        hex: '#408020' },
  { key: 'red',        en: 'Red',         no: 'Rød',          hex: '#C02020' },
  { key: 'black',      en: 'Black',       no: 'Svart',        hex: '#202020' },
]

const COLOR_TYPES = [
  { suffix: 'wool',      enSuffix: 'Wool',       noSuffix: 'Ull',           texStyle: 'wool',      sound: S.SOFT },
  { suffix: 'concrete',  enSuffix: 'Concrete',   noSuffix: 'Betong',        texStyle: 'concrete',  sound: S.STONE },
  { suffix: 'glass',     enSuffix: 'Stained Glass',noSuffix:'Farget glass', texStyle: 'stainedGlass', sound: S.GLASS, transparent: true },
  { suffix: 'terracotta',enSuffix: 'Terracotta',  noSuffix: 'Terrakotta',   texStyle: 'terracotta',sound: S.STONE },
]

let colorId = 50
for (const type of COLOR_TYPES) {
  for (const color of COLORS_16) {
    BLOCKS.push({
      id: colorId++,
      key: `${color.key}_${type.suffix}`,
      nameEn: `${color.en} ${type.enSuffix}`,
      nameNo: `${color.no} ${type.noSuffix}`,
      category: 'colors',
      tex: allFaces(`${type.texStyle}_${color.key}`),
      sound: type.sound,
      transparent: !!type.transparent,
      solid: true,
      luminance: 0,
      colorHex: color.hex,
    })
  }
}

// ─────────────────────────────────────────────────────────────
//  Build fast lookup maps
// ─────────────────────────────────────────────────────────────
export const BLOCK_BY_ID  = new Map(BLOCKS.map(b => [b.id,  b]))
export const BLOCK_BY_KEY = new Map(BLOCKS.map(b => [b.key, b]))

/** @param {number} id */
export function getBlock(id)  { return BLOCK_BY_ID.get(id)  ?? BLOCK_BY_ID.get(0) }
/** @param {string} key */
export function getBlockByKey(key) { return BLOCK_BY_KEY.get(key) }

// ─────────────────────────────────────────────────────────────
//  Category ordering for inventory tabs
// ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  'nature', 'wood', 'stone', 'minerals', 'plants',
  'fantasy', 'furniture', 'special', 'seasonal', 'colors',
]

export function getCategory(cat) {
  return BLOCKS.filter(b => b.category === cat && b.id !== 0 && !b.hidden)
}

// ─────────────────────────────────────────────────────────────
//  Block dominant colour — used by particle system
//  Maps the primary texture-style key to a normalised [r,g,b].
// ─────────────────────────────────────────────────────────────
export function getBlockColor(def) {
  if (!def?.tex) return [0.55, 0.55, 0.55]
  const key = def.tex.all ?? def.tex.top ?? def.tex.side ?? ''
  // Use PALETTE if the key matches directly
  const hex = PALETTE[key]
  if (hex) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
  }
  // Fall back per colour-block: use colorHex if available
  if (def.colorHex) {
    const n = parseInt(def.colorHex.slice(1), 16)
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
  }
  return [0.55, 0.55, 0.55]
}
