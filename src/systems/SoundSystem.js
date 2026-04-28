// ─────────────────────────────────────────────────────────────
//  Klosseland — SoundSystem
//  All sounds are procedurally synthesised at runtime using
//  Web Audio API (via Howler's shared AudioContext).
//  No audio files required.
//
//  Public API
//  ──────────
//  init()                    — call once after first user gesture
//  dispose()                 — call on quit, stops ambient loops
//  setVolume(v)              — 0–1, master volume
//  setAmbientVolume(v)       — 0–1, ambient bus gain
//  setSfxVolume(v)           — 0–1, SFX bus gain
//  update(dt, player, world) — call every frame
//  onBlockPlace(blockId)     — call when a block is placed
//  onBlockBreak(blockId)     — call when a block is removed
// ─────────────────────────────────────────────────────────────
import { Howler } from 'howler'
import { SOUND_GROUP, BIOME } from '../data/constants.js'
import { BLOCK_BY_ID } from '../data/blockDefinitions.js'

// ── Biome wind/ambient config ─────────────────────────────────
//  windGain       — noise layer gain (0–1)
//  windFreq       — bandpass centre frequency (Hz)
//  windQ          — bandpass Q factor
//  accentInterval — [min, max] seconds between accent sounds
//  droneFreq      — if set, activates the drone oscillator at this Hz
//  droneGain      — drone gain (0–1)
const BIOME_AMBIENT = {
  [BIOME.MEADOW]: {
    windGain: 0.18, windFreq: 380, windQ: 1.2,
    accentInterval: [7, 16], droneFreq: null, droneGain: 0,
  },
  [BIOME.FOREST]: {
    windGain: 0.22, windFreq: 520, windQ: 1.5,
    accentInterval: [3, 9],  droneFreq: null, droneGain: 0,
  },
  [BIOME.SNOWY_PEAKS]: {
    windGain: 0.38, windFreq: 160, windQ: 0.7,
    accentInterval: [14, 28], droneFreq: null, droneGain: 0,
  },
  [BIOME.DESERT]: {
    windGain: 0.12, windFreq: 2200, windQ: 2.2,
    accentInterval: [9, 20], droneFreq: null, droneGain: 0,
  },
  [BIOME.JUNGLE]: {
    windGain: 0.28, windFreq: 620, windQ: 1.8,
    accentInterval: [2, 6],  droneFreq: null, droneGain: 0,
  },
  [BIOME.MUSHROOM]: {
    windGain: 0.08, windFreq: 240, windQ: 3.0,
    accentInterval: [10, 22], droneFreq: 82, droneGain: 0.06,
  },
  [BIOME.CANDY]: {
    windGain: 0.07, windFreq: 900, windQ: 4.5,
    accentInterval: [5, 11], droneFreq: 330, droneGain: 0.04,
  },
  [BIOME.AUTUMN]: {
    windGain: 0.26, windFreq: 750, windQ: 1.4,
    accentInterval: [6, 14], droneFreq: null, droneGain: 0,
  },
  [BIOME.CHERRY]: {
    windGain: 0.11, windFreq: 950, windQ: 2.8,
    accentInterval: [5, 11], droneFreq: null, droneGain: 0,
  },
  [BIOME.BLODMARK]: {
    windGain: 0.40, windFreq: 110, windQ: 0.6,
    accentInterval: [8, 22], droneFreq: 55, droneGain: 0.10,
  },
}

