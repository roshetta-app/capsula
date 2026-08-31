import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchConditions, fetchMetadataTimestamps } from '../lib/queries'
import { readConditionsCache, writeConditionsCache } from '../utils/cache'
import { CACHE_TTL_MS } from '../constants/cache'
import { logCrash } from '../utils/crashLogger'

const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

/**
 * useConditions — cache-first conditions data hook.
 *
 * 2026-08-30 (conditions durable storage, plan Sec 4.1/Phase 1, step 1.3):
 * moved off the small, size-limited localStorage slice system onto the
 * same durable IndexedDB storage the drugs library already uses — the same
 * failure that already hit drugs once (silently failing to save, causing
 * every app open to secretly re-download everything) is avoidable here by
 * doing it now, while the library is still small. This hook's init flow now
 * mirrors useDrugs.js's exactly, just with conditions' own cache functions.
 *
 * 2026-08-31 (onboarding-download-flow hardening, plan Phase 1, 1.11):
 * mirrors useDrugs.js's start()/retry() gate — see that file's comments
 * for the full reasoning. The one difference: conditions only has a
 * single-stage fetchAndCache (no light-then-full split), so start()/retry()
 * call that directly instead of a separate staged function.
 *
 * On mount:
 *   1. Read the saved copy from IndexedDB → show it immediately once ready
 *   2. Fetch app_metadata.conditions_updated_at from Supabase
 *   3. If timestamp differs OR cache is older than 7 days → re-fetch silently
 *   4. Cold start (no cache) → wait for start() (a brand-new install) or
 *      fetch immediately (a device that's already onboarded but lost its
 *      cache somehow)
 *
 * Exposes:
 *   conditions  — ConditionFull[] (Uncategorized specialty label stripped)
 *   specialties — Specialty[]  (unique, sorted by admin sort_order, Uncategorized excluded)
 *   loading     — true only on cold start
 *   error       — string | null
 *   refresh     — () => void  (force re-fetch, e.g. after CMS save)
 *   start       — () => void  (called from OnboardingScreen's slide 4 Next tap)
 *   retry       — () => void  (called from OnboardingScreen's Failed-state Retry button)
 */
export function useConditions() {
  const [conditions, setConditions] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Onboarding-download-flow hardening (plan Sec Phase 1, 1.11) — see
  // useDrugs.js's matching comment for the full reasoning. Guards against
  // firing the fetch twice if start() somehow gets called more than once.
  const startedRef = useRef(false)

  // Fetch fresh data from DB, update state, write cache.
  // Fetches metadata FIRST so the version we store matches what triggered the fetch.
  // Clears any stuck error from an earlier failed attempt at the top of
  // every call, so a retry doesn't leave a stale error message behind
  // once a new attempt is under way.
  async function fetchAndCache() {
    setError(null)
    try {
      const [fresh, { conditionsUpdatedAt }] = await Promise.all([
        fetchConditions(supabase),
        fetchMetadataTimestamps(supabase),
      ])
      setConditions(fresh)
      await writeConditionsCache(fresh, conditionsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load conditions')
      // Diagnostics-only addition (download-fail investigation, 2026-08-31)
      // — matches the same addition in useDrugs.js's fetchAndCache/
      // fetchColdStart. Previously this failure only ever surfaced as a
      // generic on-screen message and was otherwise discarded; routing it
      // through the same crash logger 1.16 already uses for cache
      // save/read failures means a real, repeating cause shows up
      // somewhere instead of only ever being retried blind.
      logCrash(err, 'useConditions.fetchAndCache')
    } finally {
      setLoading(false)
    }
  }

  // Called from OnboardingScreen's slide 4 Next tap. No-ops if the
  // first-ever download has already started (e.g. a second tap), so it
  // never restarts an in-flight or already-finished attempt.
  const start = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    fetchAndCache()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Called from the onboarding Failed state's Retry button. Unlike
  // start(), this always re-attempts — that is the whole point of a
  // retry. loading needs to be explicitly reset to true here since a
  // previous failed attempt already set it false; fetchAndCache itself
  // is also used for silent background refreshes on an already-cached
  // device, where flipping loading back to true would incorrectly show
  // a full loading state over data that's already on screen.
  const retry = useCallback(() => {
    startedRef.current = true
    setLoading(true)
    fetchAndCache()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function init() {
      const cached = await readConditionsCache()

      // Cold start — nothing saved yet
      if (!cached) {
        // A brand-new install waits for start() above, called from
        // OnboardingScreen's slide 4 Next tap, instead of downloading
        // the instant this hook mounts (plan Sec Phase 1, 1.11 — mirrors
        // useDrugs.js's 1.10). A device that's already finished
        // onboarding once but somehow has no cache (e.g. it was cleared)
        // has no onboarding screen left to tap Next on, so it still
        // loads immediately, exactly as before.
        const alreadyOnboarded = localStorage.getItem('capsula_onboarded') === 'true'
        if (alreadyOnboarded) {
          startedRef.current = true
          await fetchAndCache()
        }
        return
      }

      // Show the saved copy immediately
      setConditions(cached.data)
      setLoading(false)

      // TTL expired (>7 days) — re-fetch regardless of version
      const isExpired = !cached.fetchedAt || (Date.now() - new Date(cached.fetchedAt).getTime()) > CACHE_TTL_MS
      if (isExpired) {
        await fetchAndCache()
        return
      }

      // Silently check server version against cached version
      try {
        const { conditionsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (conditionsUpdatedAt !== cached.version) {
          await fetchAndCache()
        }
      } catch {
        // Network error — keep cached data, don't crash
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exclude Uncategorized from specialty pills — sorted by admin sort_order, fallback to name
  const specialties = useMemo(() => {
    const seen = new Map()
    for (const c of conditions) {
      if (c.specialtyId && c.specialtyId !== UNCATEGORIZED_ID && !seen.has(c.specialtyId)) {
        seen.set(c.specialtyId, {
          id:         c.specialtyId,
          name:       c.specialtyName,
          slug:       c.specialtySlug,
          // Legacy hex fields (kept for any code that still reads them)
          iconName:   c.specialtyIcon,
          colorHex:   c.specialtyColor,
          // Phase-6 token fields expected by SpecialtyFilterPills + SpecialtiesBottomSheet
          iconType:   c.specialtyIconType,
          iconValue:  c.specialtyIconType === 'custom'
                        ? c.specialtyIconUrl
                        : (c.specialtyIcon ?? 'Stethoscope'),
          colorToken: c.specialtyColorToken,
          sortOrder:  c.specialtySortOrder,
        })
      }
    }
    return [...seen.values()].sort((a, b) =>
      (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
    )
  }, [conditions])

  // Strip Uncategorized specialty label from conditions so cards show no tag
  const conditionsDisplay = useMemo(() =>
    conditions.map(c =>
      c.specialtyId === UNCATEGORIZED_ID
        ? { ...c, specialtyId: null, specialtyName: null, specialtySlug: null }
        : c
    ),
  [conditions])

  return { conditions: conditionsDisplay, specialties, loading, error, refresh: fetchAndCache, start, retry }
}
