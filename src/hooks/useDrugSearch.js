/**
 * src/hooks/useDrugSearch.js
 * Phase 2I — fuzzy drug search hook.
 *
 * Mirrors useConditionSearch but for flat drug objects.
 * Does NOT replace useSearch.js — that hook stays for backward compat.
 *
 * GFB step 3.5.5 (2026-07-16): now takes an explicit mode: 'brand'|'generic'
 * param (per plan §5/§10 Section 2, ADR-042). Both split indexes (from step
 * 3.3) are built once per drugs load; switching mode re-runs search against
 * the already-built index for that mode — no index rebuild on toggle.
 *
 * drug_library_ui_ux step 1e.1 (2026-07-19, decision 4.17, plan §4B, since
 * superseded — see the drug_search_plan rebuild note below): search first
 * ramped through a 1-char prefix / 2-char prefix-or-word-start / 3+ char
 * fuzzy tier, mirroring Conditions.
 *
 * drug_library_ui_ux step 1e.2 (2026-07-19, decisions 4.18/4.32, plan §4B):
 * the fuzzy tier got a real relevance floor (weak/unrelated matches are
 * dropped, not just ranked low), and Generic mode scores ingredients fairly
 * regardless of how many a combo has (see searchUtils.js header for why
 * that needed its own flattened index rather than Fuse's built-in
 * array-field scoring). `ingredientIndexRef`/`drugsByIdRef` below are built
 * once alongside the two mode indexes and passed through to generic-mode
 * searches as `fuzzyExtras`; Brand mode ignores them.
 * NO LONGER CURRENT as of Phase 6 v2 (2026-08-29) — see that note further
 * down, next to where these refs are declared. `fuzzyExtras` is gone;
 * "Did you mean" now works directly off the plain `drugs` array.
 *
 * drug_search_plan rebuild (2026-07-19, DRUG_SEARCH_PLAN.md §5): a 1-char
 * query is now intercepted before it ever reaches a search tier — it just
 * sets 'queryTooShort' and shows the full drug list unfiltered, since the
 * caller shows a "type at least 2 characters" message instead of a results
 * list. Also removed: 'suggestions'/'showSuggestions'/'clearSuggestions' and
 * the 'getDrugAutocompleteSuggestionsTiered' call that fed them — dead
 * computation left over from the autocomplete dropdown UI, which was
 * deleted app-wide earlier.
 *
 * drug_search_plan final rebuild (2026-07-19, later still, same day,
 * DRUG_SEARCH_PLAN.md §5 final form): the 2-3-char-prefix/4+-char-fuzzy
 * split above is gone — every query length (2+) now runs a single strict
 * "starts with" check via the rewritten 'searchDrugsTiered', so a fuzzy
 * results list is never shown. When that check comes back empty, a new
 * 'suggestion' piece is computed via 'getDrugSearchSuggestion' — reuses the
 * same indexes already built below, just returns one best-guess name
 * instead of a list. The caller shows it as a "Did you mean" prompt; tapping
 * it re-runs the query with that name, which then matches normally via the
 * prefix check.
 *
 * F10 Batch A — Analytics Revamp (D30/D31): same per-session dedup pattern
 * as useConditionSearch — a term is logged at most once per gap/search type
 * for as long as this hook instance lives. drug_search is now logged
 * (previously dead) once per settled query of 2+ characters, independent
 * of result count, matching the shared 2+ char threshold from D31.
 *
 * Drug Search Refinement Phase 4, §4.6/§4.7 (2026-08-29): the gap-logging
 * block below was rewritten —
 *   - Threshold dropped from the old stale 4+ chars to 2+, matching the
 *     drug_search event's own threshold and how search actually behaves
 *     today post-Phase 2 (tiers 1-2 already run at 2+ chars, so a 2-3 char
 *     empty result is just as real a "search ran, found nothing" as a
 *     longer one — the old 4+ gate was left over from a design that no
 *     longer matches how search works, per §4.6).
 *   - Now only logs when "Did you mean" ALSO found nothing — a near-miss
 *     (search empty, but a suggestion exists) is a different signal (see
 *     Phase 4 step 4c) and must not also count as a content gap. Computed
 *     as a local `suggestionValue` rather than reading the `suggestions`
 *     state, since state updates lag a render behind and this check needs
 *     the value from *this* run.
 *   - Logs the §4.1-normalized term (via `normalizeSearchText`, not a bare
 *     `.toLowerCase()`) so punctuation/spacing variants of the same term
 *     collapse into one gap, and now also logs+dedupes by mode (Brand vs
 *     Generic are different fields, so a miss in one says nothing about
 *     the other) — see searchGaps.js and DRUG_SEARCH_REFINEMENT_PLAN.md §5.
 *
 * Drug Search Refinement Phase 4, step 4c (2026-08-29): near-miss logging
 * wired up at the same point "Did you mean" is computed — when the search
 * comes back empty but a suggestion exists, that's logged as
 * `drug_search_near_miss` (mode-tagged, per-session deduped) instead of
 * being silently indistinguishable from a real gap. `usage_events` needed
 * its own `mode` column for this, same correction as `search_gaps` in 4b
 * — see plan doc §5 CORRECTED notes.
 *
 * Drug Search Refinement Phase 6, §4.8 (2026-08-29): 'suggestion' (single
 * string|null) is now 'suggestions' (string[], possibly empty) —
 * getDrugSearchSuggestion (searchUtils.js) is now parse-aware (fuzzy-matches
 * only the name piece after strength/form extraction, AND-filters on those
 * facets) and returns up to 3 ranked candidates instead of one. Near-miss/
 * gap-logging checks below switch from truthy-string checks to
 * suggestionValue.length comparisons — same logic, array-shaped.
 *
 * cross-mode-search-hint (2026-08-29): added 'crossModeMatch' (boolean) —
 * true when the same-mode search found nothing but the same query matches
 * something under the OTHER mode (e.g. typing a generic name while in
 * Brand mode). Reuses searchDrugsTiered as-is with the opposite mode; no
 * new matching logic needed since brand/generic data already lives on the
 * same FlatDrug record. Also excluded from §4.6/§4.7's content-gap logging
 * the same way a near-miss is — the content genuinely exists, just under
 * the other mode, so it isn't a real "we don't have this" gap.
 *
 * Exposes:
 *   query           — current search string
 *   setQuery        — setter
 *   results          — prefix-matched drug objects (or the full list)
 *   queryTooShort    — true for a 1-char query — caller shows a message,
 *                      not the results list
 *   suggestions      — up to 3 "Did you mean" drug names, [] if none —
 *                      only ever populated when results is empty and
 *                      something close exists
 *   crossModeMatch   — true when results is empty but the query matches
 *                      something under the other mode (Brand/Generic)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  buildDrugBrandIndex,
  buildDrugGenericIndex,
  buildDrugIngredientIndex,
  searchDrugsTiered,
  getDrugSearchSuggestion,
  normalizeSearchText,
} from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'
import { logUsageEvent } from '../analytics/usageEvents'

export function useDrugSearch(drugs, mode = 'brand') {
  const [query,          setQuery]          = useState('')
  const [results,        setResults]        = useState(drugs)
  const [queryTooShort,  setQueryTooShort]  = useState(false)
  const [suggestions,    setSuggestions]    = useState([])
  // cross-mode-search-hint (2026-08-29): true when the strict tiered search
  // found nothing in the current mode, but the SAME query matches something
  // in the other mode (e.g. typing a generic name while in Brand mode).
  // Reuses searchDrugsTiered as-is, just called with the opposite mode — no
  // new matching logic needed, since brand/generic data already lives on
  // the same FlatDrug record (see queries.js). DrugsScreen shows this as a
  // "switch mode" hint, ranked above the same-mode "Did you mean" guess
  // since an exact hit in the other mode is a more certain answer than a
  // same-mode fuzzy typo guess.
  const [crossModeMatch, setCrossModeMatch] = useState(false)

  // Both split indexes are built once per drugs load — mode toggling below
  // just picks which already-built index to search against. ingredientIndexRef
  // and drugsByIdRef (1e.2) support Generic mode's fair per-ingredient scoring;
  // Brand mode never uses them.
  // Phase 6 v2 note (2026-08-29): none of the four refs below are read by
  // runSearch's "Did you mean" call anymore — that now works directly off
  // the plain `drugs` array (see searchUtils.js). Left in place deliberately
  // rather than removed as part of this fix, to keep the change scoped to
  // the accuracy bug; a follow-up cleanup pass can remove this block once
  // confirmed nothing else needs it.
  const brandIndexRef      = useRef(null)
  const genericIndexRef    = useRef(null)
  const ingredientIndexRef = useRef(null)
  const drugsByIdRef       = useRef(null)

  // Per-session dedup (F10 Batch A / D30, D31) — see header comment.
  // loggedGapTermsRef / loggedNearMissTermsRef keys are "mode:normalizedTerm"
  // (§4.6/§4.7) so the same term in a different mode isn't treated as
  // already-logged.
  const loggedSearchTermsRef   = useRef(new Set())
  const loggedGapTermsRef      = useRef(new Set())
  const loggedNearMissTermsRef = useRef(new Set())

  useEffect(() => {
    brandIndexRef.current      = buildDrugBrandIndex(drugs)
    genericIndexRef.current    = buildDrugGenericIndex(drugs)
    ingredientIndexRef.current = buildDrugIngredientIndex(drugs)
    drugsByIdRef.current       = new Map(drugs.map(d => [d.id, d]))
    runSearch(query, mode)
  }, [drugs]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback((q, currentMode) => {
    if (!drugs) return

    const trimmed = q.trim()

    // A 1-char query is too short to search meaningfully (drug_search_plan
    // §5 point 1) — skip the tier entirely rather than running a prefix
    // filter that would return thousands of matches. The caller shows a
    // "type at least 2 characters" message instead of a results list.
    if (trimmed.length === 1) {
      setQueryTooShort(true)
      setResults(drugs)
      setSuggestions([])
      setCrossModeMatch(false)
      return
    }
    setQueryTooShort(false)

    // Strict "starts with" match, every length — replaces the old
    // 2-3-char-prefix/4+-char-fuzzy split (drug_search_plan §5 final form).
    const matched = trimmed.length >= 1
      ? (searchDrugsTiered(drugs, trimmed, currentMode) ?? drugs)
      : drugs

    setResults(matched)

    // Only when the prefix check found nothing: offer up to 3 ranked
    // "Did you mean" candidates. Phase 6 v2 (2026-08-29, live-data audit):
    // matching is now a direct letter-difference check against the plain
    // drug list, not a prebuilt fuzzy-search index — see searchUtils.js for
    // why. Computed as a local value (not just via setSuggestions) so the
    // gap-logging check below can use it in this same run, rather than
    // reading the `suggestions` state, which wouldn't reflect this run
    // until the next render (§4.6/§4.7).
    const suggestionValue = trimmed.length >= 1 && matched.length === 0
      ? getDrugSearchSuggestion(drugs, trimmed, currentMode)
      : []
    setSuggestions(suggestionValue)

    // cross-mode-search-hint: only checked when the same-mode search came
    // up empty — no point checking the other mode if the current one
    // already found something. Reuses searchDrugsTiered, just flipping
    // 'brand'/'generic'.
    const otherMode = currentMode === 'brand' ? 'generic' : 'brand'
    const crossModeMatchValue = trimmed.length >= 1 && matched.length === 0
      ? (searchDrugsTiered(drugs, trimmed, otherMode) ?? []).length > 0
      : false
    setCrossModeMatch(crossModeMatchValue)

    const normalized = trimmed.toLowerCase()

    // Log a real, settled search (F10 Batch A / D31) — once per normalized
    // term per session, independent of result count.
    if (normalized.length >= 2 && !loggedSearchTermsRef.current.has(normalized)) {
      loggedSearchTermsRef.current.add(normalized)
      logUsageEvent('drug_search', null, normalized)
    }

    const normalizedForGap = normalizeSearchText(trimmed)

    // Near-miss (§4.6/§4.7, Phase 4 step 4c): the search itself found
    // nothing, but "Did you mean" DID have a guess to offer. Not a content
    // gap — logged separately as tuning input for §4.8's later "Did you
    // mean" refinement, so it never pollutes the real-gap count below.
    if (
      suggestionValue.length > 0 &&
      normalizedForGap.length >= 2 &&
      !loggedNearMissTermsRef.current.has(`${currentMode}:${normalizedForGap}`)
    ) {
      loggedNearMissTermsRef.current.add(`${currentMode}:${normalizedForGap}`)
      logUsageEvent('drug_search_near_miss', null, normalizedForGap, currentMode)
    }

    // Real content gap (§4.6/§4.7): the search itself found nothing AND
    // "Did you mean" also had nothing to offer — the genuine "we don't
    // have this" signal, as opposed to a near-miss (above) or a
    // filter-masked result (Phase 5). Logged at 2+ chars (matching the
    // shared threshold above, replacing the old stale 4+ gate), using the
    // §4.1-normalized term, deduped per mode+term per session so a Brand
    // miss and a Generic miss on the same word are tracked separately.
    //
    // cross-mode-search-hint: a cross-mode match is excluded here the same
    // way a near-miss is — the content genuinely exists (just under the
    // other mode), so counting it as "we don't have this" would misreport
    // real catalog gaps as missing content. Not logged as its own event
    // type, to stay minimally scoped and leave Phase 4's event schema as
    // decided in the plan doc.
    const gapDedupKey = `${currentMode}:${normalizedForGap}`
    if (
      normalizedForGap.length >= 2 &&
      matched.length === 0 &&
      suggestionValue.length === 0 &&
      !crossModeMatchValue &&
      !loggedGapTermsRef.current.has(gapDedupKey)
    ) {
      loggedGapTermsRef.current.add(gapDedupKey)
      logSearchGap(trimmed, 'drugs', currentMode)
    }
  }, [drugs])

  // 150ms debounce — reacts to query typing AND mode toggling. No index
  // rebuild happens here either way (both indexes are already built above),
  // so a toggle just re-scores against the other already-built index.
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query, mode), 150)
    return () => clearTimeout(timer)
  }, [query, mode, runSearch])

  return {
    query,
    setQuery,
    results,
    queryTooShort,
    suggestions,
    crossModeMatch,
  }
}
