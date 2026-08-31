import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFlatDrugs, fetchMetadataTimestamps } from '../lib/queries'
import { readDrugsCache, writeDrugsCache } from '../utils/cache'
import { CACHE_TTL_MS } from '../constants/cache'
import { logCrash } from '../utils/crashLogger'

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

  // Retry-stacking guard (2026-08-31): tapping Retry used to start a brand
  // new fetchColdStart() without stopping whatever attempt was already
  // running (e.g. one still in flight when onboarding's 25-30s timeout
  // fired and showed Failed). Both attempts kept writing to drugs/
  // loading/progress/error, and whichever finished last "won" — visible as
  // the progress bar jumping around, and as two full downloads' worth of
  // cache writes happening back to back. This counter tags every
  // fetchColdStart() call with its own attempt number; a call only applies
  // its results if it's still the *latest* attempt by the time it resolves,
  // so a stale attempt's late-arriving progress/data/error is silently
  // ignored instead of overwriting a newer one.
  const attemptIdRef = useRef(0)

  async function fetchAndCache() {
    try {
      const fresh = await fetchFlatDrugs(supabase)
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      setDrugs(fresh)
      await writeDrugsCache(fresh, drugsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load drugs')
      // Diagnostics-only addition (download-fail investigation, 2026-08-31):
      // this catch previously only surfaced a message in the UI and
      // discarded the real error — the same invisible-failure gap 1.16
      // already fixed for cache save/read errors, just never extended to
      // a fetch failure itself. Routes through the same crash logger as
      // everywhere else in the app, so a real repeating failure shows up
      // in the crash log instead of only ever being retried blind.
      logCrash(err, 'useDrugs.fetchAndCache')
    } finally {
      setLoading(false)
    }
  }

  // Cold-start only — called from OnboardingScreen's slide 4 Next tap
  // (start(), below) or its Retry button (retry()), and from the
  // "already onboarded but cache somehow missing" branch inside init()
  // further down. Runs the same single, complete download as a normal
  // cache-expired refresh (fetchAndCache above), but also reports real
  // page-by-page progress via 'progress' for onboarding's progress bar.
  //
  // Resets loading/error at the top of every call, not just the first —
  // this is what lets it double as a retry after a failed attempt (see
  // retry() below) without a stale error message sitting around once a
  // new attempt is under way.
  //
  // 2026-08-31 (second pass): replaces the previous fetchLightThenFull,
  // which showed a fast partial list first and kept loading the full
  // data invisibly behind it — the exact blind spot that let a
  // background failure go unnoticed (a device could reach "All set!"
  // with nothing actually saved). This is now the single source of
  // truth: onboarding does not finish until the complete download has
  // actually succeeded and been saved.
  async function fetchColdStart() {
    // This call's own attempt number. If a newer call starts (another
    // Retry tap) before this one finishes, attemptIdRef.current moves past
    // myAttempt — every check below then knows this attempt is stale.
    const myAttempt = ++attemptIdRef.current

    setLoading(true)
    setError(null)
    setProgress(null)

    try {
      const fresh = await fetchFlatDrugs(supabase, (loaded, total) => {
        if (attemptIdRef.current !== myAttempt) return // a newer attempt has taken over
        setProgress({ loaded, total })
      })
      const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
      if (attemptIdRef.current !== myAttempt) return // stale — a newer attempt already resolved or is still running
      setDrugs(fresh)
      await writeDrugsCache(fresh, drugsUpdatedAt)
    } catch (err) {
      if (attemptIdRef.current !== myAttempt) return
      setError(err.message ?? 'Failed to load drugs')
      // Diagnostics-only addition (download-fail investigation, 2026-08-31)
      // — see matching note in fetchAndCache above. This is the path
      // onboarding's slide 4/5 actually uses, so this is the one that
      // matters most for seeing the real error behind the repeated
      // "Something went wrong" / Retry loop.
      logCrash(err, 'useDrugs.fetchColdStart')
    } finally {
      if (attemptIdRef.current === myAttempt) {
        setLoading(false)
        setProgress(null)
      }
    }
  }

  // Called from OnboardingScreen's slide 4 Next tap. No-ops if the
  // first-ever download has already started (e.g. a second tap), so it
  // never restarts an in-flight or already-finished attempt.
  const start = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    fetchColdStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Called from the onboarding Failed state's Retry button. Unlike
  // start(), this always re-attempts — that is the whole point of a
  // retry — and marks startedRef so a stray later start() call can't
  // also fire a second attempt on top of it.
  const retry = useCallback(() => {
    startedRef.current = true
    fetchColdStart()
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
          await fetchColdStart()
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
