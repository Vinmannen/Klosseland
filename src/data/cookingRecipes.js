// ─────────────────────────────────────────────────────────────
//  Klosseland — Cooking Recipe Definitions
//
//  CHOP_RECIPES   : { ingredientId → resultId }  (requires knife 294)
//  MIX_RECIPES    : [ { inputs: [...ids], utensilId, output: id } ]
//  COOK_RECIPES   : [ { ingredients: [...ids], utensilId, output: id } ]
//  RECIPE_BOOK    : flat list for the recipe book UI
// ─────────────────────────────────────────────────────────────

// IDs — stations
export const ID_CHOPPING_BOARD = 291
export const ID_MIXING_BOWL    = 292
export const ID_RECIPE_BOOK    = 293

// IDs — utensils
export const ID_KNIFE    = 294
export const ID_WHISK    = 295
export const ID_SPATULA  = 296
export const ID_POT      = 297
export const ID_PAN      = 298

// IDs — raw ingredients
export const ID_EGG     = 299
export const ID_FLOUR   = 300
export const ID_POTATO  = 301
export const ID_TOMATO  = 302
export const ID_ONION   = 303
export const ID_CHEESE  = 304
export const ID_MILK    = 305

// IDs — prepped
export const ID_POTATO_CHOPPED  = 306
export const ID_CARROT_SLICED   = 307
export const ID_ONION_DICED     = 308
export const ID_CHEESE_SHREDDED = 309
export const ID_EGG_CRACKED     = 310

// IDs — existing food (from original blockDefinitions)
export const ID_CARROT    = 281
export const ID_MUSHROOM  = 283
export const ID_BEEF_RAW  = 284
export const ID_BEEF_COOK = 285
export const ID_FISH_RAW  = 286
export const ID_FISH_COOK = 287
export const ID_COOKIE    = 282

// IDs — dishes
export const ID_PIZZA    = 311
export const ID_CAKE     = 312
export const ID_SOUP     = 313
export const ID_OMELETTE = 314
export const ID_FRIES    = 315
export const ID_PANCAKES = 316

// ── Chopping Board (knife required) ──────────────────────────
// Converts a raw ingredient into a prepped variant.
// knife is reusable and stays in the knife slot.
export const CHOP_RECIPES = {
  [ID_EGG]:    ID_EGG_CRACKED,      // Egg → Cracked Egg
  [ID_POTATO]: ID_POTATO_CHOPPED,   // Potato → Chopped Potato
  [ID_CARROT]: ID_CARROT_SLICED,    // Carrot → Sliced Carrot
  [ID_ONION]:  ID_ONION_DICED,      // Onion → Diced Onion
  [ID_CHEESE]: ID_CHEESE_SHREDDED,  // Cheese → Shredded Cheese
}

// ── Mixing Bowl (whisk required) ─────────────────────────────
// All inputs must be present (order-independent).
export const MIX_RECIPES = [
  {
    inputs: [ID_FLOUR, ID_EGG_CRACKED, ID_MILK],
    output: ID_PANCAKES,
    enName: 'Pancakes',  noName: 'Pannekaker',
  },
  {
    inputs: [ID_FLOUR, ID_TOMATO, ID_CHEESE_SHREDDED],
    output: ID_PIZZA,
    enName: 'Pizza',     noName: 'Pizza',
  },
  {
    inputs: [ID_FLOUR, ID_EGG_CRACKED, ID_COOKIE],
    output: ID_CAKE,
    enName: 'Cake',      noName: 'Kake',
  },
  {
    inputs: [ID_POTATO_CHOPPED, ID_CARROT_SLICED, ID_ONION_DICED],
    output: ID_SOUP,
    enName: 'Vegetable Soup', noName: 'Grønnsakssuppe',
  },
]

// ── Stove (cookware in utensil slot) ─────────────────────────
// Match: ALL ingredients must be present (up to 2 ingredient slots).
// utensilId is the required cookware.
export const COOK_RECIPES = [
  {
    ingredients: [ID_EGG_CRACKED],
    utensilId:   ID_PAN,
    output:      ID_OMELETTE,
    enName: 'Omelette',  noName: 'Omelett',
  },
  {
    ingredients: [ID_POTATO_CHOPPED],
    utensilId:   ID_PAN,
    output:      ID_FRIES,
    enName: 'Fries',     noName: 'Pommes frites',
  },
  {
    ingredients: [ID_BEEF_RAW],
    utensilId:   ID_PAN,
    output:      ID_BEEF_COOK,
    enName: 'Cooked Beef', noName: 'Stekt kjøtt',
  },
  {
    ingredients: [ID_FISH_RAW],
    utensilId:   ID_PAN,
    output:      ID_FISH_COOK,
    enName: 'Cooked Fish', noName: 'Stekt fisk',
  },
  {
    ingredients: [ID_CARROT_SLICED, ID_ONION_DICED],
    utensilId:   ID_POT,
    output:      ID_SOUP,
    enName: 'Vegetable Soup', noName: 'Grønnsakssuppe',
  },
  {
    ingredients: [ID_MUSHROOM, ID_ONION_DICED],
    utensilId:   ID_POT,
    output:      ID_SOUP,
    enName: 'Mushroom Soup', noName: 'Soppesuppe',
  },
]

// ── Valid input sets (used by CookingUI for slot validation) ──
export const CHOP_INPUTS = new Set(Object.keys(CHOP_RECIPES).map(Number))
export const MIX_INPUTS  = new Set(MIX_RECIPES.flatMap(r => r.inputs))
export const COOK_INPUTS = new Set(COOK_RECIPES.flatMap(r => r.ingredients))

// ── Recipe Book data (all recipes summarised for the UI) ─────
export const RECIPE_BOOK = [
  {
    tab: 'prep',
    station: { en: 'Chopping Board', no: 'Skjærebrett' },
    utensil: ID_KNIFE,
    recipes: Object.entries(CHOP_RECIPES).map(([inId, outId]) => ({
      inputs: [Number(inId)], output: outId,
    })),
  },
  {
    tab: 'mix',
    station: { en: 'Mixing Bowl', no: 'Miksebolle' },
    utensil: ID_WHISK,
    recipes: MIX_RECIPES.map(r => ({ inputs: r.inputs, output: r.output })),
  },
  {
    tab: 'stove',
    station: { en: 'Stove', no: 'Komfyr' },
    utensil: null,
    recipes: COOK_RECIPES.map(r => ({
      inputs: [...r.ingredients, r.utensilId], output: r.output,
    })),
  },
]
