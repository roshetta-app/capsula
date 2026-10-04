/**
 * src/components/drugs/brandsFilterLogic.js
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
 * 2026-10-05 (Other generics): in the Filter by generic pop-up, generics that
 * have only one brand in the whole list are folded into one 'Other generics'
 * row (otherGenericIds below), but only when there are at least 4 of them and
 * at least one bigger generic stays in the main list. A generic counts as
 * one-brand by its brands in the whole list, not by the number shown under the
 * form picks, so a row never moves in or out of 'Other' while picking.
 *
 * 2026-10-03 (generic pop-up order): the Filter by generic pop-up lists the
 * generics with the most brands first (sortGenericOptions below).
 */

// Brands passing the generic picks and the form picks. [] = no filter.
export function applyFilters(items, { genericSel = [], formSel = [] }, groupOf) {
  return items.filter(s =>
    (genericSel.length === 0 || genericSel.includes(s.genericId)) &&
    (formSel.length === 0 || formSel.includes(groupOf(s)))
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

// How many one-brand generics it takes before they are folded into 'Other'.
export const OTHER_GENERICS_MIN = 4

// The generic ids to fold into the 'Other generics' row: the generics with
// exactly one brand in the whole list. An empty set (nothing is folded) when
// there are fewer than OTHER_GENERICS_MIN of them, or when every generic has
// only one brand (then there is no bigger generic to keep in the list).
export function otherGenericIds(items) {
  const totals = new Map()
  for (const s of items) totals.set(s.genericId, (totals.get(s.genericId) ?? 0) + 1)
  const singles = [...totals].filter(([, n]) => n === 1).map(([id]) => id)
  const hasBigger = totals.size > singles.length
  return singles.length >= OTHER_GENERICS_MIN && hasBigger ? new Set(singles) : new Set()
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
