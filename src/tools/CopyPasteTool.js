// ─────────────────────────────────────────────────────────────
//  Klosseland — CopyPasteTool
//  3D region copy/paste for creative mode.
//
//  Keybindings (wired in main.js):
//    [   → set corner A at targeted block (shows yellow outline)
//    ]   → set corner B at targeted block (shows full selection box)
//    C   → copy the current selection
//    V   → enter paste mode (green ghost follows look target)
//    LMB → confirm paste (while in paste mode)
//    Esc → cancel paste mode  /  clear selection
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'

const SEL_COLOR   = 0xFFD04A   // yellow — selection box
const PASTE_COLOR = 0x6CC952   // green  — paste preview

export class CopyPasteTool {
  constructor(scene) {
    this._scene    = scene
    this._cornerA  = null   // { x, y, z }
    this._cornerB  = null
    this._data     = null   // { w, h, d, blocks: [{dx,dy,dz,id}] }
    this.pasteMode = false

    // ── Selection wireframe ─────────────────────────────────
    this._selBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: SEL_COLOR }),
    )
    this._selBox.visible = false
    scene.add(this._selBox)

    // ── Paste-preview wireframe ─────────────────────────────
    this._pasteBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: PASTE_COLOR, transparent: true, opacity: 0.8 }),
    )
    this._pasteBox.visible = false
    scene.add(this._pasteBox)

    // Corner-A marker (small yellow crosshair dot)
    this._markerA = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.08, 1.08, 1.08)),
      new THREE.LineBasicMaterial({ color: SEL_COLOR }),
    )
    this._markerA.visible = false
    scene.add(this._markerA)
  }

  // ── Corner A ──────────────────────────────────────────────

  setCornerA(bx, by, bz) {
    this._cornerA = { x: bx, y: by, z: bz }
    this._cornerB = null
    this._data    = null
    this.pasteMode = false
    this._pasteBox.visible = false

    // Show marker at corner A, hide full selection until B is set
    this._markerA.position.set(bx + 0.5, by + 0.5, bz + 0.5)
    this._markerA.visible = true
    this._selBox.visible  = false
  }

  // ── Corner B → finalises selection ───────────────────────

  setCornerB(bx, by, bz) {
    if (!this._cornerA) return
    this._cornerB  = { x: bx, y: by, z: bz }
    this._data     = null
    this.pasteMode = false
    this._pasteBox.visible  = false
    this._markerA.visible   = false
    this._refreshSelBox()
  }

  _refreshSelBox() {
    const a = this._cornerA, b = this._cornerB
    if (!a || !b) return

    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x)
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y)
    const minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z)

    const w = maxX - minX + 1
    const h = maxY - minY + 1
    const d = maxZ - minZ + 1

    this._selBox.scale.set(w, h, d)
    this._selBox.position.set(minX + w / 2, minY + h / 2, minZ + d / 2)
    this._selBox.visible = true
  }

  // ── Copy ──────────────────────────────────────────────────

  copy(world) {
    if (!this._cornerA || !this._cornerB) return false

    const a = this._cornerA, b = this._cornerB
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x)
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y)
    const minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z)

    const blocks = []
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++)
        for (let z = minZ; z <= maxZ; z++) {
          const id = world.getBlock(x, y, z)
          if (id) blocks.push({ dx: x - minX, dy: y - minY, dz: z - minZ, id })
        }

    this._data = {
      w: maxX - minX + 1,
      h: maxY - minY + 1,
      d: maxZ - minZ + 1,
      blocks,
    }
    return true
  }

  // ── Paste mode ────────────────────────────────────────────

  enterPasteMode() {
    if (!this._data) return false
    this.pasteMode = true
    this._pasteBox.scale.set(this._data.w, this._data.h, this._data.d)
    this._pasteBox.visible = true
    return true
  }

  /**
   * Update the paste-preview ghost to show where the copy will land.
   * The paste origin is placed so the ghost's lower-left-front corner
   * aligns with the targeted block.
   */
  updatePastePreview(bx, by, bz) {
    if (!this.pasteMode || !this._data) return
    const { w, h, d } = this._data
    this._pasteBox.position.set(bx + w / 2, by + h / 2, bz + d / 2)
  }

  /**
   * Write copied blocks into the world at (bx, by, bz).
   * Returns array of [x, y, z] for dirty-chunk remeshing.
   */
  paste(world, bx, by, bz) {
    if (!this.pasteMode || !this._data) return []
    const changed = []
    for (const { dx, dy, dz, id } of this._data.blocks) {
      world.setBlock(bx + dx, by + dy, bz + dz, id)
      changed.push([bx + dx, by + dy, bz + dz])
    }
    this.cancelPaste()
    return changed
  }

  cancelPaste() {
    this.pasteMode = false
    this._pasteBox.visible = false
  }

  // ── Clear everything ──────────────────────────────────────

  clearAll() {
    this._cornerA  = null
    this._cornerB  = null
    this._data     = null
    this.pasteMode = false
    this._selBox.visible   = false
    this._pasteBox.visible = false
    this._markerA.visible  = false
  }

  // ── Accessors ─────────────────────────────────────────────

  get hasSelection() { return !!(this._cornerA && this._cornerB) }
  get hasCopy()      { return !!this._data }

  // ── Cleanup ───────────────────────────────────────────────

  dispose() {
    for (const obj of [this._selBox, this._pasteBox, this._markerA]) {
      this._scene.remove(obj)
      obj.geometry.dispose()
      obj.material.dispose()
    }
  }
}
