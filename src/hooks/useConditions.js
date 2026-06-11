import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchConditions, fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache, isCacheExpired } from '../utils/cache'

const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

/**
 * useConditions — cache-first conditions data hook.
 *
 * On mount:
 *   1. Read cache synchronously → render immediately (zero delay)
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
  const cached = getCacheData('conditions')

  const [conditions, setConditions] = useState(cached ?? [])
  const [loading,    setLoading]    = useState(!cached)
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
      writeCache('conditions', fresh, conditionsUpdatedAt)
    } catch (err) {
      setError(err.message ?? 'Failed to load conditions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      const cachedTs = getCacheTimestamp('conditions')

      // Cold start — no cache at all
      if (!cachedTs) {
        await fetchAndCache()
        return
      }

      // TTL expired (>7 days) — re-fetch regardless of version
      if (isCacheExpired('conditions')) {
        await fetchAndCache()
        return
      }

      // Silently check server version against cached version
      try {
        const { conditionsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (conditionsUpdatedAt !== cachedTs) {
          await fetchAndCache()
        } else {
          // Cache is fresh — ensure loading is false
          setLoading(false)
        }
      } catch {
        // Network error — keep cached data, don't crash
        setLoading(false)
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
          id:        c.specialtyId,
          name:      c.specialtyName,
          slug:      c.specialtySlug,
          iconName:  c.specialtyIcon,
          colorHex:  c.specialtyColor,
          sortOrder: c.specialtySortOrder,
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
