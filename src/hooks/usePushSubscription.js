/**
 * src/hooks/usePushSubscription.js
 * Phase 3K — Push Notification Subscription
 *
 * Stage 2 (F4 notification rebuild) — this now registers through Firebase
 * Cloud Messaging (FCM) via @capacitor-firebase/messaging instead of raw
 * Web Push, and saves the resulting token to Supabase's push_tokens table
 * (replacing the old push_subscriptions table, removed in Stage 5).
 *
 * Reuses the app's existing service worker (public/sw.js, registered in
 * main.jsx) instead of installing a separate firebase-messaging-sw.js —
 * avoids two competing service workers on the same origin.
 *
 * push_tokens.user_id is nullable (D21): a signed-out visitor can still
 * enable notifications, and the row gets "claimed" for their account the
 * next time subscribeToPush() runs while signed in — no delete+reinsert
 * needed.
 *
 * Call subscribeToPush() once (e.g. on first app load or from a settings
 * screen). Safe to call multiple times — checks for an existing token row
 * first. Returns true on real success, false on any failure — callers
 * (e.g. NotificationsBanner) should only treat this as "done" when it
 * resolves true, not just when it resolves at all.
 *
 * Stage 2 follow-up (2026-08-11) — notification bell/status sheet
 * (NotificationSheet.jsx): three additions to support it.
 *   1. `permission` is now exposed directly, reading the real browser
 *      Notification.permission rather than each caller duplicating that
 *      check (previously only NotificationsBanner did this itself).
 *   2. If permission is already 'granted' on mount, silently re-verifies
 *      the real subscribed state by re-fetching the device's token and
 *      checking it against push_tokens on the server — fixes the
 *      "already subscribed" flaw found in the F4 banner audit, where the
 *      old subscribed flag only ever lived in-session and was never
 *      re-checked against anything real. Never triggers the browser's
 *      permission prompt — only runs when permission is already granted.
 *   3. unsubscribeFromPush() — did not exist before. Deletes the FCM
 *      token via FirebaseMessaging.deleteToken() and removes the matching
 *      row from push_tokens. No soft-delete/active flag — nothing else
 *      references push_tokens rows for history, so a hard delete is the
 *      simplest correct option.
 *
 * Stage 2 follow-up (2026-08-11, same day) — `checking` added. Every
 * fresh instance of this hook (e.g. NotificationSheet.jsx re-mounting
 * each time it opens) previously started `subscribed` at false and only
 * corrected itself once the mount-time re-verification above finished —
 * a real device that was already subscribed would briefly render as "not
 * subscribed" until that async check resolved. Two visible symptoms came
 * from this single cause: the sheet flashing the wrong (off) state on
 * open, and — because a fresh sheet instance's re-check hadn't finished
 * settling yet — a tap on "Allow" firing subscribeToPush() again while
 * the real state was still resolving, coming back as a race/failure.
 * `checking` is true from mount and only flips false once the real state
 * is known for certain (unsupported, permission not granted, or the
 * granted-and-verified check has finished — success or error). Callers
 * should treat `checking === true` as "don't know yet" and avoid showing
 * or acting on `subscribed` until it's false.
 *
 * Fix (2026-08-11, notif-sync-and-race-fix) — the old save was two
 * separate steps ("does a row for this token already exist?" then
 * "insert or update"), with a real gap between them where two saves for
 * the same token at once could both read "doesn't exist yet" and both
 * try to insert, or a claim and a re-save could cross and one silently
 * undo the other. Replaced with a single call to the database's
 * claim_push_token(token, platform, user_id) function, which does the
 * check-and-save as one atomic step. Same "never un-claim a token for a
 * signed-out call" protection as before — that now lives inside the
 * database function instead of being re-derived here on every call.
 *
 * Stage 4 (F6) bug fix, 2026-08-13 (native FCM verification) — this hook
 * was only ever built and tested against the web path. The "is this
 * supported" check (`serviceWorker`/`PushManager`/`Notification` in
 * window) uses browser-only APIs that don't exist inside the native app's
 * WebView at all, so on-device it always resolved to `supported: false` —
 * this is what produced the "Notifications aren't supported on this
 * device" message seen during Stage 4 testing, well before the flow ever
 * got a chance to request permission or fetch a token. Same fix pattern
 * useAuth.js already uses for Google sign-in: branch on
 * `Capacitor.isNativePlatform()`. Native's permission check/request goes
 * through the FCM plugin's own `checkPermissions()`/`requestPermissions()`
 * (OS-level notification permission, not the browser's), and native's
 * `getToken()` needs neither a `vapidKey` nor a service worker — both are
 * web-only concepts. Also fixed alongside: `p_platform` sent to
 * `claim_push_token` was hardcoded to `'web'` regardless of the real
 * device, so every saved token — including ones that would have come from
 * a native device once this fix landed — was being mislabeled. Now uses
 * `Capacitor.getPlatform()` ('android' | 'ios' | 'web').
 */

import { useState, useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../lib/supabase'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize the Firebase app once at module load. Guarded with getApps()
// so this stays safe if the module is ever evaluated twice (e.g. Vite HMR
// during development) — initializeApp() throws on a second call otherwise.
if (!getApps().length) {
  initializeApp(firebaseConfig)
}

const FCM_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY

// Wraps a promise so it fails with a clear error instead of hanging forever
// if something (e.g. a service worker that failed to register) never
// resolves — see the 503-on-deploy case documented in index.html. Web
// path only — native's getToken() has no equivalent "waiting on a service
// worker" step to hang on.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), ms)
    ),
  ])
}