// ─────────────────────────────────────────────────────────────
export class SoundSystem {
  constructor() {
    this._ctx          = null
    this._masterGain   = null
    this._ambientGain  = null
    this._sfxGain      = null

    // Wind ambient (persistent noise loop)
    this._windSource   = null
    this._windFilter   = null
    this._windGainNode = null
    this._windLFO      = null
    this._windLFOGain  = null

    // Biome drone oscillator (mushroom/candy)
    this._droneOsc     = null
    this._droneGain    = null

    // Rain ambient layer
    this._rainSource   = null
    this._rainGainNode = null
    this._rainTargetGain = 0

    // Reusable short noise buffer for SFX
    this._sfxNoiseBuf  = null

    // Footstep state
    this._stepTimer    = 0.4

    // Biome accent timer
    this._accentTimer  = 4.0

    // Tracked biome (-1 = none)
    this._currentBiome = -1

    // Volume settings
    this._masterVol    = 0.8
    this._ambientVol   = 0.45
    this._sfxVol       = 1.0
  }

  // ── Lifecycle ─────────────────────────────────────────────

  /**
   * Call once after a user gesture has occurred (pointer lock click, etc.).
   * Sets up the AudioContext via Howler's shared context, builds persistent
   * ambient nodes, and starts the wind loop silent.
   */
  init() {
    // Use Howler's shared AudioContext when available so mute/volume calls
    // on Howler.volume() affect all sound at once.
    if (!Howler.ctx) {
      // Howler lazily creates its context. Force it by setting up its internals.
      // Fallback: create a standalone context.
      Howler._setupAudioContext?.()
    }
    this._ctx = Howler.ctx ?? new (window.AudioContext || window.webkitAudioContext)()

    if (this._ctx.state === 'suspended') this._ctx.resume()

    const ctx = this._ctx

    // Master gain → Howler master (or ctx.destination as fallback)
    this._masterGain = ctx.createGain()
    this._masterGain.gain.value = this._masterVol
    const dest = Howler.masterGain ?? ctx.destination
    this._masterGain.connect(dest)

    // Ambient bus (quieter)
    this._ambientGain = ctx.createGain()
    this._ambientGain.gain.value = this._ambientVol
    this._ambientGain.connect(this._masterGain)

    // SFX bus
    this._sfxGain = ctx.createGain()
    this._sfxGain.gain.value = this._sfxVol
    this._sfxGain.connect(this._masterGain)

    // Build persistent ambient layers (start silent)
    this._initWindAmbient()
    this._initDroneAmbient()
    this._initRainAmbient()
  }

  dispose() {
    try { this._windSource?.stop() }  catch (_) {}
    try { this._windLFO?.stop() }     catch (_) {}
    try { this._droneOsc?.stop() }    catch (_) {}
    try { this._rainSource?.stop() }  catch (_) {}
    // Do NOT close Howler's shared AudioContext
  }

  // ── Rain sound control ────────────────────────────────────
  /** Smoothly fade the rain layer in (true) or out (false). */
  setRaining(active) {
    this._rainTargetGain = active ? 0.18 : 0
  }

  // ── Volume control ────────────────────────────────────────

  setVolume(v) {
    this._masterVol = Math.max(0, Math.min(1, v))
    if (this._masterGain) this._masterGain.gain.value = this._masterVol
  }

  setAmbientVolume(v) {
    this._ambientVol = Math.max(0, Math.min(1, v))
    if (this._ambientGain) this._ambientGain.gain.value = this._ambientVol
  }

  setSfxVolume(v) {
    this._sfxVol = Math.max(0, Math.min(1, v))
    if (this._sfxGain) this._sfxGain.gain.value = this._sfxVol
  }

  // ── Per-frame update ──────────────────────────────────────

