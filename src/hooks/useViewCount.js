/**
 * src/hooks/useViewCount.js
 * 2026-11-22 (step H3): for the shared roshetta page and the shared group page. When `enabled` (the page is
 * really showing and the person is not its owner), counts one unique view after the page has been visible
 * for about 2 seconds. Returns nothing; never changes what the page shows. See viewCount.js.
 */

import { useEffect } from 'react'
import { startViewCount } from '../utils/viewCountContent'

export function useViewCount(kind, code, enabled) {
  useEffect(() => {
    if (!enabled || !code) return undefined
    return startViewCount(kind, code)
  }, [kind, code, enabled])
}
