/**
 * src/utils/applyDrugFilters.js
 * 2026-10-23 (UI refresh): the Form / Route filter, moved out of DrugsScreen.jsx unchanged so the
 * Add drugs screen can use the same filter. Narrows a list with .filter() only; never reorders.
 */

import { FORM_OPTIONS } from '../components/drugs/DrugFilterPanel'

// ─── applyFilters ─────────────────────────────────────────────────────────────

export function applyFilters(drugs, filters) {
  if (!filters) return drugs
  let result = drugs

  // Form — each selected chip covers a set of real raw form values (see
  // DrugFilterPanel's FORM_OPTIONS), not a single value, so match against
  // the combined set of raw values for every chip that's currently active.
  // A chip can also define `routes` (currently only Inhaled) for real
  // items whose `form` is a generic label (piece/powder/solution) but
  // whose `route` is the actual signal — a drug matches if its form is in
  // the active matches set OR its route is in the active routes set.
  if (!filters.forms.includes('all')) {
    const activeOptions = FORM_OPTIONS.filter(opt => filters.forms.includes(opt.value))
    const activeFormMatches  = new Set(activeOptions.flatMap(opt => opt.matches))
    const activeRouteMatches = new Set(activeOptions.flatMap(opt => opt.routes ?? []))
    result = result.filter(d =>
      activeFormMatches.has(d.form?.toLowerCase()) ||
      (d.route && activeRouteMatches.has(d.route.toLowerCase()))
    )
  }

  return result
}
