/**
 * src/utils/searchUtils.js
 * Phase 2I — adds drug fuzzy search on top of existing condition search.
 */

import Fuse from 'fuse.js'

// ─── Conditions fuzzy search ──────────────────────────────────────────────────
//
// minMatchCharLength: 1 — search activates on first keystroke.
// specialtyName excluded — specialty filtering is handled by the pill, not search.
// threshold 0.25 — tight enough to avoid noise, loose enough for typos.

const CONDITION_FUSE_OPTIONS = {
  keys: [
    { name: 'name',         weight: 0.75 },
    { name: 'card_tagline', weight: 0.25 },
  ],
  threshold:          0.25,
  minMatchCharLength: 1,
  includeScore:       true,
  ignoreLocation:     true,
}

export function buildConditionIndex(conditions) {
  return new Fuse(conditions, CONDITION_FUSE_OPTIONS)
}

export function fuzzySearchConditions(fuseIndex, query) {
  if (!query || query.trim().length < 1) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

/**
 * Top-N autocomplete suggestions.
 * When activeSpecialty is provided (not 'all'), suggestions are filtered
 * to only show conditions belonging to that specialty.
 */
export function getAutocompleteSuggestions(fuseIndex, query, limit = 5, activeSpecialty = 'all') {
  if (!query || query.trim().length < 1) return []
  const results = fuseIndex.search(query.trim(), { limit: activeSpecialty !== 'all' ? limit * 4 : limit })
  const filtered = activeSpecialty !== 'all'
    ? results.filter(r => r.item.specialtyId === activeSpecialty)
    : results
  return filtered.slice(0, limit).map(r => ({
    id:   r.item.id,
    name: r.item.name,
    slug: r.item.slug,
  }))
}

// ─── Drugs fuzzy search ───────────────────────────────────────────────────────

const DRUG_FUSE_OPTIONS = {
  keys: [
    { name: 'genericName',   weight: 0.5  },
    { name: 'category',      weight: 0.2  },
    { name: 'concentration', weight: 0.1  },
    { name: 'form',          weight: 0.1  },
    { name: 'brands.name',   weight: 0.1  },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

export function buildDrugIndex(drugs) {
  return new Fuse(drugs, DRUG_FUSE_OPTIONS)
}

export function fuzzySearchDrugs(fuseIndex, query) {
  if (!query || query.trim().length < 2) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

export function getDrugAutocompleteSuggestions(fuseIndex, query, limit = 5) {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: r.item.genericName,
    slug: r.item.slug,
  }))
}