  update(dt, player, world) {
    if (!this._ctx) return
    if (this._ctx.state === 'suspended') this._ctx.resume()

    // ── Rain gain fade ────────────────────────────────────
    if (this._rainGainNode) {
      const cur = this._rainGainNode.gain.value
      const tgt = this._rainTargetGain
      if (Math.abs(cur - tgt) > 0.0001) {
        this._rainGainNode.gain.value += (tgt - cur) * Math.min(dt / 4, 1)
      }
    }

    // ── Footsteps ─────────────────────────────────────────
    const speed    = Math.hypot(player.vx, player.vz)
    const isMoving = speed > 0.5 && player.onGround && !player.flying

    if (isMoving) {
      this._stepTimer -= dt
      if (this._stepTimer <= 0) {
        this._stepTimer = 0.37 + Math.random() * 0.08
        const blockId = world.getBlock(
          Math.floor(player.x),
          Math.floor(player.y - 0.15),
          Math.floor(player.z),
        )
        const group = BLOCK_BY_ID.get(blockId)?.sound ?? SOUND_GROUP.STONE
        this._playFootstep(group)
      }
    } else {
      // Quick first step when movement starts
      this._stepTimer = Math.min(this._stepTimer, 0.2)
    }

    // ── Biome ambient ──────────────────────────────────────
    const biome = world.getBiomeAt(Math.floor(player.x), Math.floor(player.z))
    if (biome !== this._currentBiome) {
      this._currentBiome = biome
      this._applyBiomeAmbient(biome)
      this._accentTimer = 2 + Math.random() * 4
    }

    this._accentTimer -= dt
    if (this._accentTimer <= 0) {
      const cfg = BIOME_AMBIENT[this._currentBiome] ?? BIOME_AMBIENT[BIOME.MEADOW]
      this._accentTimer =
        cfg.accentInterval[0] +
        Math.random() * (cfg.accentInterval[1] - cfg.accentInterval[0])
      this._playBiomeAccent(this._currentBiome)
    }
  }

  // ── Day cycle events ──────────────────────────────────────

  /**
   * Called by DayNightCycle when a threshold event fires.
   * @param {'dawn'|'noon'|'dusk'|'midnight'} event
   */
  onDayEvent(event) {
    if (!this._ctx) return
    const now = this._ctx.currentTime

    switch (event) {
      case 'dawn':
        // Dawn chorus — a burst of bird sounds
        this._birdChirp(now, 0.20)
        setTimeout(() => {
          if (this._ctx) this._birdChirp(this._ctx.currentTime, 0.15)
        }, 800)
        this._accentTimer = 2 + Math.random() * 3   // resume active accents
        break

      case 'noon':
        // Most active time — short accent interval
        this._accentTimer = 1 + Math.random() * 2
        break

      case 'dusk':
        // Quieting down — stretch the accent interval
        this._accentTimer = 8 + Math.random() * 6
        break

      case 'midnight': {
        // Night — long quiet stretches, softened wind
        this._accentTimer = 20 + Math.random() * 15
        const cfg = BIOME_AMBIENT[this._currentBiome] ?? BIOME_AMBIENT[BIOME.MEADOW]
        if (this._windGainNode) {
          this._windGainNode.gain.setTargetAtTime(cfg.windGain * 0.45, now, 3)
        }
        break
      }
    }
  }

  // ── Block events ──────────────────────────────────────────

  onBlockPlace(blockId) {
    if (!this._ctx) return
    const group = BLOCK_BY_ID.get(blockId)?.sound ?? SOUND_GROUP.STONE
    this._playBlockInteract(group, true)
  }

  onBlockBreak(blockId) {
    if (!this._ctx) return
    const group = BLOCK_BY_ID.get(blockId)?.sound ?? SOUND_GROUP.STONE
    this._playBlockInteract(group, false)
  }

  // ── Ambient init ──────────────────────────────────────────

  _initWindAmbient() {
    const ctx = this._ctx
    // 3-second looping noise buffer
    const len = ctx.sampleRate * 3
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    this._windSource = ctx.createBufferSource()
    this._windSource.buffer = buf
    this._windSource.loop = true

    this._windFilter = ctx.createBiquadFilter()
    this._windFilter.type = 'bandpass'
    this._windFilter.frequency.value = 400
    this._windFilter.Q.value = 1.2

    // Main wind gain (starts silent — set once first biome is detected)
    this._windGainNode = ctx.createGain()
    this._windGainNode.gain.value = 0.001

    // LFO gently modulates gain for natural wind breathing
    this._windLFO = ctx.createOscillator()
    this._windLFO.type = 'sine'
    this._windLFO.frequency.value = 0.1

    this._windLFOGain = ctx.createGain()
    this._windLFOGain.gain.value = 0.03

    this._windSource.connect(this._windFilter)
    this._windFilter.connect(this._windGainNode)
    this._windLFO.connect(this._windLFOGain)
    this._windLFOGain.connect(this._windGainNode.gain)
    this._windGainNode.connect(this._ambientGain)

    this._windSource.start()
    this._windLFO.start()
  }

