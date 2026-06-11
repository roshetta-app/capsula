/**
 * src/hooks/useSortToggle.js
 *
 * Manages sort mode for the conditions list.
 * Modes: 'az' (default) | 'recent'
 *
 * 'az'     — alphabetical A–Z (default, always)
 * 'recent' — by recently viewed, conditions with no recency fallback to A–Z at bottom
 *
 * Persists selection in localStorage under key 'capsula_conditions_sort'.
 *
 * Returns:
 *   sortMode      — 'az' | 'recent'
 *   cycleSortMode — function, toggles between the two modes
 *   setSortMode   — function, sets mode directly (extra, retained from delivered)
 *   SORT_LABELS   — { az: 'A – Z', recent: 'Recent first' }
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'capsula_conditions_sort'
const VALID_MODES = ['az', 'recent']

export const SORT_LABELS = {
  az:     'A – Z',
  recent: 'Recent first',
}

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return VALID_MODES.includes(stored) ? stored : 'az'
  } catch {
    return 'az'
  }
}

export function useSortToggle() {
  const [sortMode, setSortModeState] = useState(() => readStoredMode())

  const setSortMode = useCallback((mode) => {
    if (!VALID_MODES.includes(mode)) return
    setSortModeState(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // localStorage unavailable — state still works in memory
    }
  }, [])

  const cycleSortMode = useCallback(() => {
    setSortMode(sortMode === 'az' ? 'recent' : 'az')
  }, [sortMode, setSortMode])

  return { sortMode, cycleSortMode, setSortMode, SORT_LABELS }
}
