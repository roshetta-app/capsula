/**
 * src/hooks/useHiddenNotice.js
 * 2026-11-22 (step 14.9b-2): for the owner's own roshetta page, drug group page and Profile tab. Asks the
 * server (my_flags) once when the page shows and again when the connection comes back, and answers:
 *
 *   notice   null (nothing hidden, or not known) | { state, title, body, canAsk }  (see hiddenRules.js)
 *   ask      () => Promise<void>   asks for the one review; the notice flips to "Review requested"
 *   busy     true while the request is going
 *   message  one short line to show under the notice after a try that did not work ('' otherwise)
 *
 * Nothing is kept on the phone: the answer lives in this page's memory only, and is asked again every time
 * the page opens. Offline or a failed read simply shows no notice (not knowing is not "hidden").
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { loadFlags, requestReview } from '../utils/hiddenContent'
import { findFlag, noticeFor, reviewResultText } from '../utils/hiddenRules'

export function useHiddenNotice(kind, id) {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()
  const userId = user?.id ?? null
  const [flags, setFlags] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (authLoading || !userId || !id || !isOnline) return undefined
    let cancelled = false
    loadFlags().then((r) => { if (!cancelled && r.status === 'ok') setFlags(r.flags) })
    return () => { cancelled = true }
  }, [authLoading, userId, id, isOnline])

  const ask = useCallback(async () => {
    if (busy || !id) return
    setBusy(true)
    setMessage('')
    const r = await requestReview(kind, id)
    if (r.status === 'ok' || r.status === 'unavailable') {
      // One appeal only: from here the notice reads "Review requested".
      setFlags((prev) => (prev ?? []).map(f => (f.kind === kind && f.id === id ? { ...f, appealUsed: true } : f)))
    }
    setMessage(r.status === 'ok' ? '' : reviewResultText(r.status))
    setBusy(false)
  }, [busy, kind, id])

  const notice = userId && id ? noticeFor(kind, findFlag(flags, kind, id)) : null
  return { notice, ask, busy, message }
}
