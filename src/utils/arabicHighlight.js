/**
 * src/utils/arabicHighlight.js
 *
 * 2026-10-14 (plan v9 Session 13 follow-up, 'Arabic search like English'):
 * splits the displayed Arabic line into bold and plain parts, like highlightMatch
 * does for English, but the typed text is found after the same cleanup the search
 * uses, so a different spelling still bolds the right letters: alef and hamza
 * forms, ta marbuta and ha, alef maqsura and ya, diacritics, tatweel, a leading
 * 'al-', Arabic-Indic digits, and the ' - ' separators in the line.
 *
 * Only the typed NAME is bolded. A strength or form typed beside it is read out
 * of the query first (same reading as the search), so it is never part of the
 * bold text. A match that exists only through the small-misspelling tolerance is
 * left unbolded, like English. Returns a plain array, no JSX:
 *   [{ text, bold }, ...]
 */
import { arSearchNorm } from './arabicQuery'
import { readArabicQuery } from './searchUtils'

const IGNORABLE_RE = /[\u064B-\u0652\u0670\u0640]/

// Cleans `text` exactly like arSearchNorm and remembers, for every kept letter,
// where it was in the original text.
function normWithMap(text) {
  const kept = []
  for (let k = 0; k < text.length; k++) {
    const c = text[k]
    if (/\s/.test(c)) { kept.push({ ch: ' ', idx: k }); continue }
    const n = arSearchNorm(c)
    if (n === '') continue
    kept.push({ ch: n, idx: k })
  }

  // Collapse spaces, trim the ends.
  const spaced = []
  for (const item of kept) {
    if (item.ch === ' ' && (spaced.length === 0 || spaced[spaced.length - 1].ch === ' ')) continue
    spaced.push(item)
  }
  while (spaced.length > 0 && spaced[spaced.length - 1].ch === ' ') spaced.pop()

  // Drop a leading 'al-' on each word (only when letters follow it).
  const out = []
  for (let p = 0; p < spaced.length; p++) {
    const atWordStart = p === 0 || spaced[p - 1].ch === ' '
    if (atWordStart && spaced[p].ch === '\u0627' && spaced[p + 1]?.ch === '\u0644' &&
        spaced[p + 2] && spaced[p + 2].ch !== ' ') {
      p += 1
      continue
    }
    out.push(spaced[p])
  }
  return { norm: out.map(o => o.ch).join(''), map: out.map(o => o.idx) }
}

function findMatch(norm, q) {
  let first = -1
  let from = 0
  for (;;) {
    const at = norm.indexOf(q, from)
    if (at === -1) break
    if (first === -1) first = at
    if (at === 0 || norm[at - 1] === ' ') return at // a word start is preferred
    from = at + 1
  }
  return first
}

/**
 * @param {string} text   — the Arabic line as shown on the card
 * @param {string} typed  — the raw typed search text
 */
export function highlightArabic(text, typed) {
  const plain = [{ text, bold: false }]
  if (!text || !typed) return plain

  const { norm, map } = normWithMap(text)
  const names = [
    readArabicQuery(typed, false).nameText,
    readArabicQuery(typed, true).nameText,
    typed,
  ]

  for (const name of names) {
    const q = arSearchNorm(name)
    if (q.length < 2) continue
    const at = findMatch(norm, q)
    if (at === -1) continue

    let start = map[at]
    let end = map[at + q.length - 1] + 1
    // A match that starts a word also takes the 'al-' that the cleanup dropped.
    if (at === 0 || norm[at - 1] === ' ') {
      while (start > 0 && !/[\s-]/.test(text[start - 1])) start--
    }
    // Keep diacritics that sit on the last bolded letter.
    while (end < text.length && IGNORABLE_RE.test(text[end])) end++

    const parts = []
    if (start > 0) parts.push({ text: text.slice(0, start), bold: false })
    parts.push({ text: text.slice(start, end), bold: true })
    if (end < text.length) parts.push({ text: text.slice(end), bold: false })
    return parts
  }
  return plain
}
