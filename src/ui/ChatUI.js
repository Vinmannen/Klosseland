// ─────────────────────────────────────────────────────────────
//  Klosseland — ChatUI
//  Bottom-left chat overlay.
//  T         → open input
//  Enter     → send and close
//  Escape    → close without sending
//  Messages auto-fade after 6 s.
// ─────────────────────────────────────────────────────────────

const FADE_MS    = 6000
const MAX_LINES  = 30

export class ChatUI {
  constructor() {
    this._el       = null
    this._list     = null
    this._inputRow = null
    this._input    = null
    this._isOpen   = false
    this._onSend   = null
    this._timers   = []
    this._keyDown  = this._handleKeyDown.bind(this)
    window.addEventListener('keydown', this._keyDown)
  }

  /** Callback: (text: string) => void — called when the player sends a message. */
  onSend(fn) { this._onSend = fn }

  /** Mount chat into a parent element (defaults to #ui-root). */
  mount(parent = document.getElementById('ui-root')) {
    this._el = document.createElement('div')
    this._el.id = 'chat-root'
    this._el.innerHTML = `
      <div id="chat-messages"></div>
      <div id="chat-input-row">
        <input id="chat-input" type="text" maxlength="200" autocomplete="off"
               placeholder="Chat… (Enter to send)">
      </div>
    `
    parent.appendChild(this._el)

    this._list     = this._el.querySelector('#chat-messages')
    this._inputRow = this._el.querySelector('#chat-input-row')
    this._input    = this._el.querySelector('#chat-input')

    this._input.addEventListener('keydown', e => {
      // Prevent game controls from firing while typing
      e.stopPropagation()
      if (e.code === 'Enter') {
        e.preventDefault()
        this._sendAndClose()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        this._close()
      }
    })
  }

  /** True while the text input is focused/open. */
  get isOpen() { return this._isOpen }

  // ── Public message API ─────────────────────────────────────
  /** Render a chat message from a remote player. */
  addMessage(name, text) {
    this._addLine(`${name}: ${text}`, false)
  }

  /** Render a local player's own message (shown immediately on send). */
  addOwnMessage(name, text) {
    this._addLine(`${name}: ${text}`, false)
  }

  /** System notices: join / leave / info. */
  addNotice(text) {
    this._addLine(text, true)
  }

  // ── Internals ──────────────────────────────────────────────
  _addLine(text, isNotice) {
    const el       = document.createElement('div')
    el.className   = `chat-msg${isNotice ? ' chat-notice' : ''}`
    el.textContent = text
    this._list.appendChild(el)
    this._list.scrollTop = this._list.scrollHeight

    // Trim old lines
    while (this._list.children.length > MAX_LINES) {
      this._list.removeChild(this._list.firstChild)
    }

    // Fade unless input is open (keep visible while typing)
    const timerId = setTimeout(() => {
      if (!this._isOpen) {
        el.classList.add('chat-msg-fade')
        setTimeout(() => el.remove(), 600)
      }
    }, FADE_MS)
    this._timers.push(timerId)
  }

  _handleKeyDown(e) {
    if (e.code === 'KeyT' && !this._isOpen) {
      e.preventDefault()
      this._open()
    }
  }

  _open() {
    this._isOpen = true
    this._inputRow.classList.add('chat-input-visible')
    this._input.value = ''
    this._input.focus()
    // Un-fade all current messages while input is open
    this._list.querySelectorAll('.chat-msg-fade').forEach(m => m.classList.remove('chat-msg-fade'))
  }

  _close() {
    this._isOpen = false
    this._input.blur()
    this._inputRow.classList.remove('chat-input-visible')
  }

  _sendAndClose() {
    const text = this._input.value.trim()
    if (text) this._onSend?.(text)
    this._close()
  }

  dispose() {
    window.removeEventListener('keydown', this._keyDown)
    this._timers.forEach(id => clearTimeout(id))
    this._el?.remove()
  }
}
