/**
 * src/pages/AccountScreen.jsx
 * Phase F13 Mini-stage 1 — Account page rebuild
 *
 * Replaces the old AccountSheet popup as the destination for the bottom-nav
 * Account tab. AccountSheet.jsx itself is untouched — it still backs the
 * separate auto-sign-in-nudge popup (useSignInPrompt / D16), which this task
 * does not touch. This screen reuses the same sign-in busy/error handling
 * pattern AccountSheet already proved on native (see useAuth.js Stage 3 (F6)
 * notes on signInWithGoogle's native behavior), not a copy of its markup.
 *
 * Signed-out: icon, headline, "Continue with Google" CTA.
 * Signed-in: email, member-since date (user.created_at), plan/tier
 * (profile.tier), a disabled "Upgrade to Pro" placeholder (real trial/
 * paywall logic is F8, still blocked on an undecided business question —
 * see roadmap Section 5), and sign out.
 *
 * Mounted inside the shared Layout group (router.jsx) so BottomNav stays
 * visible; this route's own header is rendered below and the shared Layout
 * header is suppressed for it (see HEADER_SUPPRESSED_ROUTES in layout.jsx).
 */

import { useState } from 'react'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

function formatMemberSince(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function AccountScreen() {
  const { user, profile, signInWithGoogle, signOut } = useAuth()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

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

      {user ? (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          padding:         'var(--space-5)',
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
              marginBottom:    'var(--space-5)',
            }}
          >
            Upgrade to Pro
          </button>

          <button
            onClick={handleSignOut}
            disabled={busy}
            style={{
              width:           '100%',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             'var(--space-2)',
              padding:         'var(--space-3) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          'none',
              backgroundColor: busy ? 'var(--color-border)' : 'var(--color-danger)',
              color:           busy ? 'var(--color-text-tertiary)' : '#fff',
              fontSize:        14,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          busy ? 'not-allowed' : 'pointer',
            }}
          >
            <LogOut size={16} />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : (
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
    </div>
  )
}
