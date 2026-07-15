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
 * Exposes:
 *   query            — current search string
 *   setQuery         — setter
 *   results          — fuzzy-matched drug objects (null = show all)
 *   suggestions      — top 5 autocomplete matches [{ id, name, slug }]
 *   showSuggestions  — boolean
 *   clearSuggestions — () => void
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  buildDrugBrandIndex,
  buildDrugGenericIndex,
  fuzzySearchDrugs,
  getDrugAutocompleteSuggestionsByMode,
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

    // Fuzzy match
    const matched = trimmed.length >= 2
      ? (fuzzySearchDrugs(fuseIndex, trimmed) ?? drugs)
      : drugs

    setResults(matched)

    // Zero-result gap logging
    if (trimmed.length >= 2 && matched.length === 0) {
      logSearchGap(trimmed, 'drugs')
    }

    // Autocomplete suggestions
    if (trimmed.length >= 2) {
      const sug = getDrugAutocompleteSuggestionsByMode(fuseIndex, trimmed, 5, currentMode)
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
