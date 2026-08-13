import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

/**
 * useAuth — shared authentication hook for both admin and end users.
 *
 * Per D9 (single Supabase Auth system, role flag distinguishes admin/
 * end users): there is one session, and `profiles.role` is what tells
 * callers whether the signed-in person is an admin. `profile` is fetched
 * alongside the session so AuthGuard (and anything else that needs it)
 * doesn't have to do its own separate lookup.
 *
 * Returns:
 *   user:              SupabaseUser | null
 *   profile:           { role: 'user'|'admin', tier: 'free'|'paid' } | null
 *   loading:           boolean — true until the initial session + profile check resolves
 *   signIn:            (email, password) => Promise<{ error }>  — admin (CMS)
 *   signInWithGoogle:  () => Promise<{ error }>                 — end users (D2)
 *   signOut:           () => Promise<void>
 */

// Stage 3 (F6) — the custom scheme/host the native app registers in
// AndroidManifest.xml to catch Google's redirect back from the system
// browser. Must stay in sync with that file and with the redirect URL
// added to Supabase's dashboard allow-list.
const NATIVE_AUTH_CALLBACK_URL = 'com.capsula.app://auth-callback'

// Stage 3 (F6) bug fix, 2026-08-13 — confirmed on-device: useAuth() is
// called directly (no shared Context) from several components
// (AuthGuard, AccountSheet, etc.), so each mounted copy of this hook was
// registering its own separate appUrlOpen listener — logcat showed eight
// registrations at once. One real Google redirect then triggered several
// of them simultaneously, all racing to exchange the same one-time code;
// since a PKCE code can only be used once, only one such attempt could
// ever succeed regardless of any other fix. This module-level flag makes
// the listener a true app-wide singleton — registered once, ever,
// regardless of how many components use this hook.
let oauthCallbackListenerRegistered = false

// Stage 3 (F6) bug fix, 2026-08-13, second finding (intermittent-signin-fail)
// — confirmed via a real on-device logcat capture: right after returning
// from the Google browser tab, the app can briefly have no working network
// connection. Android suspends an app's network access while it's
// backgrounded (during the time spent in the browser signing in), and
// there's a real window right after the app returns to the foreground
// where that hasn't finished waking back up yet. If
// exchangeCodeForSession() fires in that window, its request to
// Supabase's token endpoint fails outright with a generic fetch error —
// nothing to do with the code or the PKCE flow being wrong. One retry
// after a short delay is enough to clear this in practice, since the
// window is brief. Only retries on this specific network-timing failure
// — a real rejection from Google/Supabase (expired/invalid code) is a
// permanent failure retrying can't fix, so that still fails immediately.
const OAUTH_EXCHANGE_RETRY_DELAY_MS = 1500