  _initDroneAmbient() {
    const ctx = this._ctx

    this._droneOsc = ctx.createOscillator()
    this._droneOsc.type = 'sine'
    this._droneOsc.frequency.value = 82

    this._droneGain = ctx.createGain()
    this._droneGain.gain.value = 0.001

    this._droneOsc.connect(this._droneGain)
    this._droneGain.connect(this._ambientGain)
    this._droneOsc.start()
  }

  _initRainAmbient() {
    const ctx = this._ctx
    // 4-second looping white-noise buffer (different from wind buffer)
    const len  = ctx.sampleRate * 4
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    this._rainSource = ctx.createBufferSource()
    this._rainSource.buffer = buf
    this._rainSource.loop   = true

    // Two BPFs stacked to shape the sound toward typical rain frequency bands
    const bpf1 = ctx.createBiquadFilter()
    bpf1.type = 'bandpass'; bpf1.frequency.value = 2200; bpf1.Q.value = 0.5

    const bpf2 = ctx.createBiquadFilter()
    bpf2.type = 'bandpass'; bpf2.frequency.value = 800;  bpf2.Q.value = 0.8

    this._rainGainNode = ctx.createGain()
    this._rainGainNode.gain.value = 0.001

    this._rainSource.connect(bpf1)
    bpf1.connect(bpf2)
    bpf2.connect(this._rainGainNode)
    this._rainGainNode.connect(this._ambientGain)
    this._rainSource.start()
  }

  _applyBiomeAmbient(biome) {
    const cfg = BIOME_AMBIENT[biome] ?? BIOME_AMBIENT[BIOME.MEADOW]
    const ctx  = this._ctx
    const now  = ctx.currentTime
    const FADE = 2.5   // crossfade seconds

    this._windFilter.frequency.setTargetAtTime(cfg.windFreq, now, FADE)
    this._windFilter.Q.setTargetAtTime(cfg.windQ, now, FADE)
    this._windGainNode.gain.setTargetAtTime(cfg.windGain, now, FADE)
    this._windLFOGain.gain.setTargetAtTime(cfg.windGain * 0.25, now, FADE)

    const droneTgt = cfg.droneGain ?? 0
    this._droneGain.gain.setTargetAtTime(droneTgt, now, FADE)
    if (cfg.droneFreq) {
      this._droneOsc.frequency.setTargetAtTime(cfg.droneFreq, now, FADE)
    }
  }

  // ── Footstep synthesis ────────────────────────────────────

  _playFootstep(group) {
    const now = this._ctx.currentTime
    const v   = 0.52

    switch (group) {
      case SOUND_GROUP.GRASS:
        this._noise(now, 0.055, 'bandpass', 740, 2.5, v * 0.70)
        break
      case SOUND_GROUP.DIRT:
        this._noise(now, 0.065, 'lowpass',  480, 1.0, v * 0.80)
        this._tone (now, 118,   0.025, 'sine', v * 0.22)
        break
      case SOUND_GROUP.STONE:
        this._noise(now, 0.030, 'highpass', 1100, 1.0, v * 0.90)
        this._tone (now, 220,   0.015, 'sine', v * 0.18)
        break
      case SOUND_GROUP.WOOD:
        this._tone (now, 130,   0.080, 'sine',      v * 0.52)
        this._noise(now, 0.025, 'bandpass', 600, 2.0, v * 0.38)
        break
      case SOUND_GROUP.SAND:
        this._noise(now, 0.085, 'lowpass',  310, 1.0, v * 0.50)
        break
      case SOUND_GROUP.SNOW:
        this._noise(now, 0.075, 'lowpass',  210, 1.0, v * 0.32)
        break
      case SOUND_GROUP.LEAVES:
        this._noise(now, 0.045, 'bandpass', 1600, 3.2, v * 0.42)
        break
      case SOUND_GROUP.GLASS:
        this._tone (now, 1400,  0.040, 'sine', v * 0.30)
        break
      default: // SOFT, LIQUID, unknown
        this._noise(now, 0.050, 'bandpass', 850, 2.0, v * 0.48)
    }
  }

