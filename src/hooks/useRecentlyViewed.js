/**
 * src/hooks/useRecentlyViewed.js
 * Phase 2C — Conditions Screen
 * Updated — full recency history for "Recent first" sort
 *
 * Phase F3 — Personal Data Migration: generalized to back both conditions
 * and drugs (previously DrugsScreen.jsx kept a separate, near-identical
 * inline copy of this same logic — see that file's history). Call with
 * useRecentlyViewed('drug') for the drugs list; existing callers are
 * unaffected since itemType defaults to 'condition'.
 *
 * Also made account-aware (D1): signed out (guest) behaves exactly as
 * before, localStorage only. Signed in, it loads from the 'recently_viewed'
 * table on sign-in and writes through on every view (optimistic — local
 * state updates immediately alongside the database call). The local copy is
 * a fast mirror, not the source of truth, once a user is present.
 *
 * recently-viewed-offline-fix (2026-09-01) — removed the reactive
 * "clear the mirror when `user` goes from signed-in to signed-out" effect
 * that used to live here. It was wiping this list on things that were
 * never a real sign-out: the sign-in library can genuinely report
 * "signed out" for a moment purely from a background session check
 * failing while offline (a confirmed quirk of the library itself, not
 * this app), and this effect couldn't tell that apart from someone
 * actually tapping Sign Out. AuthContext.jsx's signOut() already sweeps
 * this exact storage key directly, from the one place a real sign-out is
 * guaranteed to run through — see clearAllRecentlyViewedStorage() there.
 * This hook no longer needs its own copy of that logic.
 *
 * Storage keys (unchanged, so existing local history isn't lost):
 *   condition: capsula_recent_conditions
 *   drug:      capsula_recent_drugs
 * Format:      [{ id, name, slug }]  — newest first
 *
 * Exposes:
 *   history         — full capped history, newest first (drug caller uses
 *                      this directly, resolving each id against the live
 *                      catalog itself, same as before)
 *   recentlyViewed  — newest MAX_CHIP_ITEMS entries (for RecentlyViewedChips;
 *                      only meaningful for the condition caller)
 *   recentOrder     — ids of ALL viewed items, newest first (used by
 *                      useConditionSearch to sort the full conditions list
 *                      by recency; not used on the drugs side)
 *
 * F10 Batch A — Analytics Revamp (D30): recentOrder is now memoized on
 * `history` instead of recomputed with a new array identity on every
 * render. Previously, any unrelated re-render anywhere under
 * ConditionProvider produced a new recentOrder array, which flowed into
 * useConditionSearch's runSearch dependency chain and reset its 150ms
 * debounce timer — silently re-firing (and re-logging) the same stale
 * search on every re-render for as long as it sat in the box. This is the
 * root cause of the search_gaps spam bug (one term logged 2,000+ times).
 *
 * Usage in ConditionDetailScreen (called on mount):
 *   const { addRecentlyViewed } = useRecentlyViewed()
 *   useEffect(() => { addRecentlyViewed(condition) }, [condition.id])
 *
 * Usage in ConditionsScreen (read the list):
 *   const { recentlyViewed, recentOrder } = useRecentlyViewed()
 *
 * Usage in DrugsScreen (read the list):
 *   const { history: recentDrugs, addRecentlyViewed: addRecentDrug } = useRecentlyViewed('drug')
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

const MAX_CHIP_ITEMS = 5 // entries shown in the RecentlyViewedChips strip (conditions only)

const CONFIG = {
  condition: { storageKey: 'capsula_recent_conditions', maxHistory: 200 },
  drug:      { storageKey: 'capsula_recent_drugs',       maxHistory: 15  },
}

function readFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeToStorage(storageKey, items) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items))
  } catch {
    // Storage may be full or unavailable — fail silently
  }
}

export function useRecentlyViewed(itemType = 'condition') {
  const { storageKey, maxHistory } = CONFIG[itemType]
  const { user } = useAuth()
  const [history, setHistory] = useState(() => readFromStorage(storageKey))

  // Load from the database once signed in, and whenever the signed-in
  // user changes.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('recently_viewed')
      .select('item_id, item_name, item_slug, viewed_at')
      .eq('item_type', itemType)
      .order('viewed_at', { ascending: false })
      .limit(maxHistory)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const next = data.map(r => ({ id: r.item_id, name: r.item_name, slug: r.item_slug }))
        writeToStorage(storageKey, next)
        setHistory(next)
      })

    return () => { cancelled = true }
  }, [user, itemType, storageKey, maxHistory])

  /**
   * Record an item as viewed.
   * Deduplicates by id. Newest item goes to front. Trims to this type's
   * history cap.
   *
   * @param {{ id: string, name: string, slug: string }} item
   */
  const addRecentlyViewed = useCallback((item) => {
    if (!item?.id) return

    setHistory(prev => {
      const filtered = prev.filter(x => x.id !== item.id)
      const updated = [
        { id: item.id, name: item.name, slug: item.slug },
        ...filtered,
      ].slice(0, maxHistory)

      writeToStorage(storageKey, updated)
      return updated
    })

    if (user) {
      supabase
        .from('recently_viewed')
        .upsert(
          {
            user_id:    user.id,
            item_type:  itemType,
            item_id:    item.id,
            item_name:  item.name,
            item_slug:  item.slug,
            viewed_at:  new Date().toISOString(),
          },
          { onConflict: 'user_id,item_type,item_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Failed to sync recently viewed:', error)
        })
    }
  }, [user, itemType, storageKey, maxHistory])

  /**
   * Clear the entire view history for this item type.
   */
  const clearRecentlyViewed = useCallback(() => {
    writeToStorage(storageKey, [])
    setHistory([])

    if (user) {
      supabase
        .from('recently_viewed')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .then(({ error }) => {
          if (error) console.error('Failed to clear recently viewed:', error)
        })
    }
  }, [user, itemType, storageKey])

  // Chips strip only ever shows the most recent few
  const recentlyViewed = history.slice(0, MAX_CHIP_ITEMS)

  // Full recency order (newest first) — drives "Recent first" sort across
  // the entire conditions list, not just the last few viewed.
  // Memoized on `history` (F10 Batch A / D30) so this array keeps the same
  // identity across re-renders that don't actually change history — see
  // header comment for why an unmemoized version caused the search_gaps
  // spam bug.
  const recentOrder = useMemo(() => history.map(x => x.id), [history])

  return { history, recentlyViewed, recentOrder, addRecentlyViewed, clearRecentlyViewed }
}
