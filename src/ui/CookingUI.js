// ─────────────────────────────────────────────────────────────
//  Klosseland — CookingUI
//  Interactive cooking stations: chopping board, mixing bowl,
//  upgraded stove, and recipe book.
// ─────────────────────────────────────────────────────────────
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'
import {
  CHOP_RECIPES, MIX_RECIPES, COOK_RECIPES, RECIPE_BOOK,
  ID_KNIFE, ID_WHISK, ID_PAN, ID_POT,
  CHOP_INPUTS, MIX_INPUTS, COOK_INPUTS,
} from '../data/cookingRecipes.js'

// ── Shared style constants ────────────────────────────────────
const SLOT = 52
const SLOT_GAP = 8

const PANEL_STYLE = {
  borderRadius: '14px',
  padding: '22px 26px',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: '14px',
  minWidth: '310px',
  boxShadow: '0 8px 36px rgba(0,0,0,0.75)',
}

const OVERLAY_STYLE = {
  position: 'fixed', inset: '0',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.58)', zIndex: '500',
}

function applyStyle(el, styles) { Object.assign(el.style, styles) }

function makeOverlay(id) {
  const el = document.createElement('div')
  el.id = id
  applyStyle(el, OVERLAY_STYLE)
  return el
}

function makePanel(bgColor) {
  const el = document.createElement('div')
  applyStyle(el, { ...PANEL_STYLE, background: bgColor })
  return el
}

function makeTitle(text, color) {
  const el = document.createElement('div')
  el.textContent = text
  applyStyle(el, { color, fontWeight: '700', fontSize: '1.1rem', letterSpacing: '0.02em' })
  return el
}

function makeHint(text) {
  const el = document.createElement('div')
  el.textContent = text
  applyStyle(el, {
    color: 'rgba(255,255,255,0.42)', fontSize: '0.70rem',
    textAlign: 'center', marginTop: '2px',
  })
  return el
}

function makeBtn(label, bgColor, hoverColor) {
  const btn = document.createElement('button')
  btn.textContent = label
  applyStyle(btn, {
    background: bgColor, color: '#fff', border: 'none',
    borderRadius: '8px', padding: '9px 26px', cursor: 'pointer',
    fontWeight: '700', fontSize: '0.92rem',
    transition: 'background 0.15s, transform 0.1s',
  })
  btn.addEventListener('mouseenter', () => { btn.style.background = hoverColor })
  btn.addEventListener('mouseleave', () => { btn.style.background = bgColor })
  btn.addEventListener('mousedown',  () => { btn.style.transform = 'scale(0.96)' })
  btn.addEventListener('mouseup',    () => { btn.style.transform = 'scale(1)' })
  return btn
}

// Draw a slot canvas showing a block icon (or empty).
function makeSlotCanvas(blockId, atlas, borderColor = 'rgba(255,255,255,0.20)') {
  const cvs = document.createElement('canvas')
  cvs.width = cvs.height = SLOT
  applyStyle(cvs, {
    imageRendering: 'pixelated', cursor: 'pointer',
    borderRadius: '10px', border: `2px solid ${borderColor}`,
    background: 'rgba(0,0,0,0.25)',
  })
  const ctx = cvs.getContext('2d')
  if (blockId) {
    const d = BLOCK_BY_ID.get(blockId)
    const style = d?.tex?.all || d?.tex?.top || d?.tex?.side
    if (style) atlas.drawTile(ctx, 6, 6, SLOT - 12, style)
  }
  return cvs
}

// Draw a small label under a slot.
function makeSlotLabel(text) {
  const el = document.createElement('div')
  el.textContent = text
  applyStyle(el, {
    color: 'rgba(255,255,255,0.50)', fontSize: '0.62rem',
    textAlign: 'center', marginTop: '3px', width: `${SLOT}px`,
  })
  return el
}

