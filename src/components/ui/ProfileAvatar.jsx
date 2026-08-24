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
 */

import { useState } from 'react'

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

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const initials  = getInitials(fullName, user?.email)

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
