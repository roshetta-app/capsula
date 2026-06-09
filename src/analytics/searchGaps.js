/**
 * src/analytics/searchGaps.js
 * Phase 2C — Conditions Screen
 *
 * Logs search terms that return zero results to Supabase (table: search_gaps).
 * Used in the admin Analytics dashboard (Phase 3J — Search Gaps tab).
 *
 * No personal data. No user IDs. Just the term and context.
 *
 * Call site:
 *   useConditionSearch — when fuzzy search returns 0 results after debounce
 */

import { supabase } from '../lib/supabase'

/**
 * Log a zero-result search term.
 *
 * @param {string} term     — the search string the user typed
 * @param {'conditions'|'drugs'} context
 */
export async function logSearchGap(term, context) {
  if (!term || term.trim().length < 2) return
  const { error } = await supabase.from('search_gaps').insert({
    term:    term.trim().toLowerCase(),
    context,
  })
  if (error) {
    console.error('[Analytics] logSearchGap failed:', error.message, error.details, error.hint, { term, context })
  }
}
