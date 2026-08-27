/**
 * src/analytics/deviceSession.js
 * F10 Stage 2, Batch C — Device & session tracking for usage analytics.
 *
 * Generates a permanent per-device id (anonymous-first, same localStorage
 * pattern as useFavourites.js/useRecentlyViewed.js), tracks the current
 * signed-in user id (nullable, mirrors push_tokens.user_id's "claimed on
 * sign-in" linking pattern — set by AuthContext whenever the signed-in
 * user changes), the current platform ('web' | 'android' | 'ios', via the
 * same Capacitor.getPlatform() call usePushSubscription.js already uses),
 * and a session id that's fresh on every app open and rotates again after
 * a 30-minute-idle threshold (the standard Amplitude/Mixpanel/PostHog
 * convention) — tracked via Capacitor's App plugin `appStateChange` event,
 * which works on both native (backed by real OS lifecycle events) and web
 * (backed by the browser's visibilitychange under the hood).
 *
 * usageEvents.js reads all four of these on every logUsageEvent() call —
 * no existing call site (ConditionDetailScreen, DrugDetailScreen,
 * SearchBar, useConditionSearch/useDrugSearch) needs to change.
 */

import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const DEVICE_ID_STORAGE_KEY = 'capsula_device_id'
const SESSION_IDLE_ROTATE_MS = 30 * 60 * 1000 // 30 minutes

function newSessionId() {
  return crypto.randomUUID()
}

let cachedDeviceId = null
let currentSessionId = newSessionId()
let currentUserId = null
let lastBackgroundedAt = null
let listenerRegistered = false

/**
 * The device's permanent anonymous id. Generated once, ever, per device —
 * persisted to localStorage so it survives app restarts (same "cleared
 * site data wipes it" limitation useFavourites.js already has).
 */
export function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId
  try {
    let stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    if (!stored) {
      stored = crypto.randomUUID()
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, stored)
    }
    cachedDeviceId = stored
    return stored
  } catch {
    // localStorage unavailable — fall back to a runtime-only id so events
    // still carry something, even though it won't persist across reloads.
    if (!cachedDeviceId) cachedDeviceId = crypto.randomUUID()
    return cachedDeviceId
  }
}

/** Current session id — fresh per app open, rotates after 30 min idle. */
export function getSessionId() {
  return currentSessionId
}

/** 'web' | 'android' | 'ios' — same call usePushSubscription.js already uses. */
export function getPlatform() {
  return Capacitor.getPlatform()
}

/**
 * Called from AuthContext whenever the signed-in user changes (initial
 * session check, sign-in, sign-out) — mirrors push_tokens.user_id's
 * nullable "claimed on sign-in" pattern. Anonymous events log user_id as
 * null; signing in links every event from that point forward to the
 * account, with no need to migrate past anonymous events.
 */
export function setCurrentUserId(userId) {
  currentUserId = userId ?? null
}

export function getCurrentUserId() {
  return currentUserId
}

/**
 * Registers the app-open/background/resume session lifecycle listener.
 * Call once, at the app root — safe to call more than once, only the
 * first call actually registers anything.
 */
export function initDeviceSessionTracking() {
  if (listenerRegistered) return
  listenerRegistered = true

  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      lastBackgroundedAt = Date.now()
      return
    }
    // Coming back to the foreground. If the app was away 30+ minutes,
    // treat this as a new session — the case this exists for is a
    // notification tap or a resume from the background long after the
    // last real activity, which previously had no session boundary at
    // all to mark it as a fresh visit.
    if (lastBackgroundedAt && Date.now() - lastBackgroundedAt >= SESSION_IDLE_ROTATE_MS) {
      currentSessionId = newSessionId()
    }
    lastBackgroundedAt = null
  })
}
