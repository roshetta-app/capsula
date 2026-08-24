/**
 * src/pages/AccountScreen.jsx
 * Phase F13 Mini-stage 1 — Account page rebuild
 * Phase F13 Mini-stage 5 — Redesigned signed-in view from a flat form
 *             layout into a profile header + tappable settings-list
 *             layout. The inline 5-field profile form has moved to
 *             AccountEditScreen.jsx (reached via the "Edit Profile" row)
 *             — not duplicated, the same fetchOwnProfile/updateOwnProfile
 *             calls now live there instead of here.
 *             Notifications row opens the existing NotificationSheet
 *             (the same Allow/Turn-Off push-permission popup already used
 *             from ConditionsScreen's bell icon) — Capsula has no
 *             notification-history/inbox feature, so this reuses what
 *             already exists rather than building one.
 *             FAQ row navigates to the new AccountFaqScreen (placeholder
 *             content — see that file).
 *             About App row opens the new InfoSheet with placeholder
 *             content — real app description/version/links still needed.
 *             Logout moved from a dedicated full-width button into the
 *             menu list, now behind a ConfirmSheet ("Sign out?") since a
 *             stray tap in a list is easier to make than on the old
 *             standalone button.
 *             Plan / Upgrade to Pro kept, unchanged, under the profile
 *             header (per explicit decision — it wasn't in the row list
 *             but should stay visible).
 * Phase F13 Mini-stage 5 follow-up (2026-08-21) — Further visual refinement
 *             on top of the above, same file, no other files touched:
 *             - Avatar is now a solid accent circle with the user's
 *               initials (from full name if set, else from email) instead
 *               of a generic icon.
 *             - Plan / Upgrade redesigned into one row: plan name on the
 *               left, a pill-style Upgrade button on the right (still
 *               disabled — real upgrade logic is still F8, blocked).
 *             - Logout row removed from the menu list; replaced by its
 *               own full-width, visually distinct button at the very
 *               bottom of the screen, shown only while signed in. Still
 *               gated behind the same ConfirmSheet ("Sign out?") as
 *               before — only where it lives on the page changed.
 *             - Notifications / FAQ / About App menu card is now shown in
 *               both the signed-in and signed-out views (previously
 *               signed-in only) — none of the three actually require a
 *               signed-in user to work.
 * Phase F13 Mini-stage 5 follow-up round 2 (2026-08-21) — Header title is
 *             now "Account & Settings" with a leading icon. Profile card
 *             recentred: avatar, then full name (only if set), then email
 *             with a small mail icon, all stacked and centered. Plan row
 *             replaced: a free-tier user sees a solid-accent "Upgrade to
 *             Capsula PRO" card instead of any plan row at all; a pro-tier
 *             user sees a small row with a "PRO" tag instead. Both are
 *             still non-interactive placeholders — same F8 blocker.
 * Phase F13 Mini-stage 5 follow-up round 3 (2026-08-21) — Profile section
 *             lost its card background/border. Header title shrunk from
 *             22px/700 to 17px/700 with a matching smaller icon.
 * Phase F13 Mini-stage 5 follow-up round 4 (account-screen-redesign,
 *             2026-08-22) — Name/initials now come straight from
 *             AuthContext's shared `profile.fullName` (loads once at app
 *             startup, no per-visit fetch, no flash). Edit Profile moved
 *             from a round pencil button into a pill button under the
 *             email. Profile section's own left/right padding dropped so
 *             the Upgrade/PRO card lines up with the menu card below it.
 *             Avatar, name, and email sized up.
 * Phase F13 Mini-stage 5 follow-up round 5 (account-screen-redesign,
 *             2026-08-22) — Single Notifications/FAQ/About App card split
 *             into two grouped cards: "Settings" (theme toggle — new,
 *             backed by the existing useDarkMode hook — and Notifications)
 *             and "Help & Info" (FAQ, About Capsula, and a new Contact Us
 *             row, currently a stub with no action wired up). "About App"
 *             relabelled "About Capsula" to match the new group's naming.
 *             Overall spacing tightened one step down the app's spacing
 *             scale throughout (card/row padding, section gaps) — the
 *             page was reading as a lot of empty space for how few
 *             controls it actually has.
 * account-screen-visual-refresh (2026-08-22) — Row icons switched from
 *             muted (var(--color-text-secondary) on var(--color-bg)) to
 *             single accent blue (var(--color-accent) on
 *             var(--color-accent-light)) — matches BottomNav's existing
 *             single-brand-accent pattern; no per-row-hue precedent
 *             exists anywhere else in the app for a static settings list,
 *             so this deliberately does not reuse specialtyTokens.js
 *             (that system is per-entity, curated for condition
 *             specialties, not generic UI rows).
 *             Title block is now a sticky, full-bleed bar (breaks out of
 *             Layout's <main> side padding via negative margins, same
 *             visual weight as AccountEditScreen/AccountFaqScreen's own
 *             sticky back-arrow headers) instead of a plain inline title
 *             that scrolled away — this was the one screen in the app
 *             without a sticky header, not a new pattern.
 *             Help & Info reordered to FAQ, Contact Us, Report a Problem,
 *             About Capsula. Two new stub rows added, same no-op
 *             convention as Contact Us (destination not decided yet):
 *             Report a Problem (Help & Info) and a new Legal card
 *             (Terms of Use, Privacy Policy) — split out from Help & Info
 *             since those are compliance documents, not support actions.
 * account-screen-visual-refresh follow-up (2026-08-22) — Sticky title bar's
 *             leading icon now sits in a padding box matching the back
 *             button on AccountEditScreen/AccountFaqScreen (var(--space-1)
 *             padding, 22px icon) so the bar's rendered height and
 *             icon-to-title gap (var(--space-3)) line up exactly with
 *             those two screens' own sticky headers. Every tappable row
 *             (MenuRow, the dark-mode switch, Edit Profile pill, Continue
 *             with Google, Logout) now gets the same press-down scale
 *             feedback already established in BottomNav.jsx (pointerdown/
 *             up/leave driving a transform: scale() transition using the
 *             shared var(--motion-fast)/var(--ease-settle) tokens) — full-
 *             width rows use a lighter scale(0.97) than BottomNav's own
 *             scale(0.92) since an 8% squeeze reads fine on a small icon
 *             button but looks too aggressive on a full-width list row.
 *             Continue with Google button gets an inline Google "G" mark
 *             (GoogleIcon, local to this file) before the label for
 *             credibility — same treatment used industry-wide for this
 *             exact button, not a new visual pattern for the app.
 * account-menu-row-feedback-fix (2026-08-22) — Two fixes to MenuRow's
 *             press feedback, reported after on-device use: (1) the row
 *             divider (borderBottom) used to live directly on the
 *             transformed <button>, so every tap visibly shrank/moved the
 *             divider line along with the row content — dividers are a
 *             static layout element between rows, not something that
 *             should react to a press. Fixed by moving borderBottom onto
 *             a new non-transformed wrapper <div>, with the <button>
 *             (still holding the transform) nested inside it — the
 *             divider now stays perfectly still regardless of press
 *             state. (2) MenuRow's squeeze toned down further,
 *             scale(0.97) → scale(0.98) — still visibly distinct from
 *             rest state but reads calmer for a plain list row. Only
 *             MenuRow changed; ThemeRow's theme-option pills and the
 *             standalone Edit Profile / Continue with Google / Logout
 *             buttons are unaffected (not reported as an issue, and
 *             ThemeRow was never affected by the divider bug since its
 *             border lives on its own non-transformed row wrapper
 *             already).
 * account-header-logout-icon (2026-08-22) — Logout moved out of a
 *             standalone full-width button at the very bottom of the page
 *             into a small icon-only button in the sticky title bar,
 *             right-aligned opposite the UserCog/title on the left. Same
 *             ConfirmSheet ("Sign out?") gate as before — only the
 *             button's location and shape changed, not its behavior.
 * account-upgrade-card-guest-visibility (2026-08-22) — Plan/Upgrade-to-Pro
 *             card was previously nested inside the `{user && (...)}`
 *             block alongside the avatar/name/email profile header, so it
 *             only ever rendered for signed-in users. Split out into its
 *             own block that renders unconditionally, right after the
 *             (still signed-in-only) profile header and before the
 *             signed-out sign-in card. For a guest, `profile` is null, so
 *             `profile?.tier === 'pro'` is false and the free-tier
 *             "Upgrade to Capsula PRO" card shows — same placeholder as
 *             before, still non-interactive (real trial/paywall logic is
 *             F8, still blocked). No visual change for signed-in users;
 *             spacing preserved by moving the outer var(--space-3) bottom
 *             margin onto the new standalone card wrapper.
 * account-header-tweaks (2026-08-23) — Sticky title bar: leading UserCog
 *             icon and its accent-tinted badge circle removed, title now
 *             stands alone. Title font size 17px -> 15px. Logout button
 *             gains a "Log out" text label before its icon (was icon-only).
 * header-skip-country-tweaks (2026-08-23) — Reverses part of the tweak
 *             directly above, same day: leading UserCog icon + its
 *             accent-tinted badge circle are back, title bumped
 *             15px -> 17px (matches AccountEditScreen/AccountFaqScreen
 *             header size), and the Logout icon shrunk 20px -> 16px so it
 *             sits proportionally next to its "Log out" text label.
 *
 * Replaces the old AccountSheet popup as the destination for the bottom-nav
 * Account tab. AccountSheet.jsx itself is untouched — it still backs the
 * separate auto-sign-in-nudge popup (useSignInPrompt / D16), which this task
 * does not touch. This screen reuses the same sign-in busy/error handling
 * pattern AccountSheet already proved on native (see useAuth.js Stage 3 (F6)
 * notes on signInWithGoogle's native behavior), not a copy of its markup.
 *
 * Signed-out: icon, headline, "Continue with Google" CTA, then the same
 * Settings / Help & Info / Legal cards as signed-in.
 * Signed-in: centered profile header (initials avatar, name if set, email,
 * Edit Profile pill), then either an Upgrade-to-Pro card (free tier) or a
 * small PRO-tagged row (pro tier) — real trial/paywall logic is F8, still
 * blocked, see roadmap Section 5 — then Settings, Help & Info, and Legal
 * cards, then a standalone Logout button.
 *
 * Mounted inside the shared Layout group (router.jsx) so BottomNav stays
 * visible; this route's own header is rendered below and the shared Layout
 * header is suppressed for it (see HEADER_SUPPRESSED_ROUTES in layout.jsx).
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, LogOut, ChevronRight, Bell, HelpCircle, Info, UserCog, Mail,
  Sun, Moon, Monitor, MessageCircle, Flag, FileText, ShieldCheck, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getCachedAuthSnapshot } from '../utils/authSnapshot'
import { useDarkMode } from '../hooks/useDarkMode'
import { usePushSubscriptionContext } from '../context/PushSubscriptionContext'
import NotificationSheet from '../components/ui/NotificationSheet'
import InfoSheet from '../components/ui/InfoSheet'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import { ROUTES } from '../router'

// Initials for the avatar circle — from the person's full name if they've
// set one ("Jelil Ajao" -> "JA"), otherwise from their email's first two
// letters. A single fixed accent color is used (not a per-user hash color)
// to match how the rest of the app already uses one consistent accent
// rather than per-item theming.
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

// Google "G" mark — local to this file, used only on the Continue with
// Google button so the CTA reads as a real Google sign-in rather than a
// generic accent-colored button (credibility, not a new icon system).
function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}

// Same press-down scale used on BottomNav (pointerdown/up/leave driving a
// transform via var(--motion-fast)/var(--ease-settle)), just a lighter
// scale for a full-width row than BottomNav's small icon buttons use.
// account-menu-row-feedback-fix: the row divider now lives on this outer,
// non-transformed wrapper — previously it lived directly on the <button>
// below, so every press visibly shrank/moved the divider line along with
// the row's own content. The <button> inside still carries the transform,
// now scale(0.98) (was 0.97) — one notch calmer, since even the lighter
// full-width-row scale still read as too aggressive in practice.
function MenuRow({ icon, label, stateLabel, onClick, last }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div style={{
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
    }}>
      <button
        onClick={onClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          width:                   '100%',
          display:                 'flex',
          alignItems:              'center',
          gap:                     'var(--space-3)',
          padding:                 'var(--space-3)',
          border:                  'none',
          backgroundColor:         'transparent',
          fontFamily:              'var(--font-body)',
          textAlign:               'left',
          cursor:                  'pointer',
          transform:               pressed ? 'scale(0.98)' : 'scale(1)',
          transition:              'transform var(--motion-fast) var(--ease-settle)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* account-screen-visual-refresh: single accent blue (was muted
            text-secondary on a neutral bg) — see file header note. */}
        <div style={{
          width:           32,
          height:          32,
          borderRadius:    'var(--radius-full)',
          backgroundColor: 'var(--color-accent-light)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
          color:           'var(--color-accent)',
        }}>
          {icon}
        </div>
        <span style={{
          flex:       1,
          fontSize:   14,
          fontWeight: 500,
          color:      'var(--color-text-primary)',
        }}>
          {label}
        </span>
        {stateLabel && (
          <span style={{
            fontSize:   13,
            fontWeight: 500,
            color:      'var(--color-text-tertiary)',
          }}>
            {stateLabel}
          </span>
        )}
        <ChevronRight size={18} color="var(--color-text-tertiary)" />
      </button>
    </div>
  )
}

