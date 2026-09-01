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
 *
 * 2026-09-01 (weak-connection false-positive fix): a single failed
 * reachability check used to be enough to declare the whole app offline —
 * one slow response past REACHABILITY_TIMEOUT_MS (e.g. a weak hospital
 * Wi-Fi signal, or the burst of requests right after signing in
 * momentarily crowding out this lightweight check) flipped isOnline to
 * false immediately, which then flowed straight into AppGate's offline
 * block and the Pro "offline" toast with no confirmation step. That's
 * what produced the reported spam: the check would fail, recover on the
 * very next poll, fail again a few seconds of bad signal later, and so
 * on — each flip toggling the block/toast on and off.
 *
 * Fixed with a standard, asymmetric confirm pattern: it now takes
 * OFFLINE_CONFIRM_THRESHOLD (2) failed checks IN A ROW before isOnline is
 * ever set to false — a single blip is no longer trusted on its own.
 * After a first failure, instead of waiting the full RECHECK_INTERVAL_MS
 * to find out if it was real, one quick follow-up check runs sooner
 * (CONFIRM_RETRY_DELAY_MS) to confirm or clear it — so a genuine drop is
 * still caught quickly, it just isn't acted on off a single sample.
 * Recovery stays intentionally asymmetric: the very first successful
 * check clears the failure count and reports online immediately, so a
 * Pro user's access (and the "back online" toast) resumes the moment the
 * connection is actually usable again, matching plan §2.3's intent.
 *
 * 2026-09-01 (hard-vs-ambiguous offline signal): isOnline alone can't
 * tell a consumer WHY it's false — a device with no network interface at
 * all (wifi/data fully off) and a device that's technically connected but
 * failing the reachability check both collapse into the same isOnline:
 * false. AppGate.jsx's offline-block grace period needs to tell these
 * apart (a hard "no interface at all" signal should never wait — there's
 * nothing ambiguous to give the benefit of the doubt to), so this now
 * also exposes hasNetworkInterface: a live mirror of the device's own
 * online/offline events, independent of the reachability check above.
 * isOnline's own behavior (and every existing consumer of it) is
 * completely unchanged — this is an additional field, not a replacement.
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

// How many failed checks in a row are required before isOnline actually
// flips to false (2026-09-01 weak-connection fix — see file header). One
// slow/weak-signal blip is no longer enough on its own.
const OFFLINE_CONFIRM_THRESHOLD = 2

// After an unconfirmed failure, how soon the follow-up check runs — sooner
// than RECHECK_INTERVAL_MS, so a genuine drop is still confirmed quickly
// instead of leaving isOnline stale (and possibly wrong) for up to 10s.
const CONFIRM_RETRY_DELAY_MS = 3000

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

  // Live mirror of the device's own online/offline events (2026-09-01
  // fix, see file header) — independent of the reachability check below.
  // true whenever the device reports a network interface at all, false
  // only on a hard 'offline' event (no interface). This is a genuinely
  // different question from isOnline: isOnline also requires that
  // interface to actually reach the server.
  const [hasNetworkInterface, setHasNetworkInterface] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Guards against a slow/stale reachability check overwriting a newer
  // one's result once it finally resolves — same attempt-id pattern
  // already used in useDrugs.js / useConditions.js for stale background
  // responses.
  const attemptIdRef = useRef(0)
  const pollTimerRef = useRef(null)

  // How many reachability checks have failed in a row since the last
  // success (2026-09-01 weak-connection fix). Reset to 0 on any success.
  const consecutiveFailuresRef = useRef(0)
  // Holds the quick follow-up check scheduled after an unconfirmed
  // failure, so it can be cleared if a newer check supersedes it.
  const confirmRetryTimerRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (confirmRetryTimerRef.current) {
      clearTimeout(confirmRetryTimerRef.current)
      confirmRetryTimerRef.current = null
    }
  }, [])

  // Confirms real reachability and updates isOnline accordingly. Keeps the
  // continuous recheck (RECHECK_INTERVAL_MS) running afterward either way —
  // online or offline — so a connection going quietly bad, or quietly
  // recovering, is always caught within one interval instead of only ever
  // being noticed via the device's own online/offline events (2026-09-01
  // fix, see file header).
  //
  // A failure only ever flips isOnline to false once it's been confirmed
  // OFFLINE_CONFIRM_THRESHOLD times in a row (2026-09-01 weak-connection
  // fix, see file header) — a single failed check instead schedules one
  // quick follow-up via CONFIRM_RETRY_DELAY_MS rather than acting
  // immediately or waiting out the full recheck interval.
  const checkReachable = useCallback(async () => {
    const myAttempt = ++attemptIdRef.current
    const reachable = await withTimeout(fetchMetadataTimestamps(supabase), REACHABILITY_TIMEOUT_MS)
    if (attemptIdRef.current !== myAttempt) return // a newer check has taken over

    if (confirmRetryTimerRef.current) {
      clearTimeout(confirmRetryTimerRef.current)
      confirmRetryTimerRef.current = null
    }

    if (reachable) {
      consecutiveFailuresRef.current = 0
      setIsOnline(true)
    } else {
      consecutiveFailuresRef.current += 1
      if (consecutiveFailuresRef.current >= OFFLINE_CONFIRM_THRESHOLD) {
        setIsOnline(false)
      } else {
        // Not confirmed yet — don't touch isOnline off a single sample.
        // Check again sooner than the normal poll cadence would, so a
        // real drop still gets caught quickly.
        confirmRetryTimerRef.current = setTimeout(checkReachable, CONFIRM_RETRY_DELAY_MS)
      }
    }

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
      // running (it's stopped by handleOffline below). hasNetworkInterface
      // itself is trusted immediately, unlike isOnline — it's just
      // reporting the interface exists, not that it can reach anything.
      setHasNetworkInterface(true)
      checkReachable()
    }

    function handleOffline() {
      // No network interface at all — trust this signal outright for
      // both isOnline and hasNetworkInterface immediately. No confirmation
      // threshold here — an interface-level "offline" event is a hard
      // signal, not a slow/weak-signal guess.
      //
      // Fix (offline-gate-stuck, 2026-09-01): this used to also call
      // stopPolling(), betting entirely on the browser's own 'online'
      // event to ever check again — but that event isn't always reliable
      // in practice (a real wifi/data toggle can come back without the
      // event firing, or firing later than the connection actually
      // recovers), which left isOnline stuck false indefinitely with
      // nothing left to notice the recovery. Per plan §Phase 2.3 ("re-run
      // the real check periodically while it's reporting offline, so
      // access resumes promptly"), the recheck loop now keeps running
      // through a hard offline too — checkReachable()'s own guard below
      // starts it if it isn't already running, so recovery is caught
      // within one RECHECK_INTERVAL_MS regardless of whether 'online'
      // ever fires. A pending confirm-retry is still cleared, since
      // there's nothing ambiguous left to confirm once a hard offline
      // signal has already arrived.
      attemptIdRef.current++ // invalidate any reachability check still in flight
      consecutiveFailuresRef.current = 0
      if (confirmRetryTimerRef.current) {
        clearTimeout(confirmRetryTimerRef.current)
        confirmRetryTimerRef.current = null
      }
      setHasNetworkInterface(false)
      setIsOnline(false)
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(checkReachable, RECHECK_INTERVAL_MS)
      }
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

  const value = { isOnline, hasNetworkInterface }
  return <OnlineStatusCtx.Provider value={value}>{children}</OnlineStatusCtx.Provider>
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusCtx)
  if (!ctx) throw new Error('useOnlineStatus must be used inside <OnlineStatusProvider>')
  return ctx
}
