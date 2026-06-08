import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFlatDrugs, fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache, isCacheExpired } from '../utils/cache'

/**
 * useDrugs — cache-first drug data hook.
 *
 * On mount:
 *   1. Read cache synchronously → render immediately (zero delay)
 *   2. Fetch app_metadata.drugs_updated_at from Supabase
 *   3. If timestamp differs OR cache is older than 7 days → re-fetch silently
 *   4. Cold start (no cache) → show loading, fetch, render, cache
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

      // Cold start — no cache at all
      if (!cachedTs) {
        await fetchAndCache()
        return
      }

      // TTL expired — re-fetch even if version matches
      if (isCacheExpired('drugs')) {
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

  return { drugs, loading, error, refresh: fetchAndCache }
}
