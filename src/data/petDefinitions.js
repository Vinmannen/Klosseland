// ─────────────────────────────────────────────────────────────
//  Klosseland — Pet definitions
//  Each entry describes one choosable pet for the character screen.
//  id: 'none' is the "no pet" option and always lives first.
// ─────────────────────────────────────────────────────────────
import { buildRainbowUnicornCat } from '../entities/RainbowUnicornCat.js'

/**
 * @typedef {Object} PetDef
 * @property {string}   id        — Unique key stored in klosseland_character.pet
 * @property {string}   labelKey  — i18n key for the display name
 * @property {string}   emoji     — Emoji shown on the selection card
 * @property {string}   [category] — Optional category tag
 * @property {Function|null} build — () => { group: THREE.Group, legs: THREE.Mesh[] }
 */

/** @type {PetDef[]} */
export const PET_DEFS = [
  {
    id:       'none',
    labelKey: 'pets_none_label',
    emoji:    '—',
    build:    null,
  },
  {
    id:        'rainbow_unicorn_cat',
    labelKey:  'pets_rainbow_unicorn_cat',
    emoji:     '🦄',
    category:  'fantasy',
    build:     buildRainbowUnicornCat,
  },
]

/** Quick lookup by id. */
export function getPetDef(id) {
  return PET_DEFS.find(d => d.id === id) ?? PET_DEFS[0]
}
