/**
 * src/components/ui/ProfileAvatar.jsx
 * unify-profile-avatar (2026-08-25) — the one shared avatar circle, used by
 * AccountScreen.jsx, ProfileWizard.jsx, and AccountEditScreen.jsx. Each of
 * those previously had its own separate, hand-built copy of this (photo
 * with a fallback-to-initials circle) block, and they had drifted apart
 * from each other over time: different circle sizes (64px on Edit Profile
 * vs 72px on the other two) and different initials logic (some screens
 * only ever showed one letter, one handled a single-word name
 * differently). This is the single source of truth going forward — any
 * screen showing the signed-in user's avatar should use this instead of
 * building its own copy, so they can't drift apart again.
 *
 * Fixed at 72px, matching what Account screen and Profile Wizard already
 * used (Edit Profile's old 64px was the outlier and now matches too).
 *
 * avatar-instant-load (2026-09-04) — while the real `user` prop is still
 * resolving (AuthContext's initial check on cold open), this used to have
 * nothing to show and rendered a blank gap that then popped in once the
 * real prop landed. It now reads authSnapshot.js's cached snapshot
 * synchronously as its own instant-paint fallback for that gap only —
 * scoped to this component rather than seeding AuthContext's shared
 * user/loading state, since that state's history (pwa-first-signin-blank-
 * wizard, Pro-offline-cold-start rounds 1 & 2) showed it's fragile enough
 * that a wider change there risks reintroducing race conditions already
 * fixed once. hasSeenRealUserRef makes sure the fallback can never
 * resurface after a genuine sign-out while this component stays mounted
 * (e.g. tapping Sign Out on AccountScreen) — once a real user has been
 * seen this mount, the cached photo/initials are never shown again, even
 * if `user` goes null again afterward.
 */

import { useState, useRef } from 'react'
import { getCachedAuthSnapshot } from '../../utils/authSnapshot'

// Two-letter initials from the person's full name if set ("Jelil Ajao" ->
// "JA"), otherwise the first two letters of their email. Adopted from
// AccountScreen.jsx's version, which was the most complete of the three
// prior implementations — the other two either only ever showed one
// letter, or handled a single-word name differently.
function getInitials(fullName, email) {
  const trimmedName = fullName?.trim()
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/)
    const first  = parts[0]?.[0] ?? ''
    const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '')
    const initials = (first + second).toUpperCase()
    if (initials) return initials
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return ''
}

/**
 * @param {object} props.user — the signed-in Supabase auth user (for the Google photo URL and email fallback)
 * @param {string} [props.fullName] — the person's name, if set (from the profile, or the live wizard field while editing)
 * @param {object} [props.style] — optional extra styles merged onto the circle/photo (e.g. marginBottom), applied to whichever of the two renders
 */
export default function ProfileAvatar({ user, fullName, style }) {
  // account-avatar-broken-image-fallback: a truthy URL doesn't mean the
  // image actually loads — Google's avatar URLs can 403/expire/CORS-block
  // depending on session state, which would otherwise leave the browser's
  // own broken-image icon showing instead of falling back to initials.
  // This tracks a real load failure, not just URL presence. Carried over
  // unchanged from all three prior implementations.
  const [avatarError, setAvatarError] = useState(false)

  // Lazy-read once per mount — this is a snapshot for the instant-paint
  // gap only, never re-read after mount.
  const [cachedFallback] = useState(() => getCachedAuthSnapshot())

  // Flips true the first time a real user prop is seen this mount, and
  // never flips back. Updated during render (not an effect) — same
  // "have we ever seen X" ref pattern already used elsewhere in this
  // codebase (prevUserRef, pendingFavouriteRef).
  const hasSeenRealUserRef = useRef(false)
  if (user) {
    hasSeenRealUserRef.current = true
  }

  // Only allowed to use the cached fallback while there's no real user
  // yet AND a real user has never been seen this mount — this is what
  // stops a stale cached photo from reappearing after a genuine
  // sign-out while the component stays mounted.
  const canUseFallback = !user && !hasSeenRealUserRef.current

  const realAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const avatarUrl = realAvatarUrl || (canUseFallback ? cachedFallback?.avatarUrl : null) || null

  const fallbackFullName = canUseFallback ? cachedFallback?.fullName : undefined
  const fallbackEmail    = canUseFallback ? cachedFallback?.email    : undefined
  const initials = getInitials(fullName ?? fallbackFullName, user?.email ?? fallbackEmail)

  if (avatarUrl && !avatarError) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setAvatarError(true)}
        style={{
          width:        72,
          height:       72,
          borderRadius: 'var(--radius-full)',
          objectFit:    'cover',
          flexShrink:   0,
          ...style,
        }}
      />
    )
  }

  return (
    <div style={{
      width:           72,
      height:          72,
      borderRadius:    'var(--radius-full)',
      backgroundColor: 'var(--color-accent)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      flexShrink:      0,
      fontSize:        22,
      fontWeight:      600,
      color:           '#fff',
      ...style,
    }}>
      {initials}
    </div>
  )
}
