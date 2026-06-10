/**
 * src/hooks/usePushSubscription.js
 * Phase 3K — Push Notification Subscription
 *
 * Call subscribeToPush() once (e.g. on first app load or from a settings screen).
 * Saves the subscription to Supabase push_subscriptions table.
 * Safe to call multiple times — checks for existing subscription first.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const [supported,  setSupported]  = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  async function subscribeToPush() {
    if (!supported) return
    setLoading(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Notification permission denied')
        return
      }

      const reg = await navigator.serviceWorker.ready

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      // Save to Supabase
      const { error: dbErr } = await supabase
        .from('push_subscriptions')
        .upsert({ subscription: sub.toJSON() }, { onConflict: 'subscription' })

      if (dbErr) throw dbErr
      setSubscribed(true)
    } catch (e) {
      setError(e.message ?? 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  return { supported, subscribed, loading, error, subscribeToPush }
}
