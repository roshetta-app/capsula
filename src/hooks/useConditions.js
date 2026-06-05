import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchConditions, fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache } from '../utils/cache'

/**
 * useConditions — cache-first conditions data hook.
 *
 * Same cache-first pattern as useDrugs.
 *
 * Exposes:
 *   conditions  — ConditionFull[]
 *   specialties — Specialty[]  (unique, sorted by name, derived from conditions)
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

      if (!cachedTs) {
        await fetchAndCache()
        return
      }

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
  }, [])

  // Derive unique specialties from conditions — stable reference via useMemo
  const specialties = useMemo(() => {
    const seen = new Map()
    for (const c of conditions) {
      if (c.specialtyId && !seen.has(c.specialtyId)) {
        seen.set(c.specialtyId, {
          id:   c.specialtyId,
          name: c.specialtyName,
          slug: c.specialtySlug,
        })
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [conditions])

  return { conditions, specialties, loading, error, refresh: fetchAndCache }
}
