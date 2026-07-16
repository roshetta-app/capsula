import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFlatDrugs, fetchFlatDrugsLight, fetchMetadataTimestamps } from '../lib/queries'
import { readDrugsCache, writeDrugsCache } from '../utils/cache'
import { CACHE_TTL_MS } from '../constants/cache'

export function useDrugs() {
  const [drugs,    setDrugs]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  // { loaded, total } while a staged (cold-start) fetch is actively paging
  // in the background; null the rest of the time — nothing to show a
  // progress ring for on a normal, already-cached open.
  const [progress, setProgress] = useState(null)

  async function fetchAndCache() {
    try {
      const fresh = await fetchFlatDrugs(supabase)
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      setDrugs(fresh)
      await writeDrugsCache(fresh, drugsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load drugs')
    } finally {
      setLoading(false)
    }
  }

  // Cold-start only: show the fast, list-only data as soon as it arrives,
  // then keep loading the complete data (full clinical write-ups) behind
  // the scenes and swap it in once ready. Reports real page-by-page
  // progress via `progress` while each stage is in flight.
  async function fetchLightThenFull() {
    try {
      const light = await fetchFlatDrugsLight(supabase, (loaded, total) => setProgress({ loaded, total }))
      setDrugs(light)
      setLoading(false)
    } catch (err) {
      setError(err.message ?? 'Failed to load drugs')
      setLoading(false)
      setProgress(null)
      return
    }

    // Full fetch continues in the background. If this fails, the light
    // list stays in place and usable — the next normal app open retries
    // via the regular cache/version-check path below.
    try {
      const fresh = await fetchFlatDrugs(supabase, (loaded, total) => setProgress({ loaded, total }))
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      setDrugs(fresh)
      await writeDrugsCache(fresh, drugsUpdatedAt)
    } catch {
      // Silent — see comment above
    } finally {
      setProgress(null)
    }
  }

  useEffect(() => {
    async function init() {
      const cached = await readDrugsCache()

      // Cold start — nothing saved yet. Stage the load: fast list first,
      // full detail fills in right after, both with real progress.
      if (!cached) {
        await fetchLightThenFull()
        return
      }

      // Show the saved copy immediately
      setDrugs(cached.data)
      setLoading(false)

      // Expired — re-fetch regardless of version match
      const isExpired = !cached.fetchedAt || (Date.now() - new Date(cached.fetchedAt).getTime()) > CACHE_TTL_MS
      if (isExpired) {
        await fetchAndCache()
        return
      }

      // Fresh — just check in the background if the server's version moved on
      try {
        const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (drugsUpdatedAt !== cached.version) {
          await fetchAndCache()
        }
      } catch {
        // Network error on the background check — keep showing cached data
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { drugs, loading, error, progress, refresh: fetchAndCache }
}
