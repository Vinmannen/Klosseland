// ─────────────────────────────────────────────────────────────
//  Klosseland — Inventory
//  Manages the player's hotbar slots and selected slot.
//  Key 1-9 selection is handled externally via Controls.getSlotKey().
// ─────────────────────────────────────────────────────────────
import { HOTBAR_SLOTS } from '../data/constants.js'

// Default hotbar: varied starter blocks for a kids' world
//  grass, dirt, stone, oak_planks, bricks, sand, rainbow_block, crystal_blue, glowstone
const DEFAULT_SLOTS = [1, 2, 3, 12, 122, 4, 145, 140, 151]

export class Inventory {
  constructor() {
    this.slots        = [...DEFAULT_SLOTS]
    this.selectedSlot = 0
    this._listeners   = []
  }

  selectSlot(i) {
    this.selectedSlot = ((i % HOTBAR_SLOTS) + HOTBAR_SLOTS) % HOTBAR_SLOTS
    this._emit()
  }

  /** Advance selection by delta (positive = right, negative = left). */
  scroll(delta) {
    if (delta === 0) return
    this.selectSlot(this.selectedSlot + (delta > 0 ? 1 : -1))
  }

  selectedBlockId() {
    return this.slots[this.selectedSlot]
  }

  /** Replace the block in slot i and notify listeners. */
  setSlot(i, blockId) {
    if (i < 0 || i >= this.slots.length) return
    this.slots[i] = blockId
    this._emit()
  }

  /** Register a callback fired whenever the selection changes. */
  onChange(fn) {
    this._listeners.push(fn)
  }

  _emit() {
    for (const fn of this._listeners) fn(this)
  }
}
