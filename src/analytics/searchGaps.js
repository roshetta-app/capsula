/**
 * src/analytics/searchGaps.js
 * Phase 2C — Conditions Screen
 *
 * Logs search terms that return zero results to Supabase (table: search_gaps).
 * Used in the admin Analytics dashboard (Phase 3J — Search Gaps tab).
 *
 * No personal data. No user IDs. Just the term, context, and (drugs only)
 * which mode it was searched in.
 *
 * Drug Search Refinement Phase 4, §4.6/§4.7 (2026-08-29): a drug gap is
 * only a genuine "we don't have this" signal once the search itself found
 * nothing AND "Did you mean" also had no guess — the caller (useDrugSearch)
 * is responsible for that check before calling this. This function itself
 * just writes what it's given; it doesn't re-derive "is this really a
 * gap" from term/context alone.
 *
 * `mode` was added alongside this same decision — a Brand-mode miss and a
 * Generic-mode miss on the same term are different problems (they check
 * different fields), so they're now recorded separately rather than
 * collapsed into one row. `mode` is Brand/Generic only, so it's null for
 * condition gaps, which have no such concept.
 *
 * Call sites:
 *   useConditionSearch — when fuzzy search returns 0 results after debounce (mode: null)
 *   useDrugSearch      — when the tiered search returns 0 results AND
 *                         "Did you mean" also has nothing (mode: 'brand'|'generic')
 */

import { supabase } from '../lib/supabase'

/**
 * Log a zero-result search term.
 *
 * @param {string} term     — the search string the user typed
 * @param {'conditions'|'drugs'} context
 * @param {'brand'|'generic'|null} [mode] — Brand/Generic mode for drug gaps;
 *   omit or pass null for condition gaps, which have no mode concept.
 */
export async function logSearchGap(term, context, mode = null) {
  if (!term || term.trim().length < 2) return
  const { error } = await supabase.from('search_gaps').insert({
    term:    term.trim().toLowerCase(),
    context,
    mode,
  })
  if (error) {
    console.error('[Analytics] logSearchGap failed:', error.message, error.details, error.hint, { term, context, mode })
  }
}
