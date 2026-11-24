/**
 * src/hooks/useNotices.js
 *
 * Step 1c (2026-11-24) — the in-app notices list (inbox) for PERSONAL notices
 * (the ones made by the database function notify_user). Notices sent to everyone
 * are not listed here.
 *
 * Talks to three database functions (the notification_log table itself stays
 * admin-only): my_unread_notice_count(), my_notices(p_limit),
 * mark_notices_read(p_id). All three only ever see the signed-in person's own rows.
 *
 * useUnreadNotices() gives the number behind the red dot on the bell. The number
 * is shared by every bell on screen (one store, one fetch at a time) and refreshes
 * when the app opens, when the person comes back to it, and once a minute while it
 * is visible. Signed out means 0 and no requests at all.
 *
 * Props/returns:
 *   useUnreadNotices()   -> number
 *   fetchNotices()       -> Promise<Array<{ id, type, title, message, deep_link_path, sent_at, read_at }>>
 *   markNoticesRead(id?) -> Promise<void>  (no id = all; updates the shared number)
 */

import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
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
    const { data, error } = await supabase.rpc('my_unread_notice_count')
    if (!error && typeof data === 'number') setUnread(data)
  } catch {
    // offline or a blip: keep the number we have
  } finally {
    inFlight = false
  }
}

export function useUnreadNotices() {
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

export async function fetchNotices() {
  const { data, error } = await supabase.rpc('my_notices', { p_limit: 30 })
  if (error) throw error
  return data ?? []
}

export async function markNoticesRead(id = null) {
  const { error } = await supabase.rpc('mark_notices_read', { p_id: id })
  if (error) throw error
  if (id === null) {
    setUnread(0)
  } else {
    lastFetchAt = 0
    refreshUnread()
  }
}
