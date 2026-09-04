// src/utils/textDirection.js
//
// Looks at a piece of typed text and decides whether it should read
// right-to-left (Arabic-family scripts) or left-to-right (Latin, Greek,
// Cyrillic, etc.), based on the first "strong" directional character
// found — the same first-strong-character approach used by apps like
// Twitter for auto-direction. Kept as its own file rather than inline in
// PersonalNotes.jsx so any other free-text area (FreeTextPostBlock.jsx,
// NoteRowEditor.jsx, etc.) can reuse it later without duplicating the
// detection logic.
//
// Only used for the live typing box now. The saved note display used to
// have its own hand-written function here (splitIntoDirectionalRuns) that
// manually split mixed text into language chunks — that approach broke
// in two different ways in testing, so the saved note was switched to
// rely on the browser's own built-in bidi text engine (dir="auto" +
// unicode-bidi: plaintext directly in PersonalNotes.jsx) instead of any
// custom splitting logic. This file no longer needs to do that job.
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
