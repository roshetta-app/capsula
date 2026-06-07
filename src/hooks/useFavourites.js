import { useState, useCallback } from 'react'

const STORAGE_KEY = 'capsula_favourites'

// ─── Storage helpers ──────────────────────────────────────────────────────────

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { drugs: [], conditions: [] }
    const parsed = JSON.parse(raw)
    return {
      drugs:      Array.isArray(parsed.drugs)      ? parsed.drugs      : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
    }
  } catch {
    return { drugs: [], conditions: [] }
  }
}

function writeStorage(favourites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ─── useFavourites ────────────────────────────────────────────────────────────

/**
 * useFavourites — manages bookmarked drugs and conditions in localStorage.
 *
 * Storage key: 'capsula_favourites'
 * Storage shape: { drugs: string[], conditions: string[] }
 *
 * Returns:
 *   favourites            { drugs: string[], conditions: string[] }
 *   toggleDrug            (id: string) => void
 *   toggleCondition       (id: string) => void
 *   isDrugFavourited      (id: string) => boolean
 *   isConditionFavourited (id: string) => boolean
 */
export function useFavourites() {
  const [favourites, setFavourites] = useState(() => readStorage())

  const toggleDrug = useCallback((id) => {
    setFavourites(prev => {
      const next = prev.drugs.includes(id)
        ? { ...prev, drugs: prev.drugs.filter(d => d !== id) }
        : { ...prev, drugs: [...prev.drugs, id] }
      writeStorage(next)
      return next
    })
  }, [])

  const toggleCondition = useCallback((id) => {
    setFavourites(prev => {
      const next = prev.conditions.includes(id)
        ? { ...prev, conditions: prev.conditions.filter(c => c !== id) }
        : { ...prev, conditions: [...prev.conditions, id] }
      writeStorage(next)
      return next
    })
  }, [])

  const isDrugFavourited = useCallback(
    (id) => favourites.drugs.includes(id),
    [favourites.drugs]
  )

  const isConditionFavourited = useCallback(
    (id) => favourites.conditions.includes(id),
    [favourites.conditions]
  )

  return {
    favourites,
    toggleDrug,
    toggleCondition,
    isDrugFavourited,
    isConditionFavourited,
  }
}
