/**
 * src/hooks/useConditionSearch.js
 * Phase 2C — Conditions Screen
 *
 * Exposes:
 *   query, setQuery, activeSpecialty, setActiveSpecialty,
 *   results, resultCount, suggestions, showSuggestions, clearSuggestions
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildConditionIndex, fuzzySearchConditions, getAutocompleteSuggestions } from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'

function applySortMode(items, mode, recentIds) {
  if (mode === 'recent') {
    return [...items].sort((a, b) => {
      const ai = recentIds.indexOf(a.id)
      const bi = recentIds.indexOf(b.id)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  }
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

export function useConditionSearch(conditions, sortMode = 'az', recentlyViewedIds = []) {
  const [query,           setQuery]           = useState('')
  const [activeSpecialty, setActiveSpecialty] = useState('all')
  const [results,         setResults]         = useState(conditions)
  const [suggestions,     setSuggestions]     = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const fuseRef = useRef(null)
  useEffect(() => {
    fuseRef.current = buildConditionIndex(conditions)
    runSearch(query, activeSpecialty)
  }, [conditions]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback((q, specialty) => {
    if (!fuseRef.current) return

    // Step 1: specialty filter
    let pool = conditions
    if (specialty !== 'all') {
      pool = conditions.filter(c => c.specialtyId === specialty)
    }

    // Step 2: fuzzy text search within the specialty-filtered pool
    let matched
    if (q.trim().length >= 2) {
      const subIndex = buildConditionIndex(pool)
      matched = fuzzySearchConditions(subIndex, q) ?? pool
    } else {
      matched = pool
    }

    // Step 3: apply sort mode
    const sorted = applySortMode(matched, sortMode, recentlyViewedIds)
    setResults(sorted)

    // Log zero-result gaps
    if (q.trim().length >= 2 && matched.length === 0) {
      logSearchGap(q, 'conditions')
    }

    // Autocomplete suggestions — filtered to active specialty when one is selected
    if (q.trim().length >= 2) {
      const sug = getAutocompleteSuggestions(fuseRef.current, q, 5, specialty)
      setSuggestions(sug)
      setShowSuggestions(sug.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [conditions, sortMode, recentlyViewedIds])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query, activeSpecialty), 150)
    return () => clearTimeout(timer)
  }, [query, activeSpecialty, sortMode, runSearch])

  function clearSuggestions() {
    setShowSuggestions(false)
  }

  return {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    resultCount: results.length,
    suggestions,
    showSuggestions,
    clearSuggestions,
  }
}