  // ── Block interaction synthesis ───────────────────────────

  _playBlockInteract(group, isPlace) {
    const now = this._ctx.currentTime
    const v   = isPlace ? 0.72 : 0.66
    const dur = isPlace ? 0.034 : 0.058

    switch (group) {
      case SOUND_GROUP.GRASS:
        this._noise(now, dur,        'bandpass', 700, 2.0, v * 0.80)
        this._tone (now, 148, dur * 0.8, 'sine', v * 0.28)
        break
      case SOUND_GROUP.DIRT:
        this._noise(now, dur * 1.2,  'lowpass',  450, 1.0, v * 0.90)
        this._tone (now, 108, dur,   'sine',      v * 0.28)
        break
      case SOUND_GROUP.STONE:
        this._noise(now, dur * 0.7,  'highpass', 1400, 1.0, v)
        this._tone (now, 250, dur * 0.5, 'square', v * 0.12)
        break
      case SOUND_GROUP.WOOD:
        this._tone (now, isPlace ? 158 : 140, dur, 'sine', v * 0.68)
        this._noise(now, dur * 0.6,  'bandpass', 680, 2.0, v * 0.48)
        break
      case SOUND_GROUP.SAND:
        this._noise(now, dur * 1.4,  'lowpass',  270, 1.0, v * 0.75)
        break
      case SOUND_GROUP.SNOW:
        this._noise(now, dur * 1.3,  'lowpass',  195, 1.0, v * 0.58)
        break
      case SOUND_GROUP.GLASS:
        this._tone (now, 1300, dur * 0.5,  'sine', v * 0.60)
        this._tone (now, 1950, dur * 0.35, 'sine', v * 0.28)
        break
      case SOUND_GROUP.LEAVES:
        this._noise(now, dur,        'bandpass', 1400, 3.0, v * 0.58)
        break
      case SOUND_GROUP.LIQUID:
        this._noise(now, dur * 1.5,  'lowpass',  350, 0.8, v * 0.65)
        this._tone (now, 200, dur,   'sine',      v * 0.22)
        break
      default:
        this._noise(now, dur,        'bandpass',  800, 2.0, v * 0.70)
    }
  }

  // ── Biome accent sounds ───────────────────────────────────

  _playBiomeAccent(biome) {
    const now = this._ctx.currentTime
    const v   = 0.17

    switch (biome) {
      case BIOME.MEADOW:
        this._birdChirp(now, v)
        break
      case BIOME.FOREST:
        this._birdChirp(now, v * 1.5)
        break
      case BIOME.SNOWY_PEAKS:
        this._windGust(now, v * 0.9)
        break
      case BIOME.DESERT:
        this._insectBuzz(now, v * 0.75)
        break
      case BIOME.JUNGLE:
        this._birdChirp(now, v * 1.9)
        if (Math.random() < 0.45) {
          const delay = 350 + Math.random() * 300
          setTimeout(() => {
            if (this._ctx) this._birdChirp(this._ctx.currentTime, v * 1.2)
          }, delay)
        }
        break
      case BIOME.MUSHROOM:
        this._mysticalTone(now, v * 0.8)
        break
      case BIOME.CANDY:
        this._candyChime(now, v * 0.65)
        break
      case BIOME.AUTUMN:
        this._birdChirp(now, v * 0.8)
        if (Math.random() < 0.5) this._windGust(now + 0.3, v * 0.6)
        break
      case BIOME.CHERRY:
        this._candyChime(now, v * 0.45)
        break
      case BIOME.BLODMARK:
        this._batScreech(now, v * 0.85)
        if (Math.random() < 0.35) {
          const delay = 600 + Math.random() * 800
          setTimeout(() => {
            if (this._ctx) this._batScreech(this._ctx.currentTime, v * 0.55)
          }, delay)
        }
        break
    }
  }

