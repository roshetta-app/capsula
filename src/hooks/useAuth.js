import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useAuth — admin authentication hook.
 *
 * Returns:
 *   user:    SupabaseUser | null
 *   loading: boolean  — true until the initial session check resolves
 *   signIn:  (email, password) => Promise<{ error }>
 *   signOut: () => Promise<void>
 */
export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth state changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, loading, signIn, signOut }
}
