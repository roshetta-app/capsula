/**
 * src/hooks/useRecentlyViewed.js
 * Phase 2C — Conditions Screen
 *
 * Manages the recently viewed conditions list in localStorage.
 *
 * Storage key: capsula_recent_conditions
 * Format:      [{ id, name, slug }]  — last 5, newest first
 * Max items:   5 — when 6th is added, oldest is removed
 *
 * Usage in ConditionDetailScreen (called on mount):
 *   const { addRecentlyViewed } = useRecentlyViewed()
 *   useEffect(() => { addRecentlyViewed(condition) }, [condition.id])
 *
 * Usage in ConditionsScreen (read the list):
 *   const { recentlyViewed } = useRecentlyViewed()
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'capsula_recent_conditions'
const MAX_ITEMS   = 5

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage may be full or unavailable — fail silently
  }
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState(() => readFromStorage())

  /**
   * Add a condition to the recently viewed list.
   * Deduplicates by id. Newest item goes to front. Trims to MAX_ITEMS.
   *
   * @param {{ id: string, name: string, slug: string }} condition
   */
  const addRecentlyViewed = useCallback((condition) => {
    if (!condition?.id) return

    setRecentlyViewed(prev => {
      // Remove existing entry for this condition (dedup)
      const filtered = prev.filter(c => c.id !== condition.id)
      // Add to front
      const updated = [
        { id: condition.id, name: condition.name, slug: condition.slug },
        ...filtered,
      ].slice(0, MAX_ITEMS)

      writeToStorage(updated)
      return updated
    })
  }, [])

  /**
   * Clear the entire recently viewed list.
   */
  const clearRecentlyViewed = useCallback(() => {
    writeToStorage([])
    setRecentlyViewed([])
  }, [])

  return { recentlyViewed, addRecentlyViewed, clearRecentlyViewed }
}