export function usePushSubscription() {
  const [supported,  setSupported]  = useState(false)
  const [permission, setPermission] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [token,      setToken]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  // True until the real subscribed state is known for certain. Starts true
  // on every fresh instance of this hook — see file header note above.
  const [checking,   setChecking]   = useState(true)

  useEffect(() => {
    let cancelled = false

    if (Capacitor.isNativePlatform()) {
      // Native always "supports" push via the FCM plugin — the
      // serviceWorker/PushManager/Notification browser checks below don't
      // apply here at all. Permission state comes from the plugin's own
      // OS-level check, not the browser Notification API.
      setSupported(true)
      FirebaseMessaging.checkPermissions().then(({ receive }) => {
        if (!cancelled) setPermission(receive)
      })
      return () => { cancelled = true }
    }

    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(isSupported)
    if (isSupported) {
      setPermission(Notification.permission)
    } else {
      // Nothing left to check — the re-verify effect below never runs
      // when unsupported, so this is the only place that can resolve
      // `checking` for that case.
      setChecking(false)
    }
  }, [])

  // Reads or re-fetches the device's current FCM token without prompting —
  // shared by the mount-time re-verify effect below and unsubscribeFromPush
  // (which needs to know the token even if this hook instance never called
  // subscribeToPush() itself, e.g. opened fresh from the bell sheet).
  async function getCurrentToken() {
    if (Capacitor.isNativePlatform()) {
      const { token: fetchedToken } = await FirebaseMessaging.getToken()
      return fetchedToken
    }

    const registration = await withTimeout(
      navigator.serviceWorker.ready,
      10000,
      'the notification service to be ready'
    )
    const { token: fetchedToken } = await FirebaseMessaging.getToken({
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    return fetchedToken
  }

  async function subscribeToPush() {
    if (!supported) return false
    setLoading(true)
    setError(null)
    try {
      let permissionGranted

      if (Capacitor.isNativePlatform()) {
        const { receive } = await FirebaseMessaging.requestPermissions()
        setPermission(receive)
        permissionGranted = receive === 'granted'
      } else {
        const permissionResult = await Notification.requestPermission()
        setPermission(permissionResult)
        permissionGranted = permissionResult === 'granted'
      }

      if (!permissionGranted) {
        setError('Notification permission denied')
        return false
      }

      const fetchedToken = await getCurrentToken()

      if (!fetchedToken) {
        setError('Could not get a notification token')
        return false
      }

      const { data: { user } } = await supabase.auth.getUser()

      // Single atomic database call — replaces the old check-then-save
      // (select for an existing row, then insert or update), which had a
      // real gap between the check and the write. claim_push_token does
      // the check-and-save as one step and keeps the same "never un-claim
      // a token on a signed-out call" protection as before.
      const { error: dbErr } = await supabase.rpc('claim_push_token', {
        p_token: fetchedToken,
        p_platform: Capacitor.getPlatform(), // 'android' | 'ios' | 'web'
        p_user_id: user?.id ?? null,
      })
      if (dbErr) throw dbErr

      setToken(fetchedToken)
      setSubscribed(true)
      return true
    } catch (e) {
      setError(e.message ?? 'Failed to subscribe')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribeFromPush() {
    if (!supported) return false
    setLoading(true)
    setError(null)
    try {
      // No token cached on this hook instance (e.g. sheet opened fresh,
      // never called subscribeToPush itself this session) — fetch the
      // device's current one. Safe without prompting: only reachable from
      // the UI when permission is already 'granted'.
      const currentToken = token ?? await getCurrentToken()

      if (currentToken) {
        await FirebaseMessaging.deleteToken()
        const { error: dbErr } = await supabase
          .from('push_tokens')
          .delete()
          .eq('token', currentToken)
        if (dbErr) throw dbErr
      }

      setToken(null)
      setSubscribed(false)
      return true
    } catch (e) {
      setError(e.message ?? 'Failed to disable notifications')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Silent re-verification: if permission is already granted, don't trust
  // any in-memory/session flag for "subscribed" — check the real token
  // against the server. Runs once permission is known to be 'granted'.
  // Never prompts (requestPermission/requestPermissions is never called
  // here).
  //
  // Also resolves `checking` in every branch — not just the granted-and-
  // verified path — so a caller waiting on `checking` never hangs: if
  // unsupported, the mount effect above already resolved it and this
  // effect exits without touching it again; if supported but permission
  // is 'default'/'prompt'/'denied', there is nothing to re-verify, so it
  // resolves immediately; if permission is 'granted', it resolves once
  // the real check finishes, success or failure alike.
  useEffect(() => {
    if (!supported) return

    if (permission !== 'granted') {
      setChecking(false)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const fetchedToken = await getCurrentToken()
        if (!fetchedToken || cancelled) return
        const { data: existing } = await supabase
          .from('push_tokens')
          .select('id')
          .eq('token', fetchedToken)
          .maybeSingle()
        if (cancelled) return
        if (existing) {
          setToken(fetchedToken)
          setSubscribed(true)
        }
      } catch {
        // Silent check — a failure here just leaves subscribed at its
        // current value; the person can still use the toggle manually.
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, permission])

  return {
    supported, permission, subscribed, loading, error, checking,
    subscribeToPush, unsubscribeFromPush,
  }
}
