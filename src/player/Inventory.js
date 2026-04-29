// ─────────────────────────────────────────────────────────────
//  Klosseland — Inventory
//  Manages the player's three item bars:
//    slots        — regular 9-slot hotbar   (blocks)
//    toolSlots    — 6-slot tool panel        (isTool items)
//    produceSlots — 6-slot produce bar       (isProduce items)
//  Key 1-9 selection is handled externally via Controls.getSlotKey().
// ─────────────────────────────────────────────────────────────
import { HOTBAR_SLOTS, TOOL_SLOTS, PRODUCE_SLOTS } from '../data/constants.js'

// Default hotbar: varied starter blocks for a kids' world
//  grass, dirt, stone, oak_planks, bricks, sand, rainbow_block, crystal_blue, glowstone
const DEFAULT_SLOTS = [1, 2, 3, 12, 122, 4, 145, 140, 151]

// Pre-fill tool bar with all 5 kitchen utensils (knife, whisk, spatula, pot, pan)
const DEFAULT_TOOL_SLOTS = [294, 295, 296, 297, 298, null]

export class Inventory {
  constructor() {
    this.slots               = [...DEFAULT_SLOTS]
    this.toolSlots           = [...DEFAULT_TOOL_SLOTS]
    this.produceSlots        = new Array(PRODUCE_SLOTS).fill(null)
    this.selectedSlot        = 0
    this.selectedToolSlot    = 0
    this.selectedProduceSlot = 0
    this._listeners          = []
  }

  selectSlot(i) {
    this.selectedSlot = ((i % HOTBAR_SLOTS) + HOTBAR_SLOTS) % HOTBAR_SLOTS
    this._emit()
  }

  selectToolSlot(i) {
    this.selectedToolSlot = ((i % TOOL_SLOTS) + TOOL_SLOTS) % TOOL_SLOTS
    this._emit()
  }

  selectProduceSlot(i) {
    this.selectedProduceSlot = ((i % PRODUCE_SLOTS) + PRODUCE_SLOTS) % PRODUCE_SLOTS
    this._emit()
  }

  /** Advance hotbar selection by delta (positive = right, negative = left). */
  scroll(delta) {
    if (delta === 0) return
    this.selectSlot(this.selectedSlot + (delta > 0 ? 1 : -1))
  }

  selectedBlockId() {
    return this.slots[this.selectedSlot]
  }

  selectedToolId() {
    return this.toolSlots[this.selectedToolSlot] ?? null
  }

  selectedProduceId() {
    return this.produceSlots[this.selectedProduceSlot] ?? null
  }

  /**
   * Add a block to the hotbar: fills an empty slot, skips if already present,
   * otherwise replaces the currently selected slot.
   */
  addToHotbar(id) {
    if (this.slots.includes(id)) return
    const empty = this.slots.indexOf(null)
    if (empty >= 0) { this.slots[empty] = id; this._emit(); return }
    this.slots[this.selectedSlot] = id
    this._emit()
  }

  /**
   * Add a food/produce item to the produce bar.
   * Stacks into an existing slot for the same id, then fills the first empty slot.
   */
  addToProduce(id) {
    const existing = this.produceSlots.indexOf(id)
    if (existing >= 0) return  // already in bar
    const empty = this.produceSlots.indexOf(null)
    if (empty >= 0) { this.produceSlots[empty] = id; this._emit(); return }
    this.produceSlots[this.selectedProduceSlot] = id
    this._emit()
  }

  /** Replace a block in a hotbar slot and notify listeners. */
  setSlot(i, blockId) {
    if (i < 0 || i >= this.slots.length) return
    this.slots[i] = blockId
    this._emit()
  }

  setToolSlot(i, blockId) {
    if (i < 0 || i >= this.toolSlots.length) return
    this.toolSlots[i] = blockId ?? null
    this._emit()
  }

  setProduceSlot(i, blockId) {
    if (i < 0 || i >= this.produceSlots.length) return
    this.produceSlots[i] = blockId ?? null
    this._emit()
  }

  /** Register a callback fired whenever the inventory changes. */
  onChange(fn) {
    this._listeners.push(fn)
  }

  _emit() {
    for (const fn of this._listeners) fn(this)
  }
}
