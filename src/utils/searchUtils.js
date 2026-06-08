/**
 * src/utils/searchUtils.js
 * Phase 2C — Conditions Screen
 *
 * Fuse.js fuzzy search helpers for conditions (and later drugs).
 *
 * Install: npm install fuse.js
 *
 * Config locked in masterplan:
 *   keys      = name_en, specialty.name_en, card_tagline
 *   threshold = 0.35  (tolerates ~2 character typos)
 *   minMatchCharLength = 2
 *   includeScore = true
 */

import Fuse from 'fuse.js'

// ─── Conditions fuzzy search ──────────────────────────────────────────────────

const CONDITION_FUSE_OPTIONS = {
  keys: [
    { name: 'name',          weight: 0.6 },
    { name: 'specialtyName', weight: 0.25 },
    { name: 'card_tagline',  weight: 0.15 },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,   // match anywhere in the string, not just the start
}

/**
 * Build a Fuse instance for a conditions array.
 * Call this once when conditions load, then reuse.
 *
 * @param {object[]} conditions
 * @returns {Fuse}
 */
export function buildConditionIndex(conditions) {
  return new Fuse(conditions, CONDITION_FUSE_OPTIONS)
}

/**
 * Run a fuzzy search against a pre-built Fuse index.
 * Returns results sorted by score (best match first).
 *
 * @param {Fuse}   fuseIndex
 * @param {string} query
 * @returns {object[]}  — original condition objects, sorted by relevance
 */
export function fuzzySearchConditions(fuseIndex, query) {
  if (!query || query.trim().length < 2) return null  // null = show all
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

/**
 * Get top N autocomplete suggestions from a fuzzy search.
 *
 * @param {Fuse}   fuseIndex
 * @param {string} query
 * @param {number} limit   default 5
 * @returns {{ id, name, slug }[]}
 */
export function getAutocompleteSuggestions(fuseIndex, query, limit = 5) {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: r.item.name,
    slug: r.item.slug,
  }))
}
