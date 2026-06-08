/**
 * src/hooks/useDrugSearch.js
 * Phase 2I — fuzzy drug search hook.
 *
 * Mirrors useConditionSearch but for flat drug objects.
 * Does NOT replace useSearch.js — that hook stays for backward compat.
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
  buildDrugIndex,
  fuzzySearchDrugs,
  getDrugAutocompleteSuggestions,
} from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'

export function useDrugSearch(drugs) {
  const [query,           setQuery]           = useState('')
  const [results,         setResults]         = useState(drugs)
  const [suggestions,     setSuggestions]     = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Build Fuse index when drugs load or change (cache refresh)
  const fuseRef = useRef(null)
  useEffect(() => {
    fuseRef.current = buildDrugIndex(drugs)
    runSearch(query)
  }, [drugs]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback((q) => {
    if (!fuseRef.current) return

    const trimmed = q.trim()

    // Fuzzy match
    const matched = trimmed.length >= 2
      ? (fuzzySearchDrugs(fuseRef.current, trimmed) ?? drugs)
      : drugs

    setResults(matched)

    // Zero-result gap logging
    if (trimmed.length >= 2 && matched.length === 0) {
      logSearchGap(trimmed, 'drugs')
    }

    // Autocomplete suggestions
    if (trimmed.length >= 2) {
      const sug = getDrugAutocompleteSuggestions(fuseRef.current, trimmed)
      setSuggestions(sug)
      setShowSuggestions(sug.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [drugs])

  // 150ms debounce
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 150)
    return () => clearTimeout(timer)
  }, [query, runSearch])

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
