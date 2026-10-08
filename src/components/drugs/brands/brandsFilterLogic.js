/**
 * src/components/drugs/brands/brandsFilterLogic.js
 *
 * 2026-10-08 (refactor, phase 1): moved from drugs/ to drugs/brands/. No code change.
 *
 * Related drugs sheet — the filter rules, kept as plain functions so they can
 * be tested on their own (no screen needed).
 *
 * 2026-10-03: the Generic and Form filters no longer follow each other. Each
 * filter only narrows the list; picking in one never changes the picks in the
 * other. Inside one filter the picks are 'any of' (Ibuprofen OR Diclofenac);
 * between the two filters they are 'and' (Ibuprofen OR Diclofenac, AND Tablet).
 * The pop-ups show, for every option, how many brands it would give with the
 * OTHER filter's picks applied, so a pick that leads nowhere can be dimmed
 * before it is tapped.
 *
 * groupOf(item) returns the form group value of an item (or null when the
 * item's form has no group; such an item only shows while no form is picked).
 *
 * 2026-10-05 (Other generics): in the Filter by generic pop-up, the generics
 * with the fewest brands are folded into one 'Other generics' row
 * (otherGenericIds below), but only when the list is long. The cut-off adapts
 * to the list: the smallest brand count (1, then 2, then 3) that brings the
 * main list down to a short length, so a long list with many two-brand
 * generics folds those too, and a short list is left alone. Brand counts are
 * taken from the whole list, not from the number shown under the form picks,
 * so a row never moves in or out of 'Other' while picking.
 *
 * 2026-10-03 (generic pop-up order): the Filter by generic pop-up lists the
 * generics with the most brands first (sortGenericOptions below).
 */

// Brands passing the generic picks and the form picks. [] = no filter.
export function applyFilters(items, { genericSel = [], formSel = [] }, groupOf) {
  // Sets, so each brand costs one lookup however many generics are picked
  // (picking 'All other generics' can mean hundreds of picks).
  const genericSet = genericSel.length > 0 ? new Set(genericSel) : null
  const formSet    = formSel.length > 0 ? new Set(formSel) : null
  return items.filter(s =>
    (!genericSet || genericSet.has(s.genericId)) &&
    (!formSet || formSet.has(groupOf(s)))
  )
}

// For each form group: how many brands it gives with the generic picks applied
// (the form picks themselves are ignored, so every form shows its own number).
export function countByForm(items, genericSel, groupOf) {
  const counts = new Map()
  for (const s of applyFilters(items, { genericSel, formSel: [] }, groupOf)) {
    const g = groupOf(s)
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return counts
}

// For each generic: how many brands it gives with the form picks applied.
export function countByGeneric(items, formSel, groupOf) {
  const counts = new Map()
  for (const s of applyFilters(items, { genericSel: [], formSel }, groupOf)) {
    counts.set(s.genericId, (counts.get(s.genericId) ?? 0) + 1)
  }
  return counts
}

// An option can be added when it gives at least one brand. An option that is
// already picked can always be removed, whatever its number says.
export function isOptionLocked(count, isPicked) {
  return count === 0 && !isPicked
}

// Generic pop-up order: most brands first. Generics with the same number of
// brands fall back to A-Z, so the order never jumps around. Returns a new
// list; the input is left untouched.
export function sortGenericOptions(options) {
  return [...options].sort((a, b) =>
    (b.count - a.count) || a.label.localeCompare(b.label)
  )
}

// Tuning of the 'Other generics' row. Nothing is folded unless the list has at
// least OTHER_LONG_LIST generics. Then generics with up to a cut-off number of
// brands are folded, the cut-off being the smallest one (1, 2 ... up to
// OTHER_MAX_BRANDS) that leaves the main list, plus the 'Other' row, at
// OTHER_TARGET_ROWS rows or fewer; when none does, OTHER_MAX_BRANDS is used.
// Folding is dropped when it would hide fewer than OTHER_MIN_FOLDED generics
// (the row would save almost nothing) or would hide every generic.
export const OTHER_LONG_LIST    = 12
export const OTHER_TARGET_ROWS  = 8
export const OTHER_MAX_BRANDS   = 3
export const OTHER_MIN_FOLDED   = 4

// The generic ids to fold into the 'Other generics' row, or an empty set when
// nothing is folded (see the numbers above).
export function otherGenericIds(items) {
  const totals = new Map()
  for (const s of items) totals.set(s.genericId, (totals.get(s.genericId) ?? 0) + 1)
  if (totals.size < OTHER_LONG_LIST) return new Set()

  const sizes = [...totals.values()]
  let cutoff = OTHER_MAX_BRANDS
  for (let c = 1; c <= OTHER_MAX_BRANDS; c++) {
    const kept = sizes.filter(n => n > c).length
    if (kept + 1 <= OTHER_TARGET_ROWS) { cutoff = c; break }
  }

  const folded = [...totals].filter(([, n]) => n <= cutoff).map(([id]) => id)
  const keptCount = totals.size - folded.length
  return folded.length >= OTHER_MIN_FOLDED && keptCount > 0 ? new Set(folded) : new Set()
}

export function sortItems(items, mode) {
  return [...items].sort((a, b) => {
    if (mode === 'price') {
      const pa = a.price ?? Infinity
      const pb = b.price ?? Infinity
      if (pa !== pb) return pa - pb
    }
    return (a.tradenameClean ?? '').localeCompare(b.tradenameClean ?? '')
  })
}
