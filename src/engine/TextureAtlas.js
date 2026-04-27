// ─────────────────────────────────────────────────────────────
//  Klosseland — Texture Atlas
//
//  Packs all generated 16×16 block textures into one large
//  canvas (atlas), then creates a THREE.CanvasTexture from it.
//  Each block face references a UV rect within that atlas.
//
//  UV system:
//    atlas is ATLAS_COLS × ATLAS_ROWS tiles (default 16×16 = 256 faces)
//    UVs are normalised 0..1 coordinates into the atlas canvas.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { TEX_SIZE, ATLAS_COLS, ATLAS_ROWS } from '../data/constants.js'
import { generateTexture, getAllStyleNames } from './TextureGenerator.js'
import { BLOCKS, COLORS_16 }               from '../data/blockDefinitions.js'

const ATLAS_W_PX = TEX_SIZE * ATLAS_COLS   // e.g. 256 px
const ATLAS_H_PX = TEX_SIZE * ATLAS_ROWS   // e.g. 256 px

export class TextureAtlas {
  constructor() {
    this._styleIndex = new Map()  // styleName → { col, row }
    this._canvas     = null
    this._ctx        = null
    this._texture    = null
  }

  /**
   * Build the atlas. Safe to call multiple times — only runs once.
   * Returns the THREE.CanvasTexture ready for use.
   */
  build(onProgress) {
    if (this._built) {
      if (onProgress) onProgress(1)
      return this._texture
    }
    this._built = true
    this._canvas = document.createElement('canvas')
    this._canvas.width  = ATLAS_W_PX
    this._canvas.height = ATLAS_H_PX
    this._ctx = this._canvas.getContext('2d')
    this._ctx.imageSmoothingEnabled = false

    const styles = getAllStyleNames()
    const total  = styles.length
    let   slot   = 0

    for (let i = 0; i < styles.length; i++) {
      const name = styles[i]
      if (slot >= ATLAS_COLS * ATLAS_ROWS) {
        console.warn('[TextureAtlas] Atlas full! Increase ATLAS_ROWS/COLS.')
        break
      }
      const col = slot % ATLAS_COLS
      const row = Math.floor(slot / ATLAS_COLS)
      this._styleIndex.set(name, { col, row })

      const tileCvs = generateTexture(name)
      this._ctx.drawImage(tileCvs, col * TEX_SIZE, row * TEX_SIZE)
      slot++

      if (onProgress) onProgress(i / total)
    }

    // Create Three.js texture
    this._texture = new THREE.CanvasTexture(this._canvas)
    this._texture.magFilter = THREE.NearestFilter
    this._texture.minFilter = THREE.NearestFilter
    this._texture.generateMipmaps = false
    this._texture.flipY = false    // canvas v0 = UV v0, no vertical flip
    this._texture.needsUpdate = true

    return this._texture
  }

  /** THREE.CanvasTexture (call build() first). */
  get texture() { return this._texture }

  /** Plain-object copy of the style→{col,row} index — safe to postMessage. */
  getStyleIndex() {
    return Object.fromEntries(this._styleIndex)
  }

  /**
   * Returns UV {u0,v0,u1,v1} for a named texture style.
   * u0,v0 = top-left; u1,v1 = bottom-right (Three.js convention).
   */
  uv(styleName) {
    const entry = this._styleIndex.get(styleName)
    if (!entry) {
      // Fallback to first slot
      return { u0: 0, v0: 0, u1: TEX_SIZE/ATLAS_W_PX, v1: TEX_SIZE/ATLAS_H_PX }
    }
    const { col, row } = entry
    const u0 = (col     * TEX_SIZE) / ATLAS_W_PX
    const v0 = (row     * TEX_SIZE) / ATLAS_H_PX
    const u1 = ((col+1) * TEX_SIZE) / ATLAS_W_PX
    const v1 = ((row+1) * TEX_SIZE) / ATLAS_H_PX
    return { u0, v0, u1, v1 }
  }

  /**
   * Returns the 6-face UV array for a block definition's tex config.
   * Order: [top, bottom, north, south, east, west]
   * Each entry is {u0,v0,u1,v1}.
   */
  blockFaceUVs(blockDef) {
    const { tex } = blockDef
    if (!tex) return null

    const resolve = (style) => this.uv(style)

    if (tex.all)    return Array(6).fill(resolve(tex.all))

    const top    = resolve(tex.top    || tex.side || tex.all)
    const bottom = resolve(tex.bottom || tex.side || tex.all)
    const side   = resolve(tex.side   || tex.top  || tex.all)
    return [top, bottom, side, side, side, side]
  }

  /**
   * Draw a single atlas tile into an external 2D canvas context.
   * Useful for HUD elements like the hotbar.
   * @param {CanvasRenderingContext2D} ctx  target context
   * @param {number} dx  destination x
   * @param {number} dy  destination y
   * @param {number} size  destination width & height (square)
   * @param {string} styleName  texture style name (same as passed to uv())
   */
  drawTile(ctx, dx, dy, size, styleName) {
    if (!this._canvas) return
    const entry = this._styleIndex.get(styleName)
    if (!entry) return
    const { col, row } = entry
    const sx = col * TEX_SIZE
    const sy = row * TEX_SIZE
    ctx.drawImage(this._canvas, sx, sy, TEX_SIZE, TEX_SIZE, dx, dy, size, size)
  }

  /**
   * Patch a single tile in the atlas with a freshly-drawn canvas.
   * Used for per-frame animations (e.g. water shimmer).
   * The tileCvs must be TEX_SIZE × TEX_SIZE.
   */
  patchTile(styleName, tileCvs) {
    if (!this._ctx) return
    const entry = this._styleIndex.get(styleName)
    if (!entry) return
    const { col, row } = entry
    this._ctx.drawImage(tileCvs, col * TEX_SIZE, row * TEX_SIZE)
    this._texture.needsUpdate = true
  }

  /**
   * Debug: append the atlas canvas to document.body.
   * Useful during development.
   */
  debugView() {
    const s = this._canvas.style
    s.position = 'fixed'; s.top = '0'; s.right = '0'
    s.width  = `${ATLAS_W_PX * 2}px`
    s.height = `${ATLAS_H_PX * 2}px`
    s.imageRendering = 'pixelated'
    s.zIndex = '9999'
    s.border = '2px solid red'
    document.body.appendChild(this._canvas)
  }
}

// ─── Singleton ───────────────────────────────────────────────
export const atlas = new TextureAtlas()
