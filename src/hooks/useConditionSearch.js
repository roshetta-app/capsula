/**
 * src/hooks/useConditionSearch.js
 * Phase 2C — Conditions Screen
 *
 * Upgraded from simple .includes() to Fuse.js fuzzy search.
 *
 * Exposes:
 *   query                — current search string
 *   setQuery             — setter
 *   activeSpecialty      — 'all' | specialty id
 *   setActiveSpecialty   — setter
 *   results              — filtered + fuzzy-matched ConditionFull[]
 *   suggestions          — top 5 autocomplete matches [{ id, name, slug }]
 *   showSuggestions      — boolean, true when dropdown should be visible
 *   clearSuggestions     — call this when user taps outside or picks a suggestion
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildConditionIndex, fuzzySearchConditions, getAutocompleteSuggestions } from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'

export function useConditionSearch(conditions) {
  const [query,           setQuery]           = useState('')
  const [activeSpecialty, setActiveSpecialty] = useState('all')
  const [results,         setResults]         = useState(conditions)
  const [suggestions,     setSuggestions]     = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Build Fuse index when conditions load or change (cache refresh)
  const fuseRef = useRef(null)
  useEffect(() => {
    fuseRef.current = buildConditionIndex(conditions)
    // Re-run search with new index
    runSearch(query, activeSpecialty)
  }, [conditions]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback((q, specialty) => {
    if (!fuseRef.current) return

    // Step 1: specialty filter
    let pool = conditions
    if (specialty !== 'all') {
      pool = conditions.filter(c => c.specialtyId === specialty)
    }

    // Step 2: fuzzy text search
    let matched
    if (q.trim().length >= 2) {
      // Search within specialty-filtered pool
      const Fuse = fuseRef.current.constructor
      const { buildConditionIndex: build, fuzzySearchConditions: search } =
        // Re-import helpers to search a sub-pool
        require('../utils/searchUtils')
      const subIndex = build(pool)
      matched = search(subIndex, q) ?? pool
    } else {
      matched = pool
    }

    setResults(matched)

    // Log zero-result gaps (debounced — only after user pauses)
    if (q.trim().length >= 2 && matched.length === 0) {
      logSearchGap(q, 'conditions')
    }

    // Autocomplete suggestions (always from full conditions, not filtered pool)
    if (q.trim().length >= 2) {
      const sug = getAutocompleteSuggestions(fuseRef.current, q)
      setSuggestions(sug)
      setShowSuggestions(sug.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [conditions])

  // Debounce: 150ms
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query, activeSpecialty), 150)
    return () => clearTimeout(timer)
  }, [query, activeSpecialty, runSearch])

  function clearSuggestions() {
    setShowSuggestions(false)
  }

  return {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    suggestions,
    showSuggestions,
    clearSuggestions,
  }
}
