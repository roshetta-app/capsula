/**
 * src/hooks/useRecentlyViewed.js
 * Phase 2C — Conditions Screen
 * Updated — full recency history for "Recent first" sort
 *
 * Manages the viewed-conditions history in localStorage.
 *
 * Storage key: capsula_recent_conditions
 * Format:      [{ id, name, slug }]  — ALL viewed conditions, newest first
 * History cap: MAX_HISTORY_ITEMS — prevents unbounded localStorage growth
 *
 * Exposes:
 *   recentlyViewed  — newest MAX_CHIP_ITEMS entries (for RecentlyViewedChips)
 *   recentOrder     — ids of ALL viewed conditions, newest first
 *                      (used by useConditionSearch to sort the full list
 *                      by recency; items not in this array fall back to A–Z)
 *
 * Usage in ConditionDetailScreen (called on mount):
 *   const { addRecentlyViewed } = useRecentlyViewed()
 *   useEffect(() => { addRecentlyViewed(condition) }, [condition.id])
 *
 * Usage in ConditionsScreen (read the list):
 *   const { recentlyViewed, recentOrder } = useRecentlyViewed()
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY        = 'capsula_recent_conditions'
const MAX_CHIP_ITEMS      = 5    // entries shown in the RecentlyViewedChips strip
const MAX_HISTORY_ITEMS   = 200  // safety cap on stored view history

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
  const [history, setHistory] = useState(() => readFromStorage())

  /**
   * Record a condition as viewed.
   * Deduplicates by id. Newest item goes to front. Trims to MAX_HISTORY_ITEMS.
   *
   * @param {{ id: string, name: string, slug: string }} condition
   */
  const addRecentlyViewed = useCallback((condition) => {
    if (!condition?.id) return

    setHistory(prev => {
      // Remove existing entry for this condition (dedup)
      const filtered = prev.filter(c => c.id !== condition.id)
      // Add to front
      const updated = [
        { id: condition.id, name: condition.name, slug: condition.slug },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS)

      writeToStorage(updated)
      return updated
    })
  }, [])

  /**
   * Clear the entire view history.
   */
  const clearRecentlyViewed = useCallback(() => {
    writeToStorage([])
    setHistory([])
  }, [])

  // Chips strip only ever shows the most recent few
  const recentlyViewed = history.slice(0, MAX_CHIP_ITEMS)

  // Full recency order (newest first) — drives "Recent first" sort across
  // the entire conditions list, not just the last few viewed
  const recentOrder = history.map(c => c.id)

  return { recentlyViewed, recentOrder, addRecentlyViewed, clearRecentlyViewed }
}
