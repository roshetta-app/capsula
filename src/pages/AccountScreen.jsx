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

import { useState, useEffect } from 'react'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchOwnProfile, updateOwnProfile } from '../lib/queries'

// F13 Mini-stage 3 — fixed short list per D34, modeled on how
// Epocrates-style apps collect this at signup. Not a dropdown reusing the
// existing `specialties` table, which is CMS content-tagging metadata for
// drugs/conditions, not a fit for a person's own identity data.
const OCCUPATION_OPTIONS = ['Physician', 'Pharmacist', 'Nurse', 'Student', 'Other']

function formatMemberSince(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const profileInputStyle = {
  width:           '100%',
  padding:         'var(--space-2) var(--space-3)',
  borderRadius:    'var(--radius-sm)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color:           'var(--color-text-primary)',
  fontSize:        14,
  fontFamily:      'var(--font-body)',
}

function ProfileField({ label, last, children }) {
  return (
    <div style={{ marginBottom: last ? 'var(--space-5)' : 'var(--space-4)' }}>
      <label style={{
        display:      'block',
        fontSize:     13,
        color:        'var(--color-text-secondary)',
        marginBottom: 'var(--space-2)',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function AccountScreen() {
  const { user, profile, signInWithGoogle, signOut } = useAuth()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  // F13 Mini-stage 3 — editable profile fields (full name, occupation,
  // specialty, country, governorate). Loaded separately from useAuth's own
  // profile (role/tier only) via fetchOwnProfile, since only this screen
  // needs them.
  const [profileFields, setProfileFields] = useState({
    fullName:    '',
    occupation:  '',
    specialty:   '',
    country:     '',
    governorate: '',
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      setProfileLoading(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)

    fetchOwnProfile(supabase, user.id)
      .then(data => {
        if (cancelled) return
        setProfileFields({
          fullName:    data.fullName ?? '',
          occupation:  data.occupation ?? '',
          specialty:   data.specialty ?? '',
          country:     data.country ?? '',
          governorate: data.governorate ?? '',
        })
      })
      .catch(() => {
        // Leave fields blank on a failed load — the form below can still
        // be filled in and saved from scratch.
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  function handleProfileFieldChange(field, value) {
    setProfileFields(prev => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateOwnProfile(supabase, user.id, profileFields)
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err.message ?? 'Could not save. Please try again.')
    }
    setSaving(false)
  }

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
      ) : null}

      {user && !profileLoading && (
        <form
          onSubmit={handleSaveProfile}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius:    'var(--radius-lg)',
            border:          '1px solid var(--color-border)',
            padding:         'var(--space-5)',
            marginTop:       'var(--space-4)',
          }}
        >
          <div style={{
            fontSize:     15,
            fontWeight:   600,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            Profile details
          </div>

          <ProfileField label="Full name">
            <input
              type="text"
              value={profileFields.fullName}
              onChange={e => handleProfileFieldChange('fullName', e.target.value)}
              style={profileInputStyle}
            />
          </ProfileField>

          <ProfileField label="Occupation">
            <select
              value={profileFields.occupation}
              onChange={e => handleProfileFieldChange('occupation', e.target.value)}
              style={profileInputStyle}
            >
              <option value="">Select…</option>
              {OCCUPATION_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </ProfileField>

          <ProfileField label="Specialty">
            <input
              type="text"
              value={profileFields.specialty}
              onChange={e => handleProfileFieldChange('specialty', e.target.value)}
              style={profileInputStyle}
            />
          </ProfileField>

          <ProfileField label="Country">
            <input
              type="text"
              value={profileFields.country}
              onChange={e => handleProfileFieldChange('country', e.target.value)}
              style={profileInputStyle}
            />
          </ProfileField>

          <ProfileField label="Governorate" last>
            <input
              type="text"
              value={profileFields.governorate}
              onChange={e => handleProfileFieldChange('governorate', e.target.value)}
              style={profileInputStyle}
            />
          </ProfileField>

          {saveError && (
            <div style={{
              fontSize:        13,
              color:           '#DC2626',
              backgroundColor: '#FEF2F2',
              border:          '1px solid #FECACA',
              borderRadius:    'var(--radius-sm)',
              padding:         'var(--space-2) var(--space-3)',
              lineHeight:      1.4,
              marginBottom:    'var(--space-4)',
            }}>
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div style={{
              fontSize:        13,
              color:           '#15803D',
              backgroundColor: '#F0FDF4',
              border:          '1px solid #BBF7D0',
              borderRadius:    'var(--radius-sm)',
              padding:         'var(--space-2) var(--space-3)',
              lineHeight:      1.4,
              marginBottom:    'var(--space-4)',
            }}>
              Saved.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width:           '100%',
              padding:         'var(--space-3) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          'none',
              backgroundColor: saving ? 'var(--color-border)' : 'var(--color-accent)',
              color:           saving ? 'var(--color-text-tertiary)' : '#fff',
              fontSize:        14,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
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
    </div>
  )
}
