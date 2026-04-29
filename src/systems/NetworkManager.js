// ─────────────────────────────────────────────────────────────
//  Klosseland — NetworkManager
//  Client-side WebSocket wrapper.
//  Manages remote-player instances, position sync, and
//  block/chat message passing.
// ─────────────────────────────────────────────────────────────
import { RemotePlayer }              from '../entities/RemotePlayer.js'
import { WS_PORT, SYNC_RATE_HZ }     from '../data/constants.js'

const SYNC_INTERVAL = 1 / SYNC_RATE_HZ   // seconds between move sends

export class NetworkManager {
  /**
   * @param {import('three').Scene|null} scene
   *   May be null at construction time (join flow) — call setScene(scene)
   *   inside runGame once the Three.js scene exists.
   */
  constructor(scene) {
    this._scene     = scene   // may be null; set via setScene()
    this._ws        = null
    this._id        = null
    this._players   = new Map()   // id → RemotePlayer
    this._playerBuf = []          // buffered player_join events before setScene()
    this._syncTimer = 0

    // Callbacks set by the caller
    this._onBlockChange = null   // (bx, by, bz, id) => void
    this._onChat        = null   // (name, text) => void
    this._onPlayerEvent = null   // ('join'|'leave', id, name) => void
    this._onSignUpdate  = null   // (bx, by, bz, text) => void
    this._localState    = null   // () => {x, y, z, yaw, pitch}

    // Public state
    this.myId      = null
    this.isHost    = false
    this.connected = false

    // Reconnect state
    this._disposed       = false
    this._reconnectDelay = 1000
    this._host           = null
    this._playerName     = 'Player'
    this._pendingConfig  = null   // worldConfig sent on join (host only)
    this._pendingDelta   = null   // worldDelta sent on join (host only)
  }

  // ── Scene / callback setters ──────────────────────────────
  /**
   * Bind the Three.js scene (called inside runGame once the scene exists).
   * Flushes any player_join events that arrived before the scene was ready.
   */
  setScene(scene) {
    this._scene = scene
    for (const p of this._playerBuf) {
      const rp = new RemotePlayer(p.id, p.name, this._scene)
      rp.setPosition(p.x, p.y, p.z, p.yaw ?? 0)
      this._players.set(p.id, rp)
    }
    this._playerBuf = []
  }

  onBlockChange(fn)  { this._onBlockChange = fn }
  onChat(fn)         { this._onChat = fn }
  onPlayerEvent(fn)  { this._onPlayerEvent = fn }
  onSignUpdate(fn)   { this._onSignUpdate = fn }
  /** Set a function that returns the local player's current {x,y,z,yaw,pitch}. */
  setLocalState(fn)  { this._localState = fn }

  // ── Connect ───────────────────────────────────────────────
  /**
   * Open a WebSocket and wait for the server's welcome message.
   *
   * @param {string}       host         IP / hostname of the server
   * @param {string}       playerName
   * @param {object|null}  worldConfig  Pass the world config when hosting; null when joining
   * @param {Array}        worldDelta   Host's saved block delta; [] when joining
   * @returns {Promise<{isHost, worldConfig, worldDelta, players}>}
   */
  connect(host, playerName, worldConfig, worldDelta) {
    this._host          = host
    this._playerName    = playerName
    this._pendingConfig = worldConfig
    this._pendingDelta  = worldDelta
    return new Promise((resolve, reject) => this._openSocket(resolve, reject))
  }

  _openSocket(resolve, reject) {
    const url = `ws://${this._host}:${WS_PORT}`
    const ws  = new WebSocket(url)
    this._ws  = ws

    ws.onopen = () => {
      const msg = {
        type: 'join',
        name: this._playerName,
        ...(this._pendingConfig ? { worldConfig: this._pendingConfig } : {}),
        ...(this._pendingDelta  ? { worldDelta:  this._pendingDelta  } : {}),
      }
      ws.send(JSON.stringify(msg))
    }

    // One-shot welcome handler
    ws.onmessage = (event) => {
      let msg
      try { msg = JSON.parse(event.data) } catch { return }
      if (msg.type !== 'welcome') return

      this._id       = msg.id
      this.myId      = msg.id
      this.isHost    = msg.isHost
      this.connected = true
      this._reconnectDelay = 1000

      // Populate already-connected players (buffer if scene not yet set)
      for (const p of msg.players ?? []) {
        if (this._scene) {
          const rp = new RemotePlayer(p.id, p.name, this._scene)
          rp.setPosition(p.x, p.y, p.z, p.yaw ?? 0)
          this._players.set(p.id, rp)
        } else {
          this._playerBuf.push(p)
        }
      }

      // Switch to normal message handler
      ws.onmessage = (e) => { try { this._handleMessage(JSON.parse(e.data)) } catch {} }
      ws.onclose   = () => this._onDisconnect()
      ws.onerror   = () => ws.close()

      resolve({
        isHost:      msg.isHost,
        worldConfig: msg.worldConfig,
        worldDelta:  msg.worldDelta ?? [],
        players:     msg.players    ?? [],
      })
    }

    ws.onerror = () => reject(new Error(`Cannot connect to ${url}`))
    ws.onclose = () => {
      if (!this.connected) reject(new Error('Connection closed before welcome'))
    }
  }

