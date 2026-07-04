/**
 * src/hooks/useSortToggle.js
 *
 * Manages sort mode for a condition list.
 * Modes: 'az' (default) | 'recent'
 *
 * 'az'     — alphabetical A-Z
 * 'recent' — by a caller-supplied recency order (recently viewed on
 *            ConditionsScreen, recently added on FavouritesScreen — the
 *            hook itself has no opinion on what 'recent' means; that's
 *            decided by whatever id array the caller passes into
 *            useConditionSearch's own sort step)
 *
 * Persists selection in localStorage under a caller-supplied key, so
 * independent screens (ConditionsScreen, FavouritesScreen) can each
 * remember their own sort preference instead of sharing one.
 *
 * Params (all optional — no-arg call preserves ConditionsScreen's original
 * behavior exactly):
 *   storageKey    string  — localStorage key (default: 'capsula_conditions_sort')
 *   labels        object  — { az, recent } labels (default: SORT_LABELS below)
 *   defaultMode   string  — 'az' | 'recent', used when nothing is stored yet
 *                           (default: 'az')
 *
 * Returns:
 *   sortMode      — 'az' | 'recent'
 *   cycleSortMode — function, toggles between the two modes
 *   setSortMode   — function, sets mode directly (extra, retained from delivered)
 *   SORT_LABELS   — the labels object that was passed in (or the default)
 */

import { useState, useCallback } from 'react'

const DEFAULT_STORAGE_KEY = 'capsula_conditions_sort'
const VALID_MODES = ['az', 'recent']

export const SORT_LABELS = {
  az:     'A – Z',
  recent: 'Recent first',
}

function readStoredMode(storageKey, defaultMode) {
  try {
    const stored = localStorage.getItem(storageKey)
    return VALID_MODES.includes(stored) ? stored : defaultMode
  } catch {
    return defaultMode
  }
}

export function useSortToggle(storageKey = DEFAULT_STORAGE_KEY, labels = SORT_LABELS, defaultMode = 'az') {
  const [sortMode, setSortModeState] = useState(() => readStoredMode(storageKey, defaultMode))

  const setSortMode = useCallback((mode) => {
    if (!VALID_MODES.includes(mode)) return
    setSortModeState(mode)
    try {
      localStorage.setItem(storageKey, mode)
    } catch {
      // localStorage unavailable — state still works in memory
    }
  }, [storageKey])

  const cycleSortMode = useCallback(() => {
    setSortMode(sortMode === 'az' ? 'recent' : 'az')
  }, [sortMode, setSortMode])

  return { sortMode, cycleSortMode, setSortMode, SORT_LABELS: labels }
}
