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
 * Mounted once in App.jsx, inside AuthProvider so useAuth() and inside
 * BrowserRouter so useNavigate() both work. Originally a sibling of
 * OnboardingGate/AppRoutes, in the exact spot ProfileSetupModal used to
 * sit; now wraps OnboardingGate instead — see signup-wizard-flash fix
 * below for why.
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
 *
 * signup-wizard-flash fix (2026-09-15) — the account-header-tweaks fix
 * above closed the AccountScreen-specific race, but the same shape of bug
 * was still there one level up: this component used to render null and
 * only decide/navigate from inside a useEffect, so whatever route the
 * app happened to land on (e.g. Conditions) painted for a frame or two
 * before the effect fired and yanked a first-time signup over to the
 * wizard. Same root cause class as account-header-tweaks — a real screen
 * getting a chance to render before this component's own check had
 * resolved.
 *
 * Now a real gate, mirroring OnboardingGate.jsx's "hide everything until
 * we know what to show" shape: it takes `children` and either renders
 * them or renders a blank placeholder (ProfileCheckPlaceholder below,
 * styled like AppGate.jsx's full-bleed block) while it can't yet be sure
 * whether a redirect is coming. App.jsx repositions this from a sibling
 * of OnboardingGate to a wrapper around it, so nothing underneath —
 * OnboardingGate or the routes it guards — gets a chance to paint until
 * the redirect decision (and, if one fires, the route change itself) has
 * already landed.
 *
 * `checkedUserId` replaces the old `checkedForRef` ref with the same
 * once-per-signed-in-user-id semantics, but as real state: the render
 * below needs to react to it (to know when to stop blocking), and a ref
 * update alone doesn't trigger a re-render.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../router'

// Full-bleed placeholder shown only for the brief window where a
// signed-in user's profile-setup redirect hasn't been decided yet — same
// fixed/inset/zIndex/background shape as AppGate.jsx's AppGateBlock, just
// with no content, since there's nothing to show yet.
function ProfileCheckPlaceholder() {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      zIndex:          2000,
      backgroundColor: 'var(--color-surface)',
    }} />
  )
}

export default function ProfileSetupRedirect({ children }) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Guards against re-checking/re-navigating on every render — only runs
  // once per signed-in user id, same spirit as ProfileSetupModal's old
  // `checked` flag. State rather than a ref (see file header) so the
  // blocked/unblocked render decision below updates the moment this
  // settles, not just on some later unrelated re-render.
  const [checkedUserId, setCheckedUserId] = useState(null)

  useEffect(() => {
    if (!user) {
      if (checkedUserId !== null) setCheckedUserId(null)
      return
    }
    // Wait for AuthContext's own profile load to finish (same `loading`
    // flag AccountScreen itself gates on) before deciding anything —
    // this is what keeps this component's redirect decision in step with
    // what's actually on screen, instead of resolving on its own,
    // independent timeline.
    if (loading) return
    if (checkedUserId === user.id) return

    if (!profile?.profileSetupDismissed && location.pathname !== ROUTES.ACCOUNT_EDIT) {
      navigate(ROUTES.ACCOUNT_EDIT)
    }
    setCheckedUserId(user.id)
  }, [user, profile, loading, navigate, location.pathname, checkedUserId])

  // Blocked only while a signed-in user's redirect decision is still
  // outstanding: either AuthContext hasn't resolved this sign-in yet
  // (`loading`), or the check above hasn't run for this user id yet. A
  // signed-out user, or one already checked this session, is never
  // blocked — this adds no delay to the common case, only to the exact
  // first-paint gap a brand-new signup used to flash through.
  const blocked = !!user && (loading || checkedUserId !== user.id)

  if (blocked) {
    return <ProfileCheckPlaceholder />
  }

  return children
}
