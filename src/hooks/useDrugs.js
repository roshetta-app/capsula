import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFlatDrugs, fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache } from '../utils/cache'

/**
 * useDrugs — cache-first drug data hook.
 *
 * On mount:
 *   1. Read cache synchronously → render immediately (zero delay)
 *   2. Fetch app_metadata.drugs_updated_at from Supabase
 *   3. If timestamp differs → re-fetch drugs silently → update state + cache
 *   4. Cold start (no cache) → show loading, fetch, render, cache
 *
 * Exposes:
 *   drugs      — FlatDrug[]
 *   loading    — true only on cold start (no cached data)
 *   error      — string | null
 *   refresh    — () => void  (force re-fetch)
 */
export function useDrugs() {
  const cached = getCacheData('drugs')

  const [drugs,   setDrugs]   = useState(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error,   setError]   = useState(null)

  async function fetchAndCache() {
    try {
      const fresh = await fetchFlatDrugs(supabase)
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      setDrugs(fresh)
      writeCache('drugs', fresh, drugsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load drugs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      const cachedTs = getCacheTimestamp('drugs')

      if (!cachedTs) {
        // Cold start — no cache at all
        await fetchAndCache()
        return
      }

      // We already rendered from cache — now silently check timestamp
      try {
        const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (drugsUpdatedAt !== cachedTs) {
          // Stale — re-fetch silently (no loading spinner)
          await fetchAndCache()
        }
      } catch {
        // Network error on timestamp check — keep showing cached data, no error shown
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { drugs, loading, error, refresh: fetchAndCache }
}
