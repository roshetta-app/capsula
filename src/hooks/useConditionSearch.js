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
 *
 * F10 Batch A — Analytics Revamp (D30/D31): this hook sits in the same
 * fragile spot (debounce + dependency-array chain) that caused the
 * search_gaps spam bug, so every logging call here is guarded by a
 * per-session dedup Set — a term is logged at most once per gap/search
 * type for as long as this hook instance lives, no matter how many times
 * the debounce re-fires for the same unchanged query. condition_search is
 * now logged (previously dead — nothing called logUsageEvent from here)
 * once per settled query of 2+ characters, independent of result count,
 * inside the same 150ms-debounced runSearch that already logged gaps.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildConditionIndex, searchConditions } from '../utils/searchUtils'
import { logSearchGap } from '../analytics/searchGaps'
import { logUsageEvent } from '../analytics/usageEvents'

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

  // Per-session dedup (F10 Batch A / D30, D31): one log per normalized term
  // per event type, for as long as this hook instance lives. Two separate
  // Sets — a term can legitimately log once as a real search and once as a
  // zero-result gap; those are different tables/purposes.
  const loggedSearchTermsRef = useRef(new Set())
  const loggedGapTermsRef    = useRef(new Set())

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

    // Step 3: sort — only for the plain browse view (no typed query).
    // sortMode ('az' | 'recent') is a browse-list ordering choice; applying
    // it while searching was overwriting searchConditions' own match-
    // relevance order with an alphabetical/recency one, so a search no
    // longer read as "best match first" the moment a sort mode other than
    // relevance was active. Search results now keep whatever order
    // searchConditions returned them in.
    const sorted = q.trim().length === 0
      ? applySortMode(matched, sortMode, recentlyViewedIds)
      : matched
    setResults(sorted)

    const trimmed    = q.trim()
    const normalized = trimmed.toLowerCase()

    // Log a real, settled search (F10 Batch A / D31) — once per normalized
    // term per session, independent of result count. Matches the same
    // 2+ char threshold the rest of the app treats as "a real query."
    if (normalized.length >= 2 && !loggedSearchTermsRef.current.has(normalized)) {
      loggedSearchTermsRef.current.add(normalized)
      logUsageEvent('condition_search', null, normalized)
    }

    // Log zero-result gaps (only meaningful at 3+ chars where fuzzy ran)
    if (trimmed.length >= 3 && matched.length === 0 && !loggedGapTermsRef.current.has(normalized)) {
      loggedGapTermsRef.current.add(normalized)
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
