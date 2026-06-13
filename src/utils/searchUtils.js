/**
 * src/utils/searchUtils.js
 * Phase 2I — adds drug fuzzy search on top of existing condition search.
 *
 * Condition search uses a tiered strategy:
 *   1 char  — prefix match only (name starts with the letter)
 *   2 chars — prefix OR any word in name starts with the query
 *   3+ chars — full Fuse.js fuzzy search (handles typos, mid-word matches)
 *
 * This matches the behaviour of Epocrates and Medscape:
 * immediate, accurate single-char results without noise.
 */

import Fuse from 'fuse.js'

// ─── Conditions — tiered search ───────────────────────────────────────────────

const CONDITION_FUSE_OPTIONS = {
  keys: [
    { name: 'name',         weight: 0.70 },
    { name: 'card_tagline', weight: 0.15 },
    { name: 'tags',         weight: 0.15 },
  ],
  threshold:          0.25,
  minMatchCharLength: 3,
  includeScore:       true,
  ignoreLocation:     true,
}

export function buildConditionIndex(conditions) {
  return new Fuse(conditions, CONDITION_FUSE_OPTIONS)
}

/**
 * Tiered condition search.
 *
 * @param {Fuse}         fuseIndex  — built from the pool to search
 * @param {object[]}     pool       — the raw array (needed for prefix tiers)
 * @param {string}       query
 * @returns {object[]|null}         — null means "show everything" (query too short)
 */
export function searchConditions(fuseIndex, pool, query) {
  const q = query.trim()

  if (q.length === 0) return null

  if (q.length === 1) {
    // Tier 1: name must START with the letter — fast, zero noise
    const lower = q.toLowerCase()
    return pool.filter(c => c.name?.toLowerCase().startsWith(lower))
  }

  if (q.length === 2) {
    // Tier 2: name starts with query OR any word in name starts with query
    const lower = q.toLowerCase()
    return pool.filter(c => {
      const name = c.name?.toLowerCase() ?? ''
      return name.startsWith(lower) || name.split(/\s+/).some(word => word.startsWith(lower))
    })
  }

  // Tier 3: full fuzzy (3+ chars)
  const results = fuseIndex.search(q)
  return results.map(r => r.item)
}

/**
 * Autocomplete suggestions using the same tiered logic.
 * When activeSpecialty is provided (not 'all'), results are filtered to that specialty.
 */
export function getAutocompleteSuggestions(fuseIndex, pool, query, limit = 5, activeSpecialty = 'all') {
  const q = query.trim()
  if (q.length === 0) return []

  let candidates

  if (q.length === 1) {
    const lower = q.toLowerCase()
    candidates = pool.filter(c => c.name?.toLowerCase().startsWith(lower))
  } else if (q.length === 2) {
    const lower = q.toLowerCase()
    candidates = pool.filter(c => {
      const name = c.name?.toLowerCase() ?? ''
      return name.startsWith(lower) || name.split(/\s+/).some(word => word.startsWith(lower))
    })
  } else {
    // Fetch extra candidates when filtering by specialty
    const raw = fuseIndex.search(q, { limit: activeSpecialty !== 'all' ? limit * 4 : limit })
    candidates = raw.map(r => r.item)
  }

  if (activeSpecialty !== 'all') {
    candidates = candidates.filter(c => c.specialtyId === activeSpecialty)
  }

  return candidates.slice(0, limit).map(c => ({
    id:   c.id,
    name: c.name,
    slug: c.slug,
  }))
}

// ─── Legacy export — kept so any other callers don't break ───────────────────
// Prefer searchConditions() for new code.
export function fuzzySearchConditions(fuseIndex, query) {
  if (!query || query.trim().length < 3) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
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
