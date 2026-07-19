/**
 * src/utils/searchUtils.js
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
 *
 * GFB step 3.5.3 (2026-07-16): DRUG_GENERIC_FUSE_OPTIONS now also scores
 * `ingredients` (per ADR-042) — the per-ingredient text array on combo
 * generics, backfilled in 3.5.1 and returned by fetchFlatDrugs in 3.5.2.
 * Lets a search like "amoxicillin" surface a combo generic such as
 * "amoxicillin + clavulanic acid" even when the combined name alone
 * wouldn't score well. Plain single-ingredient generics have a null
 * ingredients array and just keep matching on genericName as before.
 *
 * drug_library_ui_ux step 1e.1 (2026-07-19, decision 4.17, plan §4B):
 * added `searchDrugsTiered`/`getDrugAutocompleteSuggestionsTiered` below —
 * the same 1/2/3+-char tiered ramp Conditions already uses, but field-
 * scoped per mode rather than copying Conditions' multi-field weighted
 * blend. `useDrugSearch.js` now calls these instead of `fuzzySearchDrugs`/
 * `getDrugAutocompleteSuggestionsByMode` directly. Those two functions are
 * left in place below (not deleted) since this session didn't check for
 * other callers app-wide — flag and confirm before removing them in a
 * future step if a full-repo check shows nothing else uses them.
 *
 * drug_library_ui_ux step 1e.2 (2026-07-19, decisions 4.18/4.32, plan §4B):
 * added a real relevance floor to the 3+ char fuzzy tier, plus fair
 * per-ingredient scoring for Generic mode. Confirmed via direct testing
 * this session that Fuse.js's own score is unreliable across differently
 * sized fields — the identical real typo match scores far worse when it's
 * embedded in a long, glued-together combo generic name than when it's a
 * short field on its own, purely from field length, not match quality.
 * `DRUG_GENERIC_FUSE_OPTIONS`'s existing `ingredients` key (3.5.3) doesn't
 * fix this — it blends into the same one combined record score. Brand mode
 * names are short single fields with no such bias, so Brand mode's floor is
 * a plain post-search score filter. Generic mode instead searches ingredients
 * through a separate flattened index (one entry per ingredient, not per
 * drug — see `buildDrugIngredientIndex`) so each ingredient is scored on its
 * own merit regardless of how many others its parent drug has, then takes
 * whichever of (genericName-level match, best individual ingredient match)
 * scores best for that drug. Also folds in a small ranking nudge favoring
 * drugs with fewer total ingredients, all else close to equal — a focused
 * 2-3 ingredient combo should generally outrank a 15-ingredient multivitamin
 * blend that happens to contain the same searched ingredient, without
 * hard-excluding the multivitamin. `DRUG_GENERIC_FUSE_OPTIONS`'s own
 * `ingredients` key is left as-is below (not removed) — it's likely now
 * partially redundant given 1e.1's finding that genericName already
 * contains every ingredient word, but that's an existing, dated (3.5.3)
 * config and removing it wasn't part of this step's confirmed scope; flag
 * for a future cleanup pass.
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
    { name: 'genericName', weight: 0.5 },
    { name: 'ingredients', weight: 0.2 },
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

// ─── Drugs — tiered search (Phase 1, step 1e.1, decision 4.17) ────────────────
// Same 1/2/3+-char tiered ramp as searchConditions/getAutocompleteSuggestions
// above, but field-scoped per mode instead of Conditions' multi-field weighted
// blend: Brand mode checks `name` only (adding `form` would turn a short query
// into an unintended form filter — a separate Form filter already exists for
// that). Generic mode checks `genericName` only — confirmed live (plan §0,
// 2026-07-19) that combo generics' genericName IS already
// `ingredients.join(' + ')`, so every ingredient word is already inside
// genericName; a separate ingredients check is redundant, not missing.
//
// MIN_WORD_TOKEN_LENGTH: at the 2-char word-start tier, single-character
// tokens (the "a", "c", "d", "3" vitamin-shorthand tokens that pepper combo
// generic names, e.g. "a + c + calcium + copper + e + iron ...") are ignored
// as word-start candidates — otherwise a 2-letter query would match nearly
// every multivitamin combo in the catalog regardless of what was typed.
// Does not affect the 3+ char fuzzy tier, which is untouched here (relevance
// floor for that tier is step 1e.2).

const MIN_WORD_TOKEN_LENGTH = 2

// ─── Fuzzy relevance floor (step 1e.2, decisions 4.18/4.32) ───────────────────
const RELEVANCE_FLOOR = 0.3          // score above this = treated as noise, dropped entirely
const INGREDIENT_COUNT_PENALTY = 0.01 // small nudge per extra ingredient — doesn't override real match-quality gaps

/**
 * Flattened ingredient index — one entry PER INGREDIENT, not per drug. This is
 * what makes ingredient scoring fair regardless of how many ingredients a
 * combo has (see file-header note, 1e.2). Only combo generics have a
 * populated `ingredients` array; plain generics contribute nothing here and
 * are matched purely at the genericName level, same as before.
 */
export function buildDrugIngredientIndex(drugs) {
  const flattened = []
  drugs.forEach(d => {
    if (Array.isArray(d.ingredients)) {
      d.ingredients.forEach(ingredient => {
        flattened.push({ drugId: d.id, ingredient, totalIngredients: d.ingredients.length })
      })
    }
  })
  return new Fuse(flattened, {
    keys:               ['ingredient'],
    includeScore:       true,
    ignoreLocation:     true,
    minMatchCharLength: 2,
    threshold:          0.4, // internal search bound only — RELEVANCE_FLOOR does the real filtering
  })
}

