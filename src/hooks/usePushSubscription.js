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
 */

import { useState, useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
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
// resolves — see the 503-on-deploy case documented in index.html.
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
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    setSupported(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }, [])

  async function subscribeToPush() {
    if (!supported) return false
    setLoading(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Notification permission denied')
        return false
      }

      // Wait for the existing sw.js registration (main.jsx registers it on
      // window 'load') rather than registering a second service worker.
      // Timed out (not just awaited) — if registration failed (e.g. a
      // 503 fetching sw.js during GH Pages CDN propagation), this promise
      // never resolves on its own and would otherwise hang the button
      // forever with no feedback.
      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        'the notification service to be ready'
      )

      const { token } = await FirebaseMessaging.getToken({
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        setError('Could not get a notification token')
        return false
      }

      const { data: { user } } = await supabase.auth.getUser()

      // Check if this token is already saved to avoid duplicates, and to
      // find out whether it needs claiming for the current signed-in user.
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id, user_id')
        .eq('token', token)
        .maybeSingle()

      if (!existing) {
        const { error: dbErr } = await supabase
          .from('push_tokens')
          .insert({ token, platform: 'web', user_id: user?.id ?? null })
        if (dbErr) throw dbErr
      } else if (user && existing.user_id !== user.id) {
        // Claim an unclaimed token for the now-signed-in user. If the row
        // already belongs to a different signed-in user, RLS silently
        // leaves it untouched (0 rows affected) rather than erroring.
        const { error: dbErr } = await supabase
          .from('push_tokens')
          .update({ user_id: user.id })
          .eq('id', existing.id)
        if (dbErr) throw dbErr
      }

      setSubscribed(true)
      return true
    } catch (e) {
      setError(e.message ?? 'Failed to subscribe')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { supported, subscribed, loading, error, subscribeToPush }
}
