import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchCategoriesForCMS } from '../lib/adminQueries'
import { fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache, isCacheExpired } from '../utils/cache'

/**
 * useCategories — cache-first drug-category hook. Same shape as useDrugs.js.
 *
 * Watches app_metadata.drugs_updated_at, the same timestamp useDrugs watches
 * — categories don't get their own column since category edits already bump
 * drugs_updated_at (1A.2 decision: categories feed the drugs screen).
 *
 * On mount:
 *   1. Read cache synchronously → render immediately (zero delay)
 *   2. Fetch app_metadata.drugs_updated_at from Supabase
 *   3. If timestamp differs OR cache is older than 7 days → re-fetch silently
 *   4. Cold start (no cache, or cache contains empty array) → show loading, fetch, render, cache
 */
export function useCategories() {
  // getCacheData returns null for missing OR empty-array caches,
  // so an empty-poisoned cache is treated identically to a cold start.
  const cached = getCacheData('categories')

  const [categories, setCategories] = useState(cached ?? [])
  const [loading,    setLoading]    = useState(!cached)
  const [error,      setError]      = useState(null)

  async function fetchAndCache() {
    try {
      const { data: fresh, error: fetchErr } = await fetchCategoriesForCMS()
      if (fetchErr) throw fetchErr
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      setCategories(fresh)
      writeCache('categories', fresh, drugsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      const cachedTs = getCacheTimestamp('categories')

      // Cold start — no cache at all, or cache was poisoned with empty data
      if (!cachedTs || !cached) {
        await fetchAndCache()
        return
      }

      // TTL expired — re-fetch even if version matches
      if (isCacheExpired('categories')) {
        await fetchAndCache()
        return
      }

      // Silently check if server version is newer
      try {
        const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (drugsUpdatedAt !== cachedTs) {
          await fetchAndCache()
        }
      } catch {
        // Network error — keep showing cached data, no error shown
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { categories, loading, error, refresh: fetchAndCache }
}