  // ── Reconnect (exponential backoff) ───────────────────────
  _onDisconnect() {
    this.connected = false
    if (this._disposed) return
    console.warn(`[Net] Disconnected — retrying in ${this._reconnectDelay}ms`)
    setTimeout(() => { if (!this._disposed) this._tryReconnect() }, this._reconnectDelay)
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30_000)
  }

  _tryReconnect() {
    const url = `ws://${this._host}:${WS_PORT}`
    const ws  = new WebSocket(url)
    this._ws  = ws
    ws.onopen = () => {
      const msg = {
        type: 'join',
        name: this._playerName,
        ...(this._pendingConfig ? { worldConfig: this._pendingConfig } : {}),
        ...(this._pendingDelta  ? { worldDelta:  this._pendingDelta  } : {}),
      }
      ws.send(JSON.stringify(msg))
    }
    ws.onmessage = (e) => {
      let msg; try { msg = JSON.parse(e.data) } catch { return }
      if (msg.type !== 'welcome') return
      this._id = msg.id; this.myId = msg.id
      this.connected = true; this._reconnectDelay = 1000
      // Re-add any missing players
      for (const p of msg.players ?? []) {
        if (!this._players.has(p.id)) {
          if (this._scene) {
            const rp = new RemotePlayer(p.id, p.name, this._scene)
            rp.setPosition(p.x, p.y, p.z, p.yaw ?? 0)
            this._players.set(p.id, rp)
          } else {
            this._playerBuf.push(p)
          }
        }
      }
      ws.onmessage = (ev) => { try { this._handleMessage(JSON.parse(ev.data)) } catch {} }
      ws.onclose   = () => this._onDisconnect()
      ws.onerror   = () => ws.close()
    }
    ws.onerror = () => ws.close()
    ws.onclose = () => { if (!this.connected) this._onDisconnect() }
  }

  // ── Incoming message handler ──────────────────────────────
  _handleMessage(msg) {
    switch (msg.type) {

      case 'player_join':
        if (!this._players.has(msg.id)) {
          if (this._scene) {
            const rp = new RemotePlayer(msg.id, msg.name, this._scene)
            rp.setPosition(msg.x ?? 0, msg.y ?? 20, msg.z ?? 0, msg.yaw ?? 0)
            this._players.set(msg.id, rp)
          } else {
            this._playerBuf.push(msg)
          }
        }
        this._onPlayerEvent?.('join', msg.id, msg.name)
        break

      case 'player_move': {
        const rp = this._players.get(msg.id)
        if (rp) rp.setTarget(msg.x, msg.y, msg.z, msg.yaw ?? 0)
        break
      }

      case 'player_leave': {
        const rp = this._players.get(msg.id)
        if (rp) { rp.dispose(); this._players.delete(msg.id) }
        this._onPlayerEvent?.('leave', msg.id, msg.name)
        break
      }

      case 'block_change':
        this._onBlockChange?.(msg.bx, msg.by, msg.bz, msg.id)
        break

      case 'sign_update':
        this._onSignUpdate?.(msg.bx | 0, msg.by | 0, msg.bz | 0, msg.text ?? '')
        break

      case 'chat':
        this._onChat?.(msg.name, msg.text, msg.senderId === this._id)
        break
    }
  }

  // ── Outgoing sends ────────────────────────────────────────
  sendBlockChange(bx, by, bz, id) {
    this._send({ type: 'block_change', bx: bx | 0, by: by | 0, bz: bz | 0, id: id | 0 })
  }

  sendSignUpdate(bx, by, bz, text) {
    this._send({ type: 'sign_update', bx: bx | 0, by: by | 0, bz: bz | 0, text: text ?? '' })
  }

  sendChat(text) {
    this._send({ type: 'chat', text })
  }

  _send(msg) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg))
    }
  }

  // ── Per-frame update ──────────────────────────────────────
  update(dt) {
    // Interpolate remote players
    for (const rp of this._players.values()) rp.update(dt)

    // Position sync at SYNC_RATE_HZ
    this._syncTimer += dt
    if (this._syncTimer >= SYNC_INTERVAL && this._localState) {
      this._syncTimer -= SYNC_INTERVAL
      const s = this._localState()
      this._send({ type: 'move', x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch ?? 0 })
    }
  }

  /** Returns [{id, name}] for all currently-connected remote players. */
  getPlayerList() {
    return [...this._players.values()].map(rp => ({ id: rp.id, name: rp.name }))
  }

  dispose() {
    this._disposed = true
    this._ws?.close()
    for (const rp of this._players.values()) rp.dispose()
    this._players.clear()
  }
}
