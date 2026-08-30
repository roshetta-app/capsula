import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchConditions, fetchMetadataTimestamps } from '../lib/queries'
import { readConditionsCache, writeConditionsCache } from '../utils/cache'
import { CACHE_TTL_MS } from '../constants/cache'

const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

/**
 * useConditions — cache-first conditions data hook.
 *
 * 2026-08-30 (conditions durable storage, plan §4.1/Phase 1, step 1.3):
 * moved off the small, size-limited localStorage slice system onto the
 * same durable IndexedDB storage the drugs library already uses — the same
 * failure that already hit drugs once (silently failing to save, causing
 * every app open to secretly re-download everything) is avoidable here by
 * doing it now, while the library is still small. This hook's init flow now
 * mirrors useDrugs.js's exactly, just with conditions' own cache functions.
 *
 * On mount:
 *   1. Read the saved copy from IndexedDB → show it immediately once ready
 *   2. Fetch app_metadata.conditions_updated_at from Supabase
 *   3. If timestamp differs OR cache is older than 7 days → re-fetch silently
 *   4. Cold start (no cache) → show loading, fetch, render, cache
 *
 * Exposes:
 *   conditions  — ConditionFull[] (Uncategorized specialty label stripped)
 *   specialties — Specialty[]  (unique, sorted by admin sort_order, Uncategorized excluded)
 *   loading     — true only on cold start
 *   error       — string | null
 *   refresh     — () => void  (force re-fetch, e.g. after CMS save)
 */
export function useConditions() {
  const [conditions, setConditions] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Fetch fresh data from DB, update state, write cache.
  // Fetches metadata FIRST so the version we store matches what triggered the fetch.
  async function fetchAndCache() {
    try {
      const [fresh, { conditionsUpdatedAt }] = await Promise.all([
        fetchConditions(supabase),
        fetchMetadataTimestamps(supabase),
      ])
      setConditions(fresh)
      await writeConditionsCache(fresh, conditionsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load conditions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      const cached = await readConditionsCache()

      // Cold start — nothing saved yet
      if (!cached) {
        await fetchAndCache()
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

  return { conditions: conditionsDisplay, specialties, loading, error, refresh: fetchAndCache }
}
