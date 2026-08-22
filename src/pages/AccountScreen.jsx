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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, LogOut, ChevronRight, Pencil, Bell, HelpCircle, Info, UserCog, Mail,
  Sun, Moon, Monitor, MessageCircle, Flag, FileText, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDarkMode } from '../hooks/useDarkMode'
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
function MenuRow({ icon, label, onClick, last }) {
  const [pressed, setPressed] = useState(false)
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
        padding:                 'var(--space-3)',
        border:                  'none',
        borderBottom:            last ? 'none' : '1px solid var(--color-border)',
        backgroundColor:         'transparent',
        fontFamily:              'var(--font-body)',
        textAlign:               'left',
        cursor:                  'pointer',
        transform:               pressed ? 'scale(0.97)' : 'scale(1)',
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
      <ChevronRight size={18} color="var(--color-text-tertiary)" />
    </button>
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
  const navigate = useNavigate()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const [googlePressed, setGooglePressed] = useState(false)
  const [editPressed, setEditPressed] = useState(false)
  const [logoutPressed, setLogoutPressed] = useState(false)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [aboutOpen, setAboutOpen]                 = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)

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

  // Same convention AccountEditScreen.jsx uses — wait for AuthContext's
  // initial session+profile check to resolve before rendering, so nothing
  // (avatar, name, email) ever flashes empty/wrong for a moment first.
  if (loading) return null

  const fullName = profile?.fullName
  const initials = user ? getInitials(fullName, user.email) : ''

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
        backgroundColor: 'var(--color-surface)',
        borderBottom:    '1px solid var(--color-border)',
        padding:         'var(--space-3) var(--space-6)',
        marginBottom:    'var(--space-5)',
      }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        'var(--space-3)',
          maxWidth:   680,
          margin:     '0 auto',
        }}>
          {/* Padding box matches the back button's box model on
              AccountEditScreen/AccountFaqScreen (var(--space-1) padding,
              22px icon) so this bar's height lines up with theirs even
              though this icon isn't a button. */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            padding:    'var(--space-1)',
          }}>
            <UserCog size={22} strokeWidth={1.8} color="var(--color-text-secondary)" />
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
      </div>

      {user && (
        <div style={{
          marginBottom: 'var(--space-3)',
        }}>
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            textAlign:      'center',
            marginBottom:   'var(--space-4)',
          }}>
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
              marginBottom:    'var(--space-2)',
            }}>
              {initials}
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
              <span style={{ fontSize: 15 }}>{user.email}</span>
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
              <Pencil size={14} strokeWidth={1.8} />
              Edit Profile
            </button>
          </div>

          {/* Real trial/paywall logic is F8, still blocked on an undecided
              business question (roadmap Section 5) — this card is a
              non-interactive placeholder, not yet wired to anything. */}
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
      )}

      {!user && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          padding:         'var(--space-5) var(--space-4)',
          textAlign:       'center',
          marginBottom:    'var(--space-3)',
        }}>
          <div style={{
            width:           56,
            height:          56,
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'var(--color-bg)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            margin:          '0 auto var(--space-3)',
          }}>
            <User size={28} color="var(--color-text-secondary)" strokeWidth={1.8} />
          </div>

          <div style={{
            fontSize:     16,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            Create a free account
          </div>
          <p style={{
            margin:     '0 0 var(--space-4)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            Sign in with Google to keep your favourites synced across devices.
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

      {user && (
        <button
          onClick={() => setSignOutConfirmOpen(true)}
          onPointerDown={() => setLogoutPressed(true)}
          onPointerUp={() => setLogoutPressed(false)}
          onPointerLeave={() => setLogoutPressed(false)}
          style={{
            width:                   '100%',
            display:                 'flex',
            alignItems:              'center',
            justifyContent:          'center',
            gap:                     'var(--space-2)',
            padding:                 'var(--space-3)',
            borderRadius:            'var(--radius-lg)',
            border:                  '1px solid var(--color-danger)',
            backgroundColor:         'var(--color-surface)',
            color:                   'var(--color-danger)',
            fontSize:                14,
            fontWeight:              600,
            fontFamily:              'var(--font-body)',
            cursor:                  'pointer',
            transform:               logoutPressed ? 'scale(0.97)' : 'scale(1)',
            transition:              'transform var(--motion-fast) var(--ease-settle)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <LogOut size={17} strokeWidth={1.8} />
          Logout
        </button>
      )}

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
