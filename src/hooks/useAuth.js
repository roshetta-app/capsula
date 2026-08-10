import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  // signInWithGoogle — end-user sign-in (D2: Google OAuth only, no
  // email/password at first). Supabase handles the redirect away to
  // Google and back; on success this tab navigates through the OAuth
  // flow, so there's nothing further to update here — the redirected-to
  // page picks up the new session via onAuthStateChange above.
  async function signInWithGoogle() {
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
