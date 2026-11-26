/**
 * src/lib/notificationQueries.js
 *
 * S11 (2026-11-26): the three server calls of the in-app notifications list, moved out of
 * useNotifications.js. Each returns the raw { data, error } the hook already handled.
 */

import { supabase } from './supabase'

export async function rpcMyUnreadNotificationCount() {
  return supabase.rpc('my_unread_notification_count')
}

export async function rpcMyNotifications(limit = 30) {
  return supabase.rpc('my_notifications', { p_limit: limit })
}

/** @param {string|null} id one notification, or null for all */
export async function rpcMarkNotificationsRead(id = null) {
  return supabase.rpc('mark_notifications_read', { p_id: id })
}
