/**
 * src/utils/highlightMatch.js
 *
 * Splits `text` into segments, marking which parts match `query`.
 * Case-insensitive. Returns a plain array — no JSX here.
 *
 * @param {string} text    — the full condition name
 * @param {string} query   — the user's current search term
 * @returns {{ text: string, bold: boolean }[]}
 *
 * Example:
 *   highlightMatch('Acute Bronchitis', 'bron')
 *   → [
 *       { text: 'Acute ', bold: false },
 *       { text: 'Bron', bold: true },
 *       { text: 'chitis', bold: false },
 *     ]
 */
export function highlightMatch(text, query) {
  if (!query || query.trim().length < 2) {
    return [{ text, bold: false }]
  }

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex   = new RegExp(`(${escaped})`, 'gi')
  const parts   = text.split(regex)

  return parts
    .filter(p => p.length > 0)
    .map(part => ({
      text: part,
      bold: part.toLowerCase() === query.trim().toLowerCase(),
    }))
}
