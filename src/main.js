// ─────────────────────────────────────────────────────────────
//  Klosseland — main.js
//  Boot sequence + game loop.
// ─────────────────────────────────────────────────────────────
import './style.css'
import * as THREE           from 'three'
import { atlas }            from './engine/TextureAtlas.js'
import { Renderer }         from './engine/Renderer.js'
import { ChunkMesher }      from './engine/ChunkMesher.js'
import { World }            from './world/World.js'
import { Player }           from './player/Player.js'
import { Controls }         from './player/Controls.js'
import { Camera }           from './player/Camera.js'
import { setLanguage }      from './i18n/index.js'
import { Inventory }        from './player/Inventory.js'
import { Hotbar }           from './ui/Hotbar.js'
import { ToolBar }          from './ui/ToolBar.js'
import { ProduceBar }       from './ui/ProduceBar.js'
import { castRay }          from './player/BlockRaycaster.js'
import { REACH_DISTANCE, LANGUAGES, BIOME } from './data/constants.js'
import { TitleScreen }      from './ui/TitleScreen.js'
import { CharacterScreen }  from './ui/CharacterScreen.js'
import { WorldSelect, loadWorlds, saveWorlds } from './ui/WorldSelect.js'
import { Settings, loadSettings } from './ui/Settings.js'
import { PauseMenu }        from './ui/PauseMenu.js'
import { InventoryScreen }  from './ui/InventoryScreen.js'
import { SoundSystem }      from './systems/SoundSystem.js'
import { AnimalSystem }     from './systems/AnimalSystem.js'
import { DayNightCycle }    from './systems/DayNightCycle.js'
import { NetworkManager }   from './systems/NetworkManager.js'
import { WaterSystem }      from './systems/WaterSystem.js'
import { ParticleSystem }   from './systems/ParticleSystem.js'
import { BLOCK_BY_ID, BLOCK_BY_KEY, getBlockColor } from './data/blockDefinitions.js'
import { Firework } from './entities/Firework.js'
import { ChatUI }           from './ui/ChatUI.js'
import { PlayerMesh }       from './entities/PlayerMesh.js'
import { AnimationSystem }  from './systems/AnimationSystem.js'
import { HeldItemMesh }     from './entities/HeldItemMesh.js'
import { PetSystem }        from './systems/PetSystem.js'
import { LightingSystem }  from './systems/LightingSystem.js'
import { FillTool }        from './tools/FillTool.js'
import { CopyPasteTool }   from './tools/CopyPasteTool.js'
import { Minimap }          from './ui/Minimap.js'
import { HUD }              from './ui/HUD.js'
import { WeatherSystem }    from './systems/WeatherSystem.js'
import { openChoppingBoard, openMixingBowl, openStove, openRecipeBook } from './ui/CookingUI.js'

// ── Directional furniture placement ──────────────────────────
// Maps camera yaw (radians) to furniture facing index 0-3.
// facing: 0=S (+Z), 1=W (-X), 2=N (-Z), 3=E (+X)
function yawToFacing(yaw) {
  if (yaw >= -Math.PI/4  && yaw <  Math.PI/4)  return 0  // looking south
  if (yaw >=  Math.PI/4  && yaw <  3*Math.PI/4) return 3  // looking east
  if (yaw >= -3*Math.PI/4 && yaw < -Math.PI/4)  return 1  // looking west
  return 2                                                  // looking north
}

// ── DOM refs ─────────────────────────────────────────────────
const canvas        = document.getElementById('game-canvas')
const loadingScreen = document.getElementById('loading-screen')
const loadingBar    = document.getElementById('loading-bar')
const loadingText   = document.getElementById('loading-text')

function setProgress(p, text) {
  loadingBar.style.width = `${Math.round(p * 100)}%`
  if (text) loadingText.textContent = text
}

// ─────────────────────────────────────────────────────────────
//  Simple overlay helpers (host/join dialogs)
// ─────────────────────────────────────────────────────────────

/**
 * Show a small dialog for entering a player name.
 * Returns the name (string) or null if cancelled.
 */
function showNameDialog(title, defaultName = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'kl-overlay'
    overlay.innerHTML = `
      <div class="kl-panel" style="min-width:320px;display:flex;flex-direction:column;gap:1rem">
        <h2 style="margin:0">${title}</h2>
        <input id="nd-name" class="kl-input" type="text" maxlength="24"
               placeholder="Your name" value="${defaultName}" autocomplete="off">
        <div style="display:flex;gap:0.5rem">
          <button class="kl-btn kl-btn-primary" id="nd-ok">OK</button>
          <button class="kl-btn" id="nd-cancel">Cancel</button>
        </div>
      </div>
    `
    document.getElementById('ui-root').appendChild(overlay)
    const nameEl = overlay.querySelector('#nd-name')
    nameEl.focus(); nameEl.select()

    const finish = (val) => { overlay.remove(); resolve(val) }

    overlay.querySelector('#nd-ok').onclick = () => {
      const v = nameEl.value.trim()
      if (v) { localStorage.setItem('kl_player_name', v); finish(v) }
    }
    overlay.querySelector('#nd-cancel').onclick = () => finish(null)
    nameEl.addEventListener('keydown', e => {
      if (e.code === 'Enter') overlay.querySelector('#nd-ok').click()
      if (e.code === 'Escape') finish(null)
    })
  })
}

/**
 * Show the join dialog: player name + host IP.
 * Returns { playerName, hostIp } or null if cancelled.
 */
function showJoinDialog(defaultName = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'kl-overlay'
    overlay.innerHTML = `
      <div class="kl-panel" style="min-width:340px;display:flex;flex-direction:column;gap:1rem">
        <h2 style="margin:0">Join a Game</h2>
        <label style="font-size:.85rem;color:rgba(255,255,255,.7)">Your name</label>
        <input id="jd-name" class="kl-input" type="text" maxlength="24"
               placeholder="Your name" value="${defaultName}" autocomplete="off">
        <label style="font-size:.85rem;color:rgba(255,255,255,.7)">Host IP address</label>
        <input id="jd-ip" class="kl-input" type="text" maxlength="64"
               placeholder="192.168.x.x" autocomplete="off"
               value="${localStorage.getItem('kl_last_host') || ''}">
        <div id="jd-error" style="color:#ff6b6b;font-size:.82rem;min-height:1em"></div>
        <div style="display:flex;gap:0.5rem">
          <button class="kl-btn kl-btn-primary" id="jd-connect">Connect</button>
          <button class="kl-btn" id="jd-cancel">Cancel</button>
        </div>
      </div>
    `
    document.getElementById('ui-root').appendChild(overlay)
    const nameEl  = overlay.querySelector('#jd-name')
    const ipEl    = overlay.querySelector('#jd-ip')
    const errorEl = overlay.querySelector('#jd-error')
    const connBtn = overlay.querySelector('#jd-connect')
    nameEl.focus()

    const finish = (val) => { overlay.remove(); resolve(val) }

    connBtn.onclick = () => {
      const name = nameEl.value.trim()
      const ip   = ipEl.value.trim()
      if (!name) { errorEl.textContent = 'Enter your name.'; return }
      if (!ip)   { errorEl.textContent = 'Enter the host IP.'; return }
      localStorage.setItem('kl_player_name', name)
      localStorage.setItem('kl_last_host', ip)
      finish({ playerName: name, hostIp: ip })
    }
    overlay.querySelector('#jd-cancel').onclick = () => finish(null)
    ;[nameEl, ipEl].forEach(el => el.addEventListener('keydown', e => {
      if (e.code === 'Enter') connBtn.click()
      if (e.code === 'Escape') finish(null)
    }))
  })
}

/**
 * Show a brief "Connecting…" overlay.
 * Returns { close } — call close() when done.
 */
function showConnectingOverlay(text = 'Connecting…') {
  const overlay = document.createElement('div')
  overlay.className = 'kl-overlay'
  overlay.innerHTML = `
    <div class="kl-panel" style="min-width:260px;text-align:center">
      <p style="margin:0;font-size:1.1rem">${text}</p>
    </div>
  `
  document.getElementById('ui-root').appendChild(overlay)
  return { close: () => overlay.remove() }
}

