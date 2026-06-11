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
 *   results              — filtered + fuzzy-matched ConditionFull[], sorted per sortMode
 *   resultCount          — results.length as a plain integer
 *   suggestions          — top 5 autocomplete matches [{ id, name, slug }]
 *   showSuggestions      — boolean, true when dropdown should be visible
 *   clearSuggestions     — call this when user taps outside or picks a suggestion
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildConditionIndex, fuzzySearchConditions, getAutocompleteSuggestions } from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'

/**
 * Sorts a ConditionFull[] according to the active sort mode.
 * Not exported — internal to this module.
 *
 * @param {ConditionFull[]} items
 * @param {'az'|'recent'} mode
 * @param {string[]} recentIds  — ordered most-recent first
 * @returns {ConditionFull[]}
 */
function applySortMode(items, mode, recentIds) {
  if (mode === 'recent') {
    return [...items].sort((a, b) => {
      const ai = recentIds.indexOf(a.id)
      const bi = recentIds.indexOf(b.id)
      // Both in recent list: sort by recency position
      if (ai !== -1 && bi !== -1) return ai - bi
      // Only a is recent: a comes first
      if (ai !== -1) return -1
      // Only b is recent: b comes first
      if (bi !== -1) return 1
      // Neither recent: fall back to A–Z
      return a.name.localeCompare(b.name)
    })
  }
  // Default: A–Z
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

export function useConditionSearch(conditions, sortMode = 'az', recentlyViewedIds = []) {
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
  }, [conditions, sortMode, recentlyViewedIds])

  // Debounce: 150ms
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