  // ── Accent implementations ────────────────────────────────

  _birdChirp(now, vol) {
    const count    = 2 + Math.floor(Math.random() * 2)
    const baseFreq = 1750 + Math.random() * 900
    for (let i = 0; i < count; i++) {
      const t    = now + i * (0.07 + Math.random() * 0.04)
      const freq = baseFreq * (1 + i * 0.14)
      const dur  = 0.05 + Math.random() * 0.04
      this._chirpTone(t, freq, dur, vol)
    }
  }

  _windGust(now, vol) {
    const ctx = this._ctx
    const buf = this._makeNoiseBuf(0.85)
    const src = ctx.createBufferSource()
    src.buffer = buf

    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 180

    const g = ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(vol, now + 0.28)
    g.gain.linearRampToValueAtTime(0,   now + 0.85)

    src.connect(filt); filt.connect(g); g.connect(this._sfxGain)
    src.start(now); src.stop(now + 0.9)
    src.onended = () => { try { src.disconnect(); filt.disconnect(); g.disconnect() } catch (_) {} }
  }

  _insectBuzz(now, vol) {
    const ctx  = this._ctx
    const osc  = ctx.createOscillator()
    osc.type   = 'sawtooth'
    const base = 75 + Math.random() * 45
    osc.frequency.setValueAtTime(base, now)
    osc.frequency.linearRampToValueAtTime(base * 1.35, now + 0.12)
    osc.frequency.linearRampToValueAtTime(base,        now + 0.26)

    const filt = ctx.createBiquadFilter()
    filt.type  = 'bandpass'
    filt.frequency.value = 650
    filt.Q.value = 2.5

    const g = ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(vol,  now + 0.04)
    g.gain.setValueAtTime(vol,            now + 0.20)
    g.gain.linearRampToValueAtTime(0,     now + 0.28)

    osc.connect(filt); filt.connect(g); g.connect(this._sfxGain)
    osc.start(now); osc.stop(now + 0.32)
    osc.onended = () => { try { osc.disconnect(); filt.disconnect(); g.disconnect() } catch (_) {} }
  }

  _mysticalTone(now, vol) {
    const freqs = [110, 138, 165, 220]
    const root  = freqs[Math.floor(Math.random() * freqs.length)]
    this._tone(now,        root,       1.4, 'sine', vol * 0.60)
    this._tone(now + 0.06, root * 1.5, 1.1, 'sine', vol * 0.28)
  }

  _candyChime(now, vol) {
    const notes = [523, 659, 784, 1047]   // C5 E5 G5 C6
    const note  = notes[Math.floor(Math.random() * notes.length)]
    this._tone(now, note, 0.45, 'triangle', vol)
    if (Math.random() < 0.55) {
      this._tone(now + 0.09, note * 1.5, 0.32, 'triangle', vol * 0.45)
    }
  }