/**
 * Generic-mode fuzzy search with fair per-ingredient scoring. For each drug,
 * takes whichever scores better: its genericName-level match (from
 * genericIndex, which already covers plain generics fully) or its best
 * individual ingredient match (from ingredientIndex, unaffected by how many
 * ingredients the drug has). Drops anything scoring worse than
 * RELEVANCE_FLOOR, then ranks with a small nudge toward fewer-ingredient
 * drugs when scores are otherwise close.
 */
function searchGenericDrugsFuzzy(genericIndex, ingredientIndex, drugsById, query) {
  const bestByDrugId = new Map()

  for (const r of genericIndex.search(query)) {
    bestByDrugId.set(r.item.id, { drug: r.item, score: r.score, totalIngredients: r.item.ingredients?.length })
  }

  for (const r of ingredientIndex.search(query)) {
    const existing = bestByDrugId.get(r.item.drugId)
    if (!existing || r.score < existing.score) {
      const drug = drugsById.get(r.item.drugId)
      if (drug) {
        bestByDrugId.set(r.item.drugId, { drug, score: r.score, totalIngredients: r.item.totalIngredients })
      }
    }
  }

  const passed = [...bestByDrugId.values()].filter(v => v.score <= RELEVANCE_FLOOR)

  passed.sort((a, b) => {
    const aAdj = a.score + INGREDIENT_COUNT_PENALTY * Math.max((a.totalIngredients ?? 1) - 1, 0)
    const bAdj = b.score + INGREDIENT_COUNT_PENALTY * Math.max((b.totalIngredients ?? 1) - 1, 0)
    return aAdj - bAdj
  })

  return passed.map(v => v.drug)
}

function drugFieldForMode(drug, mode) {
  return (mode === 'brand' ? drug.name : drug.genericName) ?? ''
}

function wordTokens(text) {
  return text.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Tiered drug search — mirrors searchConditions' shape but field-scoped per mode.
 *
 * @param {Fuse}   fuseIndex — buildDrugBrandIndex or buildDrugGenericIndex output
 * @param {object[]} pool    — the raw drugs array (needed for prefix tiers)
 * @param {string} query
 * @param {'brand'|'generic'} mode
 * @param {object} [fuzzyExtras] — generic mode only, for fair ingredient scoring
 *   (1e.2): { ingredientIndex: buildDrugIngredientIndex output, drugsById: Map }
 * @returns {object[]|null}  — null means "show everything" (query too short)
 */
export function searchDrugsTiered(fuseIndex, pool, query, mode = 'brand', fuzzyExtras = {}) {
  const q = query.trim()
  if (q.length === 0) return null

  if (q.length === 1) {
    // Tier 1: field must START with the letter — fast, zero noise
    const lower = q.toLowerCase()
    return pool.filter(d => drugFieldForMode(d, mode).toLowerCase().startsWith(lower))
  }

  if (q.length === 2) {
    // Tier 2: field starts with query OR any (non-trivial) word in field starts
    // with query
    const lower = q.toLowerCase()
    return pool.filter(d => {
      const field = drugFieldForMode(d, mode).toLowerCase()
      if (field.startsWith(lower)) return true
      return wordTokens(field).some(
        word => word.length >= MIN_WORD_TOKEN_LENGTH && word.startsWith(lower)
      )
    })
  }

  // Tier 3: full fuzzy (3+ chars), with a real relevance floor (1e.2) —
  // Generic mode uses fair per-ingredient scoring when the extras are
  // available; Brand mode (and Generic as a fallback without extras) just
  // filters the plain Fuse score against the floor.
  if (mode === 'generic' && fuzzyExtras.ingredientIndex && fuzzyExtras.drugsById) {
    return searchGenericDrugsFuzzy(fuseIndex, fuzzyExtras.ingredientIndex, fuzzyExtras.drugsById, q)
  }
  return fuseIndex.search(q)
    .filter(r => r.score <= RELEVANCE_FLOOR)
    .map(r => r.item)
}

/**
 * Autocomplete suggestions using searchDrugsTiered's same tier boundaries and
 * relevance floor (1e.2).
 */
export function getDrugAutocompleteSuggestionsTiered(fuseIndex, pool, query, limit = 5, mode = 'brand', fuzzyExtras = {}) {
  const q = query.trim()
  if (q.length === 0) return []

  let candidates

  if (q.length === 1) {
    const lower = q.toLowerCase()
    candidates = pool.filter(d => drugFieldForMode(d, mode).toLowerCase().startsWith(lower))
  } else if (q.length === 2) {
    const lower = q.toLowerCase()
    candidates = pool.filter(d => {
      const field = drugFieldForMode(d, mode).toLowerCase()
      if (field.startsWith(lower)) return true
      return wordTokens(field).some(
        word => word.length >= MIN_WORD_TOKEN_LENGTH && word.startsWith(lower)
      )
    })
  } else if (mode === 'generic' && fuzzyExtras.ingredientIndex && fuzzyExtras.drugsById) {
    candidates = searchGenericDrugsFuzzy(fuseIndex, fuzzyExtras.ingredientIndex, fuzzyExtras.drugsById, q)
  } else {
    const raw = fuseIndex.search(q).filter(r => r.score <= RELEVANCE_FLOOR)
    candidates = raw.map(r => r.item)
  }

  return candidates.slice(0, limit).map(d => ({
    id:   d.id,
    name: mode === 'brand' ? d.name : d.genericName,
    slug: mode === 'brand' ? d.slug : d.genericSlug,
  }))
}