// ─────────────────────────────────────────────────────────────
//  App entry point — title → world select → game loop
// ─────────────────────────────────────────────────────────────
async function startApp() {
  const savedLang = localStorage.getItem('kl_lang') || 'en'
  setLanguage(savedLang)

  while (true) {
    const titleScreen = new TitleScreen()
    const action      = await titleScreen.show()

    const savedName = localStorage.getItem('kl_player_name') || ''

    // ── Character creation flow ────────────────────────────
    if (action === 'character') {
      const charScreen = new CharacterScreen()
      await charScreen.show()
      charScreen.hide()
      titleScreen.hide()
      continue
    }

    // ── Host flow ──────────────────────────────────────────
    if (action === 'host') {
      const playerName = await showNameDialog('Host a Game', savedName)
      if (!playerName) { titleScreen.hide(); continue }

      const worldSelect = new WorldSelect()
      const worldConfig = await worldSelect.show()
      if (worldConfig === null) { worldSelect.hide(); titleScreen.hide(); continue }

      titleScreen.hide()
      worldSelect.hide()
      _startLoading()

      try {
        await runGame(worldConfig, { mode: 'host', playerName })
      } catch (err) {
        _showLoadError(err)
        await new Promise(r => setTimeout(r, 3000))
        _hideLoading()
      }
      continue
    }

    // ── Join flow ──────────────────────────────────────────
    if (action === 'join') {
      const result = await showJoinDialog(savedName)
      if (!result) { titleScreen.hide(); continue }

      const { playerName, hostIp } = result

      // Connect before entering game — we need worldConfig from server
      const connecting = showConnectingOverlay(`Connecting to ${hostIp}…`)
      const net = new NetworkManager(null)   // scene bound later inside runGame
      let welcome
      try {
        welcome = await net.connect(hostIp, playerName, null, [])
      } catch (err) {
        connecting.close()
        titleScreen.hide()
        // Show error briefly then return to title
        const errEl = document.createElement('div')
        errEl.className = 'kl-overlay'
        errEl.innerHTML = `<div class="kl-panel" style="text-align:center">
          <p style="color:#ff6b6b">Could not connect:<br>${err.message}</p>
          <button class="kl-btn kl-btn-wide" id="err-ok">Back</button></div>`
        document.getElementById('ui-root').appendChild(errEl)
        await new Promise(r => { errEl.querySelector('#err-ok').onclick = r })
        errEl.remove()
        continue
      }
      connecting.close()

      if (!welcome.worldConfig) {
        // Server has no world yet (host hasn't started) — show message
        net.dispose()
        titleScreen.hide()
        const errEl = document.createElement('div')
        errEl.className = 'kl-overlay'
        errEl.innerHTML = `<div class="kl-panel" style="text-align:center">
          <p>The host hasn't started a game yet.<br>Ask them to click <b>Host Game</b> first.</p>
          <button class="kl-btn kl-btn-wide" id="err-ok">Back</button></div>`
        document.getElementById('ui-root').appendChild(errEl)
        await new Promise(r => { errEl.querySelector('#err-ok').onclick = r })
        errEl.remove()
        continue
      }

      titleScreen.hide()
      _startLoading()

      try {
        await runGame(welcome.worldConfig, {
          mode:       'join',
          playerName,
          hostIp,
          worldDelta: welcome.worldDelta,
          net,
        })
      } catch (err) {
        net.dispose()
        _showLoadError(err)
        await new Promise(r => setTimeout(r, 3000))
        _hideLoading()
      }
      continue
    }

    // ── Solo flow ──────────────────────────────────────────
    const worldSelect = new WorldSelect()
    const worldConfig = await worldSelect.show()

    if (worldConfig === null) {
      worldSelect.hide()
      titleScreen.hide()
      continue
    }

    titleScreen.hide()
    worldSelect.hide()
    _startLoading()

    try {
      await runGame(worldConfig)
    } catch (err) {
      _showLoadError(err)
      await new Promise(r => setTimeout(r, 3000))
      _hideLoading()
    }
  }
}

function _startLoading() {
  loadingScreen.style.display = 'flex'
  loadingBar.style.background = ''
  setProgress(0, 'Starting…')
  loadingScreen.classList.remove('hidden')
}

function _showLoadError(err) {
  console.error('[Klosseland] runGame crashed:', err)
  loadingScreen.style.display = 'flex'
  loadingScreen.classList.remove('hidden')
  loadingText.textContent = `Error: ${err.message || err}. Check console (F12).`
  loadingBar.style.background = '#FF5555'
}

function _hideLoading() {
  loadingScreen.classList.add('hidden')
  setTimeout(() => { loadingScreen.style.display = 'none' }, 700)
}

// ─────────────────────────────────────────────────────────────
//  Main game session
// ─────────────────────────────────────────────────────────────
/**
 * @param {object} worldConfig
 * @param {{ mode?: 'solo'|'host'|'join', playerName?: string,
 *           hostIp?: string, worldDelta?: Array, net?: NetworkManager }} [netOpts]
 */