// A slot group: canvas + label stacked vertically.
function makeSlotGroup(label, blockId, atlas, borderColor) {
  const wrap = document.createElement('div')
  applyStyle(wrap, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' })
  const cvs = makeSlotCanvas(blockId, atlas, borderColor)
  wrap.appendChild(cvs)
  wrap.appendChild(makeSlotLabel(label))
  return { wrap, cvs }
}

// Arrow label between slots.
function makeArrow() {
  const el = document.createElement('div')
  el.textContent = '>'
  applyStyle(el, { color: 'rgba(255,255,255,0.55)', fontSize: '1.4rem', padding: '0 4px', marginBottom: '18px' })
  return el
}

// Mini hotbar shown inside cooking UIs so the player can select items without closing the UI.
function makeHotbarRow(inventory, atlas, lang) {
  const HSLOT = 34, HGAP = 3
  const wrap = document.createElement('div')
  applyStyle(wrap, {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    marginTop: '6px', padding: '7px 10px',
    background: 'rgba(0,0,0,0.28)', borderRadius: '10px',
    width: '100%', boxSizing: 'border-box',
  })

  const lbl = document.createElement('div')
  lbl.textContent = lang === 'no' ? 'Klikk vare i hurtigvalget:' : 'Click item in hotbar to select:'
  applyStyle(lbl, { color: 'rgba(255,255,255,0.38)', fontSize: '0.62rem' })
  wrap.appendChild(lbl)

  const row = document.createElement('div')
  applyStyle(row, { display: 'flex', gap: `${HGAP}px` })
  wrap.appendChild(row)

  const canvases = []

  function renderHotbar() {
    canvases.forEach((cvs, i) => {
      const sel = i === inventory.selectedSlot
      cvs.style.border = sel ? '2px solid rgba(255,220,50,0.90)' : '2px solid rgba(255,255,255,0.12)'
      cvs.style.boxShadow = sel ? '0 0 6px rgba(255,220,50,0.40)' : 'none'
      const ctx = cvs.getContext('2d')
      ctx.clearRect(0, 0, HSLOT, HSLOT)
      const blockId = inventory.slots[i] || 0
      if (blockId) {
        const d = BLOCK_BY_ID.get(blockId)
        const style = d?.tex?.all || d?.tex?.top || d?.tex?.side
        if (style) atlas.drawTile(ctx, 3, 3, HSLOT - 6, style)
      }
    })
  }

  for (let i = 0; i < 9; i++) {
    const cvs = document.createElement('canvas')
    cvs.width = cvs.height = HSLOT
    applyStyle(cvs, {
      imageRendering: 'pixelated', cursor: 'pointer', borderRadius: '6px',
      background: 'rgba(0,0,0,0.30)',
    })
    canvases.push(cvs)
    row.appendChild(cvs)
    cvs.addEventListener('click', () => { inventory.selectSlot(i); renderHotbar() })
  }

  renderHotbar()
  return { wrap, renderHotbar }
}

// Timer progress bar for stove cooking animation.
function makeTimerBar(accentColor) {
  const outer = document.createElement('div')
  applyStyle(outer, {
    width: '200px', height: '8px', borderRadius: '4px',
    background: 'rgba(255,255,255,0.12)', overflow: 'hidden',
  })
  const inner = document.createElement('div')
  applyStyle(inner, {
    height: '100%', width: '0%', borderRadius: '4px',
    background: accentColor, transition: 'width 0.05s linear',
  })
  outer.appendChild(inner)
  return { outer, inner }
}

// ─────────────────────────────────────────────────────────────
//  CHOPPING BOARD
// ─────────────────────────────────────────────────────────────
export function openChoppingBoard(inventory, atlas, showToast, controls, lang) {
  if (document.getElementById('chop-ui')) return
  controls.unlock()

  let knifeId = 0
  let inputId = 0
  let outputId = 0

  const overlay = makeOverlay('chop-ui')
  const panel   = makePanel('rgba(42,28,14,0.97)')
  panel.style.background = 'rgba(42,28,14,0.97)'

  const title = makeTitle(
    lang === 'no' ? 'Skjærebrett' : 'Chopping Board',
    '#D4A574',
  )
  panel.appendChild(title)

  // ── Slot row ──────────────────────────────────────────────
  const row = document.createElement('div')
  applyStyle(row, { display: 'flex', alignItems: 'flex-end', gap: `${SLOT_GAP}px` })

  const knifeSG  = makeSlotGroup(lang === 'no' ? 'Kniv' : 'Knife',   0, atlas, 'rgba(184,196,204,0.45)')
  const inputSG  = makeSlotGroup(lang === 'no' ? 'Råvare' : 'Input', 0, atlas, 'rgba(212,165,116,0.40)')
  const arr      = makeArrow()
  const outputSG = makeSlotGroup(lang === 'no' ? 'Resultat' : 'Result', 0, atlas, 'rgba(120,200,100,0.40)')

  row.append(knifeSG.wrap, inputSG.wrap, arr, outputSG.wrap)
  panel.appendChild(row)

  const chopBtn = makeBtn(
    lang === 'no' ? 'Hakk!' : 'Chop!',
    '#7A4F2A', '#9A6F3A',
  )
  panel.appendChild(chopBtn)
  panel.appendChild(makeHint(
    lang === 'no'
      ? 'Legg kniv + råvare, trykk Hakk  -  E / Esc lukker'
      : 'Place knife + ingredient, press Chop  -  E / Esc to close',
  ))

  const { wrap: hbWrap, renderHotbar: renderHB } = makeHotbarRow(inventory, atlas, lang)
  panel.appendChild(hbWrap)

  overlay.appendChild(panel)
  document.getElementById('ui-root').appendChild(overlay)

  function redrawSlot(sg, id, borderColor) {
    sg.cvs.style.border = `2px solid ${borderColor}`
    const ctx = sg.cvs.getContext('2d')
    ctx.clearRect(0, 0, SLOT, SLOT)
    if (id) {
      const d = BLOCK_BY_ID.get(id)
      const style = d?.tex?.all || d?.tex?.top || d?.tex?.side
      if (style) atlas.drawTile(ctx, 6, 6, SLOT - 12, style)
    }
  }

  // Source slots so items return to where they came from
  let knifeSlot  = -1
  let inputSlot  = -1
  let outputDest = -1  // slot freed by consuming the ingredient — safe landing for the result

  // Knife slot: put or take knife
  knifeSG.cvs.addEventListener('click', () => {
    const selId = inventory.selectedBlockId()
    if (!knifeId && selId === ID_KNIFE) {
      knifeSlot = inventory.selectedSlot
      knifeId = ID_KNIFE
      inventory.setSlot(knifeSlot, 0)
      renderHB()
      redrawSlot(knifeSG, knifeId, 'rgba(184,196,204,0.75)')
    } else if (knifeId) {
      inventory.setSlot(knifeSlot, knifeId)
      knifeId = 0; knifeSlot = -1; outputId = 0
      renderHB()
      redrawSlot(knifeSG, 0, 'rgba(184,196,204,0.45)')
      redrawSlot(outputSG, 0, 'rgba(120,200,100,0.40)')
    }
  })

  // Input slot
  inputSG.cvs.addEventListener('click', () => {
    const selId = inventory.selectedBlockId()
    if (!inputId && selId && CHOP_INPUTS.has(selId)) {
      inputSlot = inventory.selectedSlot
      inputId = selId
      inventory.setSlot(inputSlot, 0)
      renderHB()
      outputId = 0
      redrawSlot(inputSG, inputId, 'rgba(212,165,116,0.75)')
      redrawSlot(outputSG, 0, 'rgba(120,200,100,0.40)')
    } else if (!inputId && selId) {
      showToast(lang === 'no' ? 'Kan ikke hakkes her' : 'Not a valid ingredient', 1800)
    } else if (inputId) {
      inventory.setSlot(inputSlot, inputId)
      inputId = 0; inputSlot = -1; outputId = 0
      renderHB()
      redrawSlot(inputSG, 0, 'rgba(212,165,116,0.40)')
      redrawSlot(outputSG, 0, 'rgba(120,200,100,0.40)')
    }
  })

  // Output slot: take result
  outputSG.cvs.addEventListener('click', () => {
    if (outputId) {
      inventory.setSlot(outputDest !== -1 ? outputDest : inventory.selectedSlot, outputId)
      outputId = 0; outputDest = -1; inputId = 0; inputSlot = -1
      renderHB()
      redrawSlot(outputSG, 0, 'rgba(120,200,100,0.40)')
      redrawSlot(inputSG,  0, 'rgba(212,165,116,0.40)')
    }
  })

  // Chop button
  chopBtn.addEventListener('click', () => {
    if (!knifeId) {
      showToast(lang === 'no' ? 'Du trenger en kniv!' : 'You need a knife!', 1800); return
    }
    if (!inputId) {
      showToast(lang === 'no' ? 'Legg inn en råvare' : 'Add an ingredient', 1800); return
    }
    if (outputId) return
    const result = CHOP_RECIPES[inputId]
    if (!result) {
      showToast(lang === 'no' ? 'Kan ikke hakkes' : 'Cannot chop this', 1800); return
    }
    outputDest = inputSlot
    outputId = result; inputId = 0; inputSlot = -1
    redrawSlot(inputSG,  0,        'rgba(212,165,116,0.40)')
    redrawSlot(outputSG, outputId, 'rgba(120,200,100,0.75)')
    const name = BLOCK_BY_ID.get(outputId)
    const nameStr = (lang === 'no' ? name?.nameNo : name?.nameEn) ?? ''
    showToast((lang === 'no' ? 'Ferdig: ' : 'Done: ') + nameStr, 2200)
  })

  function close() {
    if (knifeId)  inventory.setSlot(knifeSlot, knifeId)
    if (inputId)  inventory.setSlot(inputSlot, inputId)
    if (outputId) inventory.setSlot(outputDest !== -1 ? outputDest : inventory.selectedSlot, outputId)
    overlay.remove(); controls.lock()
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  overlay._close = close
}

// ─────────────────────────────────────────────────────────────
//  MIXING BOWL
// ─────────────────────────────────────────────────────────────
export function openMixingBowl(inventory, atlas, showToast, controls, lang) {
  if (document.getElementById('mix-ui')) return
  controls.unlock()

  let whiskId  = 0
  const inputs = [0, 0, 0]
  let outputId = 0

  const overlay = makeOverlay('mix-ui')
  const panel   = makePanel('rgba(22,36,48,0.97)')

  panel.appendChild(makeTitle(lang === 'no' ? 'Miksebolle' : 'Mixing Bowl', '#70B0E0'))

  // ── Top row: whisk + 3 ingredients ───────────────────────
  const topRow = document.createElement('div')
  applyStyle(topRow, { display: 'flex', alignItems: 'flex-end', gap: `${SLOT_GAP}px` })

  const whiskSG = makeSlotGroup(lang === 'no' ? 'Visp' : 'Whisk', 0, atlas, 'rgba(192,200,208,0.45)')
  const inSGs   = [
    makeSlotGroup('1', 0, atlas, 'rgba(100,160,220,0.40)'),
    makeSlotGroup('2', 0, atlas, 'rgba(100,160,220,0.40)'),
    makeSlotGroup('3', 0, atlas, 'rgba(100,160,220,0.40)'),
  ]

  topRow.append(whiskSG.wrap, ...inSGs.map(g => g.wrap))
  panel.appendChild(topRow)

  // ── Bottom row: arrow + output ────────────────────────────
  const botRow = document.createElement('div')
  applyStyle(botRow, { display: 'flex', alignItems: 'flex-end', gap: `${SLOT_GAP}px`, marginTop: '-4px' })
  const outSG = makeSlotGroup(lang === 'no' ? 'Resultat' : 'Result', 0, atlas, 'rgba(120,200,100,0.40)')
  botRow.append(makeArrow(), outSG.wrap)
  panel.appendChild(botRow)

  const mixBtn = makeBtn(lang === 'no' ? 'Miks!' : 'Mix!', '#206090', '#2878B0')
  panel.appendChild(mixBtn)
  panel.appendChild(makeHint(
    lang === 'no'
      ? 'Legg visp + ingredienser, trykk Miks  -  E / Esc lukker'
      : 'Place whisk + ingredients, press Mix  -  E / Esc to close',
  ))

  const { wrap: hbWrapMix, renderHotbar: renderHB } = makeHotbarRow(inventory, atlas, lang)
  panel.appendChild(hbWrapMix)

  overlay.appendChild(panel)
  document.getElementById('ui-root').appendChild(overlay)

  function redrawSlot(sg, id, borderColor) {
    sg.cvs.style.border = `2px solid ${borderColor}`
    const ctx = sg.cvs.getContext('2d')
    ctx.clearRect(0, 0, SLOT, SLOT)
    if (id) {
      const d = BLOCK_BY_ID.get(id)
      const style = d?.tex?.all || d?.tex?.top || d?.tex?.side
      if (style) atlas.drawTile(ctx, 6, 6, SLOT - 12, style)
    }
  }

  let whiskSlot  = -1
  const inputSlots = [-1, -1, -1]
  let outputDest = -1

  whiskSG.cvs.addEventListener('click', () => {
    const selId = inventory.selectedBlockId()
    if (!whiskId && selId === ID_WHISK) {
      whiskSlot = inventory.selectedSlot
      whiskId = ID_WHISK
      inventory.setSlot(whiskSlot, 0)
      renderHB()
      redrawSlot(whiskSG, whiskId, 'rgba(192,200,208,0.80)')
    } else if (whiskId) {
      inventory.setSlot(whiskSlot, whiskId)
      whiskId = 0; whiskSlot = -1; outputId = 0
      renderHB()
      redrawSlot(whiskSG, 0, 'rgba(192,200,208,0.45)')
      redrawSlot(outSG,   0, 'rgba(120,200,100,0.40)')
    }
  })

  inSGs.forEach((sg, i) => {
    sg.cvs.addEventListener('click', () => {
      const selId = inventory.selectedBlockId()
      if (!inputs[i] && selId && MIX_INPUTS.has(selId)) {
        inputSlots[i] = inventory.selectedSlot
        inputs[i] = selId; outputId = 0
        inventory.setSlot(inputSlots[i], 0)
        renderHB()
        redrawSlot(sg,    inputs[i], 'rgba(100,160,220,0.75)')
        redrawSlot(outSG, 0,         'rgba(120,200,100,0.40)')
      } else if (!inputs[i] && selId) {
        showToast(lang === 'no' ? 'Ikke en gyldig ingrediens' : 'Not a valid ingredient', 1800)
      } else if (inputs[i]) {
        inventory.setSlot(inputSlots[i], inputs[i])
        inputs[i] = 0; inputSlots[i] = -1; outputId = 0
        renderHB()
        redrawSlot(sg,    0, 'rgba(100,160,220,0.40)')
        redrawSlot(outSG, 0, 'rgba(120,200,100,0.40)')
      }
    })
  })

  outSG.cvs.addEventListener('click', () => {
    if (outputId) {
      inventory.setSlot(outputDest !== -1 ? outputDest : inventory.selectedSlot, outputId)
      outputId = 0; outputDest = -1; inputs.fill(0); inputSlots.fill(-1)
      renderHB()
      redrawSlot(outSG, 0, 'rgba(120,200,100,0.40)')
      inSGs.forEach(sg => redrawSlot(sg, 0, 'rgba(100,160,220,0.40)'))
    }
  })

  // CSS swirl animation injected once
  if (!document.getElementById('mix-style')) {
    const s = document.createElement('style')
    s.id = 'mix-style'
    s.textContent = `
      @keyframes klMixSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .kl-mix-spin { animation: klMixSpin 0.6s linear infinite; display: inline-block; }
    `
    document.head.appendChild(s)
  }

  mixBtn.addEventListener('click', () => {
    if (!whiskId) {
      showToast(lang === 'no' ? 'Du trenger en visp!' : 'You need a whisk!', 1800); return
    }
    const filled = inputs.filter(id => id !== 0)
    if (filled.length < 2) {
      showToast(lang === 'no' ? 'Legg til minst 2 ingredienser' : 'Add at least 2 ingredients', 1800); return
    }
    if (outputId) return

    const sorted = [...filled].sort((a, b) => a - b)
    const match = MIX_RECIPES.find(r => {
      const rs = [...r.inputs].sort((a, b) => a - b)
      return rs.length === sorted.length && rs.every((v, i) => v === sorted[i])
    })
    if (!match) {
      showToast(lang === 'no' ? 'Ukjent oppskrift' : 'No matching recipe', 1800); return
    }

    // Animate: briefly show spin on button text
    mixBtn.innerHTML = `<span class="kl-mix-spin">~</span>`
    setTimeout(() => {
      mixBtn.textContent = lang === 'no' ? 'Miks!' : 'Mix!'
      outputDest = inputSlots.find(s => s !== -1) ?? -1
      outputId = match.output; inputs.fill(0); inputSlots.fill(-1)
      inSGs.forEach(sg => redrawSlot(sg, 0, 'rgba(100,160,220,0.40)'))
      redrawSlot(outSG, outputId, 'rgba(120,200,100,0.75)')
      const name = BLOCK_BY_ID.get(outputId)
      const nameStr = (lang === 'no' ? name?.nameNo : name?.nameEn) ?? ''
      showToast((lang === 'no' ? 'Klart: ' : 'Ready: ') + nameStr, 2200)
    }, 700)
  })

  function close() {
    if (whiskId) inventory.setSlot(whiskSlot, whiskId)
    inputs.forEach((id, i) => { if (id) inventory.setSlot(inputSlots[i], id) })
    if (outputId) inventory.setSlot(outputDest !== -1 ? outputDest : inventory.selectedSlot, outputId)
    overlay.remove(); controls.lock()
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  overlay._close = close
}

// ─────────────────────────────────────────────────────────────
//  STOVE (upgraded — 2 ingredient slots + cookware)
// ─────────────────────────────────────────────────────────────
export function openStove(blockName, inventory, atlas, showToast, controls, lang) {
  if (document.getElementById('cooking-ui')) return
  controls.unlock()

  let cookwareId = 0
  const ingredients = [0, 0]
  let outputId = 0
  let cooking  = false

  const isCampfire = blockName === 'campfire'
  const bgColor    = isCampfire ? 'rgba(40,20,8,0.97)' : 'rgba(30,20,10,0.97)'
  const accent     = '#FF8030'

  const overlay = makeOverlay('cooking-ui')
  const panel   = makePanel(bgColor)

  const titleStr = lang === 'no'
    ? (isCampfire ? 'Baal' : 'Komfyr')
    : (isCampfire ? 'Campfire' : 'Stove')
  panel.appendChild(makeTitle(titleStr, accent))

  // ── Flame decoration (CSS only) ──────────────────────────
  if (!document.getElementById('flame-style')) {
    const s = document.createElement('style')
    s.id = 'flame-style'
    s.textContent = `
      @keyframes klFlame {
        0%,100% { transform: scaleY(1) scaleX(1); opacity: 1; }
        33%      { transform: scaleY(1.15) scaleX(0.9); opacity: 0.85; }
        66%      { transform: scaleY(0.9) scaleX(1.05); opacity: 0.95; }
      }
      .kl-flame { animation: klFlame 1s ease-in-out infinite; display: inline-block; }
    `
    document.head.appendChild(s)
  }
  const flameLine = document.createElement('div')
  flameLine.innerHTML = `<span class="kl-flame" style="color:#FF6010;font-size:1rem;">||| ||| |||</span>`
  applyStyle(flameLine, { textAlign: 'center', height: '20px', lineHeight: '20px', letterSpacing: '3px' })
  panel.appendChild(flameLine)

  // ── Slot row ──────────────────────────────────────────────
  const row = document.createElement('div')
  applyStyle(row, { display: 'flex', alignItems: 'flex-end', gap: `${SLOT_GAP}px` })

  const cwSG  = makeSlotGroup(lang === 'no' ? 'Kokekar' : 'Cookware', 0, atlas, 'rgba(255,128,48,0.40)')
  const inSGs = [
    makeSlotGroup('1', 0, atlas, 'rgba(255,176,80,0.35)'),
    makeSlotGroup('2', 0, atlas, 'rgba(255,176,80,0.35)'),
  ]
  const outSG = makeSlotGroup(lang === 'no' ? 'Resultat' : 'Result',  0, atlas, 'rgba(120,200,100,0.40)')

  row.append(cwSG.wrap, ...inSGs.map(g => g.wrap), makeArrow(), outSG.wrap)
  panel.appendChild(row)

  // Timer bar
  const { outer: timerOuter, inner: timerInner } = makeTimerBar(accent)
  timerOuter.style.display = 'none'
  panel.appendChild(timerOuter)

  const cookBtn = makeBtn(lang === 'no' ? 'Tilbered!' : 'Cook!', '#B84010', '#D05010')
  panel.appendChild(cookBtn)
  panel.appendChild(makeHint(
    lang === 'no'
      ? 'Kokekar + ingredienser, trykk Tilbered  -  E / Esc lukker'
      : 'Cookware + ingredients, press Cook  -  E / Esc to close',
  ))

  const { wrap: hbWrapStove, renderHotbar: renderHB } = makeHotbarRow(inventory, atlas, lang)
  panel.appendChild(hbWrapStove)

  overlay.appendChild(panel)
  document.getElementById('ui-root').appendChild(overlay)

  function redrawSlot(sg, id, borderColor) {
    sg.cvs.style.border = `2px solid ${borderColor}`
    const ctx = sg.cvs.getContext('2d')
    ctx.clearRect(0, 0, SLOT, SLOT)
    if (id) {
      const d = BLOCK_BY_ID.get(id)
      const style = d?.tex?.all || d?.tex?.top || d?.tex?.side
      if (style) atlas.drawTile(ctx, 6, 6, SLOT - 12, style)
    }
  }

  let cwSlot    = -1
  const ingSlots = [-1, -1]
  let outputDest = -1

  cwSG.cvs.addEventListener('click', () => {
    const selId = inventory.selectedBlockId()
    const isValid = selId === ID_PAN || selId === ID_POT
    if (!cookwareId && isValid) {
      cwSlot = inventory.selectedSlot
      cookwareId = selId
      inventory.setSlot(cwSlot, 0)
      renderHB()
      redrawSlot(cwSG, cookwareId, 'rgba(255,128,48,0.80)')
    } else if (cookwareId) {
      inventory.setSlot(cwSlot, cookwareId)
      cookwareId = 0; cwSlot = -1; outputId = 0
      renderHB()
      redrawSlot(cwSG,  0, 'rgba(255,128,48,0.40)')
      redrawSlot(outSG, 0, 'rgba(120,200,100,0.40)')
    }
  })

  inSGs.forEach((sg, i) => {
    sg.cvs.addEventListener('click', () => {
      const selId = inventory.selectedBlockId()
      if (!ingredients[i] && selId && COOK_INPUTS.has(selId)) {
        ingSlots[i] = inventory.selectedSlot
        ingredients[i] = selId; outputId = 0
        inventory.setSlot(ingSlots[i], 0)
        renderHB()
        redrawSlot(sg,    ingredients[i], 'rgba(255,176,80,0.75)')
        redrawSlot(outSG, 0,              'rgba(120,200,100,0.40)')
      } else if (!ingredients[i] && selId) {
        showToast(lang === 'no' ? 'Ikke en gyldig ingrediens' : 'Not a valid ingredient', 1800)
      } else if (ingredients[i]) {
        inventory.setSlot(ingSlots[i], ingredients[i])
        ingredients[i] = 0; ingSlots[i] = -1; outputId = 0
        renderHB()
        redrawSlot(sg,    0, 'rgba(255,176,80,0.35)')
        redrawSlot(outSG, 0, 'rgba(120,200,100,0.40)')
      }
    })
  })

  outSG.cvs.addEventListener('click', () => {
    if (outputId && !cooking) {
      inventory.setSlot(outputDest !== -1 ? outputDest : inventory.selectedSlot, outputId)
      outputId = 0; outputDest = -1; ingredients.fill(0); ingSlots.fill(-1)
      renderHB()
      redrawSlot(outSG, 0, 'rgba(120,200,100,0.40)')
      inSGs.forEach(sg => redrawSlot(sg, 0, 'rgba(255,176,80,0.35)'))
    }
  })

  cookBtn.addEventListener('click', () => {
    if (cooking || outputId) return
    const filled = ingredients.filter(id => id !== 0)
    if (filled.length === 0) {
      showToast(lang === 'no' ? 'Legg til ingredienser' : 'Add ingredients', 1800); return
    }
    if (!cookwareId) {
      showToast(lang === 'no' ? 'Du trenger kokekar (gryte eller panne)' : 'Need cookware (pot or pan)', 1800); return
    }

    const match = COOK_RECIPES.find(r => {
      const same = r.ingredients.every(id => filled.includes(id)) &&
                   filled.every(id => r.ingredients.includes(id))
      return same && r.utensilId === cookwareId
    })
    if (!match) {
      showToast(lang === 'no' ? 'Ukjent oppskrift' : 'No matching recipe', 1800); return
    }

    cooking = true
    cookBtn.disabled = true
    cookBtn.style.opacity = '0.5'
    timerOuter.style.display = 'block'

    let start = null
    const COOK_MS = 2000
    function animate(ts) {
      if (!start) start = ts
      const pct = Math.min((ts - start) / COOK_MS, 1)
      timerInner.style.width = `${pct * 100}%`
      if (pct < 1) { requestAnimationFrame(animate); return }

      // Done — ingredients consumed, cookware stays in station
      outputDest = ingSlots.find(s => s !== -1) ?? -1
      outputId = match.output; ingredients.fill(0); ingSlots.fill(-1)
      inSGs.forEach(sg => redrawSlot(sg, 0, 'rgba(255,176,80,0.35)'))
      redrawSlot(outSG, outputId, 'rgba(120,200,100,0.75)')
      timerOuter.style.display = 'none'
      timerInner.style.width = '0%'
      cooking = false
      cookBtn.disabled = false
      cookBtn.style.opacity = '1'
      const name = BLOCK_BY_ID.get(outputId)
      const nameStr = (lang === 'no' ? name?.nameNo : name?.nameEn) ?? ''
      showToast((lang === 'no' ? 'Ferdig: ' : 'Done: ') + nameStr, 2500)
    }
    requestAnimationFrame(animate)
  })

  function close() {
    if (!cooking) {
      if (cookwareId) inventory.setSlot(cwSlot, cookwareId)
      ingredients.forEach((id, i) => { if (id) inventory.setSlot(ingSlots[i], id) })
      if (outputId) inventory.setSlot(outputDest !== -1 ? outputDest : inventory.selectedSlot, outputId)
    }
    overlay.remove(); controls.lock()
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  overlay._close = close
}

// ─────────────────────────────────────────────────────────────
//  RECIPE BOOK
// ─────────────────────────────────────────────────────────────
export function openRecipeBook(atlas, controls, lang) {
  if (document.getElementById('recipe-ui')) return
  controls.unlock()

  const TABS = [
    { key: 'prep',  en: 'Prep',  no: 'Prep'  },
    { key: 'mix',   en: 'Mix',   no: 'Miks'  },
    { key: 'stove', en: 'Stove', no: 'Komfyr'},
  ]
  let activeTab = 'prep'

  const overlay = makeOverlay('recipe-ui')
  const panel   = makePanel('rgba(60,36,14,0.98)')
  applyStyle(panel, { minWidth: '520px', maxWidth: '600px', gap: '10px' })

  panel.appendChild(makeTitle(lang === 'no' ? 'Kokebok' : 'Recipe Book', '#D4A574'))

  // Tab bar
  const tabBar = document.createElement('div')
  applyStyle(tabBar, { display: 'flex', gap: '6px' })

  function makeTabBtn(tab) {
    const btn = document.createElement('button')
    btn.textContent = lang === 'no' ? tab.no : tab.en
    btn.dataset.tab = tab.key
    applyStyle(btn, {
      border: 'none', borderRadius: '8px 8px 0 0',
      padding: '7px 18px', cursor: 'pointer', fontWeight: '600',
      fontSize: '0.85rem', transition: 'background 0.15s',
    })
    return btn
  }
  const tabBtns = TABS.map(makeTabBtn)
  tabBtns.forEach(b => tabBar.appendChild(b))
  panel.appendChild(tabBar)

  // Content area
  const content = document.createElement('div')
  applyStyle(content, {
    background: 'rgba(250,244,228,0.95)', borderRadius: '10px',
    padding: '16px 18px', minHeight: '260px', width: '100%',
    boxSizing: 'border-box', overflowY: 'auto', maxHeight: '420px',
  })
  panel.appendChild(content)

  panel.appendChild(makeHint(lang === 'no' ? 'E / Esc for aa lukke' : 'E / Esc to close'))

  overlay.appendChild(panel)
  document.getElementById('ui-root').appendChild(overlay)

  // ── Render current tab ──────────────────────────────────
  function renderTab() {
    content.innerHTML = ''
    tabBtns.forEach(b => {
      const active = b.dataset.tab === activeTab
      applyStyle(b, {
        background: active ? 'rgba(250,244,228,0.95)' : 'rgba(120,70,20,0.50)',
        color:      active ? '#3C2010' : '#E0C090',
      })
    })

    const section = RECIPE_BOOK.find(s => s.tab === activeTab)
    if (!section) return

    // Station header
    const stHdr = document.createElement('div')
    stHdr.textContent = (lang === 'no' ? section.station.no : section.station.en)
    applyStyle(stHdr, {
      fontWeight: '700', fontSize: '0.85rem',
      color: '#7A4F2A', marginBottom: '10px', letterSpacing: '0.05em',
    })
    content.appendChild(stHdr)

    // Utensil required line
    if (section.utensil) {
      const uDef = BLOCK_BY_ID.get(section.utensil)
      const uName = (lang === 'no' ? uDef?.nameNo : uDef?.nameEn) ?? ''
      const uLine = document.createElement('div')
      applyStyle(uLine, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' })
      const uCvs = makeSlotCanvas(section.utensil, atlas, 'rgba(180,140,80,0.40)')
      uCvs.style.width = uCvs.style.height = '32px'
      uCvs.width = uCvs.height = 32
      const uCtx = uCvs.getContext('2d')
      const ud = BLOCK_BY_ID.get(section.utensil)
      const us = ud?.tex?.all || ud?.tex?.top
      if (us) atlas.drawTile(uCtx, 3, 3, 26, us)
      const uLabel = document.createElement('span')
      uLabel.textContent = (lang === 'no' ? 'Krever: ' : 'Requires: ') + uName
      applyStyle(uLabel, { fontSize: '0.75rem', color: '#8B5E3C', fontStyle: 'italic' })
      uLine.append(uCvs, uLabel)
      content.appendChild(uLine)
    }

    // Recipe rows
    for (const recipe of section.recipes) {
      const row = document.createElement('div')
      applyStyle(row, {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 10px', marginBottom: '6px',
        background: 'rgba(255,248,232,0.80)', borderRadius: '8px',
        border: '1px solid rgba(180,140,80,0.25)',
      })

      // Input icons
      for (const id of recipe.inputs) {
        const cvs = document.createElement('canvas')
        cvs.width = cvs.height = 36
        applyStyle(cvs, {
          imageRendering: 'pixelated', borderRadius: '6px',
          border: '1.5px solid rgba(180,140,80,0.30)',
          background: 'rgba(0,0,0,0.06)',
          flexShrink: '0',
        })
        const ctx = cvs.getContext('2d')
        const d = BLOCK_BY_ID.get(id)
        const style = d?.tex?.all || d?.tex?.top
        if (style) atlas.drawTile(ctx, 4, 4, 28, style)

        const nameEl = document.createElement('div')
        nameEl.textContent = (lang === 'no' ? d?.nameNo : d?.nameEn) ?? '?'
        applyStyle(nameEl, { fontSize: '0.60rem', color: '#8B5E3C', textAlign: 'center', maxWidth: '36px', lineHeight: '1.2' })

        const col = document.createElement('div')
        applyStyle(col, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' })
        col.append(cvs, nameEl)
        row.appendChild(col)

        // Plus sign between inputs
        if (id !== recipe.inputs[recipe.inputs.length - 1]) {
          const plus = document.createElement('span')
          plus.textContent = '+'
          applyStyle(plus, { color: '#A07040', fontSize: '1rem', fontWeight: '700', flexShrink: '0' })
          row.appendChild(plus)
        }
      }

      // Arrow
      const arr = document.createElement('span')
      arr.textContent = '>'
      applyStyle(arr, { color: '#A07040', fontSize: '1.2rem', fontWeight: '700', padding: '0 4px', flexShrink: '0' })
      row.appendChild(arr)

      // Output icon
      const outCvs = document.createElement('canvas')
      outCvs.width = outCvs.height = 42
      applyStyle(outCvs, {
        imageRendering: 'pixelated', borderRadius: '8px',
        border: '2px solid rgba(80,180,60,0.45)',
        background: 'rgba(0,0,0,0.06)', flexShrink: '0',
      })
      const octx = outCvs.getContext('2d')
      const od = BLOCK_BY_ID.get(recipe.output)
      const os = od?.tex?.all || od?.tex?.top
      if (os) atlas.drawTile(octx, 5, 5, 32, os)

      const outName = document.createElement('div')
      outName.textContent = (lang === 'no' ? od?.nameNo : od?.nameEn) ?? '?'
      applyStyle(outName, { fontSize: '0.68rem', color: '#4A7830', fontWeight: '700', textAlign: 'center', maxWidth: '42px' })

      const outCol = document.createElement('div')
      applyStyle(outCol, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' })
      outCol.append(outCvs, outName)
      row.appendChild(outCol)

      content.appendChild(row)
    }
  }

  tabBtns.forEach(b => {
    b.addEventListener('click', () => { activeTab = b.dataset.tab; renderTab() })
  })
  renderTab()

  function close() { overlay.remove(); controls.lock() }
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  overlay._close = close
}
