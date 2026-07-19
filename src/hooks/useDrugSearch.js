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
 * searches as `fuzzyExtras`; Brand mode ignores them. Still current.
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
 * Exposes:
 *   query           — current search string
 *   setQuery        — setter
 *   results          — prefix-matched drug objects (or the full list)
 *   queryTooShort    — true for a 1-char query — caller shows a message,
 *                      not the results list
 *   suggestion       — a single "Did you mean" drug name, or null — only
 *                      ever set when results is empty and something close
 *                      exists
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  buildDrugBrandIndex,
  buildDrugGenericIndex,
  buildDrugIngredientIndex,
  searchDrugsTiered,
  getDrugSearchSuggestion,
} from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'

export function useDrugSearch(drugs, mode = 'brand') {
  const [query,          setQuery]          = useState('')
  const [results,        setResults]        = useState(drugs)
  const [queryTooShort,  setQueryTooShort]  = useState(false)
  const [suggestion,     setSuggestion]     = useState(null)

  // Both split indexes are built once per drugs load — mode toggling below
  // just picks which already-built index to search against. ingredientIndexRef
  // and drugsByIdRef (1e.2) support Generic mode's fair per-ingredient scoring;
  // Brand mode never uses them.
  const brandIndexRef      = useRef(null)
  const genericIndexRef    = useRef(null)
  const ingredientIndexRef = useRef(null)
  const drugsByIdRef       = useRef(null)

  useEffect(() => {
    brandIndexRef.current      = buildDrugBrandIndex(drugs)
    genericIndexRef.current    = buildDrugGenericIndex(drugs)
    ingredientIndexRef.current = buildDrugIngredientIndex(drugs)
    drugsByIdRef.current       = new Map(drugs.map(d => [d.id, d]))
    runSearch(query, mode)
  }, [drugs]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback((q, currentMode) => {
    const fuseIndex = currentMode === 'brand' ? brandIndexRef.current : genericIndexRef.current
    if (!fuseIndex) return

    const trimmed = q.trim()

    // A 1-char query is too short to search meaningfully (drug_search_plan
    // §5 point 1) — skip the tier entirely rather than running a prefix
    // filter that would return thousands of matches. The caller shows a
    // "type at least 2 characters" message instead of a results list.
    if (trimmed.length === 1) {
      setQueryTooShort(true)
      setResults(drugs)
      setSuggestion(null)
      return
    }
    setQueryTooShort(false)

    const fuzzyExtras = currentMode === 'generic'
      ? { ingredientIndex: ingredientIndexRef.current, drugsById: drugsByIdRef.current }
      : {}

    // Strict "starts with" match, every length — replaces the old
    // 2-3-char-prefix/4+-char-fuzzy split (drug_search_plan §5 final form).
    const matched = trimmed.length >= 1
      ? (searchDrugsTiered(drugs, trimmed, currentMode) ?? drugs)
      : drugs

    setResults(matched)

    // Only when the prefix check found nothing: offer a single best-guess
    // "Did you mean" name, reusing the same fuzzy indexes built below.
    setSuggestion(
      trimmed.length >= 1 && matched.length === 0
        ? getDrugSearchSuggestion(fuseIndex, trimmed, currentMode, fuzzyExtras)
        : null
    )

    // Zero-result gap logging — only meaningful at 4+ chars where fuzzy ran
    // (2-3 char tiers are exact start-of-field checks, so an empty result
    // there isn't a relevance gap).
    if (trimmed.length >= 4 && matched.length === 0) {
      logSearchGap(trimmed, 'drugs')
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
    suggestion,
  }
}