async function runGame(worldConfig, netOpts = {}) {
  const {
    mode        = 'solo',
    playerName  = localStorage.getItem('kl_player_name') || 'Player',
    worldDelta  = [],
    net: existingNet = null,
  } = netOpts

  const gameSettings = loadSettings()

  // ── 1. Texture atlas ─────────────────────────────────────
  setProgress(0.05, 'Building textures…')
  atlas.build(p => setProgress(0.05 + p * 0.4, 'Building textures…'))
  setProgress(0.45)

  // ── 2. Renderer ──────────────────────────────────────────
  setProgress(0.5, 'Creating renderer…')
  const renderer        = new Renderer(canvas)
  const mesher          = new ChunkMesher(renderer)
  const lightingSystem  = new LightingSystem(renderer.scene)
  const fillTool        = new FillTool()
  const copyPaste       = new CopyPasteTool(renderer.scene)

  // ── 3. World ─────────────────────────────────────────────
  setProgress(0.55, 'Generating world…')
  const world = new World({
    sizeKey:     worldConfig.sizeKey     ?? 'medium',
    seed:        worldConfig.seed        ?? Math.floor(Math.random() * 99999),
    terrainType: worldConfig.terrainType ?? 'hills',
    worldId:     mode !== 'join' ? (worldConfig.id ?? null) : null,
  })

  // For join: apply server delta before loading chunks
  if (mode === 'join' && worldDelta.length) {
    world.setNetworkDelta(worldDelta)
  }

  await world.load()

  // ── 4. Network setup ─────────────────────────────────────
  let network = null

  if (mode === 'host') {
    setProgress(0.57, 'Starting server connection…')
    network = new NetworkManager(renderer.scene)
    try {
      await network.connect('localhost', playerName, {
        seed:        world.seed,
        terrainType: world.terrainType,
        sizeKey:     world.sizeKey,
        worldId:     worldConfig.id ?? null,
      }, world.getDelta())
    } catch (err) {
      console.warn('[Net] Could not connect to local server:', err.message)
      console.warn('[Net] Running without multiplayer. Is "npm run server" running?')
      network.dispose()
      network = null
    }
  } else if (mode === 'join' && existingNet) {
    network = existingNet
    network.setScene(renderer.scene)
  }

  // ── 5. Sound ─────────────────────────────────────────────
  const soundSystem = new SoundSystem()
  soundSystem.setVolume(gameSettings.volume ?? 0.8)
  soundSystem.setAmbientVolume(gameSettings.ambientVolume ?? 0.45)
  soundSystem.setSfxVolume(gameSettings.sfxVolume ?? 1.0)
  soundSystem.init()

  // ── 6. Player ────────────────────────────────────────────
  const player   = new Player()
  const controls = new Controls(canvas)
  const camera   = new Camera(renderer.camera)

  // Apply game mode before spawn so creative starts flying
  player.setGameMode(worldConfig.gameMode ?? 'creative')

  // Resolve spawn origin — biome-targeted or default (0, 0)
  let spawnOriginX = 0, spawnOriginZ = 0
  if (!worldConfig.playerPos && worldConfig.startingBiome && worldConfig.startingBiome !== 'random') {
    const biomeId = BIOME[worldConfig.startingBiome]
    if (biomeId !== undefined) {
      const found = world.findBiomeSpawn(biomeId)
      spawnOriginX = found.x
      spawnOriginZ = found.z
    }
  }

  const PRELOAD   = 4
  const totalRows = PRELOAD * 2 + 1
  for (let dx = -PRELOAD; dx <= PRELOAD; dx++) {
    for (let dz = -PRELOAD; dz <= PRELOAD; dz++) {
      world.loadChunk(spawnOriginX / 16 + dx, spawnOriginZ / 16 + dz)
    }
    const row = dx + PRELOAD + 1
    setProgress(0.6 + 0.15 * (row / totalRows), 'Loading spawn area…')
    await new Promise(r => setTimeout(r, 0))  // yield so progress bar paints
  }
  setProgress(0.75, 'Finding spawn…')
  if (worldConfig.playerPos) {
    player.x = worldConfig.playerPos.x
    player.y = worldConfig.playerPos.y
    player.z = worldConfig.playerPos.z
  } else {
    player.spawnAt(spawnOriginX, spawnOriginZ, world)
  }
  const playerMesh    = new PlayerMesh(renderer.scene)
  const animSystem    = new AnimationSystem(playerMesh)
  const heldItemMesh  = new HeldItemMesh(playerMesh, atlas)
  const petSystem     = new PetSystem(renderer.scene)

  setProgress(0.8, 'Meshing terrain…')
  world.updateChunks(
    Math.floor(spawnOriginX / 16), Math.floor(spawnOriginZ / 16),
    mesher, renderer.scene, Infinity, Infinity, lightingSystem
  )

  // Start off-thread mesh workers now that the atlas is fully built.
  world.initMeshWorkers(atlas.getStyleIndex())

  // ── 7. Water + Particles + Weather ───────────────────────
  const waterSystem      = new WaterSystem(world)
  const bloodWaterSystem = new WaterSystem(world, { sourceId: 238, flowId: 239 })
  const particleSystem   = new ParticleSystem(renderer.scene)
  const weatherSystem    = new WeatherSystem(renderer.scene)

  // Seed both liquid systems with blocks already in the world
  world.eachChunk(chunk => { waterSystem.scanChunk(chunk); bloodWaterSystem.scanChunk(chunk) })

  // ── 7b. Signs — text overlay meshes ─────────────────────
  const _signMeshes = new Map()  // "bx,by,bz" → THREE.Mesh
  const _fireworks  = []         // active Firework instances

  // ── Phase 21 — Fireworks ─────────────────────────────────
  const _fireworks = []   // active Firework instances

  const _SIGN_FACE_POS = [
    (bx, by, bz) => [bx + 0.5,   by + 0.725, bz + 0.527],  // facing=0 S
    (bx, by, bz) => [bx + 0.473, by + 0.725, bz + 0.5  ],  // facing=1 W
    (bx, by, bz) => [bx + 0.5,   by + 0.725, bz + 0.473],  // facing=2 N
    (bx, by, bz) => [bx + 0.527, by + 0.725, bz + 0.5  ],  // facing=3 E
  ]
  const _SIGN_ROT_Y = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

  function _wrapSignText(text, maxCols) {
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const w = word.slice(0, maxCols)
      if (line.length + (line ? 1 : 0) + w.length <= maxCols) {
        line += (line ? ' ' : '') + w
      } else {
        if (line) lines.push(line)
        line = w
      }
    }
    if (line) lines.push(line)
    return lines.slice(0, 3)
  }

  function updateSignMesh(bx, by, bz, def, text) {
    const key = `${bx},${by},${bz}`
    const old = _signMeshes.get(key)
    if (old) { old.removeFromParent(); old.geometry.dispose(); old.material.map?.dispose(); old.material.dispose() }
    if (!text) { _signMeshes.delete(key); return }

    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 128
    const ctx2d = canvas.getContext('2d')
    ctx2d.clearRect(0, 0, 256, 128)
    ctx2d.fillStyle = '#2A1A08'
    ctx2d.font = 'bold 20px monospace'
    ctx2d.textAlign = 'center'
    ctx2d.textBaseline = 'middle'
    const lines = _wrapSignText(text, 18)
    const lineH = 26
    const startY = 64 - ((lines.length - 1) * lineH) / 2
    for (let i = 0; i < lines.length; i++) {
      ctx2d.fillText(lines[i], 128, startY + i * lineH)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.50),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    )
    const facing = def.facing ?? 0
    const [px, py, pz] = _SIGN_FACE_POS[facing](bx, by, bz)
    mesh.position.set(px, py, pz)
    mesh.rotation.y = _SIGN_ROT_Y[facing]
    renderer.scene.add(mesh)
    _signMeshes.set(key, mesh)
  }

  function removeSignMesh(bx, by, bz) {
    updateSignMesh(bx, by, bz, null, null)
  }

  // Restore any sign text from saved meta
  if (world.save) {
    world.save.eachSavedBlock((bx, by, bz, id) => {
      const def = BLOCK_BY_ID.get(id)
      if (def?.interactable === 'sign') {
        const meta = world.save.getMeta(bx, by, bz)
        if (meta?.text) updateSignMesh(bx, by, bz, def, meta.text)
      }
    })
  }

  // ── 8. Animals ───────────────────────────────────────────
  const animalSystem = new AnimalSystem(renderer.scene)

  // ── 9. HUD ───────────────────────────────────────────────
  _buildHUD(mode !== 'solo')
  const minimap = new Minimap()
  minimap.mount()
  const hud = new HUD()
  hud.mount()
  const inventory        = new Inventory()
  const hotbar           = new Hotbar(inventory)
  const toolBar          = new ToolBar(inventory)
  const produceBar       = new ProduceBar(inventory)
  const inventoryScreen  = new InventoryScreen(inventory)

  // ── 9. Chat (multiplayer only) ───────────────────────────
  let chatUI = null
  if (network) {
    chatUI = new ChatUI()
    chatUI.mount()
    chatUI.onSend(text => {
      network.sendChat(text)
      chatUI.addOwnMessage(playerName, text)
    })
    network.onChat((name, text) => {
      chatUI?.addMessage(name, text)
    })
    network.onPlayerEvent((type, _id, name) => {
      if (type === 'join') chatUI?.addNotice(`${name} joined the game.`)
      else                 chatUI?.addNotice(`${name} left the game.`)
    })
    network.onBlockChange((bx, by, bz, id) => {
      const oldId = world.getBlock(bx, by, bz)
      world.setBlock(bx, by, bz, id)
      waterSystem.onBlockChange(bx, by, bz, id, oldId)
      bloodWaterSystem.onBlockChange(bx, by, bz, id, oldId)
      if (id > 0) lightingSystem.blockPlaced(bx, by, bz, id)
      else        lightingSystem.blockBroken(bx, by, bz)
    })
    network.onSignUpdate((bx, by, bz, text) => {
      const def = BLOCK_BY_ID.get(world.getBlock(bx, by, bz))
      if (!def) return
      if (text) {
        world.save?.setMeta(bx, by, bz, { text })
        updateSignMesh(bx, by, bz, def, text)
      } else {
        world.save?.deleteMeta(bx, by, bz)
        removeSignMesh(bx, by, bz)
      }
    })
    network.onFireworkLaunch((wx, wy, wz, fwType) => {
      const def = BLOCK_BY_KEY.get(fwType)
      if (!def?.isFirework) return
      _fireworks.push(new Firework(renderer.scene, particleSystem, soundSystem, wx, wy, wz, def.burstColors))
    })
    network.setLocalState(() => ({
      x: player.x, y: player.y, z: player.z,
      yaw: camera.yaw, pitch: 0,
    }))
  }

  // ── 10. Show LAN IP for host ──────────────────────────────
  if (mode === 'host') {
    _fetchAndShowHostIp()
  }

  // ── 11. Pause + settings ──────────────────────────────────
  const pauseMenu = new PauseMenu()
  let   paused    = false
  let   resolveQuit

  function openSettings() {
    const settings = new Settings(gameSettings, mode !== 'solo')
    settings.show().then(() => {
      DAY_DURATION_S = gameSettings.dayDurationMin * 60
      soundSystem.setVolume(gameSettings.volume ?? 0.8)
      soundSystem.setAmbientVolume(gameSettings.ambientVolume ?? 0.45)
      soundSystem.setSfxVolume(gameSettings.sfxVolume ?? 1.0)
      _syncLangButtons()
    })
  }

  async function doQuit() {
    inventoryScreen.hide()
    if (worldConfig.id && mode !== 'join') {
      const worlds = loadWorlds()
      const entry  = worlds.find(w => w.id === worldConfig.id)
      if (entry) {
        entry.playerPos  = { x: player.x, y: player.y, z: player.z }
        entry.lastPlayed = Date.now()
        saveWorlds(worlds)
      }
    }
    await world.flush()
    world.dispose()
    heldItemMesh.dispose()
    animSystem.dispose()
    playerMesh.dispose()
    soundSystem.dispose()
    lightingSystem.dispose()
    copyPaste.dispose()
    animalSystem.dispose()
    petSystem.dispose()
    for (const fw of _fireworks) fw.dispose()
    _fireworks.length = 0
    particleSystem.dispose()
    weatherSystem.dispose()
    dayNightCycle.dispose()
    controls.dispose()
    renderer.dispose?.()
    chatUI?.dispose()
    network?.dispose()
    for (const fw of _fireworks) fw.dispose()
    _fireworks.length = 0
    minimap.dispose()
    hud.dispose()
    _clearHUD()
    pauseMenu.hide()
    paused = false
    resolveQuit()
  }

  function pause() {
    if (paused) return
    if (inventoryScreen.visible) inventoryScreen.hide()
    paused = true
    controls.unlock()
    pauseMenu.show({
      onResume() {
        pauseMenu.hide()
        paused = false
        controls.lock()
      },
      onSettings: openSettings,
      onQuit() { doQuit() },
      getPlayers: network ? () => network.getPlayerList() : null,
      playerName,
    })
  }

  function onKeyDown(e) {
    // Don't intercept keys while chat input is open
    if (chatUI?.isOpen) return

    // Close any open interactive UI (chest, fridge, cooking stations) before other handling
    if (e.code === 'KeyE' || e.code === 'Escape') {
      const openUi = document.getElementById('chest-ui')
                  || document.getElementById('fridge-ui')
                  || document.getElementById('cooking-ui')
                  || document.getElementById('chop-ui')
                  || document.getElementById('mix-ui')
                  || document.getElementById('recipe-ui')
      if (openUi) { openUi._close?.(); return }
    }

    if (e.code === 'KeyM' && !paused) {
      minimap.toggle()
      return
    }
    if (e.code === 'F3') {
      e.preventDefault()
      hud.toggleCoords()
      return
    }
    if (e.code === 'Tab') {
      e.preventDefault()
      if (paused) return
      if (inventoryScreen.visible) {
        inventoryScreen.hide()
        controls.lock()
      } else {
        controls.unlock()
        inventoryScreen.show()
      }
      return
    }
    if (e.code === 'Escape') {
      if (inventoryScreen.visible) {
        inventoryScreen.hide()
        controls.lock()
        return
      }
      if (copyPaste.pasteMode || copyPaste.hasSelection) {
        copyPaste.clearAll()
        return
      }
      if (paused) {
        pauseMenu.hide()
        paused = false
        controls.lock()
      } else {
        pause()
      }
    }
  }
  window.addEventListener('keydown', onKeyDown)

  // ── 12. Day/night cycle ───────────────────────────────────
  let DAY_DURATION_S = gameSettings.dayDurationMin * 60
  const dayNightCycle = new DayNightCycle(renderer, 0.35)
  dayNightCycle.on('dawn',     () => soundSystem.onDayEvent('dawn'))
  dayNightCycle.on('noon',     () => soundSystem.onDayEvent('noon'))
  dayNightCycle.on('dusk',     () => soundSystem.onDayEvent('dusk'))
  dayNightCycle.on('midnight', () => soundSystem.onDayEvent('midnight'))

  // ── 13. Fade out loading screen ───────────────────────────
  setProgress(1, "Let's go!")
  await new Promise(r => setTimeout(r, 350))
  loadingScreen.classList.add('hidden')
  await new Promise(r => setTimeout(r, 700))
  loadingScreen.style.display = 'none'

  // ── 14. Game loop ─────────────────────────────────────────
  const quitPromise = new Promise(r => { resolveQuit = r })
  const _rayDir     = new THREE.Vector3()
  let   lastTime    = performance.now()
  let   elapsed     = 0
  let   rafId

  // Hold-to-break state
  let   breakTarget  = null   // { bx, by, bz, elapsed }
  const BREAK_TIME       = 0.8  // seconds to break any block
  const SPONGE_ID        = 168
  const WATER_SOURCE_ID  = 10

  // Phase 15 — per-frame state
  let _prevUnderwater = false
  let _footstepTimer  = 0

  // ── Multi-block break helper ──────────────────────────────
  function breakBlock(bx, by, bz) {
    const oldId  = world.getBlock(bx, by, bz)
    const oldDef = BLOCK_BY_ID.get(oldId)
    if (!oldId) return

    const toBreak = [[bx, by, bz]]
    let mainBx = bx, mainBy = by, mainBz = bz
    let mainDef = oldDef

    if (oldDef?.isPart && oldDef.partnerDelta) {
      const [dx, dy, dz] = oldDef.partnerDelta
      mainBx = bx + dx; mainBy = by + dy; mainBz = bz + dz
      toBreak.push([mainBx, mainBy, mainBz])
      mainDef = BLOCK_BY_ID.get(world.getBlock(mainBx, mainBy, mainBz))
    }

    if (mainDef?.multiBlock) {
      const parts = Array.isArray(mainDef.multiBlock)
        ? mainDef.multiBlock : [mainDef.multiBlock]
      for (const { dx, dy, dz } of parts) {
        const cx = mainBx + dx, cy = mainBy + dy, cz = mainBz + dz
        if (!toBreak.some(([x, y, z]) => x === cx && y === cy && z === cz))
          toBreak.push([cx, cy, cz])
      }
    }
    for (const [x, y, z] of toBreak) {
      const id  = world.getBlock(x, y, z)
      const def = BLOCK_BY_ID.get(id)
      if (!id) continue
      world.setBlock(x, y, z, 0)
      waterSystem.onBlockChange(x, y, z, 0, id)
      bloodWaterSystem.onBlockChange(x, y, z, 0, id)
      network?.sendBlockChange(x, y, z, 0)
      lightingSystem.blockBroken(x, y, z)
      if (def?.liquid) particleSystem.emitWaterSplash(x + 0.5, y + 0.5, z + 0.5)
      if (def?.interactable === 'sign') {
        world.save?.deleteMeta(x, y, z)
        removeSignMesh(x, y, z)
      }

      // Remove any surface decoration sitting on top of the broken block
      const aboveId  = world.getBlock(x, y + 1, z)
      const aboveDef = aboveId ? BLOCK_BY_ID.get(aboveId) : null
      if (aboveDef && aboveDef.solid === false && !aboveDef.liquid) {
        world.setBlock(x, y + 1, z, 0)
        waterSystem.onBlockChange(x, y + 1, z, 0, aboveId)
        bloodWaterSystem.onBlockChange(x, y + 1, z, 0, aboveId)
        network?.sendBlockChange(x, y + 1, z, 0)
        lightingSystem.blockBroken(x, y + 1, z)
        const [ar, ag, ab] = getBlockColor(aboveDef)
        particleSystem.emitBlockBreak(x, y + 1, z, ar, ag, ab)
      }
    }
    soundSystem.onBlockBreak(oldId)
    const [r, g, b] = getBlockColor(oldDef)
    particleSystem.emitBlockBreak(bx, by, bz, r, g, b)
  }

  // ── Interaction state ─────────────────────────────────────
  let sittingAt  = null   // { bx, by, bz } or null
  let sleepingAt = null   // { bx, by, bz } or null
  const chestStorage = new Map()   // "bx,by,bz" → number[9]
  const fridgeStorage = new Map()  // "bx,by,bz" → number[9]

  function showToast(msg, duration = 2800) {
    let el = document.getElementById('hud-toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'hud-toast'
      Object.assign(el.style, {
        position: 'fixed', bottom: '148px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.72)', color: '#fff',
        padding: '7px 20px', borderRadius: '20px',
        fontSize: '0.88rem', fontWeight: '600',
        pointerEvents: 'none', transition: 'opacity 0.45s',
        whiteSpace: 'nowrap', zIndex: '20',
      })
      document.getElementById('ui-root').appendChild(el)
    }
    el.textContent = msg
    el.style.opacity = '1'
    clearTimeout(el._t)
    el._t = setTimeout(() => { el.style.opacity = '0' }, duration)
  }

  // facing: 0=S(+Z), 1=W(-X), 2=N(-Z), 3=E(+X)
  // Yaw so the character faces the furniture's front (sits/lies along the furniture axis).
  const _FURN_YAWS    = [0, -Math.PI / 2, Math.PI, Math.PI / 2]
  // Foot direction offset per facing (from head block toward foot block).
  const _FOOT_DIR_X   = [0, -1,  0, 1]
  const _FOOT_DIR_Z   = [1,  0, -1, 0]

  function standUp() {
    if (!sittingAt) return
    player.x  = sittingAt.px ?? sittingAt.bx + 0.5
    player.y  = (sittingAt.py ?? sittingAt.by + 0.5) + 1.2
    player.z  = sittingAt.pz ?? sittingAt.bz + 0.5
    player.vx = player.vy = player.vz = 0
    sittingAt = null
  }

  function sitOn(bx, by, bz, facing) {
    const yaw = _FURN_YAWS[facing] ?? 0
    sittingAt = { bx, by, bz, yaw }
    player.x  = bx + 0.5
    player.z  = bz + 0.5
    player.y  = by + 0.5
    player.vx = player.vy = player.vz = 0
    playerMesh.setFacing(yaw)
    showToast('Trykk E for å stå opp  /  Press E to stand up')
  }

  function wakeUp() {
    if (!sleepingAt) return
    player.x  = sleepingAt.bx + 0.5
    player.y  = sleepingAt.by + 1.5
    player.z  = sleepingAt.bz + 0.5
    player.vx = player.vy = player.vz = 0
    sleepingAt = null
  }

  function sleepOn(bx, by, bz, facing) {
    const yaw  = _FURN_YAWS[facing] ?? 0
    const fdx  = _FOOT_DIR_X[facing] ?? 0
    const fdz  = _FOOT_DIR_Z[facing] ?? 1
    // With Euler YXZ and rotation.x=-PI/2, head direction = (-sin(yaw), 0, -cos(yaw)).
    // Set group so body center lands at bed center (midpoint of head+foot blocks).
    const H  = 1.7
    const px = bx + 0.5 + fdx * 0.5 + (H / 2) * Math.sin(yaw)
    const py = by + 0.65
    const pz = bz + 0.5 + fdz * 0.5 + (H / 2) * Math.cos(yaw)
    sleepingAt = { bx, by, bz, px, py, pz, yaw }
    player.x  = px
    player.y  = py
    player.z  = pz
    player.vx = player.vy = player.vz = 0
    playerMesh.setFacing(yaw)
    showToast('Trykk E for å våkne  /  Press E to wake up', 3500)
  }

  function openChest(bx, by, bz) {
    const key    = `${bx},${by},${bz}`
    if (!chestStorage.has(key)) chestStorage.set(key, new Array(9).fill(0))
    const slots  = chestStorage.get(key)
    const lang   = localStorage.getItem('kl_lang') || 'en'

    if (document.getElementById('chest-ui')) return  // already open
    controls.unlock()

    const overlay = document.createElement('div')
    overlay.id = 'chest-ui'
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', zIndex: '500',
    })

    const panel = document.createElement('div')
    Object.assign(panel.style, {
      background: 'rgba(30,28,36,0.97)', borderRadius: '12px',
      padding: '20px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '12px', minWidth: '260px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    })

    const title = document.createElement('div')
    title.textContent = lang === 'no' ? 'Kiste' : 'Chest'
    Object.assign(title.style, {
      color: '#fff', fontWeight: '700', fontSize: '1.1rem',
    })
    panel.appendChild(title)

    const grid = document.createElement('canvas')
    const SLOT = 48, GAP = 4, COLS = 3, ROWS = 3
    grid.width  = COLS * SLOT + (COLS - 1) * GAP
    grid.height = ROWS * SLOT + (ROWS - 1) * GAP
    Object.assign(grid.style, { imageRendering: 'pixelated', cursor: 'pointer' })
    panel.appendChild(grid)

    const hint = document.createElement('div')
    hint.textContent = lang === 'no'
      ? 'Klikk for å sette/hente blokker  •  E / Esc for å lukke'
      : 'Click to put/take blocks  •  E / Esc to close'
    Object.assign(hint.style, {
      color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem',
    })
    panel.appendChild(hint)
    overlay.appendChild(panel)
    document.getElementById('ui-root').appendChild(overlay)

    function drawChestGrid() {
      const ctx = grid.getContext('2d')
      ctx.clearRect(0, 0, grid.width, grid.height)
      for (let i = 0; i < 9; i++) {
        const col = i % COLS, row = Math.floor(i / COLS)
        const x = col * (SLOT + GAP), y = row * (SLOT + GAP)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.beginPath()
        try { ctx.roundRect(x, y, SLOT, SLOT, 5) } catch { ctx.rect(x, y, SLOT, SLOT) }
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth = 1
        ctx.stroke()
        if (slots[i]) {
          const def = BLOCK_BY_ID.get(slots[i])
          if (def?.tex) {
            const style = def.tex.all || def.tex.top || def.tex.side
            if (style) atlas.drawTile(ctx, x + 4, y + 4, SLOT - 8, style)
          }
        }
      }
    }
    drawChestGrid()

    grid.addEventListener('click', e => {
      const rect  = grid.getBoundingClientRect()
      const mx    = e.clientX - rect.left
      const my    = e.clientY - rect.top
      const col   = Math.floor(mx / (SLOT + GAP))
      const row   = Math.floor(my / (SLOT + GAP))
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      const idx   = row * COLS + col
      const selId = inventory.selectedBlockId()
      if (selId && !slots[idx]) {
        slots[idx] = selId
      } else if (slots[idx]) {
        inventory.setSlot(inventory.selectedSlot, slots[idx])
        slots[idx] = 0
      }
      drawChestGrid()
    })

    function closeChest() {
      overlay.remove()
      controls.lock()
    }

    overlay.addEventListener('click', e => { if (e.target === overlay) closeChest() })
    overlay._close = closeChest
  }

  function openFridge(bx, by, bz) {
    const def = BLOCK_BY_ID.get(world.getBlock(bx, by, bz))
    // Normalize to bottom block position
    const ky  = def?.isPart ? by + (def.partnerDelta?.[1] ?? 0) : by
    const key = `${bx},${ky},${bz}`
    if (!fridgeStorage.has(key)) fridgeStorage.set(key, new Array(9).fill(0))
    const slots = fridgeStorage.get(key)
    const lang  = localStorage.getItem('kl_lang') || 'en'

    if (document.getElementById('fridge-ui')) return
    controls.unlock()

    const overlay = document.createElement('div')
    overlay.id = 'fridge-ui'
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', zIndex: '500',
    })
    const panel = document.createElement('div')
    Object.assign(panel.style, {
      background: 'rgba(20,36,56,0.97)', borderRadius: '12px',
      padding: '20px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '12px', minWidth: '260px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    })
    const title = document.createElement('div')
    title.textContent = lang === 'no' ? 'Kjøleskap' : 'Fridge'
    Object.assign(title.style, { color: '#88CCFF', fontWeight: '700', fontSize: '1.1rem' })
    panel.appendChild(title)

    const grid = document.createElement('canvas')
    const SLOT = 48, GAP = 4, COLS = 3, ROWS = 3
    grid.width = COLS * SLOT + (COLS - 1) * GAP
    grid.height = ROWS * SLOT + (ROWS - 1) * GAP
    Object.assign(grid.style, { imageRendering: 'pixelated', cursor: 'pointer' })
    panel.appendChild(grid)

    const hint = document.createElement('div')
    hint.textContent = lang === 'no'
      ? 'Klikk for å sette/hente mat  •  E / Esc for å lukke'
      : 'Click to put/take items  •  E / Esc to close'
    Object.assign(hint.style, { color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' })
    panel.appendChild(hint)
    overlay.appendChild(panel)
    document.getElementById('ui-root').appendChild(overlay)

    function drawGrid() {
      const ctx = grid.getContext('2d')
      ctx.clearRect(0, 0, grid.width, grid.height)
      for (let i = 0; i < 9; i++) {
        const col = i % COLS, row = Math.floor(i / COLS)
        const x = col * (SLOT + GAP), y = row * (SLOT + GAP)
        ctx.fillStyle = 'rgba(130,200,255,0.08)'
        ctx.beginPath()
        try { ctx.roundRect(x, y, SLOT, SLOT, 5) } catch { ctx.rect(x, y, SLOT, SLOT) }
        ctx.fill()
        ctx.strokeStyle = 'rgba(130,200,255,0.22)'
        ctx.lineWidth = 1; ctx.stroke()
        if (slots[i]) {
          const d = BLOCK_BY_ID.get(slots[i])
          if (d?.tex) {
            const style = d.tex.all || d.tex.top || d.tex.side
            if (style) atlas.drawTile(ctx, x + 4, y + 4, SLOT - 8, style)
          }
        }
      }
    }
    drawGrid()
    grid.addEventListener('click', e => {
      const rect = grid.getBoundingClientRect()
      const col  = Math.floor((e.clientX - rect.left) / (SLOT + GAP))
      const row  = Math.floor((e.clientY - rect.top)  / (SLOT + GAP))
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      const idx = row * COLS + col
      const selId = inventory.selectedBlockId()
      if (selId && !slots[idx]) { slots[idx] = selId }
      else if (slots[idx]) { inventory.setSlot(inventory.selectedSlot, slots[idx]); slots[idx] = 0 }
      drawGrid()
    })
    function closeFridge() { overlay.remove(); controls.lock() }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeFridge() })
    overlay._close = closeFridge
  }

  function handleInteract(bx, by, bz) {
    const lang = localStorage.getItem('kl_lang') || 'en'
    const id  = world.getBlock(bx, by, bz)
    const def = BLOCK_BY_ID.get(id)
    if (!def?.interactable) return
    if (def.interactable === 'sit')        sitOn(bx, by, bz, def.facing ?? 0)
    else if (def.interactable === 'bed')   sleepOn(bx, by, bz, def.facing ?? 0)
    else if (def.interactable === 'chest') openChest(bx, by, bz)
    else if (def.interactable === 'fridge') openFridge(bx, by, bz)
    else if (def.interactable === 'chopbench')
      openChoppingBoard(inventory, atlas, showToast, controls, lang)
    else if (def.interactable === 'mixbowl')
      openMixingBowl(inventory, atlas, showToast, controls, lang)
    else if (def.interactable === 'stove' || def.interactable === 'campfire')
      openStove(def.interactable, inventory, atlas, showToast, controls, lang)
    else if (def.interactable === 'recipebook')
      openRecipeBook(atlas, controls, lang)
    else if (def.interactable === 'firework') {
      world.setBlock(bx, by, bz, 0)
      network?.sendBlockChange(bx, by, bz, 0)
      const fw = new Firework(renderer.scene, particleSystem, soundSystem, bx, by, bz, def.burstColors)
      _fireworks.push(fw)
      network?.sendFireworkLaunch(bx, by, bz, def.key)
    }
    else if (def.interactable === 'bathtub') {
      // Resolve to main block if player clicked a companion part
      let mainBx = bx, mainBy = by, mainBz = bz
      if (def.isPart && def.partnerDelta) {
        mainBx = bx + def.partnerDelta[0]
        mainBy = by + def.partnerDelta[1]
        mainBz = bz + def.partnerDelta[2]
      }
      const mainDef = BLOCK_BY_ID.get(world.getBlock(mainBx, mainBy, mainBz))
      sitOn(mainBx, mainBy, mainBz, mainDef?.facing ?? 0)
      // Override position to centre of the 2×2 tub at water level
      sittingAt.px = mainBx + 1
      sittingAt.py = mainBy + 0.35
      sittingAt.pz = mainBz + 1
      player.x = sittingAt.px
      player.y = sittingAt.py
      player.z = sittingAt.pz
      const _bLang = localStorage.getItem('kl_lang') || 'en'
      showToast(_bLang === 'no' ? 'Ahh, deilig bad!' : 'Ahh, so relaxing!', 2500)
    } else if (def.interactable === 'sign') {
      openSignEdit(bx, by, bz, def)
    }
  }

  function openSignEdit(bx, by, bz, def) {
    const save = world.save
    const currentText = save?.getMeta(bx, by, bz)?.text ?? ''

    const overlay = document.createElement('div')
    overlay.id = 'sign-edit-overlay'
    overlay.innerHTML = `
      <div class="sign-edit-box">
        <textarea id="sign-text-input" maxlength="54">${currentText}</textarea>
      </div>
    `
    document.body.appendChild(overlay)
    controls.unlock()

    const input = overlay.querySelector('#sign-text-input')
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)

    function confirm() {
      const text = input.value.trim()
      if (text) {
        save?.setMeta(bx, by, bz, { text })
        updateSignMesh(bx, by, bz, def, text)
      } else {
        save?.deleteMeta(bx, by, bz)
        removeSignMesh(bx, by, bz)
      }
      network?.sendSignUpdate(bx, by, bz, text)
      closeOverlay()
    }

    function closeOverlay() {
      overlay.remove()
      controls.lock()
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirm() }
      else if (e.key === 'Escape') closeOverlay()
    })
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay() })
  }

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05)
    lastTime = ts

    if (!paused) {
      elapsed += dt

      // Block input while chat is open
      const chatOpen = chatUI?.isOpen ?? false
      const lang     = localStorage.getItem('kl_lang') || 'en'

      // Skip physics entirely while sitting/sleeping — running gravity + collision
      // then overriding position causes a per-frame snap oscillation (shaking).
      if (sittingAt) {
        player.x  = sittingAt.px ?? sittingAt.bx + 0.5
        player.z  = sittingAt.pz ?? sittingAt.bz + 0.5
        player.y  = sittingAt.py ?? sittingAt.by + 0.5
        player.vx = player.vy = player.vz = 0
        playerMesh.setFacing(sittingAt.yaw)
        const seatId  = world.getBlock(sittingAt.bx, sittingAt.by, sittingAt.bz)
        const seatDef = BLOCK_BY_ID.get(seatId)
        if (!seatDef?.interactable || (seatDef.interactable !== 'sit' && seatDef.interactable !== 'bathtub')) standUp()
      } else if (sleepingAt) {
        player.x  = sleepingAt.px
        player.y  = sleepingAt.py
        player.z  = sleepingAt.pz
        player.vx = player.vy = player.vz = 0
        playerMesh.setFacing(sleepingAt.yaw)
        const bedId  = world.getBlock(sleepingAt.bx, sleepingAt.by, sleepingAt.bz)
        const bedDef = BLOCK_BY_ID.get(bedId)
        if (!bedDef?.interactable || bedDef.interactable !== 'bed') wakeUp()
      } else {
        player.update(dt, controls, world)
      }

      // Adventure mode: respawn on fatal fall
      if (player.respawnQueued) {
        player.respawnQueued = false
        player.y = world.getSurfaceY(Math.floor(player.x), Math.floor(player.z)) + 3
        player.vx = player.vy = player.vz = 0
      }

      playerMesh.update(player.x, player.y, player.z, player.vx, player.vz)
      animSystem.isSitting  = sittingAt  !== null
      animSystem.isSleeping = sleepingAt !== null
      const _selId  = inventory.selectedBlockId()
      heldItemMesh.setItem(_selId ?? 0, _selId ? BLOCK_BY_ID.get(_selId) : null)
      animSystem.heldItemType = heldItemMesh.itemType
      animSystem.update(dt, player, controls)
      camera.update(player, controls, world, dt)
      soundSystem.update(dt, player, world)
      animalSystem.update(dt, player, world, dayNightCycle.isNight)
      petSystem.update(dt, player, world)

      if (!chatOpen) {
        inventory.scroll(controls.getWheelDelta())
        const slotKey = controls.getSlotKey()
        if (slotKey >= 0) inventory.selectSlot(slotKey)
      }

      renderer.camera.getWorldDirection(_rayDir)
      const cam = renderer.camera.position
      const selectedId = inventory.selectedBlockId()
      const ray = castRay(
        cam.x, cam.y, cam.z,
        _rayDir.x, _rayDir.y, _rayDir.z,
        REACH_DISTANCE, world,
        (bx, by, bz) => {
          const _bid = world.getBlock(bx, by, bz)
          if (selectedId === SPONGE_ID && _bid === WATER_SOURCE_ID) return true
          return BLOCK_BY_ID.get(_bid)?.interactable === 'firework'
        },
      )

      // ── Creative tool keys (no ray required) ─────────────
      if (!chatOpen) {
        if (controls.consumeKey('KeyC') && copyPaste.hasSelection) copyPaste.copy(world)
        if (controls.consumeKey('KeyV') && copyPaste.hasCopy)      copyPaste.enterPasteMode()
      }

      if (ray.hit) {
        renderer.selectionBox.position.set(ray.bx + 0.5, ray.by + 0.5, ray.bz + 0.5)
        renderer.selectionBox.visible = true

        // Update paste-mode ghost position
        if (copyPaste.pasteMode) copyPaste.updatePastePreview(ray.bx, ray.by, ray.bz)

        // Smart placement: if ray hits the upper portion of a vertical face,
        // redirect to place on top of the block instead of to the side.
        let pnx = ray.nx, pny = ray.ny, pnz = ray.nz
        if ((ray.nx !== 0 || ray.nz !== 0) && ray.hy !== undefined) {
          const fracY = ray.hy - ray.by
          if (fracY > 0.65) { pnx = 0; pny = 1; pnz = 0 }
        }
        const px = ray.bx + pnx
        const py = ray.by + pny
        const pz = ray.bz + pnz
        renderer.placementGhost.position.set(px + 0.5, py + 0.5, pz + 0.5)
        renderer.placementGhost.visible = controls.pointerLocked && !!selectedId

        if (!chatOpen) {
          // ── Eyedropper (MMB) ─────────────────────────────
          if (controls.consumeMMB()) {
            const pickedId = world.getBlock(ray.bx, ray.by, ray.bz)
            if (pickedId) {
              const existing = inventory.slots.indexOf(pickedId)
              if (existing >= 0) inventory.selectSlot(existing)
              else               inventory.setSlot(inventory.selectedSlot, pickedId)
            }
          }

          // ── Copy/Paste corner selection ───────────────────
          if (controls.consumeKey('BracketLeft'))  copyPaste.setCornerA(ray.bx, ray.by, ray.bz)
          if (controls.consumeKey('BracketRight')) copyPaste.setCornerB(ray.bx, ray.by, ray.bz)

          // ── Paste confirm (LMB in paste mode) ────────────
          if (copyPaste.pasteMode && controls.consumeLMB()) {
            copyPaste.paste(world, ray.bx, ray.by, ray.bz)

          // ── Fill (F + LMB) ────────────────────────────────
          } else if (controls.isHeld('KeyF') && selectedId && controls.consumeLMB()) {
            fillTool.fill(world, ray.bx, ray.by, ray.bz, selectedId)

          // ── Place (instant on click) ─────────────────────
          } else if (selectedId && controls.consumeLMB()) {
            const hitId = world.getBlock(ray.bx, ray.by, ray.bz)

            if (selectedId === SPONGE_ID && hitId === WATER_SOURCE_ID) {
              // Sponge placed on a source block → absorb all connected water
              waterSystem.absorbSource(ray.bx, ray.by, ray.bz)
              world.setBlock(ray.bx, ray.by, ray.bz, SPONGE_ID)
              soundSystem.onBlockPlace(SPONGE_ID)
              network?.sendBlockChange(ray.bx, ray.by, ray.bz, SPONGE_ID)
              renderer.triggerPlaceAnim(ray.bx, ray.by, ray.bz)
            } else {
              // Directional furniture: pick the variant matching the camera yaw
              const selectedDef = BLOCK_BY_ID.get(selectedId)
              let placeId = selectedId
              if (selectedDef?.dirGroup) {
                placeId = selectedDef.dirGroup[yawToFacing(camera.yaw)]
              }
              const placeDef = BLOCK_BY_ID.get(placeId)
              if (placeDef?.multiBlock) {
                if (Array.isArray(placeDef.multiBlock)) {
                  const parts = placeDef.multiBlock
                  if (parts.every(({ dx, dy, dz }) => world.getBlock(px+dx, py+dy, pz+dz) === 0)) {
                    const oldId = world.getBlock(px, py, pz)
                    world.setBlock(px, py, pz, placeId)
                    for (const { dx, dy, dz, partId } of parts) {
                      world.setBlock(px+dx, py+dy, pz+dz, partId)
                      network?.sendBlockChange(px+dx, py+dy, pz+dz, partId)
                      lightingSystem.blockPlaced(px+dx, py+dy, pz+dz, partId)
                    }
                    waterSystem.onBlockChange(px, py, pz, placeId, oldId)
                    bloodWaterSystem.onBlockChange(px, py, pz, placeId, oldId)
                    soundSystem.onBlockPlace(placeId)
                    network?.sendBlockChange(px, py, pz, placeId)
                    renderer.triggerPlaceAnim(px, py, pz)
                    lightingSystem.blockPlaced(px, py, pz, placeId)
                  }
                } else {
                  const { dx, dy, dz, partId } = placeDef.multiBlock
                  const [px2, py2, pz2] = [px + dx, py + dy, pz + dz]
                  if (world.getBlock(px2, py2, pz2) === 0) {
                    const oldId = world.getBlock(px, py, pz)
                    world.setBlock(px, py, pz, placeId)
                    world.setBlock(px2, py2, pz2, partId)
                    waterSystem.onBlockChange(px, py, pz, placeId, oldId)
                    bloodWaterSystem.onBlockChange(px, py, pz, placeId, oldId)
                    soundSystem.onBlockPlace(placeId)
                    network?.sendBlockChange(px, py, pz, placeId)
                    network?.sendBlockChange(px2, py2, pz2, partId)
                    renderer.triggerPlaceAnim(px, py, pz)
                    lightingSystem.blockPlaced(px, py, pz, placeId)
                    lightingSystem.blockPlaced(px2, py2, pz2, partId)
                  }
                }
              } else {
                const oldId = world.getBlock(px, py, pz)
                world.setBlock(px, py, pz, placeId)
                waterSystem.onBlockChange(px, py, pz, placeId, oldId)
                bloodWaterSystem.onBlockChange(px, py, pz, placeId, oldId)
                soundSystem.onBlockPlace(placeId)
                network?.sendBlockChange(px, py, pz, placeId)
                renderer.triggerPlaceAnim(px, py, pz)
                lightingSystem.blockPlaced(px, py, pz, placeId)
              }
            }
          }

          // ── Break (hold LMB with empty hand) ─────────────
          if (!selectedId && controls.isLMBHeld()) {
            if (!breakTarget ||
                breakTarget.bx !== ray.bx ||
                breakTarget.by !== ray.by ||
                breakTarget.bz !== ray.bz) {
              breakTarget = { bx: ray.bx, by: ray.by, bz: ray.bz, elapsed: 0 }
            }
            breakTarget.elapsed += dt
            const progress = breakTarget.elapsed / BREAK_TIME
            renderer.updateCrack(ray, Math.min(progress, 0.999))
            if (progress >= 1) {
              breakBlock(ray.bx, ray.by, ray.bz)
              breakTarget = null
              renderer.updateCrack(null, -1)
            }
          } else {
            breakTarget = null
            renderer.updateCrack(null, -1)
          }

          // ── RMB: instant break ───────────────────────────
          if (controls.consumeRMB()) {
            breakBlock(ray.bx, ray.by, ray.bz)
          }
        }
      } else {
        renderer.selectionBox.visible   = false
        renderer.placementGhost.visible = false
        breakTarget = null
        renderer.updateCrack(null, -1)
      }

      // ── E: interact / stand up / wake up / close any UI ─────
      if (!chatOpen && controls.consumeKey('KeyE')) {
        const openUi = document.getElementById('chest-ui')
                    || document.getElementById('fridge-ui')
                    || document.getElementById('cooking-ui')
                    || document.getElementById('chop-ui')
                    || document.getElementById('mix-ui')
                    || document.getElementById('recipe-ui')
        if (openUi) {
          openUi._close?.()
        } else if (sittingAt) {
          standUp()
        } else if (sleepingAt) {
          wakeUp()
        } else {
          if (ray.hit) {
            handleInteract(ray.bx, ray.by, ray.bz)
          }
        }
      }

      // ── R: eat selected food item (from produce bar) ────────
      if (!chatOpen && controls.consumeKey('KeyR')) {
        const eatId  = inventory.selectedProduceId()
        const eatDef = BLOCK_BY_ID.get(eatId)
        if (eatDef?.isFood) {
          inventory.setProduceSlot(inventory.selectedProduceSlot, null)
          const name = lang === 'no' ? eatDef.nameNo : eatDef.nameEn
          showToast(lang === 'no' ? `Spiste ${name}!` : `Ate ${name}!`, 2200)
        }
      }

      // ── B: open recipe book ──────────────────────────────────
      if (!chatOpen && controls.consumeKey('KeyB')) {
        const anyUiOpen = document.getElementById('chest-ui')
                       || document.getElementById('fridge-ui')
                       || document.getElementById('cooking-ui')
                       || document.getElementById('chop-ui')
                       || document.getElementById('mix-ui')
                       || document.getElementById('recipe-ui')
        if (!anyUiOpen) openRecipeBook(atlas, controls, lang)
      }

      renderer.updatePlaceAnim(dt)

      // ── Phase 15 system updates ──────────────────────────
      waterSystem.update(dt)
      bloodWaterSystem.update(dt)
      particleSystem.update(dt, player.x, player.y, player.z, world)
      renderer.updateFlora(elapsed)

      // Footstep dust on dirt / sand / grass surfaces
      if (player.onGround && !player.flying &&
          (Math.abs(player.vx) + Math.abs(player.vz)) > 1.0) {
        _footstepTimer += dt
        if (_footstepTimer >= 0.28) {
          _footstepTimer = 0
          const gid  = world.getBlock(Math.floor(player.x), Math.floor(player.y) - 1, Math.floor(player.z))
          const gdef = BLOCK_BY_ID.get(gid)
          if (gdef?.sound === 'grass' || gdef?.sound === 'sand' || gdef?.sound === 'dirt') {
            particleSystem.emitFootstep(player.x, player.y, player.z)
          }
        }
      } else {
        _footstepTimer = 0
      }

      dayNightCycle.update(dt, DAY_DURATION_S, player.x, player.y, player.z)
      const currentBiome = world.getBiomeAt(player.x, player.z)
      renderer.updateBiomeFog(currentBiome, dt)
      weatherSystem.setBiome(currentBiome)
      weatherSystem.update(dt, player.x, player.y, player.z)
      soundSystem.setRaining(weatherSystem.isRaining)
      renderer.updateWater(elapsed)

      // Underwater: check camera block AFTER sky/fog updates so we override last
      const camId      = world.getBlock(Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z))
      const underwater = !!(BLOCK_BY_ID.get(camId)?.liquid)
      renderer.setUnderwater(underwater)

      // Water entry splash
      if (underwater && !_prevUnderwater) {
        particleSystem.emitWaterSplash(player.x, player.y, player.z)
      }
      _prevUnderwater = underwater

      lightingSystem.update(player.x, player.y, player.z)
      world.updateChunks(player.chunkX, player.chunkZ, mesher, renderer.scene, 2, 2, lightingSystem)
      hotbar.tick(ts / 1000)
      toolBar.tick(ts / 1000)
      produceBar.tick(ts / 1000)

      // Network update (remote player interpolation + position sync)
      network?.update(dt)

      // ── Phase 21 — Firework update ───────────────────────
      for (let _fi = _fireworks.length - 1; _fi >= 0; _fi--) {
        if (_fireworks[_fi].update(dt)) {
          _fireworks[_fi].dispose()
          _fireworks.splice(_fi, 1)
        }
      }

      const flyEl = document.getElementById('hud-fly')
      if (flyEl) flyEl.textContent = player.flying ? '✈ Flying' : ''

      if (gameSettings.showFPS) {
        const fpsEl = document.getElementById('hud-fps')
        if (fpsEl) fpsEl.textContent = dt > 0 ? `${Math.round(1 / dt)} FPS` : ''
      }

      minimap.update(player, world)
      hud.update(player)
    }

    renderer.render()
    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)

  await quitPromise
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKeyDown)
}

