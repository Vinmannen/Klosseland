// ─────────────────────────────────────────────────────────────
//  Klosseland — LAN Server
//  HTTP (serves Vite build) + WebSocket on port 3001.
//  First player is the host and supplies world config + delta.
//  All clients receive a world-sync delta on join.
// ─────────────────────────────────────────────────────────────
import express              from 'express'
import { createServer }     from 'http'
import { WebSocketServer }  from 'ws'
import { fileURLToPath }    from 'url'
import { dirname, join }    from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { networkInterfaces } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT      = 3001
const SAVES_DIR = join(__dirname, 'saves')
if (!existsSync(SAVES_DIR)) mkdirSync(SAVES_DIR, { recursive: true })

// ── HTTP app ───────────────────────────────────────────────────
const app    = express()
const server = createServer(app)

// Serve Vite production build (dist/) when running standalone
app.use(express.static(join(__dirname, '..', 'dist')))

// Expose local network IPs so the host can show them to friends
app.get('/api/ip', (_req, res) => {
  const nets = networkInterfaces()
  const ips  = []
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address)
    }
  }
  res.json({ ips })
})

// ── Server-side world state ────────────────────────────────────
let worldConfig = null          // {seed, terrainType, sizeKey, worldId}
let worldDelta  = []            // [[bx, by, bz, blockId], …]
let savePath    = null

const players = new Map()       // id → { ws, name, x, y, z, yaw, pitch }
let   nextId  = 1

function loadSave(worldId) {
  savePath = join(SAVES_DIR, `${worldId}.json`)
  if (existsSync(savePath)) {
    try {
      const d = JSON.parse(readFileSync(savePath, 'utf-8'))
      if (Array.isArray(d.worldDelta)) worldDelta = d.worldDelta
    } catch { worldDelta = [] }
  } else {
    worldDelta = []
  }
}

function persistSave() {
  if (!savePath) return
  try { writeFileSync(savePath, JSON.stringify({ worldDelta })) } catch {}
}

function broadcast(msg, excludeId = null) {
  const raw = JSON.stringify(msg)
  for (const [id, p] of players) {
    if (id !== excludeId && p.ws.readyState === 1 /* OPEN */) {
      p.ws.send(raw)
    }
  }
}

// ── WebSocket server ───────────────────────────────────────────
const wss = new WebSocketServer({ server })

wss.on('connection', ws => {
  const id = String(nextId++)

  ws.on('message', raw => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    switch (msg.type) {

      case 'join': {
        const name   = String(msg.name || 'Player').slice(0, 24)
        const isHost = players.size === 0

        if (isHost) {
          worldConfig = msg.worldConfig ?? null
          // Host sends their current localforage delta so latecomers get the right world
          if (Array.isArray(msg.worldDelta)) {
            worldDelta = msg.worldDelta
          }
          if (worldConfig?.worldId) {
            loadSave(worldConfig.worldId)
            // Merge host's in-memory delta on top of the saved one
            if (Array.isArray(msg.worldDelta)) {
              for (const [bx, by, bz, bid] of msg.worldDelta) {
                const idx = worldDelta.findIndex(([x, y, z]) => x === bx && y === by && z === bz)
                if (idx >= 0) worldDelta.splice(idx, 1)
                worldDelta.push([bx, by, bz, bid])
              }
              persistSave()
            }
          }
        }

        const spawnY = 20
        players.set(id, { ws, name, x: 0, y: spawnY, z: 0, yaw: 0, pitch: 0 })

        const existingPlayers = [...players.entries()]
          .filter(([pid]) => pid !== id)
          .map(([pid, p]) => ({ id: pid, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }))

        ws.send(JSON.stringify({
          type:        'welcome',
          id,
          isHost,
          worldConfig,
          worldDelta,
          players:     existingPlayers,
        }))

        broadcast({ type: 'player_join', id, name, x: 0, y: spawnY, z: 0, yaw: 0, pitch: 0 }, id)
        console.log(`[+] ${name} joined (id ${id}, isHost=${isHost})`)
        break
      }

      case 'move': {
        const p = players.get(id)
        if (!p) break
        p.x = +msg.x || 0; p.y = +msg.y || 0; p.z = +msg.z || 0
        p.yaw = +msg.yaw || 0; p.pitch = +msg.pitch || 0
        broadcast({ type: 'player_move', id, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }, id)
        break
      }

      case 'block_change': {
        const bx = msg.bx | 0, by = msg.by | 0, bz = msg.bz | 0, bid = msg.id | 0
        const idx = worldDelta.findIndex(([x, y, z]) => x === bx && y === by && z === bz)
        if (idx >= 0) worldDelta.splice(idx, 1)
        worldDelta.push([bx, by, bz, bid])
        persistSave()
        broadcast({ type: 'block_change', bx, by, bz, id: bid }, id)
        break
      }

      case 'sign_update': {
        const bx = msg.bx | 0, by = msg.by | 0, bz = msg.bz | 0
        const text = String(msg.text || '').slice(0, 200)
        broadcast({ type: 'sign_update', bx, by, bz, text }, id)
        break
      }

      case 'firework_launch': {
        const wx = msg.wx | 0, wy = msg.wy | 0, wz = msg.wz | 0
        const fwType = String(msg.fwType || '').slice(0, 40)
        broadcast({ type: 'firework_launch', wx, wy, wz, fwType }, id)
        break
      }

      case 'chat': {
        const text = String(msg.text || '').slice(0, 200)
        const name = players.get(id)?.name ?? 'Unknown'
        // broadcast to everyone including sender so they see confirmation
        const raw2 = JSON.stringify({ type: 'chat', senderId: id, name, text })
        for (const [, p] of players) {
          if (p.ws.readyState === 1) p.ws.send(raw2)
        }
        console.log(`[chat] ${name}: ${text}`)
        break
      }
    }
  })

  ws.on('close', () => {
    const p = players.get(id)
    if (p) {
      console.log(`[-] ${p.name} left (id ${id})`)
      broadcast({ type: 'player_leave', id, name: p.name })
      players.delete(id)
    }
    if (players.size === 0) {
      worldConfig = null
      worldDelta  = []
      savePath    = null
    }
  })

  ws.on('error', err => {
    console.error(`[ws] error on id ${id}:`, err.message)
    ws.terminate()
  })
})

// ── Boot ───────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const nets = networkInterfaces()
  const ips  = []
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address)
    }
  }
  console.log(`[Klosseland] Server on port ${PORT}`)
  if (ips.length) console.log(`[Klosseland] LAN: ${ips.join(', ')}`)
})
