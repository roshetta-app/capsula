/**
 * src/components/drugs/classes/KeywordChips.jsx
 *
 *  * 2026-10-08 (refactor, phase 1): moved from drugs/ to drugs/classes/ (the
 *   chips show a class family's keywords). No code change.
 *
 * 2026-10-05 (new): the keyword chips of a family, shown on the Alternatives
 * list of the Related drugs sheet (SimilarAlternativesSheet.jsx). Same chip look as
 * the class sheet: as many words as fit in about two lines (counted by letters,
 * so long words take more room), then a '+N' chip that shows all of them,
 * and a 'Show less' chip that folds them back. Words start with a capital
 * letter. Display only, nothing happens when a word is tapped.
 *
 * ClassSheet.jsx keeps its own copy of this look for now (so a tested
 * file is left alone); the two can be merged later.
 *
 * Exports:
 *   default KeywordChips({ words, showTitle, marginBottom })
 *     words        array of keyword texts (nothing is drawn when empty)
 *     showTitle    boolean, default true: the small 'Keywords' title above
 *                  the chips. The Alternatives list leaves it out.
 *     marginBottom the space left under the block (default 0)
 *   wordsForFamily(keywords, className, familyName)
 *     the words whose targets name exactly this class and family (names as
 *     stored), A to Z, repeats dropped (ignoring capital letters).
 */

import { useState } from 'react'

// How many words fit in about two lines before the '+N' chip. Long words take
// more room than short ones, so the count follows the letters, not a fixed
// number. Sizes are estimates of the chip width in px (12px text, 9px padding
// each side, 6px gap) on a small phone, whose chip area is about 320px wide.
const LINE_WIDTH   = 320
const MAX_LINES    = 2
const CHAR_WIDTH   = 6.2
const CHIP_EXTRA   = 24   // padding + gap around the letters
const MORE_CHIP    = 44   // room kept for the '+N' chip

export function visibleCount(words) {
  const cost = w => (w ? w.length : 0) * CHAR_WIDTH + CHIP_EXTRA
  const total = words.reduce((sum, w) => sum + cost(w), 0)
  // Everything fits in two lines: show all, no '+N' needed.
  if (total <= LINE_WIDTH * MAX_LINES) return words.length
  const budget = LINE_WIDTH * MAX_LINES - MORE_CHIP - 20
  let used = 0
  let n = 0
  for (const w of words) {
    const c = cost(w)
    if (used + c > budget) break
    used += c
    n++
  }
  return Math.max(1, n)
}

// A keyword as shown: the first letter capital, the rest as written.
function capFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

// Sorts keyword texts A to Z and drops repeats (ignoring capital letters).
function uniqueSorted(words) {
  const seen = new Map()
  for (const w of words) {
    const key = w.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, w.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

// The words that point at one family (class + family name, exact match).
export function wordsForFamily(keywords, className, familyName) {
  if (!className || !familyName) return []
  const out = []
  for (const k of keywords ?? []) {
    if (!k || !k.keyword) continue
    for (const t of k.targets ?? []) {
      if (t && t.class === className && t.subclass === familyName) {
        out.push(k.keyword)
        break
      }
    }
  }
  return uniqueSorted(out)
}

export default function KeywordChips({ words = [], showTitle = true, marginBottom = 0 }) {
  // Whether every word is shown, or only the first few and a '+N' chip.
  const [open, setOpen] = useState(false)
  if (words.length === 0) return null

  const limit  = visibleCount(words)
  const shown  = open ? words : words.slice(0, limit)
  const hidden = words.length - limit

  return (
    <div style={{
      flexShrink:    0,
      display:       'flex',
      flexDirection: 'column',
      gap:           'var(--space-2)',
      marginBottom,
    }}>
      {showTitle && (
        <p style={{
          flexShrink: 0,
          margin:     '0 var(--space-1)',
          fontSize:   14.5,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
        }}>
          Keywords
        </p>
      )}
      <div style={{
        flexShrink: 0,
        display:    'flex',
        flexWrap:   'wrap',
        gap:        6,
        margin:     '0 var(--space-1)',
      }}>
        {shown.map(w => (
          <span key={w} style={{
            padding:         '3px 9px',
            borderRadius:    999,
            fontSize:        12,
            lineHeight:      1.3,
            color:           'var(--color-accent)',
            backgroundColor: 'var(--color-accent-light)',
          }}>
            {capFirst(w)}
          </span>
        ))}
        {hidden > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Show fewer words' : `Show ${hidden} more words`}
            aria-expanded={open}
            style={{
              padding:         '3px 9px',
              border:          'none',
              borderRadius:    999,
              fontFamily:      'var(--font-body)',
              fontSize:        12,
              lineHeight:      1.3,
              color:           'var(--color-text-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              cursor:          'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:         'none',
            }}
          >
            {open ? 'Show less' : `+${hidden}`}
          </button>
        )}
      </div>
    </div>
  )
}
