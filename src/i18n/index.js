// ─────────────────────────────────────────────────────────────
//  Klosseland — i18n system
//  Usage:
//    import { t, setLanguage, getLanguage } from './i18n/index.js'
//    t('play')                     → "Play" / "Spill"
//    t('lan_connected', {name:'Lea'}) → "Lea joined!"
// ─────────────────────────────────────────────────────────────
import en from './en.js'
import no from './no.js'

const bundles = { en, no }

let current = en

/** Change language. Persists to localStorage. */
export function setLanguage(code) {
  if (!bundles[code]) return
  current = bundles[code]
  localStorage.setItem('kl_lang', code)
  // Notify all listeners
  _listeners.forEach(fn => fn(code))
}

/** Get current language code ('en' | 'no'). */
export function getLanguage() { return current.lang }

/** Translate a key, optionally interpolating {placeholders}. */
export function t(key, vars) {
  const str = current[key] ?? en[key] ?? key
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

/** Subscribe to language changes. Returns an unsubscribe function. */
const _listeners = new Set()
export function onLanguageChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

// Block / pet name helpers — these live in their own registries
// but expose a translate helper here for convenience.
export function blockName(block) {
  return current.lang === 'no' ? block.nameNo : block.nameEn
}
export function petName(petDef) {
  return current.lang === 'no' ? petDef.nameNo : petDef.nameEn
}

// Initialise from saved preference
;(function init() {
  const saved = localStorage.getItem('kl_lang')
  if (saved && bundles[saved]) current = bundles[saved]
})()