function isNetworkTimingError(error) {
  if (!error) return false
  const message = error.message ?? ''
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

async function exchangeCodeWithRetry(code) {
  const first = await supabase.auth.exchangeCodeForSession(code)
  if (!first.error || !isNetworkTimingError(first.error)) return first

  await new Promise(resolve => setTimeout(resolve, OAUTH_EXCHANGE_RETRY_DELAY_MS))
  return supabase.auth.exchangeCodeForSession(code)
}

// Phase F3 bug fix — both notes and recently-viewed clear their own local
// storage reactively, but only while their exact screen/condition happens
// to be mounted at the moment of sign-out (see useNotes.js /
// useRecentlyViewed.js). Favourites doesn't have this problem — it's
// mirrored by an always-mounted context, so its own effect always fires.
// This sweeps the remaining two directly, from the one place sign-out
// always runs through regardless of what page is open. Storage keys are
// duplicated from useNotes.js's prefix and useRecentlyViewed.js's CONFIG
// on purpose (importing back into useAuth.js from hooks that already
// import useAuth would create a circular dependency) — if either hook's
// storage-key naming changes, update both spots.
function clearAllNotesStorage() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('capsula_notes_')) keysToRemove.push(key)
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function clearAllRecentlyViewedStorage() {
  try {
    localStorage.removeItem('capsula_recent_conditions')
    localStorage.removeItem('capsula_recent_drugs')
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('role, tier')
      .eq('id', currentUser.id)
      .single()

    setProfile(error ? null : data)
  }, [])

  useEffect(() => {
    let cancelled = false

    // Get the current session on mount, then load its profile row before
    // clearing `loading` — callers like AuthGuard need role available on
    // the very first render that has a user, not one tick later.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      await loadProfile(session?.user ?? null)
      if (!cancelled) setLoading(false)
    })

    // Subscribe to auth state changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // Stage 3 (F6) — native only. Google's sign-in flow can't complete
  // inside an embedded WebView (a platform restriction on Google's side,
  // not something configurable), so the native branch of
  // signInWithGoogle() below opens the OAuth URL in the system browser
  // instead of redirecting in-place. This listener is what catches the
  // app being reopened via the deep link once that browser flow
  // finishes, exchanges the returned code for a real session (PKCE, per
  // supabase.js), and closes the browser tab. Registered once on mount,
  // a no-op on web.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (oauthCallbackListenerRegistered) return
    oauthCallbackListenerRegistered = true

    // No cleanup/remove here on purpose — this listener is meant to live
    // for the whole app session (any component may trigger a Google
    // sign-in), not tied to whichever component happened to mount it
    // first.
    App.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(NATIVE_AUTH_CALLBACK_URL)) return

      // Stage 3 (F6) bug fix, 2026-08-13 — confirmed on-device:
      // exchangeCodeForSession() expects just the one-time authorization
      // code, not the full callback URL. Passing the whole URL sends it
      // as-is to Supabase's token endpoint, which can't match it to the
      // stored sign-in attempt and fails with "invalid flow state, no
      // valid flow state found" — even though the code-verifier
      // round-trip itself (confirmed via the diagnostic logging above)
      // was working correctly the whole time.
      const code = new URL(url).searchParams.get('code')
      if (!code) {
        console.error('OAuth callback URL had no code parameter:', url)
        await Browser.close()
        return
      }

      const { error } = await exchangeCodeWithRetry(code)
      if (error) {
        // Bug fix, 2026-08-13 (intermittent-signin-fail) — this used to
        // only log to the console, leaving the person back in the app
        // still signed out with no idea why. A retry already ran inside
        // exchangeCodeWithRetry for the transient network-timing case;
        // reaching here means it still failed (either a real
        // Google/Supabase rejection, or the network genuinely didn't
        // recover), so tell them directly rather than staying silent.
        console.error('OAuth callback session exchange failed:', error.message)
        toast.error('Sign-in failed. Please try again.')
      }
      await Browser.close()
    })
  }, [toast])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  // signInWithGoogle — end-user sign-in (D2: Google OAuth only, no
  // email/password at first).
  //
  // Web: unchanged from before — Supabase handles the redirect away to
  // Google and back in the same tab; the redirected-to page picks up the
  // new session via onAuthStateChange above.
  //
  // Native (Stage 3, F6): the same in-tab redirect can't complete inside
  // the app's embedded WebView, so this instead asks Supabase for the
  // OAuth URL without auto-navigating (skipBrowserRedirect), opens that
  // URL in the system browser via the Browser plugin, and returns. The
  // appUrlOpen listener above picks up the rest once Google redirects
  // back to the app.
  async function signInWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: NATIVE_AUTH_CALLBACK_URL,
          skipBrowserRedirect: true,
        },
      })
      if (error) return { error }
      await Browser.open({ url: data.url })
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    return { error }
  }

  // Notes and recently-viewed each own storage keys that only get cleared
  // reactively while their specific screen/condition is on-screen (see
  // clearAllNotesStorage / clearAllRecentlyViewedStorage for why). Signing
  // out sweeps both from here, the one place guaranteed to run regardless
  // of what page is currently open. Favourites doesn't need the same
  // treatment — it's mirrored by an always-mounted context, so its own
  // sign-out effect already covers every case.
  async function signOut() {
    clearAllNotesStorage()
    clearAllRecentlyViewedStorage()
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signIn, signInWithGoogle, signOut }
}
