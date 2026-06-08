/**
 * src/utils/searchUtils.js
 * Phase 2I — adds drug fuzzy search on top of existing condition search.
 *
 * Drug search keys (masterplan spec):
 *   genericName       weight 0.5
 *   category          weight 0.2
 *   concentration+form weight 0.2  (via virtual field — search brands array too)
 *   brands[].name     weight 0.1
 */

import Fuse from 'fuse.js'

// ─── Conditions fuzzy search (unchanged from 2C) ──────────────────────────────

const CONDITION_FUSE_OPTIONS = {
  keys: [
    { name: 'name',          weight: 0.6 },
    { name: 'specialtyName', weight: 0.25 },
    { name: 'card_tagline',  weight: 0.15 },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

export function buildConditionIndex(conditions) {
  return new Fuse(conditions, CONDITION_FUSE_OPTIONS)
}

export function fuzzySearchConditions(fuseIndex, query) {
  if (!query || query.trim().length < 2) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

export function getAutocompleteSuggestions(fuseIndex, query, limit = 5) {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: r.item.name,
    slug: r.item.slug,
  }))
}

// ─── Drugs fuzzy search (new in 2I) ──────────────────────────────────────────

const DRUG_FUSE_OPTIONS = {
  keys: [
    { name: 'genericName',    weight: 0.5  },
    { name: 'category',       weight: 0.2  },
    { name: 'concentration',  weight: 0.1  },
    { name: 'form',           weight: 0.1  },
    { name: 'brands.name',    weight: 0.1  },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

/**
 * Build a Fuse index for a drugs array.
 * @param {object[]} drugs — flat drug objects from DrugContext
 * @returns {Fuse}
 */
export function buildDrugIndex(drugs) {
  return new Fuse(drugs, DRUG_FUSE_OPTIONS)
}

/**
 * Run fuzzy drug search. Returns null when query is too short (= show all).
 * @param {Fuse}   fuseIndex
 * @param {string} query
 * @returns {object[]|null}
 */
export function fuzzySearchDrugs(fuseIndex, query) {
  if (!query || query.trim().length < 2) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

/**
 * Top-N autocomplete suggestions for drugs.
 * @param {Fuse}   fuseIndex
 * @param {string} query
 * @param {number} limit
 * @returns {{ id, name, slug }[]}
 */
export function getDrugAutocompleteSuggestions(fuseIndex, query, limit = 5) {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: r.item.genericName,
    slug: r.item.slug,
  }))
}
