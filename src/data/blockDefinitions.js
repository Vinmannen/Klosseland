// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Klosseland â€” Block Definitions
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
//    luminance   0â€“15 glow level (0 = no glow)
//    solid       false means player passes through (flowers, etc.)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { SOUND_GROUP } from './constants.js'

const S = SOUND_GROUP

// Helper â€“ single texture for all faces
function allFaces(style) { return { all: style } }
// Helper â€“ different top / side / bottom
function topSideBottom(top, side, bottom) { return { top, side, bottom } }
// Helper â€“ same on all sides but different top
function topAndSide(top, sides) { return { top, side: sides, bottom: sides } }

// â”€â”€ Colour palette (hex) used by the texture generator â”€â”€â”€â”€â”€â”€â”€
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

  // Wood â€” Oak
  oakBark:      '#8B6030',
  oakBarkDark:  '#6A4820',
  oakPlanks:    '#C8943A',
  oakPlanksDark:'#A87828',
  oakRings:     '#D4A858',

  // Wood â€” Pine
  pineBark:     '#5A3820',
  pineBarkDark: '#3C2410',
  pinePlanks:   '#8C6040',
  pinePlanksDark:'#6A4828',

  // Wood â€” Birch
  birchBark:    '#DCDCCC',
  birchBarkDark:'#A8A890',
  birchPlanks:  '#D4C890',
  birchPlanksDark:'#B0A870',

  // Wood â€” Jungle
  jungleBark:   '#4E7828',
  jungleBarkDk: '#385820',
  junglePlanks: '#8C7840',
  junglePlanks2:'#6C5C30',

  // Wood â€” Cherry
  cherryBark:   '#C06878',
  cherryBarkDk: '#904858',
  cherryPlanks: '#DCA0A8',
  cherryPlanks2:'#C07888',

  // Wood â€” Dark Oak
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

  // B7 â€” Fairy Woodland
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

  // B8 â€” Meadow
  mossyStone:     '#7A8A60',
  mossyStoneHi:   '#909870',

  // B9 â€” Cherry
  petalBase:      '#F0D8E0',
  petalPink:      '#E8A8C0',
  petalWhite:     '#FFF0F4',
  petalGreen:     '#C8D8B0',
  stoneLantern:   '#484848',
  stoneLanternGlow: '#FFD870',

  // B10 â€” Blodmark (vampire)
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

  // Farming
  farmDirt:       '#5C3A1A',
  farmFurrow:     '#3A2010',
  farmDirtMid:    '#7A5030',
  cropStem:       '#4CAF50',
  cropLeaf:       '#6DBF70',
  cropStem2:      '#5CAF30',
  cropLeaf2:      '#8CCF50',
  wheatGold:      '#F0C040',
  wheatStalk:     '#D4A020',
  carrotColor:    '#E87820',
  carrotBright:   '#FF8C00',
  tomatoRed:      '#D03020',
  tomatoFlower:   '#F0D040',
  onionBulb:      '#9050B0',
  onionStem:      '#7CBF40',
  scarecrowPost:  '#8B5E3C',
  scarecrowHat:   '#D4A040',
  scarecrowBody:  '#8C7060',
  waterCan:       '#3080C0',
  waterCanHi:     '#4898E0',
  waterCanDk:     '#1A5090',
  hoeHandle:      '#A0602A',
  hoeHandleDk:    '#7A4418',
  hoeBlade:       '#B8B8C0',
  hoeBladeDk:     '#808090',

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Block list
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const BLOCKS = [
  // â”€â”€ AIR (id 0, never in inventory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 0, key: 'air',   nameEn: 'Air',    nameNo: 'Luft',   category: null,
    tex: null, sound: null, transparent: true, solid: false, luminance: 0 },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  NATURE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    nameEn: 'Snow',        nameNo: 'SnÃ¸',
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  WOOD â€” OAK
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

  // â”€â”€ PINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ BIRCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 15, key: 'birch_log',
    nameEn: 'Birch Log',   nameNo: 'BjÃ¸rketresstamme',
    category: 'wood',
    tex: topAndSide('birchLogTop', 'birchLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 16, key: 'birch_planks',
    nameEn: 'Birch Planks',nameNo: 'BjÃ¸rkebord',
    category: 'wood',
    tex: allFaces('birchPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // â”€â”€ JUNGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ CHERRY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 19, key: 'cherry_log',
    nameEn: 'Cherry Log',  nameNo: 'KirsebÃ¦rstamme',
    category: 'wood',
    tex: topAndSide('cherryLogTop', 'cherryLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 20, key: 'cherry_planks',
    nameEn: 'Cherry Planks',nameNo: 'KirsebÃ¦rbord',
    category: 'wood',
    tex: allFaces('cherryPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // â”€â”€ DARK OAK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 21, key: 'dark_oak_log',
    nameEn: 'Dark Oak Log',    nameNo: 'MÃ¸rk eiketresstamme',
    category: 'wood',
    tex: topAndSide('darkOakLogTop', 'darkOakLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 22, key: 'dark_oak_planks',
    nameEn: 'Dark Oak Planks', nameNo: 'MÃ¸rke eikebord',
    category: 'wood',
    tex: allFaces('darkOakPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  LEAVES & PLANTS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 23, key: 'oak_leaves',
    nameEn: 'Oak Leaves',    nameNo: 'Eikeblader',
    category: 'plants',
    tex: allFaces('oakLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 24, key: 'pine_leaves',
    nameEn: 'Pine Needles',  nameNo: 'FurunÃ¥ler',
    category: 'plants',
    tex: allFaces('pineLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 25, key: 'birch_leaves',
    nameEn: 'Birch Leaves',  nameNo: 'BjÃ¸rkeblader',
    category: 'plants',
    tex: allFaces('birchLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 26, key: 'jungle_leaves',
    nameEn: 'Jungle Leaves', nameNo: 'Jungelblader',
    category: 'plants',
    tex: allFaces('jungleLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 27, key: 'cherry_leaves',
    nameEn: 'Cherry Blossoms',nameNo: 'KirsebÃ¦rblomster',
    category: 'plants',
    tex: allFaces('cherryLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 28, key: 'autumn_leaves',
    nameEn: 'Autumn Leaves',  nameNo: 'HÃ¸stblader',
    category: 'plants',
    tex: allFaces('autumnLeaves'),
    sound: S.LEAVES, transparent: true, solid: true, luminance: 0, waving: true },

  { id: 29, key: 'cactus',
    nameEn: 'Cactus',         nameNo: 'Kaktus',
    category: 'plants',
    tex: topSideBottom('cactusTop', 'cactusSide', 'cactusTop'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 0 },

  { id: 30, key: 'flower_red',
    nameEn: 'Red Flower',     nameNo: 'RÃ¸d blomst',
    category: 'plants',
    tex: allFaces('flowerRed'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 31, key: 'flower_yellow',
    nameEn: 'Yellow Flower',  nameNo: 'Gul blomst',
    category: 'plants',
    tex: allFaces('flowerYellow'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 32, key: 'flower_blue',
    nameEn: 'Blue Flower',    nameNo: 'BlÃ¥ blomst',
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
    nameEn: 'Tall Grass',     nameNo: 'HÃ¸yt gress',
    category: 'plants',
    tex: allFaces('tallGrass'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  { id: 37, key: 'mushroom_red',
    nameEn: 'Red Mushroom',   nameNo: 'RÃ¸d sopp',
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

  // Flowing water â€” placed by WaterSystem, never in inventory
  { id: 45, key: 'waterFlow',
    nameEn: 'Flowing Water',  nameNo: 'Rennende vann',
    category: null,
    tex: allFaces('waterFlow'),
    sound: S.LIQUID, transparent: true, liquid: true, solid: false, luminance: 0 },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  COLOUR BLOCKS (16 Ã— wool, concrete, stained glass,
  //  terracotta = generated programmatically below)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // IDs 50â€“113 are reserved for colour blocks (see generateColorBlocks)

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  STONE & BRICK  (start at 120)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    nameEn: 'Nether Brick',   nameNo: 'MÃ¸rkemurstein',
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FANTASY  (start at 140)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 140, key: 'crystal_blue',
    nameEn: 'Blue Crystal',   nameNo: 'BlÃ¥ krystall',
    category: 'fantasy',
    tex: allFaces('crystalBlue'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#40C8FF' },

  { id: 141, key: 'crystal_purple',
    nameEn: 'Purple Crystal', nameNo: 'Lilla krystall',
    category: 'fantasy',
    tex: allFaces('crystalPurple'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#C840FF' },

  { id: 142, key: 'crystal_green',
    nameEn: 'Green Crystal',  nameNo: 'GrÃ¸nn krystall',
    category: 'fantasy',
    tex: allFaces('crystalGreen'),
    sound: S.STONE, transparent: true, solid: true, luminance: 10, lightColor: '#40FFB0' },

  { id: 143, key: 'crystal_red',
    nameEn: 'Red Crystal',    nameNo: 'RÃ¸d krystall',
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FURNITURE / MISC  (start at 160)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 160, key: 'bookshelf',
    nameEn: 'Bookshelf',      nameNo: 'Bokhylle',
    category: 'furniture', sub: 'living',
    tex: topSideBottom('oakPlanks','bookshelf','oakPlanks'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 161, key: 'hay_bale',
    nameEn: 'Hay Bale',       nameNo: 'HÃ¸yballe',
    category: 'furniture', sub: 'garden',
    tex: topAndSide('hayBaleTop','hayBaleSide'),
    sound: S.GRASS, transparent: false, solid: true, luminance: 0 },

  { id: 162, key: 'barrel',
    nameEn: 'Barrel',         nameNo: 'TÃ¸nne',
    category: 'furniture', sub: 'storage',
    tex: topAndSide('barrelTop','barrelSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  { id: 163, key: 'lantern',
    nameEn: 'Lantern',        nameNo: 'Lykt',
    category: 'furniture', sub: 'garden',
    tex: allFaces('lantern'),
    sound: S.STONE, transparent: true, solid: false, luminance: 14, lightColor: '#FFC060' },

  { id: 164, key: 'campfire',
    nameEn: 'Campfire',       nameNo: 'BÃ¥l',
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  SPECIAL / GLASS  (start at 175)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  SEASONAL  (start at 185)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    nameEn: 'Easter Egg',     nameNo: 'PÃ¥skeegg',
    category: 'seasonal',
    tex: allFaces('easterEgg'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 188, key: 'snowman_head',
    nameEn: 'Snowman Head',   nameNo: 'SnÃ¸mannhode',
    category: 'seasonal',
    tex: allFaces('snowmanHead'),
    sound: S.SNOW, transparent: false, solid: true, luminance: 0 },

  // â”€â”€ BIOME IDENTITY BLOCKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // B1 â€” Autumn
  { id: 189, key: 'leaf_pile',
    nameEn: 'Leaf Pile',      nameNo: 'LÃ¸vhaug',
    category: 'seasonal',
    tex: allFaces('leafPile'),
    sound: S.LEAVES, transparent: false, solid: true, luminance: 0 },

  // B2 â€” Desert
  { id: 190, key: 'dead_bush',
    nameEn: 'Dead Bush',      nameNo: 'TÃ¸rr busk',
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

  // â”€â”€ B3: SNOWY PEAKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 193, key: 'powder_snow',
    nameEn: 'Powder Snow',       nameNo: 'LÃ¸ssnÃ¸',
    category: 'nature',
    tex: allFaces('powderSnow'),
    sound: S.SNOW, transparent: false, solid: true, luminance: 0 },

  // â”€â”€ B4: MUSHROOM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ B5 â€” CANDY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 196, key: 'candy_red',
    nameEn: 'Red Candy Block',   nameNo: 'RÃ¸d godteriblokk',
    category: 'fantasy',
    tex: allFaces('candyRed'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 197, key: 'candy_mint',
    nameEn: 'Mint Candy Block',  nameNo: 'MintgrÃ¸nn godteriblokk',
    category: 'fantasy',
    tex: allFaces('candyMint'),
    sound: S.SOFT, transparent: false, solid: true, luminance: 0 },

  { id: 198, key: 'frosted_log',
    nameEn: 'Frosted Log',       nameNo: 'Frostet stokk',
    category: 'fantasy',
    tex: topAndSide('frostedLogTop', 'frostedLogSide'),
    sound: S.WOOD, transparent: false, solid: true, luminance: 0 },

  // â”€â”€ JUNGLE (B6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 199, key: 'tropical_flower',
    nameEn: 'Tropical Flower',   nameNo: 'Tropisk blomst',
    category: 'plants',
    tex: allFaces('tropicalFlower'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0 },

  // â”€â”€ FAIRY WOODLAND (B7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // B8 â€” Meadow
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

  // B9 â€” Cherry
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

  // â”€â”€ Non-cube geometry blocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    nameEn: 'Door',              nameNo: 'DÃ¸r',
    category: 'furniture', sub: 'garden',
    tex: topSideBottom('doorTop', 'doorSide', 'doorTop'),
    shape: 'panel',
    sound: S.WOOD, transparent: true, solid: false,
    multiBlock: { dx: 0, dy: 1, dz: 0, partId: 237 } },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FURNITURE â€” Phase 18  (custom shapes + directional facing)
  //  facing: 0=S (+Z front), 1=W (-X front), 2=N (-Z front), 3=E (+X front)
  //  dirGroup: [S, W, N, E] IDs â€” used by placement to pick the right variant
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

  // â”€â”€ Directional variants (hidden: never shown in inventory) â”€â”€

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

  // â”€â”€ Multi-block secondary blocks (hidden, placed automatically) â”€â”€

  // Bed foot â€” matching facing with head block
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

  // Door top â€” placed automatically above door
  { id: 237, key: 'door_top',
    nameEn: 'Door', nameNo: 'DÃ¸r',
    category: 'furniture', hidden: true,
    tex: topSideBottom('doorTop', 'doorSide', 'doorTop'),
    sound: S.WOOD, transparent: true, solid: false,
    shape: 'panel', isPart: true, partnerDelta: [0, -1, 0] },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  B10 â€” BLODMARK (Vampire Biome)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  { id: 238, key: 'blood_water',
    nameEn: 'Blood Water',       nameNo: 'Blodbad',
    category: 'special',
    tex: allFaces('bloodWater'),
    sound: S.LIQUID, transparent: true, liquid: true, solid: false, luminance: 0 },

  // Flowing blood â€” placed by BloodWaterSystem, never in inventory
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
    nameEn: 'Dark Stone',        nameNo: 'MÃ¸rk stein',
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
    nameEn: 'Dark Thorns',       nameNo: 'MÃ¸rke torner',
    category: 'plants',
    tex: allFaces('darkThorns'),
    sound: S.LEAVES, transparent: true, solid: false, luminance: 0 },

  { id: 245, key: 'blood_crystal',
    nameEn: 'Blood Crystal',     nameNo: 'Blodkrystall',
    category: 'fantasy',
    tex: allFaces('bloodCrystal'),
    sound: S.GLASS, transparent: true, solid: false, luminance: 8, lightColor: '#CC0030' },

  // Vampire Throne â€” directional furniture (chair shape)
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  KITCHEN FURNITURE  (start at 250)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 250, key: 'kitchen_counter',
    nameEn: 'Kitchen Counter', nameNo: 'KjÃ¸kkenbenk',
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
    nameEn: 'Fridge',          nameNo: 'KjÃ¸leskap',
    category: 'furniture', sub: 'kitchen',
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 0, dirGroup: [255, 256, 257, 258],
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 271 } },
  { id: 256, key: 'fridge_w', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 1,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 272 } },
  { id: 257, key: 'fridge_n', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 2,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 273 } },
  { id: 258, key: 'fridge_e', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeSide', side: 'fridgeSide', front: 'fridgeFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 3,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', multiBlock: { dx: 0, dy: 1, dz: 0, partId: 274 } },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  BATHROOM FURNITURE  (start at 259)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

  // â”€â”€ Dresser (bedroom addition) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Toilet directional variants (hidden) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Fridge top (hidden, placed automatically above fridge) â”€
  { id: 271, key: 'fridge_top', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 0,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },
  { id: 272, key: 'fridge_top_w', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 1,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },
  { id: 273, key: 'fridge_top_n', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 2,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },
  { id: 274, key: 'fridge_top_e', nameEn: 'Fridge', nameNo: 'KjÃ¸leskap',
    category: 'furniture', hidden: true,
    tex: { top: 'fridgeTopTop', side: 'fridgeTopSide', front: 'fridgeTopFront', bottom: 'fridgeSide' },
    shape: 'cabinet_furn', facing: 3,
    sound: S.STONE, transparent: true, solid: true, luminance: 0,
    interactable: 'fridge', isPart: true, partnerDelta: [0, -1, 0] },

  // â”€â”€ Sofa right companion (hidden, placed automatically) â”€â”€â”€
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FOOD ITEMS (IDs 279â€“287)
  //  cross shape = small sprite, placeable as decoration
  //  isFood: true â€” can be eaten by pressing R
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 279, key: 'food_apple',
    nameEn: 'Apple',           nameNo: 'Eple',
    category: 'food',
    tex: allFaces('foodApple'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 2 },
  { id: 280, key: 'food_bread',
    nameEn: 'Bread',           nameNo: 'BrÃ¸d',
    category: 'food',
    tex: allFaces('foodBread'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },
  { id: 281, key: 'food_carrot',
    nameEn: 'Carrot',          nameNo: 'Gulrot',
    category: 'food',
    tex: allFaces('foodCarrot'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 2 },
  { id: 282, key: 'food_cookie',
    nameEn: 'Cookie',          nameNo: 'Kjeks',
    category: 'food',
    tex: allFaces('foodCookie'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 1 },
  { id: 283, key: 'food_mushroom',
    nameEn: 'Mushroom Soup',   nameNo: 'Soppesuppe',
    category: 'food',
    tex: allFaces('foodMushF'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },
  { id: 284, key: 'food_beef_raw',
    nameEn: 'Raw Beef',        nameNo: 'RÃ¥tt kjÃ¸tt',
    category: 'food',
    tex: allFaces('foodMeat'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 0, rawFood: true, cookedId: 285 },
  { id: 285, key: 'food_beef_cooked',
    nameEn: 'Cooked Beef',     nameNo: 'Stekt kjÃ¸tt',
    category: 'food',
    tex: allFaces('foodCooked'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },
  { id: 286, key: 'food_fish_raw',
    nameEn: 'Raw Fish',        nameNo: 'RÃ¥ fisk',
    category: 'food',
    tex: allFaces('foodFish'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 0, rawFood: true, cookedId: 287 },
  { id: 287, key: 'food_fish_cooked',
    nameEn: 'Cooked Fish',     nameNo: 'Stekt fisk',
    category: 'food',
    tex: allFaces('foodFishC'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },

  // â”€â”€ Bathtub companion blocks (invisible, solid) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  COOKING STATIONS (IDs 291â€“293)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 291, key: 'chopping_board',
    nameEn: 'Chopping Board',  nameNo: 'SkjÃ¦rebrett',
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
    sound: S.SOFT, transparent: true, solid: true, luminance: 0, interactable: 'recipebook' },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  KITCHEN UTENSILS (IDs 294â€“298)
  //  cross-sprite items â€” reusable, not consumed
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 294, key: 'tool_knife',
    nameEn: 'Knife',     nameNo: 'Kniv',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolKnife'),
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 295, key: 'tool_whisk',
    nameEn: 'Whisk',     nameNo: 'Visp',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolWhisk'),
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 296, key: 'tool_spatula',
    nameEn: 'Spatula',   nameNo: 'Stekespade',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolSpatula'),
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 297, key: 'tool_pot',
    nameEn: 'Pot',       nameNo: 'Gryte',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolPot'),
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  { id: 298, key: 'tool_pan',
    nameEn: 'Frying Pan', nameNo: 'Stekepanne',
    category: 'food', sub: 'utensils',
    tex: allFaces('toolPan'),
    sound: S.STONE, transparent: true, solid: false, luminance: 0, isUtensil: true },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  RAW INGREDIENTS (IDs 299â€“305)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 299, key: 'food_egg',
    nameEn: 'Egg',       nameNo: 'Egg',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingEgg'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 300, key: 'food_flour',
    nameEn: 'Flour',     nameNo: 'Mel',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingFlour'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 301, key: 'food_potato',
    nameEn: 'Potato',    nameNo: 'Potet',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingPotato'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 302, key: 'food_tomato',
    nameEn: 'Tomato',    nameNo: 'Tomat',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingTomato'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 303, key: 'food_onion',
    nameEn: 'Onion',     nameNo: 'LÃ¸k',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingOnion'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 304, key: 'food_cheese',
    nameEn: 'Cheese',    nameNo: 'Ost',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingCheese'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 305, key: 'food_milk',
    nameEn: 'Milk',      nameNo: 'Melk',
    category: 'food', sub: 'ingredients',
    tex: allFaces('ingMilk'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PREPPED VARIANTS (IDs 306â€“310) â€” hidden, only from stations
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 306, key: 'food_potato_chopped',
    nameEn: 'Chopped Potato', nameNo: 'Hakket potet',
    category: 'food', hidden: true,
    tex: allFaces('prepPotatoChopped'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 307, key: 'food_carrot_sliced',
    nameEn: 'Sliced Carrot',  nameNo: 'Skivet gulrot',
    category: 'food', hidden: true,
    tex: allFaces('prepCarrotSliced'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 308, key: 'food_onion_diced',
    nameEn: 'Diced Onion',    nameNo: 'Hakket lÃ¸k',
    category: 'food', hidden: true,
    tex: allFaces('prepOnionDiced'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 309, key: 'food_cheese_shredded',
    nameEn: 'Shredded Cheese', nameNo: 'Revet ost',
    category: 'food', hidden: true,
    tex: allFaces('prepCheeseShredded'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  { id: 310, key: 'food_egg_cracked',
    nameEn: 'Cracked Egg',    nameNo: 'Knekt egg',
    category: 'food', hidden: true,
    tex: allFaces('prepEggCracked'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0 },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  COOKED DISHES (IDs 311â€“316)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 311, key: 'food_pizza',
    nameEn: 'Pizza',     nameNo: 'Pizza',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishPizza'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 5 },

  { id: 312, key: 'food_cake',
    nameEn: 'Cake',      nameNo: 'Kake',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishCake'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },

  { id: 313, key: 'food_soup',
    nameEn: 'Vegetable Soup', nameNo: 'GrÃ¸nnsakssuppe',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishSoup'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },

  { id: 314, key: 'food_omelette',
    nameEn: 'Omelette',  nameNo: 'Omelett',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishOmelet'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },

  { id: 315, key: 'food_fries',
    nameEn: 'Fries',     nameNo: 'Pommes frites',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishFries'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 3 },

  { id: 316, key: 'food_pancakes',
    nameEn: 'Pancakes',  nameNo: 'Pannekaker',
    category: 'food', sub: 'dishes',
    tex: allFaces('dishPancakes'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isFood: true, foodValue: 4 },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PHASE 20 â€” Signs (IDs 317â€“320)
  //  Four facing variants; only sign_s shows in inventory.
  //  dirGroup maps yawâ†’facing at placement time.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 317, key: 'sign_s', nameEn: 'Sign', nameNo: 'Skilt',
    category: 'decoration', shape: 'sign', facing: 0,
    tex: { top: 'oakLogSide', bottom: 'oakPlanks', side: 'oakPlanks', front: 'signFace' },
    sound: S.WOOD, solid: true, transparent: true, interactable: 'sign',
    dirGroup: [317, 318, 319, 320] },
  { id: 318, key: 'sign_w', nameEn: 'Sign', nameNo: 'Skilt',
    category: 'decoration', shape: 'sign', facing: 1,
    tex: { top: 'oakLogSide', bottom: 'oakPlanks', side: 'oakPlanks', front: 'signFace' },
    sound: S.WOOD, solid: true, transparent: true, interactable: 'sign', hidden: true },
  { id: 319, key: 'sign_n', nameEn: 'Sign', nameNo: 'Skilt',
    category: 'decoration', shape: 'sign', facing: 2,
    tex: { top: 'oakLogSide', bottom: 'oakPlanks', side: 'oakPlanks', front: 'signFace' },
    sound: S.WOOD, solid: true, transparent: true, interactable: 'sign', hidden: true },
  { id: 320, key: 'sign_e', nameEn: 'Sign', nameNo: 'Skilt',
    category: 'decoration', shape: 'sign', facing: 3,
    tex: { top: 'oakLogSide', bottom: 'oakPlanks', side: 'oakPlanks', front: 'signFace' },
    sound: S.WOOD, solid: true, transparent: true, interactable: 'sign', hidden: true },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PHASE 21 â€” Fireworks (IDs 321â€“325)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  { id: 321, key: 'firework_red',     nameEn: 'Firework (Red)',     nameNo: 'Fyrverkeri (rÃ¸d)',
    category: 'decoration',
    tex: allFaces('fireworkRed'),    sound: S.WOOD,
    transparent: true, solid: false, luminance: 0,
    isFirework: true, burstColors: ['#FF2020', '#FF8020'], interactable: 'firework' },
  { id: 322, key: 'firework_blue',    nameEn: 'Firework (Blue)',    nameNo: 'Fyrverkeri (blÃ¥)',
    category: 'decoration',
    tex: allFaces('fireworkBlue'),   sound: S.WOOD,
    transparent: true, solid: false, luminance: 0,
    isFirework: true, burstColors: ['#2060FF', '#80C0FF'], interactable: 'firework' },
  { id: 323, key: 'firework_green',   nameEn: 'Firework (Green)',   nameNo: 'Fyrverkeri (grÃ¸nn)',
    category: 'decoration',
    tex: allFaces('fireworkGreen'),  sound: S.WOOD,
    transparent: true, solid: false, luminance: 0,
    isFirework: true, burstColors: ['#20CC40', '#A0FFB0'], interactable: 'firework' },
  { id: 324, key: 'firework_gold',    nameEn: 'Firework (Gold)',    nameNo: 'Fyrverkeri (gull)',
    category: 'decoration',
    tex: allFaces('fireworkGold'),   sound: S.WOOD,
    transparent: true, solid: false, luminance: 0,
    isFirework: true, burstColors: ['#FFD020', '#FFF080'], interactable: 'firework' },
  { id: 325, key: 'firework_rainbow', nameEn: 'Firework (Rainbow)', nameNo: 'Fyrverkeri (regnbue)',
    category: 'decoration',
    tex: allFaces('fireworkRainbow'), sound: S.WOOD,
    transparent: true, solid: false, luminance: 0,
    isFirework: true, burstColors: 'rainbow', interactable: 'firework' },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PHASE 22 â€” FARMING (IDs 326â€“343)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // â”€â”€ Farmland (tilled dirt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 326, key: 'farmland',
    nameEn: 'Farmland',   nameNo: 'Dyrket mark',
    category: 'farming',
    tex: topSideBottom('farmlandTop', 'farmlandSide', 'farmlandSide'),
    sound: S.DIRT, transparent: false, solid: true, luminance: 0,
    isFarmland: true },

  // â”€â”€ Wheat (harvestId â†’ flour, ID 300) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 327, key: 'crop_wheat_1',
    nameEn: 'Wheat Seeds', nameNo: 'HvetefrÃ¸',
    category: 'farming',
    tex: allFaces('wheat1'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 1, cropType: 'wheat', nextStageId: 328, harvestId: 300 },
  { id: 328, key: 'crop_wheat_2',
    nameEn: 'Wheat',       nameNo: 'Hvete',
    category: 'farming', hidden: true,
    tex: allFaces('wheat2'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 2, cropType: 'wheat', nextStageId: 329, harvestId: 300 },
  { id: 329, key: 'crop_wheat_3',
    nameEn: 'Wheat (Ready)', nameNo: 'Hvete (Klar)',
    category: 'farming', hidden: true,
    tex: allFaces('wheat3'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 3, cropType: 'wheat', harvestId: 300 },

  // â”€â”€ Carrot (harvestId â†’ food_carrot, ID 281) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 330, key: 'crop_carrot_1',
    nameEn: 'Carrot Seeds', nameNo: 'GulrotfrÃ¸',
    category: 'farming',
    tex: allFaces('carrot1'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 1, cropType: 'carrot', nextStageId: 331, harvestId: 281 },
  { id: 331, key: 'crop_carrot_2',
    nameEn: 'Carrot',       nameNo: 'Gulrot',
    category: 'farming', hidden: true,
    tex: allFaces('carrot2'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 2, cropType: 'carrot', nextStageId: 332, harvestId: 281 },
  { id: 332, key: 'crop_carrot_3',
    nameEn: 'Carrot (Ready)', nameNo: 'Gulrot (Klar)',
    category: 'farming', hidden: true,
    tex: allFaces('carrot3'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 3, cropType: 'carrot', harvestId: 281 },

  // â”€â”€ Potato (harvestId â†’ food_potato, ID 301) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 333, key: 'crop_potato_1',
    nameEn: 'Potato Seeds', nameNo: 'PotetfrÃ¸',
    category: 'farming',
    tex: allFaces('potato1'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 1, cropType: 'potato', nextStageId: 334, harvestId: 301 },
  { id: 334, key: 'crop_potato_2',
    nameEn: 'Potato',       nameNo: 'Potet',
    category: 'farming', hidden: true,
    tex: allFaces('potato2'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 2, cropType: 'potato', nextStageId: 335, harvestId: 301 },
  { id: 335, key: 'crop_potato_3',
    nameEn: 'Potato (Ready)', nameNo: 'Potet (Klar)',
    category: 'farming', hidden: true,
    tex: allFaces('potato3'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 3, cropType: 'potato', harvestId: 301 },

  // â”€â”€ Tomato (harvestId â†’ food_tomato, ID 302) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 336, key: 'crop_tomato_1',
    nameEn: 'Tomato Seeds', nameNo: 'TomatfrÃ¸',
    category: 'farming',
    tex: allFaces('tomato1'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 1, cropType: 'tomato', nextStageId: 337, harvestId: 302 },
  { id: 337, key: 'crop_tomato_2',
    nameEn: 'Tomato',       nameNo: 'Tomat',
    category: 'farming', hidden: true,
    tex: allFaces('tomato2'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 2, cropType: 'tomato', nextStageId: 338, harvestId: 302 },
  { id: 338, key: 'crop_tomato_3',
    nameEn: 'Tomato (Ready)', nameNo: 'Tomat (Klar)',
    category: 'farming', hidden: true,
    tex: allFaces('tomato3'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 3, cropType: 'tomato', harvestId: 302 },

  // â”€â”€ Onion (harvestId â†’ food_onion, ID 303) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 339, key: 'crop_onion_1',
    nameEn: 'Onion Seeds',  nameNo: 'LÃ¸kfrÃ¸',
    category: 'farming',
    tex: allFaces('onion1'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 1, cropType: 'onion', nextStageId: 340, harvestId: 303 },
  { id: 340, key: 'crop_onion_2',
    nameEn: 'Onion',        nameNo: 'LÃ¸k',
    category: 'farming', hidden: true,
    tex: allFaces('onion2'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 2, cropType: 'onion', nextStageId: 341, harvestId: 303 },
  { id: 341, key: 'crop_onion_3',
    nameEn: 'Onion (Ready)', nameNo: 'LÃ¸k (Klar)',
    category: 'farming', hidden: true,
    tex: allFaces('onion3'),
    sound: S.GRASS, transparent: true, solid: false, luminance: 0,
    isCrop: true, cropStage: 3, cropType: 'onion', harvestId: 303 },

  // â”€â”€ Decorations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 342, key: 'scarecrow',
    nameEn: 'Scarecrow',    nameNo: 'Fugleskremsel',
    category: 'farming',
    tex: allFaces('scarecrow'),
    sound: S.WOOD, transparent: true, solid: false, luminance: 0 },

  { id: 343, key: 'watering_can',
    nameEn: 'Watering Can', nameNo: 'Vannkanne',
    category: 'farming',
    tex: allFaces('wateringCan'),
    sound: S.SOFT, transparent: true, solid: false, luminance: 0,
    isWateringCan: true },

  { id: 344, key: 'hoe',
    nameEn: 'Hoe',          nameNo: 'Hakke',
    category: 'farming',
    tex: allFaces('hoe'),
    sound: S.STONE, transparent: true, solid: false, luminance: 0,
    isHoe: true },
]

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Generate the 64 colour blocks (16 colours Ã— 4 types)
//  IDs 50â€“113
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const COLORS_16 = [
  { key: 'white',      en: 'White',       no: 'Hvit',         hex: '#F0F0F0' },
  { key: 'orange',     en: 'Orange',      no: 'Oransje',      hex: '#F08020' },
  { key: 'magenta',    en: 'Magenta',     no: 'Magenta',      hex: '#D040C0' },
  { key: 'light_blue', en: 'Light Blue',  no: 'LyseblÃ¥',      hex: '#60B0E8' },
  { key: 'yellow',     en: 'Yellow',      no: 'Gul',          hex: '#F0D020' },
  { key: 'lime',       en: 'Lime',        no: 'LimegrÃ¸nn',    hex: '#70D820' },
  { key: 'pink',       en: 'Pink',        no: 'Rosa',         hex: '#F080A0' },
  { key: 'gray',       en: 'Gray',        no: 'GrÃ¥',          hex: '#606060' },
  { key: 'light_gray', en: 'Light Gray',  no: 'LysegrÃ¥',      hex: '#A0A0A0' },
  { key: 'cyan',       en: 'Cyan',        no: 'Turkis',       hex: '#20C0D0' },
  { key: 'purple',     en: 'Purple',      no: 'Lilla',        hex: '#8020C0' },
  { key: 'blue',       en: 'Blue',        no: 'BlÃ¥',          hex: '#3050D0' },
  { key: 'brown',      en: 'Brown',       no: 'Brun',         hex: '#804818' },
  { key: 'green',      en: 'Green',       no: 'GrÃ¸nn',        hex: '#408020' },
  { key: 'red',        en: 'Red',         no: 'RÃ¸d',          hex: '#C02020' },
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Stamp category-derived bar-type flags (runs once at load)
//  isTool:    item belongs exclusively in the tool bar
//  isProduce: item belongs exclusively in the produce bar
//  Future activity items can set these flags explicitly on their own definitions.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
for (const b of BLOCKS) {
  if (b.isUtensil) b.isTool = true
  if (b.category === 'food' && !b.isTool) b.isProduce = true
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Build fast lookup maps
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const BLOCK_BY_ID  = new Map(BLOCKS.map(b => [b.id,  b]))
export const BLOCK_BY_KEY = new Map(BLOCKS.map(b => [b.key, b]))

/** @param {number} id */
export function getBlock(id)  { return BLOCK_BY_ID.get(id)  ?? BLOCK_BY_ID.get(0) }
/** @param {string} key */
export function getBlockByKey(key) { return BLOCK_BY_KEY.get(key) }

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Category ordering for inventory tabs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CATEGORIES = [
  'nature', 'wood', 'stone', 'minerals', 'plants',
  'fantasy', 'furniture', 'special', 'seasonal', 'colors', 'decoration',
]

export function getCategory(cat) {
  return BLOCKS.filter(b => b.category === cat && b.id !== 0 && !b.hidden)
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Block dominant colour â€” used by particle system
//  Maps the primary texture-style key to a normalised [r,g,b].
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

