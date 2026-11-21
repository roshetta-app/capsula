/**
 * src/utils/scrollMemory.js
 * 2026-11-20: the one rule for where a screen starts scrolled, shared by the two hooks
 * (useListScrollMemory for a whole page, useRowScrollMemory for a sideways row).
 *
 * The rule: a screen opened fresh (a tap, a tab, a link) starts at the top / the first card.
 * A screen reached by going Back (the Back arrow or the phone's Back button) starts where the
 * person left it. The places are kept in a small memory for the current app session only,
 * so a fresh launch always starts at the top.
 */

const memory = new Map()

/** Keep a place (pixels) under a screen's or row's key. Bad numbers are ignored. */
export function rememberScroll(key, value) {
  if (key == null || !Number.isFinite(value)) return
  memory.set(key, value)
}

/** The place kept under a key, or undefined when nothing is kept. */
export function recalledScroll(key) {
  return memory.get(key)
}

/** Forget everything (used by the checks). */
export function clearScrollMemory() {
  memory.clear()
}

/**
 * Where a screen or row starts. `navType` is the router's 'POP' (Back), 'PUSH' or 'REPLACE'.
 * Only Back brings the kept place back; anything else, or no kept place, starts at 0.
 * A sideways row in a right-to-left page keeps a negative number, so any non-zero number counts.
 */
export function startPosition(navType, saved) {
  if (navType !== 'POP') return 0
  if (!Number.isFinite(saved) || saved === 0) return 0
  return saved
}

/**
 * 2026-11-21 (step 12.10): the key for a main tab's place, named like the list and row keys
 * ('list:groups', 'row:home-groups'): 'tab:conditions', 'tab:drugs', 'tab:favourites'.
 */
export function tabScrollKey(name) {
  return `tab:${name}`
}

/**
 * Where a main tab screen starts. A tap on a tab (`fromTab`) brings back the place kept for that
 * tab, or the top when nothing is kept. Back (`POP`) brings the kept place back only when
 * `restoreOnBack` is on. Anything else returns null: the screen is left to do what it did before.
 */
export function startForTab(navType, fromTab, saved, restoreOnBack = true) {
  const kept = Number.isFinite(saved) ? saved : 0
  if (fromTab) return kept
  if (navType === 'POP' && restoreOnBack && kept !== 0) return kept
  return null
}
