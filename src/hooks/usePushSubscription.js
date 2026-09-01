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
 *
 * Bug fix, 2026-08-14 (stale-token-on-reinstall) — the mount-time
 * re-verify effect below only ever *checked* the device's current token
 * against push_tokens; when permission was already granted but the token
 * had changed (reinstalling the app, clearing app data, or any other FCM
 * token rotation all produce a new token), the lookup came back empty and
 * the effect silently gave up — it never saved the new token. The result:
 * `subscribed` stayed false with no visible error, the old/dead token was
 * left behind in push_tokens, and every admin notification kept targeting
 * a token the device no longer had. Fixed by calling the same
 * claim_push_token save subscribeToPush() already uses whenever the
 * lookup misses — this makes the app self-heal its token on every launch
 * where permission is granted, instead of only ever saving once at the
 * moment someone taps "Allow".
 *
 * Bug fix, 2026-08-17 (notif-display-fix, foreground follow-up) — FCM
 * only auto-displays a system notification when the app is backgrounded
 * or closed. While the app is in the foreground, a push arrives silently
 * and nothing shows it unless something explicitly does. Confirmed via
 * testing: notifications sent while the app was open on-screen never
 * appeared, while ones sent while backgrounded did. Fixed by listening
 * for FirebaseMessaging's 'notificationReceived' event (fires only in the
 * foreground — background/closed delivery is unaffected and unchanged)
 * and mirroring it into a local notification via
 * @capacitor/local-notifications, so a push is visible regardless of
 * whether the app happens to be open when it arrives. Requires
 * `npm install @capacitor/local-notifications` and `npx cap sync android`.
 *
 * Bug fix, 2026-08-17 (banner-eager-permission-fix, same-day follow-up) —
 * the foreground fix above originally called
 * LocalNotifications.requestPermissions() unconditionally at the top of
 * the notification-listener effect, which runs once on every app mount.
 * That fired the phone's OS permission popup immediately on app open,
 * ahead of — and regardless of — NotificationsBanner's own deliberate
 * "Allow Notifications" ask, defeating the whole point of the banner's
 * opt-in flow. Fixed by moving the request to fire lazily, only right
 * before a local notification actually needs to be scheduled (inside the
 * 'notificationReceived' handler itself). By the time a push is being
 * received in the foreground, FCM permission was already granted through
 * the normal banner/bell flow, so this now just silently confirms the
 * already-granted permission instead of prompting a second time.
 *
 * Phase F9 Stage 2 (D28) addition — parity with deliver-notification's new
 * rich-content/per-type-channel payload, for the foreground display path:
 *   - The foreground LocalNotifications.schedule() call now carries the
 *     same image (via `attachments`, LocalNotifications' documented way to
 *     show an image) and `channelId` the background/closed FCM-displayed
 *     path already gets natively from deliver-notification's payload.
 *     CHANNEL_BY_TYPE below mirrors deliver-notification/index.ts's own
 *     mapping exactly — keep the two in sync if either changes.
 *   - `extra` now also carries the deep-link `url` (previously only
 *     `log_id`), read back out via event.notification.extra.url —
 *     threaded through so the tap-navigation parity fix (making a tap on
 *     a foreground-shown notification actually route the app to the
 *     linked drug/condition, matching sw.js's D28 navigate fix) has the
 *     value available.
 *   - Tap navigation is now wired up: this hook is only ever mounted via
 *     PushSubscriptionProvider (context/PushSubscriptionContext.jsx),
 *     which App.jsx renders inside <BrowserRouter>, so useNavigate() is
 *     safe to call here.
 *
 * Bug fix, 2026-08-20 (miui-alarms-redirect-mitigation) — this used to
 * call requestPermissions() unconditionally on every single foreground
 * push. Confirmed on a Xiaomi/MIUI device: this can surface the OS's own
 * "Alarms & reminders" settings screen instead of a normal notification
 * prompt — a manufacturer-level Android customization outside this app's
 * control, not documented behavior of the LocalNotifications plugin
 * itself, so there's no way to suppress the redirect itself from here.
 * Checking first and only requesting when not already granted was meant
 * to cut this down to at most once per app session — see the 2026-09-01
 * follow-up below for why that didn't actually hold.
 *
 * Bug fix, 2026-09-01 (miui-alarms-redirect-removed) — the check-then-
 * request pattern above still re-requested on every single foreground
 * notification for as long as permission stayed ungranted on a given
 * phone. Rather than just capping how often that request fires, this
 * removes the request entirely: permission was already asked for once,
 * for real, through the FCM banner/bell flow
 * (FirebaseMessaging.requestPermissions(), elsewhere in this file) — and
 * on Android that's the same underlying OS permission LocalNotifications
 * needs, so a second, separate request from this plugin was never
 * actually necessary. It was also the direct trigger for the MIUI
 * redirect: only an actual request() call (not the read-only
 * checkPermissions() below) can surface that OS settings screen. Now
 * this only reads the current permission state; if it somehow isn't
 * granted, that one foreground notification is simply skipped, with no
 * prompt — the same end result a denied request would have produced,
 * just without ever asking again from this code path.
 *
 * Bug fix, 2026-09-01 (ghost-token-on-reinstall) — claim_push_token was
 * only ever keyed on the FCM token itself, and a reinstall (or a cleared-
 * data reset) always produces a brand-new token — so every reinstall
 * inserted a fresh row instead of updating the existing one for that
 * physical device, leaving the old row behind as a permanently dead
 * entry until FCM eventually confirmed it dead (which can take over a
 * day). Fixed by also sending this device's permanent id (getDeviceId(),
 * from analytics/deviceSession.js — the same id already used for usage
 * analytics) to claim_push_token, which now updates the existing row for
 * a known device_id instead of always inserting a new one. See the
 * matching database migration for the other half of this fix.
 *
 * Bug fix, 2026-09-01 (offline-push-toggle-fix) — subscribeToPush() and
 * unsubscribeFromPush() both end with a save/delete against push_tokens in
 * Supabase, which needs a real connection. While offline, that step used
 * to fail silently partway through, surfacing only as a generic "Could
 * not enable/turn off notifications. Please try again." error — accurate,
 * but easy to mistake for a permission problem rather than a connectivity
 * one. Now reads the app's existing shared connectivity check
 * (useOnlineStatus, same one AppGate.jsx and OfflineStatusToast.jsx
 * already use) and exits immediately with a clear "No internet
 * connection" error — before touching the OS permission prompt or making
 * any network call — whenever isOnline is false. `isOnline` is also
 * exposed on the hook's return value so callers (NotificationSheet.jsx)
 * can show the right message up front instead of waiting for a failed
 * attempt.
 *
 * Bug fix, 2026-09-01 (alarms-redirect-fix) — root cause found for the
 * MIUI "Alarms & reminders" redirect the three fixes above
 * (miui-alarms-redirect-mitigation, miui-alarms-redirect-removed) were
 * chasing. It was never the notification-permission checks those two
 * fixes correctly tightened — it was @capacitor/local-notifications
 * itself: displaying a notification through that plugin goes through
 * Android's exact-alarm scheduling system, which is what triggers the
 * permission redirect, regardless of anything checked/requested
 * beforehand. There's no supported way around that from inside the
 * plugin, so this removes it from the foreground path entirely: a push
 * arriving while the app is open is now shown as an in-app toast (this
 * app's existing ToastContext, extended with an optional onAction so
 * tapping it still reports the click and follows the deep link, same as
 * the old native notification did) instead of a native notification.
 * This matches how most apps handle a push arriving while already open
 * (an in-app banner rather than a system notification), and is also
 * Firebase's own documented approach — foreground display is left
 * entirely up to the app. Background/closed delivery is unaffected: those
 * are still shown natively by Android straight from the FCM payload, same
 * as before. One known trade-off: the toast shows title/body only, not
 * the notification's image — background/closed notifications still show
 * the image as before.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { initializeApp, getApps } from 'firebase/app'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../lib/supabase'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from '../context/ToastContext'
