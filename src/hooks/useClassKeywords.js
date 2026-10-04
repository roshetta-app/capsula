import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchClassKeywords, fetchMetadataTimestamps } from '../lib/queries'
import { getCacheData, getCacheTimestamp, writeCache, isCacheExpired } from '../utils/cache'

/**
 * useClassKeywords — cache-first hook for the Class search keywords.
 * Same shape as useCategories.js (the saved copy is read first, so Class
 * search keeps working offline).
 *
 * Returns the active keywords: [{ id, keyword, targets: [{ class, subclass }] }].
 * Phase B of the class-keywords plan (CLASS_SEARCH_MODE_PLAN.md section 8):
 * this only loads and saves the list. Nothing searches with it yet.
 *
 * Watches app_metadata.drugs_updated_at, the same stamp useDrugs and
 * useCategories watch. Keyword edits in the CMS bump that stamp (phase E), so
 * no new column is needed.
 *
 * On mount:
 *   1. Read the saved copy synchronously -> available immediately
 *   2. If there is no saved copy, or it is older than 7 days -> fetch
 *   3. Otherwise quietly compare the server stamp; fetch only if it moved
 *   4. Any failure is silent: the saved copy (or an empty list) stays in use,
 *      because keywords are an extra on top of name search, never required.
 *
 * Note: an empty list is never saved (writeCache's rule), so a device with no
 * keywords asks the server on each app start. That is one tiny request.
 */
export function useClassKeywords() {
  const cached = getCacheData('classKeywords')
  const [classKeywords, setClassKeywords] = useState(cached ?? [])

  async function fetchAndCache() {
    try {
      const [fresh, { drugsUpdatedAt }] = await Promise.all([
        fetchClassKeywords(supabase),
        fetchMetadataTimestamps(supabase),
      ])
      setClassKeywords(fresh)
      writeCache('classKeywords', fresh, drugsUpdatedAt)
    } catch {
      // Silent on purpose — keep whatever is already showing.
    }
  }

  useEffect(() => {
    async function init() {
      const cachedTs = getCacheTimestamp('classKeywords')

      // No saved copy yet, or it was never written (empty list)
      if (!cachedTs || !cached) {
        await fetchAndCache()
        return
      }

      // Saved copy too old — re-fetch even if the stamp matches
      if (isCacheExpired('classKeywords')) {
        await fetchAndCache()
        return
      }

      // Quietly check whether the server moved on
      try {
        const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
        if (drugsUpdatedAt !== cachedTs) {
          await fetchAndCache()
        }
      } catch {
        // Offline — keep the saved copy.
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { classKeywords, refreshClassKeywords: fetchAndCache }
}
