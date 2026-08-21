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
 *
 * Replaces the old AccountSheet popup as the destination for the bottom-nav
 * Account tab. AccountSheet.jsx itself is untouched — it still backs the
 * separate auto-sign-in-nudge popup (useSignInPrompt / D16), which this task
 * does not touch. This screen reuses the same sign-in busy/error handling
 * pattern AccountSheet already proved on native (see useAuth.js Stage 3 (F6)
 * notes on signInWithGoogle's native behavior), not a copy of its markup.
 *
 * Signed-out: icon, headline, "Continue with Google" CTA — unchanged.
 * Signed-in: profile header (avatar, email, member-since date), Plan/
 * Upgrade-to-Pro placeholder (real trial/paywall logic is F8, still
 * blocked — see roadmap Section 5), then a menu-list card: Edit Profile,
 * Notifications, FAQ, About App, Logout.
 *
 * Mounted inside the shared Layout group (router.jsx) so BottomNav stays
 * visible; this route's own header is rendered below and the shared Layout
 * header is suppressed for it (see HEADER_SUPPRESSED_ROUTES in layout.jsx).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, LogOut, ChevronRight, UserCog, Bell, HelpCircle, Info,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import NotificationSheet from '../components/ui/NotificationSheet'
import InfoSheet from '../components/ui/InfoSheet'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import { ROUTES } from '../router'

function formatMemberSince(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function MenuRow({ icon, label, onClick, last }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:           '100%',
        display:         'flex',
        alignItems:      'center',
        gap:             'var(--space-3)',
        padding:         'var(--space-4)',
        border:          'none',
        borderBottom:    last ? 'none' : '1px solid var(--color-border)',
        backgroundColor: 'transparent',
        fontFamily:      'var(--font-body)',
        textAlign:       'left',
        cursor:          'pointer',
      }}
    >
      <div style={{
        width:           32,
        height:          32,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-bg)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        color:           'var(--color-text-secondary)',
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

export default function AccountScreen() {
  const { user, profile, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

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

  return (
    <div style={{ paddingTop: 'var(--space-6)' }}>
      <h1 style={{
        margin:       0,
        marginBottom: 'var(--space-6)',
        fontSize:     22,
        fontWeight:   700,
        color:        'var(--color-text-primary)',
      }}>
        Account
      </h1>

      {user && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          padding:         'var(--space-5)',
          marginBottom:    'var(--space-4)',
        }}>
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-3)',
            marginBottom: 'var(--space-5)',
          }}>
            <div style={{
              width:           44,
              height:          44,
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-accent)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <User size={22} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize:     15,
                fontWeight:   600,
                color:        'var(--color-text-primary)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>
                {user.email}
              </div>
              {formatMemberSince(user.created_at) && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Member since {formatMemberSince(user.created_at)}
                </div>
              )}
            </div>
          </div>

          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-bg)',
            borderRadius:    'var(--radius-sm)',
            marginBottom:    'var(--space-3)',
          }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Plan</span>
            <span style={{
              fontSize:      13,
              fontWeight:    600,
              color:         'var(--color-text-primary)',
              textTransform: 'capitalize',
            }}>
              {profile?.tier ?? 'Free'}
            </span>
          </div>

          {/* Placeholder only — real trial/paywall logic is F8, still
              blocked on an undecided business question (roadmap Section 5). */}
          <button
            disabled
            style={{
              width:           '100%',
              padding:         'var(--space-3) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color:           'var(--color-text-tertiary)',
              fontSize:        14,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          'not-allowed',
            }}
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {user && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          overflow:        'hidden',
        }}>
          <MenuRow
            icon={<UserCog size={17} strokeWidth={1.8} />}
            label="Edit Profile"
            onClick={() => navigate(ROUTES.ACCOUNT_EDIT)}
          />
          <MenuRow
            icon={<Bell size={17} strokeWidth={1.8} />}
            label="Notifications"
            onClick={() => setNotificationsOpen(true)}
          />
          <MenuRow
            icon={<HelpCircle size={17} strokeWidth={1.8} />}
            label="FAQ"
            onClick={() => navigate(ROUTES.ACCOUNT_FAQ)}
          />
          <MenuRow
            icon={<Info size={17} strokeWidth={1.8} />}
            label="About App"
            onClick={() => setAboutOpen(true)}
          />
          <MenuRow
            icon={<LogOut size={17} strokeWidth={1.8} />}
            label="Logout"
            onClick={() => setSignOutConfirmOpen(true)}
            last
          />
        </div>
      )}

      {!user && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          padding:         'var(--space-6) var(--space-5)',
          textAlign:       'center',
        }}>
          <div style={{
            width:           56,
            height:          56,
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'var(--color-bg)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            margin:          '0 auto var(--space-4)',
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
            margin:     '0 0 var(--space-5)',
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
              marginBottom:    'var(--space-4)',
              textAlign:       'left',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={busy}
            style={{
              width:           '100%',
              padding:         'var(--space-3) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          'none',
              backgroundColor: busy ? 'var(--color-border)' : 'var(--color-accent)',
              color:           busy ? 'var(--color-text-tertiary)' : '#fff',
              fontSize:        14,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
        </div>
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
