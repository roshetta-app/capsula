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
 * SUPERSEDED 2026-07-19 later same day — see the DRUG_SEARCH_PLAN.md §3b
 * fix note further down; the `ingredients` key described here was removed.
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
 * NOTE, 2026-07-19 later same day: that flagged redundancy turned out not to
 * be harmless — see the fix note below. The `ingredients` key has been removed.
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
 *
 * drug_search_plan false-positive fix (2026-07-19, later same day,
 * DRUG_SEARCH_PLAN.md §3b, decision 4.33): the `ingredients` key on
 * DRUG_GENERIC_FUSE_OPTIONS (added in GFB 3.5.3, flagged as possibly
 * redundant in 1e.2) is confirmed as the cause of false-positive Generic
 * mode results — e.g. searching "iron" surfaced multi-ingredient combo
 * generics containing no iron at all. Root cause: that key let a whole
 * drug's ingredient list be scored as one glued-together blob as part of
 * the combined per-record Fuse score. On drugs with long ingredient lists,
 * that blob can score a loose, coincidental match against a short query
 * even when no individual ingredient is actually close — and because that
 * score comes back on the SAME combined record as the genericName check,
 * it can pass the relevance floor before the correct, fair per-ingredient
 * index (built separately for exactly this purpose, see 1e.2 above) ever
 * gets a chance to weigh in. Fix: removed the `ingredients` key from
 * DRUG_GENERIC_FUSE_OPTIONS below. Ingredient-level matching still works
 * exactly as before — it now runs ONLY through the fair, per-ingredient
 * flattened index (`buildDrugIngredientIndex` / `searchGenericDrugsFuzzy`),
 * never through this blended whole-record blob. genericName/arabicName/
 * category matching on the generic index is unaffected.
 *
 * drug_search_plan brand-name fix (2026-07-19, later same day, DRUG_SEARCH_PLAN.md
 * §3c, decision 4.34): confirmed via live database that Brand mode's `name` key
 * was the raw, un-cleaned brand row — dose/ingredient details glued onto the
 * brand name — so a search like "zinc" was a real substring match against that
 * glued text, not a fuzzy false positive. Brand mode now searches
 * `tradenameClean` (the clean brand name, already used for display) instead,
 * in both the fuzzy tier (`DRUG_BRAND_FUSE_OPTIONS`) and the 2-3 char
 * exact-prefix tier (`drugFieldForMode`). `nameAr` was dropped from the same
 * config — confirmed identical to `name` on every published brand today, so
 * it carried the same bug through a second key; flagged for a future data
 * pass once real Arabic brand names exist to search.
 *
 * drug_search_plan brand-secondary-fields fix (2026-07-19, later still, same
 * day): confirmed directly against the live database that Brand mode's two
 * remaining secondary fuzzy keys, `form` and `concentration`, are both
 * low-cardinality values shared across thousands of unrelated brands —
 * `form` has only ~45 distinct values total (e.g. "tablet"/"gel"/"syrup");
 * common `concentration` values like "500mg"/"100mg" are each shared by
 * 100-220+ brands. Scoring either as a secondary key meant a search for a
 * common form or dose word could fuzzy-match brands with no real connection
 * to the query — the same shared-field pattern behind decisions 4.33 and
 * 4.34 above, just on a different pair of keys. Brand mode's fuzzy tier
 * (`DRUG_BRAND_FUSE_OPTIONS`) now searches `tradenameClean` only, matching
 * what the 2-3 char exact-prefix tier (`drugFieldForMode`) already did. Not
 * yet logged as a numbered decision in DRUG_SEARCH_PLAN.md — flag for that
 * file's next update.
 *
 * drug_search_plan final rebuild (2026-07-19, later still, same day,
 * DRUG_SEARCH_PLAN.md §5 final form): the 2-3-char-only prefix tier and the
 * separate 4+ char auto-fuzzy results tier are gone — 'searchDrugsTiered'
 * now runs one strict "starts with" check at every query length, no ceiling,
 * so it's no longer really "tiered" (name kept as-is to avoid an unrelated
 * import-name churn in useDrugSearch.js). Generic mode's prefix check now
 * also matches each of a drug's individual ingredients, not just the
 * combined genericName — reuses the flattened ingredient list already built
 * by 'buildDrugIngredientIndex', just checked with '.startsWith()' instead
 * of through Fuse. When the prefix check comes back empty, the new
 * 'getDrugSearchSuggestion' offers a single best-guess "Did you mean" name
 * instead of ever showing an uncertain fuzzy list — it reuses the exact same
 * fuzzy search + 'RELEVANCE_FLOOR' cutoff the old auto-fuzzy tier used
 * ('searchGenericDrugsFuzzy' for Generic mode, plain 'fuseIndex.search' +
 * floor filter for Brand mode), just takes only the top-ranked result's name
 * instead of returning the whole list.
 *
 * drug_search_plan ingredient reorder-on-match (2026-07-19, later still, same
 * day, DRUG_SEARCH_PLAN.md §6, decision 4.31, checklist 1e.3): when Generic
 * mode's prefix check matches an ingredient that the card's "first 2 + N"
 * truncation would otherwise hide (SharedDrugCard.jsx shows only the first 2
 * entries of `drug.ingredients`), that ingredient is moved to the front of
 * the array before the drug is returned from `searchDrugsTiered`, so it's
 * never hidden behind "+N". Array order decides which ingredient wins if a
 * query matches more than one on the same drug (first match in the original
 * array order, no extra scoring). Applies uniformly to every generic-mode
 * result, including a "Did you mean" tap-through rerun, since that goes
 * through this same function. `SharedDrugCard.jsx` itself needs no changes —
 * it already just renders whatever order `drug.ingredients` is in.
 */

