import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFlatDrugs, fetchFlatDrugsLight, fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache, isCacheExpired } from '../utils/cache'

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

  // Cold-start only: show the fast, list-only data as soon as it arrives,
  // then keep loading the complete data (full clinical write-ups) behind
  // the scenes and swap it in once ready. The list, search, and pregnancy/
  // breastfeeding filter all work correctly on the light data already —
  // only a drug's detail page briefly shows "not yet added" for sections
  // that fill in a moment later. Every visit after this first one uses the
  // plain fetchAndCache path above and is unaffected.
  async function fetchLightThenFull() {
    try {
      const light = await fetchFlatDrugsLight(supabase)
      setDrugs(light)
      setLoading(false)
    } catch (err) {
      setError(err.message ?? 'Failed to load drugs')
      setLoading(false)
      return
    }

    // Full fetch continues in the background. If this fails, the light
    // list stays in place and usable — the next normal app open retries
    // via the regular cache/version-check path above.
    try {
      const fresh = await fetchFlatDrugs(supabase)
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      setDrugs(fresh)
      writeCache('drugs', fresh, drugsUpdatedAt)
    } catch {
      // Silent — see comment above
    }
  }

  useEffect(() => {
    async function init() {
      const cachedTs = getCacheTimestamp('drugs')

      // Cold start (nothing cached yet) — stage the load: fast list first,
      // full detail fills in right after.
      if (!cachedTs || !cached) {
        await fetchLightThenFull()
        return
      }

      // Cache exists but has expired — re-fetch regardless of version match
      if (isCacheExpired('drugs')) {
        await fetchAndCache()
        return
      }

      // Cache is fresh — just check in the background if the server's
      // version has moved on, and only re-fetch if it has
      try {
        const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (drugsUpdatedAt !== cachedTs) {
          await fetchAndCache()
        }
      } catch {
        // Network error on the background check — keep showing cached data
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { drugs, loading, error, refresh: fetchAndCache }
}
