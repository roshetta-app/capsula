/**
 * src/components/ui/OfflineStatusToast.jsx
 * Phase 5 refinement (offline-banner-pro-refine session)
 *
 * Replaces OfflineBanner.jsx. Renders nothing — purely watches isOnline
 * and fires a single toast at the moment connectivity is actually lost
 * (the online-to-offline transition), instead of showing a persistent
 * pill for as long as isOnline stays false.
 *
 * Only fires on a live drop, never on cold-open-already-offline: the
 * 'previous' ref starts at the CURRENT isOnline value on mount, so if the
 * app opens already offline there is nothing to compare against and no
 * toast fires — decided this session: a Pro user in that case just
 * browses normally from cache, no message needed.
 *
 * Free users never see this at all — they are already covered by
 * AppGate.jsx's full-screen offline block, which is mutually exclusive
 * with normal browsing.
 *
 * Fixes carried over from the old OfflineBanner.jsx audit, all resolved
 * simply by routing through the app's existing toast system instead of a
 * bespoke component:
 *   - dark mode: toast styling already uses the shared color tokens
 *   - icon: toast's own built-in icon glyph, no hand-drawn svg
 *   - position/z-index collision with NotificationsBanner: toasts already
 *     share one coordinated stack, nothing else pinned to the same spot
 *   - persistence: toast auto-dismisses on its own timer and never
 *     survives navigation, since it's not tied to route/mount at all
 *
 * Usage — mounted once in layout.jsx, same position OfflineBanner was:
 *   import OfflineStatusToast from './ui/OfflineStatusToast'
 *   ...
 *   <OfflineStatusToast />
 */

import { useEffect, useRef } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useIsPro } from '../../hooks/useIsPro'
import { useToast } from '../../context/ToastContext'

export default function OfflineStatusToast() {
  const { isOnline } = useOnlineStatus()
  const isPro = useIsPro()
  const { toast } = useToast()

  const wasOnlineRef = useRef(isOnline)

  useEffect(() => {
    // Only Pro users get this reassurance — a free user going offline is
    // handled entirely by AppGate.jsx's full-screen block instead.
    if (isPro && wasOnlineRef.current && !isOnline) {
      toast.info('Offline — everything still works')
    }
    wasOnlineRef.current = isOnline
  }, [isOnline, isPro, toast])

  return null
}
