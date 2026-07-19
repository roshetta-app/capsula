/**
 * src/hooks/useConditionSearch.js
 *
 * Uses tiered search from searchUtils:
 *   1 char  — prefix only
 *   2 chars — prefix or word-start
 *   3+ chars — full fuzzy
 *
 * Exposes:
 *   query, setQuery, activeSpecialty, setActiveSpecialty,
 *   results, resultCount
 *
 * drug_search_plan cleanup (2026-07-19, DRUG_SEARCH_PLAN.md §5): removed
 * suggestions/showSuggestions/clearSuggestions — dead computation left over
 * from the autocomplete dropdown UI, which was deleted app-wide earlier.
 * Tier behavior itself (1-char prefix, 2-char prefix-or-word-start, 3+ char
 * fuzzy) is unchanged — this file only drops the unused suggestion output.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildConditionIndex, searchConditions } from '../utils/searchUtils'
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

// Reads a previously-picked specialty for this browser session only (mirrors
// the entrance-animation flag pattern in ConditionsScreen — sessionStorage,
// not localStorage, so it clears on a fresh app open, not just a re-visit).
function readStoredSpecialty(storageKey) {
  if (!storageKey) return 'all'
  try {
    return sessionStorage.getItem(storageKey) ?? 'all'
  } catch {
    return 'all'
  }
}

export function useConditionSearch(conditions, sortMode = 'az', recentlyViewedIds = [], storageKey = null) {
  const [query,           setQuery]           = useState('')
  const [activeSpecialty, setActiveSpecialty] = useState(() => readStoredSpecialty(storageKey))
  const [results,         setResults]         = useState(conditions)

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

    // Step 2: tiered search
    // Build a sub-index from the pool for fuzzy tier (3+ chars)
    const subIndex = buildConditionIndex(pool)
    const matched  = searchConditions(subIndex, pool, q) ?? pool

    // Step 3: sort
    const sorted = applySortMode(matched, sortMode, recentlyViewedIds)
    setResults(sorted)

    // Log zero-result gaps (only meaningful at 3+ chars where fuzzy ran)
    if (q.trim().length >= 3 && matched.length === 0) {
      logSearchGap(q, 'conditions')
    }
  }, [conditions, sortMode, recentlyViewedIds])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query, activeSpecialty), 150)
    return () => clearTimeout(timer)
  }, [query, activeSpecialty, sortMode, runSearch])

  // Remember the chosen specialty for the rest of this browser session so it
  // survives navigating away and back (e.g. opening a condition card and
  // returning). Session-only by design — a fresh app open starts at 'all'.
  useEffect(() => {
    if (!storageKey) return
    try {
      sessionStorage.setItem(storageKey, activeSpecialty)
    } catch {
      // Storage unavailable (private browsing, quota) — filter just won't persist.
    }
  }, [storageKey, activeSpecialty])

  return {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    resultCount: results.length,
  }
}
