/**
 * src/components/ProfileSetupRedirect.jsx
 * Profile wizard redesign — replaces ProfileSetupModal.jsx
 *
 * Same trigger condition ProfileSetupModal used (signed-in user whose
 * profiles.profile_setup_dismissed is still false), but instead of
 * rendering a popup form itself, it navigates to /account/edit and lets
 * AccountEditScreen + ProfileWizard handle the actual form — per the
 * redesign spec, the modal is gone, both entry points now share one
 * wizard. AccountEditScreen independently reads the same dismissed flag
 * to decide whether to open straight into edit mode, so this component's
 * only job is routing there, not any of the form/save logic.
 *
 * Mounted once in App.jsx, in the exact spot ProfileSetupModal used to
 * sit — as a sibling of OnboardingGate/AppRoutes, inside AuthProvider so
 * useAuth() and inside BrowserRouter so useNavigate() both work.
 *
 * account-header-tweaks (2026-08-23) — root-cause fix for a reported bug:
 * after a first-time Google sign-in, the person would briefly see the
 * signed-in AccountScreen before getting bounced to the wizard. This used
 * to run its own separate fetchOwnProfile() call to check
 * profileSetupDismissed, independent of (and slower than) AuthContext's
 * own already-in-flight profile load — AccountScreen only waits on the
 * latter, so it rendered signed-in well before this component's own fetch
 * had a chance to resolve and redirect. Now that profileSetupDismissed
 * rides along on AuthContext's shared `profile` (see AuthContext.jsx),
 * this reads it straight from useAuth() instead — same data, same timing
 * AccountScreen itself waits on via `loading`, so the two are no longer
 * racing against each other.
 */

import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../router'

export default function ProfileSetupRedirect() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Guards against re-checking/re-navigating on every render — only runs
  // once per signed-in user id, same spirit as ProfileSetupModal's old
  // `checked` flag.
  const checkedForRef = useRef(null)

  useEffect(() => {
    if (!user) {
      checkedForRef.current = null
      return
    }
    // Wait for AuthContext's own profile load to finish (same `loading`
    // flag AccountScreen itself gates on) before deciding anything —
    // this is what keeps this component's redirect decision in step with
    // what's actually on screen, instead of resolving on its own,
    // independent timeline.
    if (loading) return
    if (checkedForRef.current === user.id) return
    checkedForRef.current = user.id

    if (!profile?.profileSetupDismissed && location.pathname !== ROUTES.ACCOUNT_EDIT) {
      navigate(ROUTES.ACCOUNT_EDIT)
    }
  }, [user, profile, loading, navigate, location.pathname])

  return null
}
