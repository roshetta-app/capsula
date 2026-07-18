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
 * drug_library_ui_ux step 1e.1 (2026-07-19, decision 4.17, plan §4B): search
 * now ramps through the same tiered strategy Conditions uses (1-char prefix,
 * 2-char prefix-or-word-start, 3+ char fuzzy) instead of going straight to
 * loose fuzzy matching at 2 characters. See searchUtils.js's
 * `searchDrugsTiered`/`getDrugAutocompleteSuggestionsTiered` for the field
 * scoping (name-only per mode) and word-token floor. Zero-result gap logging
 * now fires at the same 3+ char threshold Conditions uses, since that's the
 * only tier where a "gap" (nothing genuinely similar) is a meaningful signal
 * — the 1-2 char tiers are exact prefix/word-start checks, so an empty
 * result there just means nothing starts with those letters, not a search
 * quality problem.
 *
 * Exposes:
 *   query            — current search string
 *   setQuery         — setter
 *   results          — tiered-matched drug objects (null = show all)
 *   suggestions      — top 5 autocomplete matches [{ id, name, slug }]
 *   showSuggestions  — boolean
 *   clearSuggestions — () => void
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  buildDrugBrandIndex,
  buildDrugGenericIndex,
  searchDrugsTiered,
  getDrugAutocompleteSuggestionsTiered,
} from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'

export function useDrugSearch(drugs, mode = 'brand') {
  const [query,           setQuery]           = useState('')
  const [results,         setResults]         = useState(drugs)
  const [suggestions,     setSuggestions]     = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Both split indexes are built once per drugs load — mode toggling below
  // just picks which already-built index to search against.
  const brandIndexRef   = useRef(null)
  const genericIndexRef = useRef(null)

  useEffect(() => {
    brandIndexRef.current   = buildDrugBrandIndex(drugs)
    genericIndexRef.current = buildDrugGenericIndex(drugs)
    runSearch(query, mode)
  }, [drugs]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback((q, currentMode) => {
    const fuseIndex = currentMode === 'brand' ? brandIndexRef.current : genericIndexRef.current
    if (!fuseIndex) return

    const trimmed = q.trim()

    // Tiered match (1e.1): 1-char prefix-only, 2-char prefix-or-word-start,
    // 3+ char fuzzy — replaces the old flat "fuzzy from 2 chars" behavior.
    const matched = trimmed.length >= 1
      ? (searchDrugsTiered(fuseIndex, drugs, trimmed, currentMode) ?? drugs)
      : drugs

    setResults(matched)

    // Zero-result gap logging — only meaningful at 3+ chars where fuzzy ran
    // (same threshold Conditions uses; 1-2 char tiers are exact prefix/
    // word-start checks, so an empty result there isn't a relevance gap).
    if (trimmed.length >= 3 && matched.length === 0) {
      logSearchGap(trimmed, 'drugs')
    }

    // Autocomplete suggestions
    if (trimmed.length >= 1) {
      const sug = getDrugAutocompleteSuggestionsTiered(fuseIndex, drugs, trimmed, 5, currentMode)
      setSuggestions(sug)
      setShowSuggestions(sug.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [drugs])

  // 150ms debounce — reacts to query typing AND mode toggling. No index
  // rebuild happens here either way (both indexes are already built above),
  // so a toggle just re-scores against the other already-built index.
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query, mode), 150)
    return () => clearTimeout(timer)
  }, [query, mode, runSearch])

  function clearSuggestions() {
    setShowSuggestions(false)
  }

  return {
    query,
    setQuery,
    results,
    suggestions,
    showSuggestions,
    clearSuggestions,
  }
}
