import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchConditions, fetchMetadataTimestamps, fetchAuditLogSince, fetchAuditCursorNow, fetchConditionById } from '../lib/queries'
import { readConditionsCache, writeConditionsCache, getCachedPhoto, savePhotoToCache, pruneOrphanedPhotos } from '../utils/cache'
import { getAllGalleryUrls } from '../utils/galleryImageUrls'
import { CACHE_TTL_MS } from '../constants/cache'
import { logCrash } from '../utils/crashLogger'

const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

// Phase F14 Stage 3 (delta sync): mirrors useDrugs.js's matching constant —
// see that file's comment for the full reasoning.
const DELTA_FALLBACK_CHANGE_COUNT = 200

// Image System Refinement Plan, Part A (2026-09-01): how many gallery
// photos sync in parallel during syncGalleryPhotos below. Bounded so a
// large batch of new/changed photos doesn't open dozens of simultaneous
// connections on a mobile network — 4 is a conservative middle ground:
// plenty of overlap for the common case (mostly cache-hit checks, no
// network at all), gentle on the uncommon case (many real downloads at
// once, e.g. a brand-new install).
const PHOTO_DOWNLOAD_CONCURRENCY = 4

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
 * 2026-09-01 (Image System Refinement Plan, Part A): after every full
 * condition fetch — the initial onboarding download, a manual retry, a
 * TTL-expiry refresh, or a delta-merge with real changes — this hook now
 * also syncs every referenced gallery photo (device-first, network
 * fallback, quietly save a copy) and prunes any saved photo no longer
 * referenced by any condition. Exposed as photosLoading/photosProgress so
 * OnboardingScreen.jsx can fold this into the combined setup progress bar
 * as a third weighted component alongside drugs and conditions. A failed
 * individual photo download is non-fatal (plan §4) — it's logged, still
 * counted toward progress, and simply stays uncached; it self-heals the
 * next time it's actually viewed online via useCachedImage.js's
 * cache-on-view.
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
 *   conditions      — ConditionFull[] (Uncategorized specialty label stripped)
 *   specialties     — Specialty[]  (unique, sorted by admin sort_order, Uncategorized excluded)
 *   loading         — true only on cold start
 *   error           — string | null
 *   photosLoading   — true while the gallery-photo sync step is running
 *   photosProgress  — { loaded, total } for the gallery-photo sync step
 *   refresh         — () => void  (force re-fetch, e.g. after CMS save)
 *   start           — () => void  (called from OnboardingScreen's slide 4 Next tap)
 *   retry           — () => void  (called from OnboardingScreen's Failed-state Retry button)
 */
export function useConditions() {
  const [conditions, setConditions] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Image System Refinement Plan, Part A — separate from `loading` on
  // purpose: conditions themselves should show the instant they're cached,
  // without waiting on every gallery photo to finish syncing. Defaults to
  // true, same convention as `loading` above — it only ever resolves once
  // syncGalleryPhotos actually runs (see that function).
  const [photosLoading,  setPhotosLoading]  = useState(true)
  const [photosProgress, setPhotosProgress] = useState({ loaded: 0, total: 0 })

  // Onboarding-download-flow hardening (plan Sec Phase 1, 1.11) — see
  // useDrugs.js's matching comment for the full reasoning. Guards against
  // firing the fetch twice if start() somehow gets called more than once.
  const startedRef = useRef(false)

  // Retry-stacking guard (2026-08-31) — mirrors useDrugs.js's matching
  // fix. Tapping Retry used to start a brand new fetchAndCache() without
  // stopping whatever attempt was already running, and whichever one
  // finished last would silently overwrite the other's result. This
  // counter tags every fetchAndCache() call with its own attempt number;
  // a call only applies its results if it's still the *latest* attempt by
  // the time it resolves. Also protects the silent background-refresh
  // path this same function serves (init()'s TTL/version checks below) —
  // if a background refresh and a user-triggered retry ever overlap, only
  // the most recent one wins. Reused below to guard syncGalleryPhotos'
  // longer-running loop the same way.
  const attemptIdRef = useRef(0)

  // Image System Refinement Plan, Part A: downloads every gallery photo
  // referenced across `conditionsList` (device-first — skips the network
  // entirely for anything already saved, so re-running this after every
  // background refresh stays cheap), then prunes any saved photo no
  // longer referenced by any condition. `myAttempt` is whatever
  // attemptIdRef held at the moment this was kicked off — if a newer
  // fetchAndCache attempt starts before this finishes, this one stops
  // touching state (and stops making further network requests) rather
  // than racing it.
  async function syncGalleryPhotos(conditionsList, myAttempt) {
    const urls = getAllGalleryUrls(conditionsList)
    if (attemptIdRef.current !== myAttempt) return

    setPhotosLoading(true)
    setPhotosProgress({ loaded: 0, total: urls.length })

    if (urls.length === 0) {
      // 2026-09-02 fix: only this (still-current) attempt is allowed to
      // prune — see the matching fix on the final prune call below for
      // the full reasoning (a stale attempt finishing late could
      // otherwise delete photos a newer attempt just saved).
      if (attemptIdRef.current === myAttempt) {
        await pruneOrphanedPhotos(urls)
        setPhotosLoading(false)
      }
      return
    }

    let loaded = 0
    let cursor = 0

    async function worker() {
      while (cursor < urls.length) {
        if (attemptIdRef.current !== myAttempt) return // a newer attempt has taken over
        const url = urls[cursor++]
        try {
          // Device first, same order as useCachedImage.js — a photo
          // already saved from a previous fetch or cache-on-view never
          // hits the network again here.
          const alreadyCached = await getCachedPhoto(url)
          if (!alreadyCached) {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`)
            const blob = await res.blob()
            await savePhotoToCache(url, blob)
          }
        } catch (err) {
          // Non-fatal (plan §4 — "a failed photo download during
          // onboarding is non-fatal"): this one photo simply stays
          // uncached and self-heals the next time it's actually viewed
          // online (useCachedImage.js's cache-on-view).
          logCrash(err, 'useConditions.syncGalleryPhotos')
        } finally {
          loaded += 1
          if (attemptIdRef.current === myAttempt) {
            setPhotosProgress({ loaded, total: urls.length })
          }
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(PHOTO_DOWNLOAD_CONCURRENCY, urls.length) }, worker)
    )

    // 2026-09-02 fix (image-system review, Issue 1): pruning used to run
    // unconditionally here even if a newer attempt had already taken
    // over — so a slow-finishing stale attempt could delete a photo the
    // newer attempt just downloaded a moment earlier, since the stale
    // attempt's `urls` snapshot wouldn't include it. Now only the
    // still-current attempt is allowed to prune, matching the guard used
    // everywhere else in this function.
    if (attemptIdRef.current === myAttempt) {
      await pruneOrphanedPhotos(urls)
      setPhotosLoading(false)
    }
  }

  // Fetch fresh data from DB, update state, write cache.
  // Fetches metadata FIRST so the version we store matches what triggered the fetch.
  // Clears any stuck error from an earlier failed attempt at the top of
  // every call, so a retry doesn't leave a stale error message behind
  // once a new attempt is under way.
  async function fetchAndCache() {
    const myAttempt = ++attemptIdRef.current
    setError(null)
    try {
      // Phase F14 Stage 3: also captures a fresh audit_log cursor
      // alongside the fetch — mirrors useDrugs.js's fetchAndCache. Leaves
      // this device with a working baseline for the next background delta
      // check regardless of why this particular fetch was a full one.
      const [auditCursor, fresh, { conditionsUpdatedAt }] = await Promise.all([
        fetchAuditCursorNow(supabase).catch(() => null),
        fetchConditions(supabase),
        fetchMetadataTimestamps(supabase),
      ])
      if (attemptIdRef.current !== myAttempt) return // a newer attempt has taken over
      setConditions(fresh)
      await writeConditionsCache(fresh, conditionsUpdatedAt, auditCursor)
      // Fire-and-forget: conditions themselves are already cached and
      // shown above; gallery photos sync in the background so `loading`
      // (below) can resolve without waiting on every photo to finish.
      // OnboardingScreen.jsx tracks photosLoading/photosProgress
      // separately for its combined progress bar.
      syncGalleryPhotos(fresh, myAttempt)
    } catch (err) {
      if (attemptIdRef.current !== myAttempt) return
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
      if (attemptIdRef.current === myAttempt) {
        setLoading(false)
      }
    }
  }

  // Phase F14 Stage 3 (delta sync): mirrors useDrugs.js's applyDrugsDelta —
  // see that function's comment for the full reasoning on the fallback
  // rules (missing cursor, failed audit_log query, oversized change set).
  // conditions/condition_blocks changes are id-scoped directly (record_id
  // IS the condition id for both — confirmed from saveConditionBlocks/
  // updateCondition/insertCondition/deleteCondition), so unlike drugs'
  // generic/formulation ids, no scope lookup is needed here. A specialties
  // change is uncommon enough that it falls back to a normal full
  // fetchAndCache rather than adding separate per-specialty handling
  // (deliberate simplification, not an oversight) — that full refetch also
  // naturally covers any condition-level changes in the same batch, so no
  // extra per-id work happens once this path is taken.
  async function applyConditionsDelta(cachedRecord, conditionsUpdatedAt) {
    if (!cachedRecord.auditCursor) {
      await fetchAndCache()
      return
    }

    try {
      const changes = await fetchAuditLogSince(supabase, cachedRecord.auditCursor)

      if (changes.length === 0) {
        await writeConditionsCache(cachedRecord.data, conditionsUpdatedAt, cachedRecord.auditCursor)
        return
      }

      if (changes.length > DELTA_FALLBACK_CHANGE_COUNT) {
        await fetchAndCache()
        return
      }

      if (changes.some(c => c.table_name === 'specialties')) {
        await fetchAndCache()
        return
      }

      const conditionIds = new Set(changes.map(c => c.record_id))

      let nextConditions = [...cachedRecord.data]
      for (const id of conditionIds) {
        nextConditions = nextConditions.filter(c => c.id !== id)
        const fresh = await fetchConditionById(supabase, id)
        if (fresh) nextConditions.push(fresh)
      }

      const newCursor = changes[changes.length - 1].created_at
      setConditions(nextConditions)
      await writeConditionsCache(nextConditions, conditionsUpdatedAt, newCursor)
      // Image System Refinement Plan, Part A: a delta merge can add,
      // change, or remove gallery photos just like a full fetch — sync
      // and prune here too, fire-and-forget, same as fetchAndCache above.
      syncGalleryPhotos(nextConditions, attemptIdRef.current)
    } catch (err) {
      logCrash(err, 'useConditions.applyConditionsDelta')
      await fetchAndCache()
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

      // Silently check server version against cached version. Phase F14
      // Stage 3: routes through applyConditionsDelta instead of a full
      // fetchAndCache — see that function for the delta-merge logic and
      // its fallback rules.
      try {
        const { conditionsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (conditionsUpdatedAt !== cached.version) {
          await applyConditionsDelta(cached, conditionsUpdatedAt)
        } else {
          // 2026-09-02 fix (image-system review, Issue 2): previously,
          // when nothing about the conditions data itself had changed,
          // syncGalleryPhotos never ran at all this session — leaving
          // photosLoading stuck at its initial `true` forever (nothing
          // else ever resolves it), and — more importantly — meaning a
          // device with an already-valid conditions cache (e.g. one that
          // onboarded before offline photo caching existed) would never
          // actually get its gallery photos downloaded until something
          // unrelated forced a refresh. Running it here too is cheap: any
          // photo already saved is just a device-only check, no network
          // involved, so this reliably completes on every normal app
          // open instead of only on a real data refresh.
          syncGalleryPhotos(cached.data, attemptIdRef.current)
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

  return {
    conditions: conditionsDisplay,
    specialties,
    loading,
    error,
    photosLoading,
    photosProgress,
    refresh: fetchAndCache,
    start,
    retry,
  }
}
