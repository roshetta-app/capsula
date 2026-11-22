// Avatar designs for the public profile (step 14.3b). Plain rules, no imports beyond the list.
// A design is a colour plus a symbol, written as the short code the app and the database store
// ("heart-rose" = heart symbol on a rose background). The database only checks the code against
// its fixed list (table avatar_codes); how a code LOOKS lives here. Initials are the default.

import { AVATAR_CODES } from './profileRules.js'

// Background colours: all deep enough for a white symbol or letters (4.5:1 or better),
// and the same in light and dark mode.
export const AVATAR_COLORS = {
  teal: '#0F766E', blue: '#1D4ED8', rose: '#BE185D', green: '#15803D', amber: '#B45309',
  red: '#B91C1C', sky: '#0369A1', violet: '#6D28D9', indigo: '#4338CA', orange: '#C2410C',
  slate: '#475569', yellow: '#A16207', navy: '#1E3A8A', pink: '#A21CAF', lime: '#4D7C0F', coral: '#BE4B3A',
}

// Symbols the component knows how to draw. Every code in the list must use one of these.
export const AVATAR_SYMBOLS = [
  'capsule', 'stethoscope', 'heart', 'leaf', 'pill', 'cross', 'drop', 'star',
  'syringe', 'flask', 'shield', 'sun', 'moon', 'bandage', 'bolt', 'flower',
]

// Colours for the initials default: picked from the person's name, so it stays the same everywhere.
const INITIALS_PALETTE = ['teal', 'blue', 'rose', 'green', 'amber', 'sky', 'violet', 'indigo', 'slate', 'navy']

// 'heart-rose' -> { code, symbol: 'heart', color: 'rose', bg: '#BE185D' }; unknown or empty -> null.
export function avatarDesign(code) {
  if (typeof code !== 'string' || !AVATAR_CODES.includes(code)) return null
  const i = code.lastIndexOf('-')
  const symbol = code.slice(0, i)
  const color = code.slice(i + 1)
  if (!AVATAR_SYMBOLS.includes(symbol) || !AVATAR_COLORS[color]) return null
  return { code, symbol, color, bg: AVATAR_COLORS[color] }
}

// Up to two letters: first letter of the first and last word ("Sara Ali" -> "SA"); one word
// gives its first letter. Arabic has no capitals, so letters are kept as they are.
export function initialsFor(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const first = Array.from(words[0])[0] ?? ''
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : ''
  return (first + last).toUpperCase()
}

// A steady colour for a name (the same name always gets the same colour).
export function autoColor(name) {
  const s = String(name ?? '').trim()
  let h = 0
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return INITIALS_PALETTE[h % INITIALS_PALETTE.length]
}

// What to draw: a chosen design, or initials on an automatic colour.
// An unknown or empty code (an old list, a typo, nothing chosen) quietly gives initials.
export function resolveAvatar({ code, name } = {}) {
  const design = avatarDesign(code)
  if (design) return { kind: 'design', symbol: design.symbol, bg: design.bg, code: design.code }
  const color = autoColor(name)
  return { kind: 'initials', text: initialsFor(name), bg: AVATAR_COLORS[color] }
}
