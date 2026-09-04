// src/utils/textDirection.js
//
// Looks at a piece of typed or saved text and decides whether it should
// read right-to-left (Arabic-family scripts) or left-to-right (Latin,
// Greek, Cyrillic, etc.), based on the first "strong" directional
// character found — the same first-strong-character approach used by
// apps like Twitter for auto-direction. Kept as its own file rather than
// inline in PersonalNotes.jsx so any other free-text area
// (FreeTextPostBlock.jsx, NoteRowEditor.jsx, etc.) can reuse it later
// without duplicating the detection logic — checked project_tree.md's
// utils/ folder first and nothing else currently needs this, so nothing
// is being wired up beyond Personal Notes yet.
//
// This is a per-block check (looks at the first strong character in the
// whole string), not per-line — a note that starts in English and
// switches to Arabic partway through follows whichever strong character
// appears first overall, rather than flipping direction line by line.

const RTL_CHAR_RANGE = /[\u0591-\u07FF\u0860-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/
const LTR_CHAR_RANGE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/

/**
 * Returns 'rtl' or 'ltr' based on the first strong-directional character
 * found in `text`. Characters with no inherent direction of their own
 * (numbers, punctuation, whitespace, emoji) are skipped over while
 * scanning. Defaults to 'ltr' when no strong character is found at all
 * (empty string, numbers-only, punctuation-only, etc.).
 */
export function getTextDirection(text) {
  if (!text) return 'ltr'

  for (const char of text) {
    if (RTL_CHAR_RANGE.test(char)) return 'rtl'
    if (LTR_CHAR_RANGE.test(char)) return 'ltr'
  }

  return 'ltr'
}

/**
 * Same first-strong-character scan as getTextDirection, but returns null
 * for a word with no strong character of its own (pure numbers,
 * punctuation, emoji, or whitespace) instead of defaulting to 'ltr'.
 * splitIntoDirectionalRuns needs that null case to know when a word
 * should just tag along with whichever chunk it's sitting next to,
 * rather than force-starting a new left-to-right chunk.
 */
function detectStrongDirection(word) {
  for (const char of word) {
    if (RTL_CHAR_RANGE.test(char)) return 'rtl'
    if (LTR_CHAR_RANGE.test(char)) return 'ltr'
  }
  return null
}

/**
 * Splits mixed-language text into isolated chunks, one per uninterrupted
 * run of same-direction words, so each chunk can be wrapped in its own
 * <bdi> for display. This is what lets a saved note like
 * "Tonsiltis بيكون في حالات شديدة" render as two isolated blocks instead
 * of one direction fighting the other.
 *
 * Splitting happens strictly on whitespace boundaries — never inside a
 * word — so a single word (e.g. "antibiotics") can never be broken into
 * two chunks no matter which language starts the note or where a
 * language switch happens later. Words with no strong character of their
 * own (numbers, punctuation, emoji) attach to whichever chunk comes
 * right before them, so they don't force an unnecessary extra chunk.
 *
 * Returns an array of { text, dir } objects in reading order. An empty
 * or falsy input returns a single empty 'ltr' run so callers can map
 * over the result unconditionally.
 */
export function splitIntoDirectionalRuns(text) {
  if (!text) return [{ text: '', dir: 'ltr' }]

  // Each token is one word plus any whitespace immediately after it, so
  // re-joining every token's text in order reproduces the original
  // string exactly (including spacing and line breaks).
  const tokens = text.match(/\S+\s*/g) || [text]
  const runs = []

  for (const token of tokens) {
    const dir = detectStrongDirection(token)

    if (dir === null) {
      // No strong character in this token — attach it to the previous
      // chunk if there is one, otherwise start a neutral chunk that the
      // next strong token's direction will effectively take over.
      if (runs.length > 0) {
        runs[runs.length - 1].text += token
      } else {
        runs.push({ text: token, dir: 'ltr' })
      }
      continue
    }

    if (runs.length > 0 && runs[runs.length - 1].dir === dir) {
      runs[runs.length - 1].text += token
    } else {
      runs.push({ text: token, dir })
    }
  }

  return runs
}