// ── HUD helpers ───────────────────────────────────────────────
function _buildHUD(multiplayer = false) {
  const ui = document.getElementById('ui-root')

  ui.innerHTML += `
    <style>
      #hud-crosshair {
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 20px; height: 20px;
        pointer-events: none;
      }
      #hud-crosshair::before,
      #hud-crosshair::after {
        content: '';
        position: absolute;
        background: rgba(255,255,255,0.85);
        border-radius: 2px;
      }
      #hud-crosshair::before { width: 2px; height: 100%; left: 50%; transform: translateX(-50%); }
      #hud-crosshair::after  { width: 100%; height: 2px; top: 50%; transform: translateY(-50%); }
      #hud-fly {
        position: fixed; top: 36px; left: 50%;
        transform: translateX(-50%);
        font-size: 0.9rem; font-weight: 700;
        color: rgba(255,255,255,0.8);
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        pointer-events: none;
      }
      #hud-fps {
        position: fixed; top: 58px; left: 50%;
        transform: translateX(-50%);
        font-size: 0.75rem; font-weight: 700;
        color: rgba(255,255,255,0.5);
        pointer-events: none;
      }
      #hud-net {
        position: fixed; top: 120px; right: 16px;
        font-size: 0.8rem; font-weight: 700;
        color: rgba(255,255,255,0.75);
        text-shadow: 0 1px 3px rgba(0,0,0,0.7);
        pointer-events: none;
        max-width: 200px;
        text-align: right;
      }
    </style>
    <div id="hud-crosshair" style="pointer-events:none"></div>
    <div id="hud-fly"       style="pointer-events:none"></div>
    <div id="hud-fps"       style="pointer-events:none"></div>
    <div id="hud-net"       style="pointer-events:none"></div>
  `

  const langDiv  = document.createElement('div')
  langDiv.id     = 'hud-lang'
  const curLang  = localStorage.getItem('kl_lang') || 'en'
  langDiv.innerHTML = Object.entries(LANGUAGES)
    .map(([code, name]) =>
      `<button class="${code === curLang ? 'active' : ''}" data-lang="${code}">${name}</button>`
    ).join('')
  langDiv.querySelectorAll('[data-lang]').forEach(btn => {
    btn.onclick = () => { setLanguage(btn.dataset.lang); _syncLangButtons() }
  })
  document.getElementById('ui-root').appendChild(langDiv)
}

function _syncLangButtons() {
  const lang = localStorage.getItem('kl_lang') || 'en'
  document.querySelectorAll('#hud-lang [data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang)
  })
}

function _clearHUD() {
  document.getElementById('ui-root').innerHTML = ''
}

/** Fetch LAN IPs from server and show them in the HUD for hosts. */
async function _fetchAndShowHostIp() {
  try {
    const res  = await fetch('/api/ip')
    const data = await res.json()
    const ips  = data.ips ?? []
    const netEl = document.getElementById('hud-net')
    if (netEl && ips.length) {
      netEl.innerHTML = `🌐 Hosting<br>${ips.map(ip => `${ip}:3001`).join('<br>')}`
    } else if (netEl) {
      netEl.textContent = '🌐 Hosting (localhost)'
    }
  } catch {
    const netEl = document.getElementById('hud-net')
    if (netEl) netEl.textContent = '🌐 Hosting'
  }
}

// ── Boot ──────────────────────────────────────────────────────
startApp().catch(err => {
  console.error('[Klosseland] Fatal crash:', err)
  loadingScreen.style.display  = 'flex'
  loadingText.textContent      = `Fatal error: ${err.message || err}. Check console (F12).`
  loadingBar.style.background  = '#FF5555'
})