  _batScreech(now, vol) {
    const ctx  = this._ctx
    const osc  = ctx.createOscillator()
    osc.type   = 'sawtooth'
    // Starts high, drops sharply — bat screech shape
    const base = 1800 + Math.random() * 600
    osc.frequency.setValueAtTime(base, now)
    osc.frequency.exponentialRampToValueAtTime(base * 0.35, now + 0.18)
    osc.frequency.exponentialRampToValueAtTime(base * 0.22, now + 0.32)

    const filt = ctx.createBiquadFilter()
    filt.type  = 'bandpass'
    filt.frequency.value = 900
    filt.Q.value = 1.8

    const g = ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(vol, now + 0.02)
    g.gain.setValueAtTime(vol,          now + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

    osc.connect(filt); filt.connect(g); g.connect(this._sfxGain)
    osc.start(now); osc.stop(now + 0.42)
    osc.onended = () => { try { osc.disconnect(); filt.disconnect(); g.disconnect() } catch (_) {} }
  }

  _chirpTone(now, freq, dur, vol) {
    const ctx = this._ctx
    const osc = ctx.createOscillator()
    osc.type  = 'sine'
    osc.frequency.setValueAtTime(freq,          now)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + dur * 0.65)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0,   now)
    g.gain.linearRampToValueAtTime(vol, now + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001,  now + dur)

    osc.connect(g); g.connect(this._sfxGain)
    osc.start(now); osc.stop(now + dur + 0.012)
    osc.onended = () => { try { osc.disconnect(); g.disconnect() } catch (_) {} }
  }

  // ── Low-level synthesis primitives ───────────────────────

  /**
   * Short noise burst through a biquad filter.
   * @param {number} now       AudioContext timestamp
   * @param {number} dur       Duration in seconds
   * @param {string} fType     BiquadFilter type
   * @param {number} fFreq     Filter frequency (Hz)
   * @param {number} fQ        Filter Q
   * @param {number} gain      Peak gain (0–1)
   */
  _noise(now, dur, fType, fFreq, fQ, gain) {
    const ctx = this._ctx
    const buf = this._getSfxNoiseBuf()
    const src = ctx.createBufferSource()
    src.buffer     = buf
    // Random playback offset for variety
    src.loopStart  = Math.random() * (buf.duration - dur - 0.01)
    src.loopEnd    = src.loopStart + dur + 0.01
    src.loop       = false

    const filt = ctx.createBiquadFilter()
    filt.type = fType
    // Slight pitch randomisation (±5%)
    filt.frequency.value = fFreq * (1 + (Math.random() - 0.5) * 0.10)
    filt.Q.value = fQ

    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

    src.connect(filt); filt.connect(g); g.connect(this._sfxGain)
    src.start(now); src.stop(now + dur + 0.015)
    src.onended = () => { try { src.disconnect(); filt.disconnect(); g.disconnect() } catch (_) {} }
  }

  /**
   * Short decaying oscillator tone.
   * @param {number} now
   * @param {number} freq    Frequency (Hz)
   * @param {number} dur     Duration in seconds
   * @param {string} type    Oscillator type
   * @param {number} gain    Peak gain (0–1)
   */
  _tone(now, freq, dur, type, gain) {
    const ctx = this._ctx
    const osc = ctx.createOscillator()
    osc.type = type
    // Slight pitch randomisation (±3%)
    osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.06)

    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

    osc.connect(g); g.connect(this._sfxGain)
    osc.start(now); osc.stop(now + dur + 0.012)
    osc.onended = () => { try { osc.disconnect(); g.disconnect() } catch (_) {} }
  }

  // ── Buffer helpers ────────────────────────────────────────

  /**
   * Returns a cached 0.5-second noise buffer for SFX use.
   * Reusing one buffer is much cheaper than allocating per-sound.
   */
  _getSfxNoiseBuf() {
    if (!this._sfxNoiseBuf) {
      const ctx = this._ctx
      const len = Math.ceil(ctx.sampleRate * 0.5)
      this._sfxNoiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = this._sfxNoiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    }
    return this._sfxNoiseBuf
  }

  /** Creates a fresh noise buffer for one-shot accent effects (wind gust, etc.). */
  _makeNoiseBuf(dur) {
    const ctx = this._ctx
    const len = Math.max(1, Math.ceil(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }
}
