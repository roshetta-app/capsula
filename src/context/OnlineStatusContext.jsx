/**
 * src/context/OnlineStatusContext.jsx
 * Phase 2K — PWA & Offline Infrastructure
 * Phase 2 update (plan: CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md, §4.4 / §Phase 2)
 *
 * Shared-Context fix (Pro-offline-lift bug) — this used to be a plain hook
 * (useOnlineStatus.js), called directly and independently by both
 * OfflineBanner.jsx and AppGate.jsx. Each mounted copy ran its OWN
 * reachability check, its own 5s timeout, and its own 15s poll timer, with
 * zero coordination between them — so the banner and the offline block
 * could each decide "we're back online" at a different moment, making the
 * block's own lift look inconsistent (sometimes instant, sometimes stuck
 * until its own independent poll cycle happened to land). This is the same
 * bug class AuthContext.jsx already hit and fixed the same way (see that
 * file's header) — one shared check, reused, instead of a separate copy of
 * the same check per consumer.
 *
 * Same shape as AuthContext/FavouritesContext/PushSubscriptionContext:
 * create the context, a Provider that runs the check once, and a consumer
 * hook that throws if used outside the Provider.
 *
 * src/hooks/useOnlineStatus.js now just re-exports useOnlineStatus from
 * here — every existing call site (OfflineBanner.jsx, AppGate.jsx) keeps
 * working completely unchanged, still reading { isOnline }.
 *
 * Listens to window online/offline events AND confirms real reachability —
 * a device can report navigator.onLine === true on a weak or technically-
 * connected-but-dead network, and that false positive used to be trusted
 * outright. Now, whenever the device claims to be online, that claim is
 * verified with a real (but cheap, short-timeout) request before isOnline
 * is ever reported true.
 *
 * Reuses the same lightweight app_metadata timestamp query already used
 * elsewhere for cache-freshness checks (fetchMetadataTimestamps) — not a
 * new, heavier call — wrapped with a short client-side timeout since that
 * function itself has no abort/timeout support.
 *
 * This is the one place anything in the app should go to ask "are we
 * really online" (plan §2.4).
 *
 * SSR-safe: defaults to true (navigator may be undefined in non-browser envs).
 *
 * 2026-09-01 (onboarding-offline-retry fix): the reachability recheck used
 * to only run on a timer AFTER already deciding the connection was down —
 * while isOnline was true, nothing ever re-verified it again until the
 * device's own 'offline' event fired, which never fires for a connection
 * that goes quietly bad (Wi-Fi/data still shows connected, nothing
 * actually gets through). That gap is what made offline detection feel
 * slow everywhere that reads isOnline, onboarding included: nothing was
 * watching for a mid-download connection loss at all, so the only thing
 * that ever caught it was a download stalling for its own, much longer,
 * timeout elsewhere. Fixed by making the recheck run continuously, every
 * RECHECK_INTERVAL_MS, regardless of whether the last check reported
 * online or offline.
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMetadataTimestamps } from '../lib/queries'

// "Short timeout" per plan §2.1 — no exact number specified there, so
// defaulting to a 5s reachability timeout for each individual check.
const REACHABILITY_TIMEOUT_MS = 5000

// How often the real reachability check re-runs, continuously, regardless
// of whether the last result was online or offline (2026-09-01 fix — see
// file header). Catches a connection that goes quietly dead within one
// interval, and — while already offline — is also what lets a Pro user's
// access, and onboarding's auto-retry, resume promptly once the connection
// is actually usable again.
const RECHECK_INTERVAL_MS = 10000

// Resolves true/false, never rejects — a network error and a timeout both
// just mean "not reachable right now."
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms)
    promise
      .then(() => { clearTimeout(timer); resolve(true) })
      .catch(() => { clearTimeout(timer); resolve(false) })
  })
}

const OnlineStatusCtx = createContext(null)

export function OnlineStatusProvider({ children }) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Guards against a slow/stale reachability check overwriting a newer
  // one's result once it finally resolves — same attempt-id pattern
  // already used in useDrugs.js / useConditions.js for stale background
  // responses.
  const attemptIdRef = useRef(0)
  const pollTimerRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Confirms real reachability and updates isOnline accordingly. Keeps the
  // continuous recheck (RECHECK_INTERVAL_MS) running afterward either way —
  // online or offline — so a connection going quietly bad, or quietly
  // recovering, is always caught within one interval instead of only ever
  // being noticed via the device's own online/offline events (2026-09-01
  // fix, see file header).
  const checkReachable = useCallback(async () => {
    const myAttempt = ++attemptIdRef.current
    const reachable = await withTimeout(fetchMetadataTimestamps(supabase), REACHABILITY_TIMEOUT_MS)
    if (attemptIdRef.current !== myAttempt) return // a newer check has taken over

    setIsOnline(reachable)

    if (!pollTimerRef.current) {
      pollTimerRef.current = setInterval(checkReachable, RECHECK_INTERVAL_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleOnline() {
      // Device says it's connected again — confirm it before trusting it
      // (§4.4), rather than flipping isOnline true on the device's word
      // alone. Also restarts the continuous recheck if it isn't already
      // running (it's stopped by handleOffline below).
      checkReachable()
    }

    function handleOffline() {
      // No network interface at all — trust this signal outright, and
      // stop the continuous recheck too: with no connection at any level,
      // there's nothing to usefully re-check until the browser reports
      // 'online' again (handleOnline above restarts it).
      attemptIdRef.current++ // invalidate any reachability check still in flight
      stopPolling()
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check on mount — don't trust navigator.onLine's word alone
    // even at startup; confirm reachability before ever reporting online.
    // Runs exactly once for the whole app now (Provider mounts once in
    // App.jsx), not once per component that reads isOnline.
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      checkReachable()
    } else {
      setIsOnline(false)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = { isOnline }
  return <OnlineStatusCtx.Provider value={value}>{children}</OnlineStatusCtx.Provider>
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusCtx)
  if (!ctx) throw new Error('useOnlineStatus must be used inside <OnlineStatusProvider>')
  return ctx
}
