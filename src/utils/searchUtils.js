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
 * (legacy, single merged index) were confirmed to have no remaining callers
 * once `useDrugSearch.js` switched onto the split `buildDrugBrandIndex`/
 * `buildDrugGenericIndex` indexes below, and were deleted 2026-07-19 (see
 * the rebuild note further down) — kept here only as a pointer for anyone
 * looking for them by name.
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
 * added `searchDrugsTiered` below — originally the same 1/2/3+-char tiered
 * ramp Conditions already uses, but field-scoped per mode rather than
 * copying Conditions' multi-field weighted blend. `useDrugSearch.js` now
 * calls this instead of `fuzzySearchDrugs`/`getDrugAutocompleteSuggestionsByMode`
 * directly (both since deleted — see the rebuild note further down).
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
 *
 * drug_search_plan rebuild (2026-07-19, DRUG_SEARCH_PLAN.md §5, supersedes
 * decision 4.17's original tiering): the 1-char tier is gone — a single
 * letter returns too many prefix matches to be useful, so the caller
 * (useDrugSearch.js) now shows a "type at least 2 characters" message
 * instead of calling into a search tier at all. The 2-char "or any word in
 * the field starts with it" rule is also gone — audited real data showed it
 * was dominated by generic qualifier words ("plus", "forte", "d3",
 * "sodium"...), not distinctive ones. Drugs search now runs: 2-3 chars =
 * field starts with the query; 4+ chars = fuzzy with the relevance floor
 * (unchanged, still 1e.2). `MIN_WORD_TOKEN_LENGTH`/`wordTokens` had no
 * remaining purpose once the word-start rule was removed, so they're gone
 * too. Also removed in the same pass, confirmed dead via direct file read
 * (plan §3): the already-superseded legacy trio (`buildDrugIndex`/
 * `fuzzySearchDrugs`/`getDrugAutocompleteSuggestions`),
 * `getDrugAutocompleteSuggestionsByMode`, and both hooks' unused
 * suggestion-building functions (`getAutocompleteSuggestions` for
 * Conditions, `getDrugAutocompleteSuggestionsTiered` for Drugs) — the
 * autocomplete dropdown UI they fed was deleted app-wide earlier and
 * nothing reads their output anymore.
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

// ─── Legacy export — kept so any other callers don't break ───────────────────
// Prefer searchConditions() for new code.
export function fuzzySearchConditions(fuseIndex, query) {
  if (!query || query.trim().length < 3) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

// ─── Drugs fuzzy search — legacy single-index trio removed ───────────────────
// buildDrugIndex/fuzzySearchDrugs/getDrugAutocompleteSuggestions deleted
// 2026-07-19 (DRUG_SEARCH_PLAN.md §3/§5) — confirmed no remaining callers
// once useDrugSearch.js switched to the split brand/generic indexes below.

// ─── Drugs fuzzy search — split indexes (Phase 3, step 3.3) ───────────────────
// Brand index: searches by the item's own name first. Generic index:
// searches by the underlying drug's generic name first. No shared scoring
// between them — a query only ever matches within the mode it's run against.

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

// ─── Drugs — tiered search ─────────────────────────────────────────────────
// Rebuilt 2026-07-19 per DRUG_SEARCH_PLAN.md §5 (supersedes decision 4.17's
// original word-start-at-2-chars design). Brand mode checks `name` only
// (adding `form` would turn a short query into an unintended form filter —
// a separate Form filter already exists for that). Generic mode checks
// `genericName` only — combo generics' genericName already contains every
// ingredient word, so a separate ingredients check is redundant, not
// missing. `getDrugAutocompleteSuggestionsByMode` (unused, confirmed no
// callers) was removed in the same pass.

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

  if (q.length <= 3) {
    // Tier: field must START with the query. The old "or any word in the
    // field starts with it" rule is gone (DRUG_SEARCH_PLAN.md §5 point 2) —
    // audited real data showed it was dominated by generic qualifier words
    // ("plus", "forte", "d3", "sodium"...), not distinctive ones. A 1-char
    // query is intercepted by the caller before this function is ever
    // called (§5 point 1), so in practice this only runs for 2-3 chars.
    const lower = q.toLowerCase()
    return pool.filter(d => drugFieldForMode(d, mode).toLowerCase().startsWith(lower))
  }

  // Tier: full fuzzy (4+ chars), with a real relevance floor (1e.2) —
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
