/**
 * src/lib/authQueries.js
 *
 * S11 (2026-11-26): the sign-in and session calls of `AuthContext.jsx` (the one place that talks to the
 * server's sign-in service), moved out so the context no longer imports the server client. Every function
 * is a plain pass-through: same call, same arguments, same answer as before, so the sign-in flows
 * (Google popup, installed app, native app, email sign-in), the session restore, the sign-out and the
 * profile read behave exactly as they did.
 */

import { supabase } from './supabase'

// ── Session ───────────────────────────────────────────────────────────────
export const getAuthSession = () => supabase.auth.getSession()

/** Listens to sign-in and sign-out events. Returns what the client returns: { data: { subscription } }. */
export const onAuthChange = (callback) => supabase.auth.onAuthStateChange(callback)

export const exchangeCodeForSession = (code) => supabase.auth.exchangeCodeForSession(code)

// ── Sign in ───────────────────────────────────────────────────────────────
export const signInWithEmailPassword = (email, password) => supabase.auth.signInWithPassword({ email, password })

/** Google sign-in. `options` is exactly what the caller built for its route (native, installed app or popup). */
export const startGoogleOAuth = (options) => supabase.auth.signInWithOAuth({ provider: 'google', options })

// ── Sign out ──────────────────────────────────────────────────────────────
/** Frees this phone from the account before sign-out (the row rules only allow it while signed in). */
export const freePushTokensOfDevice = (deviceId) => supabase.from('push_tokens').update({ user_id: null }).eq('device_id', deviceId)

export const signOutOfServer = () => supabase.auth.signOut()

// ── Own profile ───────────────────────────────────────────────────────────
export const queryOwnProfileForAuth = (userId) => supabase
  .from('profiles')
  .select('role, tier, full_name, theme_preference, phone_number, occupation, country, specialty, profile_setup_dismissed, gender, phone_country_code, occupation_other, student_type, pro_plan, pro_end')
  .eq('id', userId)
  .single()
