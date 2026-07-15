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
 *
 * GFB step 3.3 (2026-07-16): drug search index split into two independent
 * indexes — a brand index (item's own name/nameAr primary, form/
 * concentration secondary) and a generic index (genericName/arabicName
 * primary, category secondary) — so brand and generic results are never
 * scored against each other, per ADR-033.
 *
 * `buildDrugIndex`/`DRUG_FUSE_OPTIONS`/`getDrugAutocompleteSuggestions`
 * below are kept as-is (legacy, single merged index) because
 * `useDrugSearch.js` still calls them and hasn't been switched over yet —
 * that hook's API shape (mode param vs. two result sets) is a deferred
 * design decision, step 3.5. Once 3.5 wires the hook onto the new
 * `buildDrugBrandIndex`/`buildDrugGenericIndex`/
 * `getDrugAutocompleteSuggestionsByMode` functions below, the legacy trio
 * has no remaining callers and can be deleted. The one change made to the
 * legacy `DRUG_FUSE_OPTIONS` here is removing the `brands.name` key — it
 * read the nested `brands` array that no longer exists after the Phase
 * 3.1 reshape (each row is now a single item, not a formulation with a
 * brands array), so that key silently matched nothing anyway.
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

// ─── Drugs fuzzy search — LEGACY, single merged index ─────────────────────────
// Kept only until useDrugSearch.js (step 3.5) switches to the split indexes
// below. See file-header note. brands.name key removed (2026-07-16, step
// 3.3) — dead after the 3.1 reshape, matched nothing regardless.

const DRUG_FUSE_OPTIONS = {
  keys: [
    { name: 'genericName',   weight: 0.5  },
    { name: 'category',      weight: 0.2  },
    { name: 'concentration', weight: 0.1  },
    { name: 'form',          weight: 0.1  },
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

// ─── Drugs fuzzy search — split indexes (Phase 3, step 3.3) ───────────────────
// Brand index: searches by the item's own name first. Generic index:
// searches by the underlying drug's generic name first. No shared scoring
// between them — a query only ever matches within the mode it's run against.
// `fuzzySearchDrugs` above is mode-agnostic (just runs whatever index it's
// given) and is reused here rather than duplicated.

const DRUG_BRAND_FUSE_OPTIONS = {
  keys: [
    { name: 'name',          weight: 0.6 },
    { name: 'nameAr',        weight: 0.2 },
    { name: 'form',          weight: 0.1 },
    { name: 'concentration', weight: 0.1 },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

const DRUG_GENERIC_FUSE_OPTIONS = {
  keys: [
    { name: 'genericName', weight: 0.7 },
    { name: 'arabicName',  weight: 0.2 },
    { name: 'category',    weight: 0.1 },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

export function buildDrugBrandIndex(drugs) {
  return new Fuse(drugs, DRUG_BRAND_FUSE_OPTIONS)
}

export function buildDrugGenericIndex(drugs) {
  return new Fuse(drugs, DRUG_GENERIC_FUSE_OPTIONS)
}

/**
 * Autocomplete suggestions for the split indexes. Unlike the legacy
 * getDrugAutocompleteSuggestions above (always returns genericName), this
 * returns the item's own name in brand mode, per plan §10 Section 2.
 *
 * @param {Fuse}   fuseIndex — built from buildDrugBrandIndex or buildDrugGenericIndex
 * @param {string} query
 * @param {number} limit
 * @param {'brand'|'generic'} mode
 */
export function getDrugAutocompleteSuggestionsByMode(fuseIndex, query, limit = 5, mode = 'generic') {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: mode === 'brand' ? r.item.name : r.item.genericName,
    slug: mode === 'brand' ? r.item.slug : r.item.genericSlug,
  }))
}
