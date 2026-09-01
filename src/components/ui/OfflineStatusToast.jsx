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
 * Cooldown (this session): a flaky connection can drop and reconnect
 * several times within a couple of minutes. Without a cooldown, every
 * single drop would fire its own toast — recreating the same spammy,
 * intrusive feeling this component was built to replace. COOLDOWN_MS
 * below suppresses a repeat toast if the last one fired more recently
 * than that, even across multiple real drops. The very first drop in a
 * session always shows, since lastShownRef starts empty.
 *
 * "Back online" confirmation (this session): fires once reconnected, but
 * ONLY if the matching offline toast actually showed — paired 1:1 via
 * offlineToastShownRef, not an independent watcher. If a drop was
 * suppressed by the cooldown above, its recovery is silent too, so
 * "back online" never appears without a preceding "offline" message the
 * person actually saw. Not subject to its own cooldown — it fires the
 * instant reconnection happens, since it can only ever fire once per
 * shown offline toast anyway.
 *
 * 2026-09-01 (cooldown-survives-reload fix): the cooldown timestamp and
 * the "did the offline message actually show" pairing used to live only
 * in refs, reset to empty on every mount. That meant a reload or app
 * relaunch during a rough patch of signal forgot both — the 60s cooldown
 * above and the offline/back-online pairing — so someone reloading a few
 * times while signal was bad could see more "Offline" messages than the
 * cooldown was ever meant to allow, and could in rare cases see a stray
 * "Back online" with no matching message shown that session (or the
 * reverse: an owed "Back online" never arriving because the pairing flag
 * was lost). Both values now persist to localStorage (same fail-silently
 * pattern already used in utils/cache.js) and are read back on mount, so
 * they survive a reload/relaunch exactly as if the app had stayed open.
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

// Minimum time between repeat toasts on a flaky connection that drops and
// reconnects several times in a row. Tunable — no exact number specified
// by product, 60s chosen as a reasonable "don't be spammy" default.
const COOLDOWN_MS = 60000

// localStorage keys for the two small values that need to survive a
// reload/relaunch (2026-09-01 fix, see file header). Same naming
// convention and fail-silently-on-unavailable pattern as utils/cache.js.
const LAST_SHOWN_KEY = 'capsula_offline_toast_last_shown_at'
const PENDING_KEY    = 'capsula_offline_toast_pending'

function readPersistedLastShown() {
  try {
    const raw = localStorage.getItem(LAST_SHOWN_KEY)
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    // localStorage unavailable — behave as if nothing was ever shown
    return 0
  }
}

function writePersistedLastShown(timestamp) {
  try {
    localStorage.setItem(LAST_SHOWN_KEY, String(timestamp))
  } catch {
    // localStorage full or unavailable — fail silently, same as
    // utils/cache.js does for its own writes
  }
}

function readPersistedPending() {
  try {
    return localStorage.getItem(PENDING_KEY) === 'true'
  } catch {
    return false
  }
}

function writePersistedPending(pending) {
  try {
    localStorage.setItem(PENDING_KEY, pending ? 'true' : 'false')
  } catch {
    // fail silently
  }
}

export default function OfflineStatusToast() {
  const { isOnline } = useOnlineStatus()
  const isPro = useIsPro()
  const { toast } = useToast()

  const wasOnlineRef = useRef(isOnline)

  // Lazily seeded from localStorage on first render only (2026-09-01
  // fix) — `undefined` is the "not yet read" sentinel, since 0/false are
  // both valid persisted values and can't be used as the sentinel
  // themselves.
  const lastShownRef = useRef(undefined)
  if (lastShownRef.current === undefined) lastShownRef.current = readPersistedLastShown()

  const offlineToastShownRef = useRef(undefined)
  if (offlineToastShownRef.current === undefined) offlineToastShownRef.current = readPersistedPending()

  useEffect(() => {
    const wasOnline = wasOnlineRef.current

    if (isPro) {
      if (wasOnline && !isOnline) {
        // Going offline — only Pro users get this reassurance; a free
        // user going offline is handled entirely by AppGate.jsx's
        // full-screen block instead.
        const now = Date.now()
        if (now - lastShownRef.current >= COOLDOWN_MS) {
          toast.info('Offline — everything still works')
          lastShownRef.current = now
          offlineToastShownRef.current = true
          writePersistedLastShown(now)
          writePersistedPending(true)
        }
      } else if (!wasOnline && isOnline && offlineToastShownRef.current) {
        // Coming back online — only confirm if the drop that caused this
        // was actually announced (not cooldown-suppressed), whether that
        // announcement happened this session or a prior one before a
        // reload (2026-09-01 fix).
        toast.success('Back online')
        offlineToastShownRef.current = false
        writePersistedPending(false)
      }
    }

    wasOnlineRef.current = isOnline
  }, [isOnline, isPro, toast])

  return null
}
