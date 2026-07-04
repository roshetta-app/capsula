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
 *   restoreConditionAt    (id: string, index: number) => void
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

  // restoreConditionAt — reinserts a condition id at a specific index instead
  // of appending it to the end. Used by Undo after a remove: toggleCondition
  // is append-only by design (so ordinary re-favouriting always lands at the
  // end, which is what powers the "recently added" sort), but Undo isn't
  // ordinary re-favouriting — it should put the item back exactly where it
  // was, not bump it to the top. No-ops if the id is already present, as a
  // guard against a stray double-fire (e.g. a fast double-tap on Undo).
  const restoreConditionAt = useCallback((id, index) => {
    setFavourites(prev => {
      if (prev.conditions.includes(id)) return prev
      const conditions = [...prev.conditions]
      const insertAt = Math.max(0, Math.min(index, conditions.length))
      conditions.splice(insertAt, 0, id)
      const next = { ...prev, conditions }
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
    restoreConditionAt,
    isDrugFavourited,
    isConditionFavourited,
  }
}