// Same row shell as MenuRow but with a switch on the right instead of a
// chevron — this row toggles a setting in place rather than navigating
// anywhere, so it isn't a <button> itself (the switch is).
// account-theme-sync: replaces the old Dark Mode on/off ToggleRow with a
// real 3-way Light/Dark/System control. Same row shell (icon circle +
// label) as MenuRow/the old ToggleRow above, so it doesn't stand out.
const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  Icon: Sun },
  { value: 'dark',   label: 'Dark',   Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

function ThemeRow({ theme, onChange, last }) {
  const [pressedOption, setPressedOption] = useState(null)
  return (
    <div
      style={{
        width:        '100%',
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-3)',
        padding:      'var(--space-3)',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      {/* account-screen-visual-refresh: single accent blue, same as MenuRow above. */}
      <div style={{
        width:           32,
        height:          32,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-accent-light)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        color:           'var(--color-accent)',
      }}>
        <Monitor size={17} strokeWidth={1.8} />
      </div>
      <span style={{
        flex:       1,
        fontSize:   14,
        fontWeight: 500,
        color:      'var(--color-text-primary)',
      }}>
        Appearance
      </span>
      <div style={{
        display:         'flex',
        backgroundColor: 'var(--color-bg)',
        borderRadius:    'var(--radius-full)',
        padding:         3,
        gap:             2,
      }}>
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value
          const pressed = pressedOption === value
          return (
            <button
              key={value}
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(value)}
              onPointerDown={() => setPressedOption(value)}
              onPointerUp={() => setPressedOption(null)}
              onPointerLeave={() => setPressedOption(null)}
              style={{
                border:                  'none',
                padding:                 'var(--space-1) var(--space-2)',
                borderRadius:            'var(--radius-full)',
                display:                 'flex',
                alignItems:              'center',
                cursor:                  'pointer',
                backgroundColor:         active ? 'var(--color-accent)' : 'transparent',
                color:                   active ? '#fff' : 'var(--color-text-secondary)',
                transform:               pressed ? 'scale(0.9)' : 'scale(1)',
                transition:              'background-color var(--motion-base) var(--ease-reveal), color var(--motion-base) var(--ease-reveal), transform var(--motion-fast) var(--ease-settle)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={14} strokeWidth={1.8} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// profile-nudge-system: same physician-occupation check AccountEditScreen.jsx
// already uses to decide whether Specialty applies to this person — kept in
// sync with that file rather than imported, since it's a two-value string
// comparison, not worth its own shared util for this.
function isPhysicianOccupation(occupation) {
  return occupation === 'Specialist Physician' || occupation === 'Resident Physician'
}

// profile-nudge-banner-redesign: counts how many required fields are
// filled in, out of how many apply to this person. Email is counted as
// always-filled (base 1 of 5, or 1 of 6 for a physician) — every signed-in
// user has one by definition (Google sign-in), so treating it as real
// progress means the bar is never fully empty, even on a totally blank
// profile. The other 4 (name, phone, occupation, country) are counted
// normally, plus specialty for physicians only.
function getProfileCompleteness(data) {
  let total = 5     // email (always) + name + phone + occupation + country
  let completed = 1 // email always counts
  if (data?.fullName?.trim())   completed++
  if (data?.phoneNumber?.trim()) completed++
  if (data?.occupation?.trim()) completed++
  if (data?.country?.trim())    completed++
  if (isPhysicianOccupation(data?.occupation)) {
    total += 1
    if (data?.specialty?.trim()) completed++
  }
  return { completed, total }
}

// profile-nudge-banner-redesign: persistent, non-dismissible reminder
// shown near the top of the signed-in view whenever completed < total. No
// dismiss/close control by design (independent of wizard-skip state, it
// should stay until the fields are actually filled) — tapping it is the
// only way to act on it, same press-feedback convention as the Edit
// Profile pill above it. Option B from the redesign discussion: title +
// a slim progress bar only, no fraction/percentage text underneath.
function ProfileNudgeCard({ completed, total, onClick }) {
  const [pressed, setPressed] = useState(false)
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width:                   '100%',
        display:                 'flex',
        alignItems:              'center',
        gap:                     'var(--space-3)',
        padding:                 'var(--space-3) var(--space-4)',
        borderRadius:            'var(--radius-lg)',
        border:                  '1px solid var(--color-accent)',
        backgroundColor:         'color-mix(in srgb, var(--color-accent) 10%, transparent)',
        textAlign:               'left',
        cursor:                  'pointer',
        marginBottom:            'var(--space-3)',
        transform:               pressed ? 'scale(0.98)' : 'scale(1)',
        transition:              'transform var(--motion-fast) var(--ease-settle)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <AlertCircle size={20} strokeWidth={1.8} color="var(--color-accent)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          Finish setting up your profile
        </div>
        <div style={{
          width:           '100%',
          height:          6,
          borderRadius:    'var(--radius-full)',
          backgroundColor: 'var(--color-border)',
          overflow:        'hidden',
        }}>
          <div style={{
            width:           `${percent}%`,
            height:          '100%',
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'var(--color-accent)',
            transition:      'width var(--motion-fast) var(--ease-settle)',
          }} />
        </div>
      </div>
      <ChevronRight size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize:      12,
      fontWeight:    600,
      color:         'var(--color-text-secondary)',
      marginBottom:  'var(--space-2)',
      paddingLeft:   2,
    }}>
      {children}
    </div>
  )
}

export default function AccountScreen() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth()
  const { theme, setTheme } = useDarkMode()
  const { subscribed: notificationsOn } = usePushSubscriptionContext()
  const navigate = useNavigate()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const [googlePressed, setGooglePressed] = useState(false)
  const [editPressed, setEditPressed] = useState(false)
  const [logoutPressed, setLogoutPressed] = useState(false)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [aboutOpen, setAboutOpen]                 = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  // account-avatar-broken-image-fallback: a truthy URL doesn't mean the
  // image actually loads — Google's avatar URLs can 403/expire/CORS-block
  // depending on session state, which previously left the browser's own
  // broken-image icon showing instead of falling back to initials. This
  // tracks a real load failure, not just URL presence.
  // react-310-hooks-order-fix (2026-08-22): this hook used to sit below
  // the `if (loading) return null` early return further down — on the
  // render where loading was still true, React never ran this hook at
  // all, then ran it on every render after loading flipped to false,
  // which is exactly what triggers React error #310 ("rendered more
  // hooks than during the previous render"). Every hook must run
  // unconditionally on every render, so it moves up here with the rest.
  const [avatarError, setAvatarError] = useState(false)
  // account-avatar-flash-fix (2026-08-24): tracks whether the photo has
  // actually finished loading — separate from avatarError above, which
  // only tracks a real load failure. Lets the initials circle stay
  // visible underneath the whole time, with the real photo fading in
  // over it once it's ready, instead of there being a gap with nothing
  // shown while the photo is in flight.
  const [avatarLoaded, setAvatarLoaded] = useState(false)

  // account-instant-load (2026-08-24): read once, on mount only — this is
  // only ever used as a placeholder for the brief window while the real
  // check (`loading` below) is still running, so it never needs to react
  // to anything changing after that.
  const [snapshot] = useState(() => getCachedAuthSnapshot())

  // profile-nudge-instant-load: completeness is now computed directly from
  // AuthContext's `profile`, which already carries phone/occupation/
  // country/specialty as of the fix in AuthContext.jsx — no separate fetch,
  // no wait. `profile` is null until AuthContext's own load finishes, at
  // which point `loading` (checked below) has already gone false, so by
  // the time this ever renders, completeness is already known — this is
  // what removes the beat-long delay before the banner used to appear.
  const completeness = user ? getProfileCompleteness(profile) : null

  async function handleGoogleSignIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error: authError } = await signInWithGoogle()
    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Please try again.')
    }
    // Same reset-on-every-path fix AccountSheet.jsx uses (Stage 3 F6,
    // 2026-08-13) — on native, signInWithGoogle() only opens the system
    // browser and returns immediately, so busy must clear here rather than
    // waiting on a navigation that never happens on this platform.
    setBusy(false)
  }

  async function handleSignOut() {
    if (busy) return
    setBusy(true)
    await signOut()
    setBusy(false)
  }

  // Contact Us, Report a Problem, Terms of Use, Privacy Policy — all stubs
  // for now, no destinations decided yet. Deliberately no-ops rather than
  // left unwired, so each row is real and tappable (matches the rest of
  // the card) without pretending to go anywhere yet.
  function handleContactUs() {}
  function handleReportProblem() {}
  function handleTermsOfUse() {}
  function handlePrivacyPolicy() {}

  // account-instant-load (2026-08-24): previously this waited for
  // AuthContext's real check every single time, which is exactly what
  // made this screen feel slower to open than the others — a blank
  // screen on every visit while the check re-ran. Now, if there's a
  // remembered snapshot from last time, fall through and show that
  // instead of blocking — the real check still runs in the background
  // and quietly takes over the moment it resolves (see `fullName`,
  // `displayEmail`, `avatarUrl` below). Only a true first-ever visit,
  // with no snapshot yet, still shows nothing until the real check
  // finishes — there's nothing to show in that one case.
  const showingProvisional = loading && !!snapshot
  if (loading && !snapshot) return null

  const fullName    = showingProvisional ? snapshot.fullName : profile?.fullName
  const displayEmail = showingProvisional ? snapshot.email : user?.email
  const initials     = (user || showingProvisional) ? getInitials(fullName, displayEmail) : ''
  // account-avatar-google-pic: same source AccountEditScreen.jsx and
  // ProfileWizard.jsx already read — live Google avatar, never
  // uploaded/stored separately. Falls back to the initials circle below
  // when signed in without a photo (or on a non-Google-avatar session).
  // account-instant-load: uses the remembered photo while provisional,
  // same fallback chain otherwise.
  const avatarUrl = showingProvisional
    ? snapshot.avatarUrl
    : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null)

  return (
    <div>
      {/* account-screen-visual-refresh: sticky, full-bleed title bar —
          breaks out of Layout's <main> side padding (var(--space-6) each
          side) via negative margins, same visual weight as
          AccountEditScreen/AccountFaqScreen's own sticky back-arrow
          headers. This was the one screen in the app without a sticky
          header (Layout's shared header is sticky; both Account sub-pages
          already use a sticky bar) — not a new pattern, just adopting the
          one everywhere else already uses. */}
      <div style={{
        position:        'sticky',
        top:             0,
        zIndex:          50,
        marginLeft:      'calc(-1 * var(--space-6))',
        marginRight:     'calc(-1 * var(--space-6))',
        backgroundColor: 'var(--color-bg)',
        padding:         'var(--space-5) var(--space-6) var(--space-3)',
        marginBottom:    'var(--space-5)',
      }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            'var(--space-3)',
          maxWidth:       680,
          margin:         '0 auto',
        }}>
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--space-3)',
          }}>
            {/* header-skip-country-tweaks (2026-08-23): leading icon
                restored — same accent-tinted badge-circle treatment
                MenuRow already uses for its own icons below (32px circle,
                var(--color-accent-light) fill, icon in var(--color-accent)),
                not a new pattern. Title bumped 15px -> 17px to match, same
                size AccountEditScreen/AccountFaqScreen already use for
                their own sticky headers. */}
            <div style={{
              width:           32,
              height:          32,
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-accent-light)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
              color:           'var(--color-accent)',
            }}>
              <UserCog size={18} strokeWidth={1.8} />
            </div>
            <h1 style={{
              margin:     0,
              fontSize:   17,
              fontWeight: 700,
              color:      'var(--color-text-primary)',
            }}>
              Account &amp; Settings
            </h1>
          </div>

          {/* account-header-logout-icon: Logout moved from a standalone
              full-width button at the bottom of the page into a small icon
              button here, right-aligned in the sticky title bar — same
              padding-box treatment as the leading UserCog icon above so it
              lines up vertically, still gated behind the same ConfirmSheet
              ("Sign out?") as before. Only the icon's location changed.
              account-instant-load: shown during the provisional state too
              — it triggers the real signOut() from context either way,
              so there's no risk in it appearing a beat before the real
              check confirms. */}
          {(user || showingProvisional) && (
            <button
              onClick={() => setSignOutConfirmOpen(true)}
              onPointerDown={() => setLogoutPressed(true)}
              onPointerUp={() => setLogoutPressed(false)}
              onPointerLeave={() => setLogoutPressed(false)}
              aria-label="Log out"
              style={{
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                gap:                     6,
                padding:                 'var(--space-1) var(--space-2)',
                border:                  'none',
                background:              'transparent',
                cursor:                  'pointer',
                flexShrink:              0,
                transform:               logoutPressed ? 'scale(0.9)' : 'scale(1)',
                transition:              'transform var(--motion-fast) var(--ease-settle)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                fontSize:   13,
                fontWeight: 600,
                color:      'var(--color-danger)',
              }}>
                Log out
              </span>
              {/* header-skip-country-tweaks (2026-08-23): shrunk
                  20px -> 16px so it reads proportional to the "Log out"
                  text label added alongside it in the prior session —
                  same rough icon-to-text ratio as the Manage Profile
                  pill's UserCog(14)/text(13) pairing below. */}
              <LogOut size={16} strokeWidth={1.8} color="var(--color-danger)" />
            </button>
          )}
        </div>
      </div>

      {/* account-instant-load: renders during the provisional state too,
          using the remembered snapshot values above (fullName,
          displayEmail, avatarUrl already account for this) — this is the
          part of the screen meant to appear instantly. The completeness
          banner and Upgrade/PRO card further down stay gated on the real
          `user`/`completeness` values, so they intentionally still wait
          for the real check. */}
      {(user || showingProvisional) && (
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          textAlign:      'center',
          marginBottom:   'var(--space-4)',
        }}>
          {/* account-avatar-flash-fix: initials circle is always in the
              DOM now (not just when there's no photo), so there's never a
              gap with nothing shown. The real photo, when present and not
              errored, sits on top and fades in via opacity once it
              actually finishes loading (onLoad), instead of appearing (or
              failing) abruptly. `key={avatarUrl}` resets the fade-in state
              if the photo URL itself ever changes (e.g. after switching
              Google accounts) rather than carrying over a stale loaded
              state for a different image. */}
          <div style={{
            position:     'relative',
            width:        72,
            height:       72,
            flexShrink:   0,
            marginBottom: 'var(--space-2)',
          }}>
            <div style={{
              position:        'absolute',
              inset:           0,
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-accent)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        22,
              fontWeight:      600,
              color:           '#fff',
            }}>
              {initials}
            </div>
            {avatarUrl && !avatarError && (
              <img
                key={avatarUrl}
                src={avatarUrl}
                alt=""
                onLoad={() => setAvatarLoaded(true)}
                onError={() => setAvatarError(true)}
                style={{
                  position:     'absolute',
                  inset:        0,
                  width:        '100%',
                  height:       '100%',
                  borderRadius: 'var(--radius-full)',
                  objectFit:    'cover',
                  opacity:      avatarLoaded ? 1 : 0,
                  transition:   'opacity var(--motion-fast) var(--ease-settle)',
                }}
              />
            )}
          </div>

          {fullName?.trim() && (
            <div style={{
              fontSize:     19,
              fontWeight:   600,
              color:        'var(--color-text-primary)',
              marginBottom: 4,
            }}>
              {fullName.trim()}
            </div>
          )}

          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--space-1)',
            color:      'var(--color-text-secondary)',
            marginBottom: 'var(--space-2)',
          }}>
            <Mail size={15} strokeWidth={1.8} />
            <span style={{ fontSize: 15 }}>{displayEmail}</span>
          </div>

          <button
            onClick={() => navigate(ROUTES.ACCOUNT_EDIT)}
            onPointerDown={() => setEditPressed(true)}
            onPointerUp={() => setEditPressed(false)}
            onPointerLeave={() => setEditPressed(false)}
            style={{
              display:                 'inline-flex',
              alignItems:              'center',
              gap:                     'var(--space-2)',
              padding:                 'var(--space-2) var(--space-4)',
              borderRadius:            'var(--radius-full)',
              border:                  '1px solid var(--color-border)',
              backgroundColor:         'var(--color-surface)',
              color:                   'var(--color-text-primary)',
              fontSize:                13,
              fontWeight:              600,
              fontFamily:              'var(--font-body)',
              cursor:                  'pointer',
              transform:               editPressed ? 'scale(0.97)' : 'scale(1)',
              transition:              'transform var(--motion-fast) var(--ease-settle)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <UserCog size={14} strokeWidth={1.8} />
            Manage Profile
          </button>
        </div>
      )}

      {/* account-instant-load: also held back during the provisional
          state — a remembered snapshot means someone was signed in last
          time, so showing "sign in" here would be wrong for that brief
          window even though `user` itself hasn't resolved yet. */}
      {!user && !showingProvisional && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          padding:         'var(--space-5) var(--space-4)',
          textAlign:       'center',
          marginBottom:    'var(--space-3)',
        }}>
          <div style={{
            width:           48,
            height:          48,
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'var(--color-bg)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            margin:          '0 auto var(--space-3)',
          }}>
            <User size={22} color="var(--color-text-secondary)" strokeWidth={1.8} />
          </div>

          <div style={{
            fontSize:     16,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            Sign in or create account
          </div>
          <p style={{
            margin:     '0 0 var(--space-4)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            Sync your favourites across devices with your Google account.
          </p>

          {error && (
            <div style={{
              fontSize:        13,
              color:           '#DC2626',
              backgroundColor: '#FEF2F2',
              border:          '1px solid #FECACA',
              borderRadius:    'var(--radius-sm)',
              padding:         'var(--space-2) var(--space-3)',
              lineHeight:      1.4,
              marginBottom:    'var(--space-3)',
              textAlign:       'left',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            onPointerDown={() => setGooglePressed(true)}
            onPointerUp={() => setGooglePressed(false)}
            onPointerLeave={() => setGooglePressed(false)}
            disabled={busy}
            style={{
              width:                   '100%',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     'var(--space-2)',
              padding:                 'var(--space-2) var(--space-4)',
              borderRadius:            'var(--radius-sm)',
              border:                  'none',
              backgroundColor:         busy ? 'var(--color-border)' : 'var(--color-accent)',
              color:                   busy ? 'var(--color-text-tertiary)' : '#fff',
              fontSize:                14,
              fontWeight:              600,
              fontFamily:              'var(--font-body)',
              cursor:                  busy ? 'not-allowed' : 'pointer',
              transform:               googlePressed ? 'scale(0.97)' : 'scale(1)',
              transition:              'transform var(--motion-fast) var(--ease-settle)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {!busy && (
              <span style={{
                display:         'inline-flex',
                backgroundColor: '#fff',
                borderRadius:    'var(--radius-sm)',
                padding:         2,
              }}>
                <GoogleIcon size={16} />
              </span>
            )}
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
        </div>
      )}

      {/* profile-nudge-system: signed-in only, independent of whether the
          wizard was ever formally completed — driven purely by whether
          the required fields are actually filled in.
          open-wizard-directly: passes an explicit flag so tapping this
          always opens the wizard, even for someone who already dismissed
          setup once (e.g. via Skip) — AccountEditScreen only opened the
          wizard automatically for a never-dismissed profile before. */}
      {user && completeness && completeness.completed < completeness.total && (
        <ProfileNudgeCard
          completed={completeness.completed}
          total={completeness.total}
          onClick={() => navigate(ROUTES.ACCOUNT_EDIT, { state: { openWizard: true } })}
        />
      )}

      {/* account-upgrade-card-guest-visibility: renders regardless of
          sign-in state (previously nested inside the profile-header block
          above, signed-in only). For a guest, profile is null, so this
          always resolves to the free-tier Upgrade card — still a
          non-interactive placeholder, real trial/paywall logic is F8,
          still blocked on an undecided business question (roadmap
          Section 5). Moved below the guest sign-in card (was above) per
          explicit placement request, same day. */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        {profile?.tier === 'pro' ? (
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             'var(--space-2)',
            padding:         'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--color-bg)',
            borderRadius:    'var(--radius-sm)',
          }}>
            <span style={{
              display:       'inline-block',
              backgroundColor: 'var(--color-accent)',
              color:         '#fff',
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: '0.04em',
              padding:       '2px 6px',
              borderRadius:  4,
            }}>
              PRO
            </span>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>plan</span>
          </div>
        ) : (
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            gap:             'var(--space-3)',
            padding:         'var(--space-3)',
            backgroundColor: 'var(--color-accent)',
            borderRadius:    'var(--radius-lg)',
          }}>
            <div>
              <div style={{
                fontSize:     14,
                fontWeight:   600,
                color:        '#fff',
                marginBottom: 2,
              }}>
                Upgrade to Capsula{' '}
                <span style={{
                  display:       'inline-block',
                  backgroundColor: '#fff',
                  color:         'var(--color-accent)',
                  fontSize:      10,
                  fontWeight:    700,
                  letterSpacing: '0.04em',
                  padding:       '2px 6px',
                  borderRadius:  4,
                  verticalAlign: 'middle',
                }}>
                  PRO
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                Unlock the full drug &amp; condition library
              </div>
            </div>
            <ChevronRight size={18} color="#fff" style={{ flexShrink: 0 }} />
          </div>
        )}
      </div>

      <SectionLabel>Settings</SectionLabel>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius:    'var(--radius-lg)',
        border:          '1px solid var(--color-border)',
        overflow:        'hidden',
        marginBottom:    'var(--space-3)',
      }}>
        <ThemeRow
          theme={theme}
          onChange={setTheme}
        />
        <MenuRow
          icon={<Bell size={17} strokeWidth={1.8} />}
          label="Notifications"
          stateLabel={notificationsOn ? 'On' : 'Off'}
          onClick={() => setNotificationsOpen(true)}
          last
        />
      </div>

      {/* account-screen-visual-refresh: reordered FAQ, Contact Us, Report
          a Problem, About Capsula. Report a Problem is new (stub). */}
      <SectionLabel>Help &amp; Info</SectionLabel>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius:    'var(--radius-lg)',
        border:          '1px solid var(--color-border)',
        overflow:        'hidden',
        marginBottom:    'var(--space-3)',
      }}>
        <MenuRow
          icon={<HelpCircle size={17} strokeWidth={1.8} />}
          label="FAQ"
          onClick={() => navigate(ROUTES.ACCOUNT_FAQ)}
        />
        <MenuRow
          icon={<MessageCircle size={17} strokeWidth={1.8} />}
          label="Contact Us"
          onClick={handleContactUs}
        />
        <MenuRow
          icon={<Flag size={17} strokeWidth={1.8} />}
          label="Report a Problem"
          onClick={handleReportProblem}
        />
        <MenuRow
          icon={<Info size={17} strokeWidth={1.8} />}
          label="About Capsula"
          onClick={() => setAboutOpen(true)}
          last
        />
      </div>

      {/* account-screen-visual-refresh: new card, split out of Help &
          Info — Terms of Use and Privacy Policy are compliance documents,
          not support actions, so they get their own group. Both stubs. */}
      <SectionLabel>Legal</SectionLabel>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius:    'var(--radius-lg)',
        border:          '1px solid var(--color-border)',
        overflow:        'hidden',
        marginBottom:    user ? 'var(--space-3)' : 0,
      }}>
        <MenuRow
          icon={<FileText size={17} strokeWidth={1.8} />}
          label="Terms of Use"
          onClick={handleTermsOfUse}
        />
        <MenuRow
          icon={<ShieldCheck size={17} strokeWidth={1.8} />}
          label="Privacy Policy"
          onClick={handlePrivacyPolicy}
          last
        />
      </div>

      <NotificationSheet
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <InfoSheet
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About Capsula"
      >
        {/* PLACEHOLDER — real app description, version, and links needed
            before shipping. */}
        Capsula — placeholder description text. Version, links, and real
        copy still needed here.
      </InfoSheet>

      <ConfirmSheet
        isOpen={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={handleSignOut}
        title="Sign out?"
        message="You can sign back in with Google anytime."
        confirmLabel={busy ? 'Signing out…' : 'Sign out'}
        destructive
      />
    </div>
  )
}
