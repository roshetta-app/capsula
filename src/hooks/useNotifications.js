/**
 * src/hooks/useNotifications.js
 *
 * Step 1c (2026-11-24) — the in-app notifications page (inbox) for PERSONAL notifications
 * (the ones made by the database function notify_user). Notifications sent to everyone
 * are not listed here.
 *
 * Talks to three database functions (the notification_log table itself stays
 * admin-only): my_unread_notification_count(), my_notifications(p_limit),
 * mark_notifications_read(p_id). All three only ever see the signed-in person's own rows.
 *
 * useUnreadNotifications() gives the number behind the red dot on the bell. The number
 * is shared by every bell on screen (one store, one fetch at a time) and refreshes
 * when the app opens, when the person comes back to it, and once a minute while it
 * is visible. Signed out means 0 and no requests at all.
 *
 * Props/returns:
 *   useUnreadNotifications()   -> number
 *   fetchNotifications()       -> Promise<Array<{ id, type, title, message, deep_link_path, sent_at, read_at }>>
 *   markNotificationsRead(id?) -> Promise<void>  (no id = all; updates the shared number)
 */

import { useEffect, useSyncExternalStore } from 'react'
import { rpcMyUnreadNotificationCount, rpcMyNotifications, rpcMarkNotificationsRead } from '../lib/notificationQueries'
import { useAuth } from './useAuth'

const POLL_MS = 60 * 1000
const MIN_GAP_MS = 5 * 1000

let unread = 0
let lastFetchAt = 0
let inFlight = false
const listeners = new Set()

function setUnread(n) {
  if (n === unread) return
  unread = n
  listeners.forEach(l => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function refreshUnread() {
  const now = Date.now()
  if (inFlight || now - lastFetchAt < MIN_GAP_MS) return
  inFlight = true
  lastFetchAt = now
  try {
    const { data, error } = await rpcMyUnreadNotificationCount()
    if (!error && typeof data === 'number') setUnread(data)
  } catch {
    // offline or a blip: keep the number we have
  } finally {
    inFlight = false
  }
}

export function useUnreadNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const count = useSyncExternalStore(subscribe, () => unread, () => 0)

  useEffect(() => {
    if (!userId) {
      setUnread(0)
      return undefined
    }
    lastFetchAt = 0
    refreshUnread()
    function onVisible() {
      if (document.visibilityState === 'visible') refreshUnread()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const timer = setInterval(onVisible, POLL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      clearInterval(timer)
    }
  }, [userId])

  return userId ? count : 0
}

export async function fetchNotifications() {
  const { data, error } = await rpcMyNotifications(30)
  if (error) throw error
  return data ?? []
}

export async function markNotificationsRead(id = null) {
  const { error } = await rpcMarkNotificationsRead(id)
  if (error) throw error
  if (id === null) {
    setUnread(0)
  } else {
    lastFetchAt = 0
    refreshUnread()
  }
}