import { getDeviceId } from '../analytics/deviceSession'

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

// Phase F9 Stage 2 (D28) — must match deliver-notification/index.ts's
// CHANNEL_BY_TYPE exactly. These ids only work if a matching Android
// notification channel has already been registered on-device (the Stage 2
// native one-time setup step) — otherwise Android silently falls back to
// its own default channel behavior. Still needed for the one-time channel
// registration below (background/closed notifications, shown natively by
// Android from deliver-notification's own FCM payload, still use these
// channels) — only the per-notification channel lookup that used to
// happen here for the foreground path (channelForType()) was removed
// alongside the local-notification code it belonged to; see 2026-09-01
// (alarms-redirect-fix) in the file header.
const CHANNEL_BY_TYPE = {
  info:      'capsula_info',
  update:    'capsula_update',
  important: 'capsula_important',
}

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
  const navigate = useNavigate()
  // Bug fix, 2026-09-01 (alarms-redirect-fix) — see file header. This hook
  // is only ever mounted via PushSubscriptionProvider, which App.jsx
  // renders inside <ToastProvider>, so useToast() is always safe to call
  // here.
  const { toast } = useToast()
  // 2026-09-01 offline fix — see file header. Same shared check used
  // elsewhere in the app (AppGate.jsx, OfflineStatusToast.jsx), not a new
  // independent one.
  const { isOnline } = useOnlineStatus()
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

      // Phase F9 Stage 2 (D28) — one-time Android channel registration.
      // AndroidManifest.xml meta-data only supports a single *default*
      // channel, which can't cover the 3 needed here, so this uses the FCM
      // plugin's own createChannel() instead — the plugin's documented way
      // to register additional channels. Safe to call on every app start:
      // Android no-ops re-creating a channel with an id that already
      // exists (matches deliver-notification/index.ts's CHANNEL_BY_TYPE
      // and this file's own copy above — keep all three in sync). Fire-
      // and-forget: a failure here just means channel_id falls back to
      // Android's own default channel behavior until the next app start.
      for (const id of Object.values(CHANNEL_BY_TYPE)) {
        FirebaseMessaging.createChannel({
          id,
          name: id === CHANNEL_BY_TYPE.important ? 'Important updates'
            : id === CHANNEL_BY_TYPE.update ? 'Content updates' : 'General info',
          importance: id === CHANNEL_BY_TYPE.important ? 5 : 3,
          visibility: 1,
        }).catch(() => { /* best-effort, see note above */ })
      }

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

  // Bug fix, 2026-08-17 (notif-display-fix, foreground follow-up) — see
  // file header note above. Native only: the web path already gets
  // browser-level notifications for free via the service worker even
  // while a tab is focused, so it doesn't need this. Runs once on mount;
  // the listener stays registered for the life of the app (this hook is
  // only ever mounted once, via PushSubscriptionProvider at the app root).
  //
  // Bug fix, 2026-08-17 (click-count-fix) — the CMS's click counter
  // (notification_log.click_count) was only ever wired up on the web
  // path: public/sw.js's notificationclick handler is what reports a tap
  // back via the increment_notification_click database function. Service
  // workers are explicitly skipped entirely on native (see main.jsx's
  // Capacitor.isNativePlatform() guard), so that handler never runs in
  // the Android app at all — every native tap, background/closed or
  // foreground, has been going unrecorded since native support was added.
  // Two separate tap sources need covering on native, since they're shown
  // by two different mechanisms:
  //   - Background/closed: Android itself displays the notification from
  //     the raw FCM payload, so its tap is reported by FCM's own
  //     'notificationActionPerformed' event, reading log_id back out of
  //     the same data payload send-notification/index.ts already sends.
  //   - Foreground: shown as an in-app toast (see 2026-09-01,
  //     alarms-redirect-fix, below), so its "tap" is just the toast's own
  //     onAction callback — no separate native listener needed for this
  //     path anymore.
  // Both call the same increment_notification_click RPC the service
  // worker uses (log_id param name matches), fire-and-forget — a failed
  // report shouldn't block anything the person is doing.
  //
  // Bug fix, 2026-09-01 (alarms-redirect-fix) — replaces the
  // LocalNotifications-based foreground display this section used to
  // describe (banner-eager-permission-fix, miui-alarms-redirect-
  // mitigation, miui-alarms-redirect-removed — see file header for all
  // three). Those fixes correctly targeted the notification-permission
  // checks, but the actual redirect trigger turned out to be a different,
  // unrelated Android permission: LocalNotifications.schedule() displays
  // by way of the same OS mechanism used for exact-time alarms, and
  // requesting that permission is what MIUI shows as a full "Alarms &
  // reminders" settings redirect rather than a normal popup — regardless
  // of anything checked or requested beforehand. There is no supported way
  // to display a notification through that plugin without touching this
  // mechanism, so the fix removes it from this path entirely: a
  // foreground push is now shown as an in-app toast (this app's existing
  // toast system, ToastContext.jsx) instead of a native notification.
  // This is also the standard approach — most apps (e.g. WhatsApp,
  // Instagram) show an in-app banner rather than a system notification
  // while already open, and Firebase's own guidance leaves foreground
  // display entirely up to the app for this reason. Background/closed
  // delivery (the other bullet above) is untouched by this change.
  // Known trade-off: unlike the old LocalNotifications-based version, the
  // toast does not show the notification's image (deliver-notification's
  // image_url) — text (title/body) only. Background/closed notifications,
  // which Android displays natively from FCM's own payload, still show
  // the image as before; this only affects the foreground-only case.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    function reportClick(logId) {
      if (!logId) return
      supabase.rpc('increment_notification_click', { log_id: logId })
        .then(({ error: rpcErr }) => {
          if (rpcErr) console.warn('[push] Failed to report notification click:', rpcErr.message)
        })
    }

    // Phase F9 Stage 2 (D28) tap-navigation fix — routes the app to the
    // notification's deep link on tap, matching sw.js's own navigate fix.
    // '/capsula/' is deliver-notification's and this hook's own fallback
    // for "no link set" (matches the web build's basename); native's
    // router has no such basename (see App.jsx's ROUTER_BASENAME), so
    // it's normalized to the real home route instead of a path that
    // doesn't exist here.
    function navigateToDeepLink(url) {
      if (!url) return
      navigate(url === '/capsula/' ? '/' : url)
    }

    const handles = []

    FirebaseMessaging.addListener('notificationReceived', event => {
      // Bug fix, 2026-09-01 (alarms-redirect-fix) — see comment above this
      // effect. No LocalNotifications permission check or schedule() call
      // here anymore; this is shown as an in-app toast instead, which
      // needs no OS-level permission of any kind.
      const notification = event?.notification ?? event
      const deepLinkUrl = notification?.data?.url ?? '/capsula/'
      const logId = notification?.data?.log_id ?? null

      const title = notification?.title ?? ''
      const body = notification?.body ?? ''
      const message = title && body ? `${title}: ${body}` : (title || body)
      if (!message) return

      // onAction stands in for the old localNotificationActionPerformed
      // listener: tapping the toast reports the click and routes to the
      // deep link, same as tapping the old native notification did.
      toast.info(message, {
        onAction: () => {
          reportClick(logId)
          navigateToDeepLink(deepLinkUrl)
        },
      })
    }).then(handle => handles.push(handle))

    FirebaseMessaging.addListener('notificationActionPerformed', event => {
      reportClick(event?.notification?.data?.log_id)
      navigateToDeepLink(event?.notification?.data?.url)
    }).then(handle => handles.push(handle))

    return () => { handles.forEach(handle => handle.remove()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Saves a fetched token via the same atomic claim_push_token step
  // subscribeToPush() uses. Shared so the mount-time re-verify effect can
  // self-heal a rotated/reinstalled token without duplicating this logic.
  //
  // Bug fix, 2026-09-01 (ghost-token-on-reinstall) — see file header.
  // Now also sends this device's permanent id so the database function
  // can update the existing row for a known device instead of always
  // inserting a new one keyed only on the (reinstall-rotated) token.
  async function saveToken(fetchedToken) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error: dbErr } = await supabase.rpc('claim_push_token', {
      p_token: fetchedToken,
      p_platform: Capacitor.getPlatform(), // 'android' | 'ios' | 'web'
      p_user_id: user?.id ?? null,
      p_device_id: getDeviceId(),
    })
    if (dbErr) throw dbErr
  }

  async function subscribeToPush() {
    if (!supported) return false
    // 2026-09-01 offline fix — see file header. Bail out before ever
    // touching the OS permission prompt or a network call: fetching a
    // token and saving it both need a real connection, so there's nothing
    // useful this can do offline anyway.
    if (!isOnline) {
      setError('No internet connection')
      return false
    }
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

      // Single atomic database call — replaces the old check-then-save
      // (select for an existing row, then insert or update), which had a
      // real gap between the check and the write. claim_push_token does
      // the check-and-save as one step and keeps the same "never un-claim
      // a token on a signed-out call" protection as before.
      await saveToken(fetchedToken)

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
    // 2026-09-01 offline fix — see file header. Same reasoning as
    // subscribeToPush(): removing the token is a server-side delete, so
    // there's nothing to do here without a connection.
    if (!isOnline) {
      setError('No internet connection')
      return false
    }
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
  // If the current device token isn't found in push_tokens, it's not
  // necessarily unsubscribed — the token itself may simply have rotated
  // (reinstall, cleared app data, routine FCM rotation) while permission
  // stayed granted. In that case, save the fresh token the same way
  // subscribeToPush() does, so the app self-heals instead of silently
  // leaving a dead token behind and never sending to this device again.
  //
  // Also resolves `checking` in every branch — not just the granted-and-
  // verified path — so a caller waiting on `checking` never hangs: if
  // unsupported, the mount effect above already resolved it and this
  // effect exits without touching it again; if supported but permission
  // is 'default'/'prompt'/'denied', there is nothing to re-verify, so it
  // resolves immediately; if permission is 'granted', it resolves once
  // the real check (and, if needed, the self-heal save) finishes, success
  // or failure alike.
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
        } else {
          // Token rotated or was never saved — self-heal by saving it now.
          await saveToken(fetchedToken)
          if (cancelled) return
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
    supported, permission, subscribed, loading, error, checking, isOnline,
    subscribeToPush, unsubscribeFromPush,
  }
}