import Fuse from 'fuse.js'
import { FORM_OPTIONS } from '../components/drugs/DrugFilterPanel'

// ─── Shared text normalization (DRUG_SEARCH_REFINEMENT_PLAN.md §4.1/§5, Phase 1) ──
// One shared helper so every drug-search comparison treats punctuation/spacing
// differences as the same text (e.g. "Co-Amoxiclav" now matches a typed
// "amoxiclav" or "coamoxiclav"). Strips hyphens, collapses multiple/extra
// spaces down to one, lowercases. "+" is deliberately left untouched — it's
// meaningful here, separating two real ingredients in a combo drug name
// (e.g. "Amoxicillin + Clavulanic Acid"); stripping it risks unrelated combos
// starting to match each other. Comparison-only: nothing that reaches the
// screen (drug names, ingredient names) is ever passed through this before
// being displayed — only before being compared.
export function normalizeSearchText(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/-/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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

// `name` swapped for `tradenameClean`, and `nameAr` dropped, 2026-07-19 (later
// same day, DRUG_SEARCH_PLAN.md §3c, decision 4.34) — confirmed against the
// live database: `name` is the raw, un-cleaned brand row, which glues the full
// dose/ingredient breakdown onto the brand name (e.g. "Veval 10mg/.../40 Mg
// Zinc/Lactoferrin) — 15 Tablets"), so a search for any ingredient word inside
// that string was a real (not fuzzy) match on Brand mode's primary field —
// that's how "zinc" surfaced brands with no clean-name relationship to zinc at
// all. `tradenameClean` (added step 0a, already used for card/header display)
// is the actual short brand name and is populated on every published brand.
// `nameAr` was also confirmed, via a full-table check, to be an exact
// character-for-character duplicate of `name` on all 19,771 published brands
// today — not real Arabic text — so keeping it would have reintroduced the
// identical bug through a second key. Dropped rather than pointed at a
// not-yet-existing clean-Arabic-name field; flagged below for a future data
// pass once `name_ar` is actually populated with translated text.
//
// `form`/`concentration` dropped as well, 2026-07-19 (later still, same day) —
// confirmed directly against the live database that both are low-cardinality
// values shared across thousands of unrelated brands (`form` has only ~45
// distinct values total, e.g. "tablet"/"gel"/"syrup"; common `concentration`
// values like "500mg"/"100mg" are each shared by 100-220+ brands). Scoring
// either as a secondary key meant a search for a common form or dose word
// could fuzzy-match brands with no real connection to the query — same
// shared-field pattern as the `name`/`nameAr` bug above and decision 4.33,
// just on a different pair of keys. Brand mode's fuzzy tier now searches
// `tradenameClean` only, matching what the 2-3 char exact-prefix tier
// (`drugFieldForMode`, below) already did.
const DRUG_BRAND_FUSE_OPTIONS = {
  keys:               ['tradenameClean'],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

// `ingredients` key removed 2026-07-19 (DRUG_SEARCH_PLAN.md §3b, decision
// 4.33) — was causing false-positive matches on combo generics with long
// ingredient lists (see file header note above for the full root cause).
// Ingredient-level matching now runs exclusively through the separate,
// fair, per-ingredient flattened index below (`buildDrugIngredientIndex` /
// `searchGenericDrugsFuzzy`).
// `arabicName` key removed 2026-08-02 (CMS Library Identity section, decision
// 1) — it scored `generics.name_ar`, confirmed dead (2 of 7,266 rows
// populated, not read anywhere outside the CMS editor's own input) and now
// removed from the query/DB entirely. genericName/category remain.
const DRUG_GENERIC_FUSE_OPTIONS = {
  keys: [
    { name: 'genericName', weight: 0.5 },
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

// ─── Drugs — prefix-only search + single "Did you mean" fallback ──────────
// Final rebuild 2026-07-19 per DRUG_SEARCH_PLAN.md §5 (supersedes decision
// 4.17's original word-start-at-2-chars design, and the intermediate
// 2-3-char-prefix/4+-char-fuzzy split noted above). Every query, any length,
// now shows only "starts with" matches. Brand mode checks 'tradenameClean'
// only (adding 'form' would turn a short query into an unintended form
// filter — a separate Form filter already exists for that). Generic mode
// checks 'genericName' plus each of the drug's individual 'ingredients' —
// combo generics' genericName already contains every ingredient word in
// most cases, but checking ingredients directly catches the rest without
// requiring the words to appear in that exact combined string.
// 'getDrugAutocompleteSuggestionsByMode' (unused, confirmed no callers) was
// removed in an earlier pass of this same rebuild.

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

// ─── Query facet extraction — strength (DRUG_SEARCH_REFINEMENT_PLAN.md §4.4,
// Phase 3, step 3b) ─────────────────────────────────────────────────────────
// Not wired into search yet (that's step 3d) — this is just the standalone
// piece that recognizes a strength inside a typed query, e.g. "panadol
// 500mg" is really the name "panadol" plus the strength "500mg", not one
// phrase to match as a whole.
//
// Checked against the real, live data before building this (step 3a):
// 5,347 of 11,813 published formulations have a strength at all. Of those,
// ~3,800 (71%) are the simple, dominant shape this matches — a number
// stuck directly to a unit, e.g. "500mg", "1g", "1%" — with or without a
// space in between. The stored 'concentration' text field is what this is
// meant to compare against later (step 3d), not the separate structured
// strength columns — those are only populated for ~4,400 of the 5,347, so
// matching against them alone would miss real strengths. Units are the
// ones that actually show up in the data (mg/mcg/g/% most common, iu/ml
// less so); "per volume" strengths like "5mg / ml" and combo strengths
// like "10mg/80mg" are real but a different kind of question than "what's
// the total strength" — not something this extraction needs to solve.
const STRENGTH_UNITS = ['mcg', 'mg', 'iu', 'ml', 'g', '%']
// Longest unit first (e.g. 'mcg' before 'mg') so "500mcg" isn't mistakenly
// read as "500mc" + a stray "g". '(?![a-z])' stops a real word starting
// right after the unit from being swallowed in (so "500ml" doesn't also
// swallow a following "milk", for instance, if that were ever typed).
const STRENGTH_PATTERN = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${STRENGTH_UNITS.join('|')})(?![a-z])`,
  'i'
)

/**
 * Pulls a strength (a number + unit, e.g. "500mg") out of a typed drug
 * search query, if one is there. Returns null when no strength-shaped text
 * is found, so a plain name-only query is untouched.
 *
 * @param {string} query — the raw typed search text (not yet normalized)
 * @returns {{ value: string, unit: string, remainingText: string }|null}
 *   value/unit as typed (unit lowercased); remainingText is the query with
 *   the matched strength removed and spacing cleaned up — the piece that
 *   still needs to be matched against the drug name.
 */
export function extractStrengthFromQuery(query) {
  const text = (query ?? '').trim()
  const match = text.match(STRENGTH_PATTERN)
  if (!match) return null

  const [fullMatch, value, unit] = match
  const remainingText = (text.slice(0, match.index) + text.slice(match.index + fullMatch.length))
    .replace(/\s+/g, ' ')
    .trim()

  return { value, unit: unit.toLowerCase(), remainingText }
}

// ─── Query facet extraction — form (DRUG_SEARCH_REFINEMENT_PLAN.md §4.5,
// Phase 3, step 3c) ─────────────────────────────────────────────────────────
// Not wired into search yet (that's step 3d) — this is the standalone piece
// that recognizes a form word inside a typed query, e.g. "panadol tablet" is
// really the name "panadol" plus the form "tablet", not one phrase.
//
// Per the plan's decision (§5): reuses FORM_OPTIONS from DrugFilterPanel.jsx
// as-is — no new word list. The words this recognizes are the real raw
// `matches` values already used to drive the Form filter chips (e.g.
// "tablet", "syrup", "eye drops", "injection"), not abbreviations like "tab"
// — so this only catches a query where the person typed (or nearly typed) a
// real form word, not a short chip-label fragment.
//
// Flattened once at module load into a single word/phrase → option lookup
// list, sorted longest-first. The longest-first order matters: several
// options share overlapping words (e.g. "oil" alone under Topical, and "hair
// oil" also under Topical; "solution" alone under Syrup/Susp., and
// "inhalation solution" under Inhaled) — checking longer phrases first means
// a query containing "hair oil" is recognized as that whole phrase rather
// than incorrectly stopping at the shorter "oil" and leaving "hair" stranded
// in the name text.
const FORM_WORD_ENTRIES = FORM_OPTIONS
  .filter(opt => opt.value !== 'all')
  .flatMap(opt => opt.matches.map(word => ({ word, option: opt })))
  .sort((a, b) => b.word.length - a.word.length)

/**
 * Pulls a known form word/phrase (e.g. "tablet", "eye drops", "injection")
 * out of a typed drug search query, if one is there. Matches on a whole word
 * or phrase only (not mid-word — "tablet" won't match inside "tabletop"),
 * case-insensitively. Returns null when nothing form-shaped is found, so a
 * plain name-only query is untouched.
 *
 * @param {string} query — the raw typed search text (not yet normalized)
 * @returns {{ value: string, matches: string[], routes: string[]|undefined,
 *   matchedText: string, remainingText: string }|null}
 *   value/matches/routes are the matched FORM_OPTIONS chip's own fields —
 *   `matches` is what step 3d will check the drug's stored form against,
 *   `routes` (only present on the Inhaled chip today) is what it'll check
 *   the drug's stored route against. matchedText is the literal word/phrase
 *   found in the query. remainingText is the query with that word/phrase
 *   removed and spacing cleaned up — the piece that still needs to be
 *   matched against the drug name.
 */
export function extractFormFromQuery(query) {
  const text = (query ?? '').trim()
  if (text.length === 0) return null

  for (const { word, option } of FORM_WORD_ENTRIES) {
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const match = text.match(pattern)
    if (!match) continue

    const remainingText = (text.slice(0, match.index) + text.slice(match.index + match[0].length))
      .replace(/\s+/g, ' ')
      .trim()

    return { value: option.value, matches: option.matches, routes: option.routes, matchedText: match[0], remainingText }
  }

  return null
}

function drugFieldForMode(drug, mode) {
  // Brand mode reads tradenameClean (not the raw 'name' field) — see
  // DRUG_GENERIC_FUSE_OPTIONS' neighbor for the 2026-07-19 fix note
  // (decision 4.34). Used both as the prefix-check field (Brand mode; and
  // Generic mode's base check alongside per-ingredient matching below) and
  // as the display name returned by a "Did you mean" suggestion.
  return (mode === 'brand' ? drug.tradenameClean : drug.genericName) ?? ''
}

function genericPrefixFields(drug) {
  // Generic mode's prefix check: the combined genericName, plus each
  // individual ingredient on combo generics. Reuses the same 'ingredients'
  // array 'buildDrugIngredientIndex' already flattens for fuzzy suggestion
  // scoring — no new lookup structure, just a plain '.startsWith()' check
  // here since this tier doesn't need fuzzy matching or an index at all.
  const fields = [drug.genericName ?? '']
  if (Array.isArray(drug.ingredients)) {
    fields.push(...drug.ingredients)
  }
  return fields
}

// ─── Multi-tier field matching (DRUG_SEARCH_REFINEMENT_PLAN.md §4.2, Phase 2) ──
// Three ordered checks, strongest to weakest — searchDrugsTiered tries them
// in order and stops at the first one that returns any results, so a true
// tier-1 match never gets buried under noisier tier-2/3 matches:
//   Tier 1 — field starts with the query (today's only behavior).
//   Tier 2 — a whole word inside the field starts with the query (a real
//     word-boundary match, e.g. "extra" matching the second word in
//     "Panadol Extra").
//   Tier 3 — query appears anywhere in the field, mid-word. Loosest tier,
//     last resort only — callers gate this to 4+ character queries (see
//     searchDrugsTiered) so short queries like "for"/"d3" never reach it;
//     that gating is what caused the original rollback of plain substring
//     search, per the plan's audit.
// 'field' is raw (un-normalized) text; normalization happens here so every
// call site compares the same way.
function fieldMatchesAtTier(field, query, tier) {
  const normalized = normalizeSearchText(field)
  if (tier === 1) return normalized.startsWith(query)
  if (tier === 2) return normalized.split(' ').some(word => word.startsWith(query))
  return normalized.includes(query)
}

/**
 * Ranking signal for Generic-mode results (drug-card-ordering task,
 * 2026-07-19): tells searchDrugsTiered's sort whether this drug matched on
 * its own combined genericName (tier 0, stronger signal) or only via one of
 * its buried ingredients (tier 1), plus how much text remains after the
 * matched prefix — shorter remainder ranks higher within a tier. genericName
 * is checked first since it's always present and is the stronger of the two
 * signals; only checks ingredients if genericName didn't match, matching
 * genericPrefixFields' own field order.
 *
 * 'matchTier' (Phase 2, §4.2) is which of the three field-matching tiers
 * this call is being scored under — passed through from searchDrugsTiered so
 * the same check ("starts with" / "word starts with" / "substring anywhere")
 * that found this drug is also what decides which side (name vs ingredient)
 * gets credit. Ranking math itself is unchanged regardless of matchTier, per
 * the plan's decision to reuse "shortest remaining text wins" as-is.
 */
function genericMatchRank(drug, lower, matchTier) {
  if (fieldMatchesAtTier(drug.genericName, lower, matchTier)) {
    const generic = normalizeSearchText(drug.genericName)
    return { tier: 0, remainder: generic.length - lower.length }
  }

  const hit = Array.isArray(drug.ingredients)
    ? drug.ingredients.find(ing => fieldMatchesAtTier(ing, lower, matchTier))
    : undefined

  return { tier: 1, remainder: (hit !== undefined ? normalizeSearchText(hit).length : lower.length) - lower.length }
}

/**
 * Ingredient reorder-on-match (2026-07-19, DRUG_SEARCH_PLAN.md §6, decision
 * 4.31, checklist 1e.3). SharedDrugCard.jsx renders only the first 2 entries
 * of `drug.ingredients` plus a "+N" count for the rest — so a query that only
 * matches a buried ingredient (index 2+) would otherwise never be visible on
 * the card. If the first ingredient (in original array order) that starts
 * with the query is already within the visible first 2, nothing changes. If
 * it's buried, this returns a shallow copy of the drug with that ingredient
 * moved to the front, leaving every other ingredient in its original
 * relative order. Drugs with no ingredient array, or no ingredient match at
 * all, are returned unchanged (same reference — no unnecessary copies).
 *
 * 'matchTier' (Phase 2, §4.2) — same reasoning as genericMatchRank above: an
 * ingredient only gets reordered to the front if it actually matches under
 * the tier that produced this drug's results, not under a stronger tier
 * that came up empty.
 */
function reorderIngredientsForMatch(drug, lower, matchTier) {
  if (!Array.isArray(drug.ingredients)) return drug

  const idx = drug.ingredients.findIndex(ing => fieldMatchesAtTier(ing, lower, matchTier))
  if (idx < 2) return drug // -1 (no match) or already visible in the first 2 — nothing to do

  const reordered = [
    drug.ingredients[idx],
    ...drug.ingredients.slice(0, idx),
    ...drug.ingredients.slice(idx + 1),
  ]
  return { ...drug, ingredients: reordered }
}

function searchGenericAtTier(pool, lower, tier) {
  return pool
    .filter(d => genericPrefixFields(d).some(field => fieldMatchesAtTier(field, lower, tier)))
    .map(d => reorderIngredientsForMatch(d, lower, tier))
    .map(d => ({ drug: d, ...genericMatchRank(d, lower, tier) }))
    .sort((a, b) =>
      a.tier !== b.tier
        ? a.tier - b.tier
        : a.remainder !== b.remainder
          ? a.remainder - b.remainder
          : (a.drug.genericName ?? '').localeCompare(b.drug.genericName ?? '')
    )
    .map(r => r.drug)
}

function searchBrandAtTier(pool, lower, tier) {
  return pool
    .filter(d => fieldMatchesAtTier(drugFieldForMode(d, 'brand'), lower, tier))
    .sort((a, b) => {
      const aLen = drugFieldForMode(a, 'brand').length
      const bLen = drugFieldForMode(b, 'brand').length
      return aLen !== bLen ? aLen - bLen : drugFieldForMode(a, 'brand').localeCompare(drugFieldForMode(b, 'brand'))
    })
}

/**
 * Drug search — three ordered tiers, strongest to weakest, each tried only
 * when the tier(s) above come back empty (DRUG_SEARCH_REFINEMENT_PLAN.md
 * §4.2, Phase 2): (1) starts with the query, (2) a whole word in the field
 * starts with the query, (3) query appears anywhere, mid-word. Tiers 1-2 are
 * available from 2 characters (today's threshold); tier 3 is gated to 4+
 * characters so short, generic-feeling queries ("for", "d3") never reach the
 * loosest tier and drown out real answers — the exact problem that got plain
 * substring search rolled back once before. No fuzzy fallback baked in (see
 * 'getDrugSearchSuggestion' for that). Field-scoped per mode: Brand mode
 * checks 'tradenameClean'; Generic mode checks 'genericName' plus each
 * individual ingredient.
 *
 * Ranking (drug_library_ui_ux, drug-card-ordering task, 2026-07-19; reused
 * unchanged within whichever tier actually produced results, per §4.2):
 *   - Brand mode: shortest remaining text after the matched query prefix
 *     wins (e.g. query "brufen" ranks "Brufen" above "Brufen Retard") —
 *     tradenameClean.length is the whole signal since the query is a fixed-
 *     length prefix on every result. Ties broken alphabetically.
 *   - Generic mode: a match on the drug's own combined genericName outranks
 *     a match that only hit via one of its buried ingredients (a name match
 *     is a stronger signal than an ingredient match) — then, within each of
 *     those two tiers, shortest remaining text after the prefix wins, same
 *     rule as Brand mode. Ties broken alphabetically by genericName.
 *
 * @param {object[]} pool    — the raw drugs array to filter
 * @param {string}   query
 * @param {'brand'|'generic'} mode
 * @returns {object[]|null}  — null means "show everything" (query too short)
 */
export function searchDrugsTiered(pool, query, mode = 'brand') {
  const q = query.trim()
  if (q.length === 0) return null

  // Normalized, not just lowercased (DRUG_SEARCH_REFINEMENT_PLAN.md §4.1) —
  // strips hyphens and collapses spacing so punctuation differences no
  // longer cause a real match to be missed. See normalizeSearchText above.
  const lower = normalizeSearchText(q)

  // Tier 3 (substring anywhere) only kicks in at 4+ characters — see
  // fieldMatchesAtTier's header note for why.
  const tiersToTry = lower.length >= 4 ? [1, 2, 3] : [1, 2]

  for (const tier of tiersToTry) {
    const matched = mode === 'generic'
      ? searchGenericAtTier(pool, lower, tier)
      : searchBrandAtTier(pool, lower, tier)
    if (matched.length > 0) return matched
  }

  return []
}

/**
 * Single best-guess "Did you mean" suggestion — only meant to be called when
 * 'searchDrugsTiered' comes back empty. Reuses the same fuzzy search and
 * 'RELEVANCE_FLOOR' cutoff the old auto-fuzzy tier used; just takes the
 * top-ranked match's display name instead of returning the whole list.
 *
 * @param {Fuse}   fuseIndex — buildDrugBrandIndex or buildDrugGenericIndex output
 * @param {string} query
 * @param {'brand'|'generic'} mode
 * @param {object} [fuzzyExtras] — generic mode only, for fair ingredient scoring
 *   (1e.2): { ingredientIndex: buildDrugIngredientIndex output, drugsById: Map }
 * @returns {string|null} — the suggested drug's display name, or null if
 *   nothing scored within the relevance floor
 */
export function getDrugSearchSuggestion(fuseIndex, query, mode = 'brand', fuzzyExtras = {}) {
  const q = query.trim()
  if (q.length === 0) return null

  const matches = (mode === 'generic' && fuzzyExtras.ingredientIndex && fuzzyExtras.drugsById)
    ? searchGenericDrugsFuzzy(fuseIndex, fuzzyExtras.ingredientIndex, fuzzyExtras.drugsById, q)
    : fuseIndex.search(q).filter(r => r.score <= RELEVANCE_FLOOR).map(r => r.item)

  return matches.length > 0 ? drugFieldForMode(matches[0], mode) : null
}