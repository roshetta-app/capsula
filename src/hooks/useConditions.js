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
 *   specialties — Specialty[]  (unique, sorted by name, Uncategorized excluded)
 *   loading     — true only on cold start
 *   error       — string | null
 *   refresh     — () => void
 */
export function useConditions() {
  const cached = getCacheData('conditions')

  const [conditions, setConditions] = useState(cached ?? [])
  const [loading,    setLoading]    = useState(!cached)
  const [error,      setError]      = useState(null)

  async function fetchAndCache() {
    try {
      const fresh = await fetchConditions(supabase)
      const { conditionsUpdatedAt } = await fetchMetadataTimestamps(supabase)
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

      // Cold start
      if (!cachedTs) {
        await fetchAndCache()
        return
      }

      // TTL expired
      if (isCacheExpired('conditions')) {
        await fetchAndCache()
        return
      }

      // Silently check server version
      try {
        const { conditionsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (conditionsUpdatedAt !== cachedTs) {
          await fetchAndCache()
        }
      } catch {
        // Keep cached data on network error
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []  )

  // FIX 1: Exclude Uncategorized from the pills — derived from conditions, sorted by name
  const specialties = useMemo(() => {
    const seen = new Map()
    for (const c of conditions) {
      if (c.specialtyId && c.specialtyId !== UNCATEGORIZED_ID && !seen.has(c.specialtyId)) {
        seen.set(c.specialtyId, {
          id:       c.specialtyId,
          name:     c.specialtyName,
          slug:     c.specialtySlug,
          iconName: c.specialtyIcon,
          colorHex: c.specialtyColor,
        })
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [conditions])

  // FIX 2: Strip Uncategorized specialty label from conditions so cards show no tag
  const conditionsDisplay = useMemo(() =>
    conditions.map(c =>
      c.specialtyId === UNCATEGORIZED_ID
        ? { ...c, specialtyId: null, specialtyName: null, specialtySlug: null }
        : c
    ),
  [conditions])

  return { conditions: conditionsDisplay, specialties, loading, error, refresh: fetchAndCache }
}
