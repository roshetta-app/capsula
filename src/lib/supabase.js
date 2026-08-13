import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// Stage 3 (F6) bug fix, 2026-08-13 — confirmed on-device: Supabase's
// default auth storage is the browser's localStorage. Android can (and,
// per this session's logcat, did) kill the app's process in the
// background while the user is choosing a Google account in the system
// browser, to free memory. localStorage writes made just before that
// aren't guaranteed to have been flushed to disk yet, so the PKCE code
// verifier written right before opening the browser can be gone by the
// time the app is relaunched via the redirect — Supabase's own exchange
// call then fails with "invalid flow state, no valid flow state found",
// exactly as seen in this session's log, even though the redirect itself
// arrived correctly. This only matters for the OAuth code-verifier
// round-trip; it doesn't affect the web build, which never gets killed
// mid-flow the same way. Fix: on native only, back auth storage with
// '@capacitor/preferences', which writes to Android's SharedPreferences
// (a real, durable, synchronous-on-the-native-side store) instead of the
// WebView's localStorage. Web keeps the default (unset = localStorage).
const capacitorPreferencesStorageAdapter = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key })
    // TEMP DIAGNOSTIC (Stage 3 OAuth debug, 2026-08-13) — shows exactly
    // which key the auth exchange is reading and whether it's actually
    // there, since the earlier fix (durable storage + singleton
    // listener) still leaves the code-verifier reported as missing at
    // exchange time. Remove once the flow is confirmed working.
    console.log('[OAuth diag] storage.getItem', key, value ? `found (${value.length} chars)` : 'NOT FOUND')
    return value
  },
  setItem: async (key, value) => {
    // TEMP DIAGNOSTIC (Stage 3 OAuth debug, 2026-08-13) — remove once the
    // flow is confirmed working.
    console.log('[OAuth diag] storage.setItem', key, `(${value.length} chars)`)
    await Preferences.set({ key, value })
  },
  removeItem: async (key) => {
    // TEMP DIAGNOSTIC (Stage 3 OAuth debug, 2026-08-13) — remove once the
    // flow is confirmed working.
    console.log('[OAuth diag] storage.removeItem', key)
    await Preferences.remove({ key })
  },
}

// flowType explicitly set to 'pkce' (Stage 3, F6) rather than left on the
// library default. PKCE is Supabase's documented recommendation for
// mobile/deep-link OAuth flows (native sign-in exchanges an auth code for
// a session, rather than parsing tokens out of a redirect URL's hash) and
// works identically for the existing web flow, so this is a safe default
// for both build targets, not just native.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    flowType: 'pkce',
    ...(Capacitor.isNativePlatform()
      ? { storage: capacitorPreferencesStorageAdapter }
      : {}),
  },
})
