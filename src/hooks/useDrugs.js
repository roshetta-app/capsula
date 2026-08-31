import { useState, useEffect, useRef, useCallback } from 'react'
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

  // Onboarding-download-flow hardening (plan Sec Phase 1, 1.10): on a
  // brand-new install (no cache yet, onboarding not finished), the
  // first-ever download waits for start() below — called from
  // OnboardingScreen's slide 4 Next tap — instead of firing the instant
  // this hook mounts. startedRef just guards against firing the fetch a
  // second time if start() somehow gets called more than once.
  const startedRef = useRef(false)

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
  //
  // Resets loading/error at the top of every call, not just the first —
  // this is what lets it double as a retry after a failed attempt (see
  // retry() below) without a stale error message sitting around once a
  // new attempt is under way.
  async function fetchLightThenFull() {
    setLoading(true)
    setError(null)

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

  // Called from OnboardingScreen's slide 4 Next tap. No-ops if the
  // first-ever download has already started (e.g. a second tap), so it
  // never restarts an in-flight or already-finished attempt.
  const start = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    fetchLightThenFull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Called from the onboarding Failed state's Retry button. Unlike
  // start(), this always re-attempts — that is the whole point of a
  // retry — and marks startedRef so a stray later start() call can't
  // also fire a second attempt on top of it.
  const retry = useCallback(() => {
    startedRef.current = true
    fetchLightThenFull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function init() {
      const cached = await readDrugsCache()

      // Cold start — nothing saved yet.
      if (!cached) {
        // A brand-new install waits for start() above, called from
        // OnboardingScreen's slide 4 Next tap, instead of downloading
        // the instant this hook mounts (plan Sec Phase 1, 1.10 —
        // overrides the previous "downloads are automatic" behavior for
        // this specific first-ever-open case only). A device that's
        // already finished onboarding once but somehow has no cache
        // (e.g. it was cleared) has no onboarding screen left to tap
        // Next on, so it still loads immediately, exactly as before.
        const alreadyOnboarded = localStorage.getItem('capsula_onboarded') === 'true'
        if (alreadyOnboarded) {
          startedRef.current = true
          await fetchLightThenFull()
        }
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

  return { drugs, loading, error, progress, refresh: fetchAndCache, start, retry }
}
