/**
 * src/hooks/useSortToggle.js
 *
 * Manages sort mode state for the Conditions screen.
 * Persists selection to localStorage so preference survives page reload.
 *
 * Sort modes:
 *   'az'     — alphabetical A–Z (default)
 *   'recent' — recently viewed conditions float to top, remainder A–Z
 *
 * @returns {{ sortMode: 'az' | 'recent', toggleSort: () => void, setSortMode: (mode: 'az' | 'recent') => void }}
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'capsula_conditions_sort'
const VALID_MODES = ['az', 'recent']

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

  const toggleSort = useCallback(() => {
    setSortMode(sortMode === 'az' ? 'recent' : 'az')
  }, [sortMode, setSortMode])

  return { sortMode, toggleSort, setSortMode }
}
