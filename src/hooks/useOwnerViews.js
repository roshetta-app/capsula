/**
 * src/hooks/useOwnerViews.js
 * 2026-11-23 (step H4): for the owner's own roshetta page, drug group page and Profile tab. Asks the server
 * once when the page shows (and the item has a live link) and again when the connection comes back, and answers
 *
 *   views  null (not known, offline, failed, not signed in, or not asked for) | { total, last7 }
 *
 * kind is 'roshetta', 'group' or 'profile' (the profile total is summed over the person's own items; id is
 * ignored for it). enabled is false while the item has no link (nothing to count), so nothing is asked.
 *
 * Nothing is kept on the phone: the answer lives in this page's memory only and is asked again every time the
 * page opens. Not knowing shows nothing, never a zero.
 */

import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { fetchItemViews, fetchProfileViews } from '../utils/ownerViewsContent'

export function useOwnerViews(kind, id, enabled = true) {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()
  const userId = user?.id ?? null
  const key = `${kind}:${id ?? ''}:${userId ?? ''}`
  const [answer, setAnswer] = useState({ key: '', views: null })
  const needsId = kind !== 'profile'

  useEffect(() => {
    if (authLoading || !userId || !enabled || !isOnline || (needsId && !id)) return undefined
    let cancelled = false
    const request = kind === 'profile' ? fetchProfileViews() : fetchItemViews(kind, id)
    request.then((r) => {
      if (cancelled) return
      setAnswer({ key, views: r.status === 'ok' ? { total: r.total, last7: r.last7 } : null })
    })
    return () => { cancelled = true }
  }, [authLoading, userId, enabled, isOnline, kind, id, key, needsId])

  // An answer belongs to the item and person it was asked for; anything else (or a switched-off link) shows nothing.
  return userId && enabled && answer.key === key ? answer.views : null
}
