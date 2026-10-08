/**
 * src/components/drugs/brands/brandsText.js
 *
 * 2026-10-08 (refactor, phase 3): the small text helpers of BrandsList.jsx
 * (name casing, filter pill labels, the form group lookup), moved here word for
 * word. No hooks, no screen code. No behaviour change.
 */
import { FORM_OPTIONS } from '../DrugFilterPanel.jsx'

// Maps a sibling's raw 'form' value (e.g. 'capsule', 'eye drops') to the
// grouped filter option it belongs to (e.g. the 'Tab / Cap.' group) —
// same grouping DrugFilterPanel.jsx's Form/Route section already uses,
// via its exported FORM_OPTIONS. A value with no match resolves to null
// and is simply left out of the filter rather than guessed into a group.
export function resolveFormGroup(rawForm) {
  if (!rawForm) return null
  return FORM_OPTIONS.find(opt => opt.value !== 'all' && opt.matches.includes(rawForm)) || null
}

// 'brompheniramine + paracetamol' -> 'Brompheniramine + Paracetamol'
// Generic names list their ingredients separated by ' + '; each one gets its
// own capital letter (the rest of the name stays lower case).
export function ingredientCase(text) {
  const t = (text ?? '').trim().toLowerCase()
  return t.replace(/(^|\+\s*)(\S)/g, (_, lead, ch) => lead + ch.toUpperCase())
}

// 'beta blockers + diuretics' -> 'Beta Blockers + Diuretics'. Only the first
// letter of each word is touched, so names already in capitals ('ACE') stay.
// Used for the family labels on the 'Other families' page.
export function familyCase(text) {
  return (text ?? '').replace(/(^|[\s+/(-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())
}

// Pill text for the generic filter: a prompt when nothing is picked, else a count.
export function genericLabel(selected) {
  if (selected.length === 0) return 'Filter by generic'
  return `${selected.length} ${selected.length === 1 ? 'generic' : 'generics'} selected`
}

// Pill text for a multi-select filter: nothing picked, one picked, or a count.
export function multiLabel(selected, options, allLabel, plural) {
  if (selected.length === 0) return allLabel
  if (selected.length === 1) return options.find(o => o.value === selected[0])?.label ?? allLabel
  return `${selected.length} ${plural}`
}
