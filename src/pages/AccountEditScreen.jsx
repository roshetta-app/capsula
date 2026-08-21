/**
 * src/pages/AccountEditScreen.jsx
 * Phase F13 Mini-stage 5 (Account redesign)
 *
 * Full page for editing the five personal-info fields (full name,
 * occupation, specialty, country, governorate). This is the same form
 * that lived inline on AccountScreen.jsx before this redesign — moved
 * here, not duplicated or rebuilt: same fetchOwnProfile/updateOwnProfile
 * calls, same field list, same OCCUPATION_OPTIONS.
 *
 * Rendered outside the shared Layout group (see router.jsx) — own
 * back-arrow header, no BottomNav, same convention as
 * ConditionDetailScreen/DrugDetailScreen.
 *
 * Reachable only from a signed-in AccountScreen row; if somehow reached
 * while signed out (e.g. a stale bookmark), redirects back to /account
 * rather than rendering a broken form with no user id to load against.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchOwnProfile, updateOwnProfile } from '../lib/queries'
import { ROUTES } from '../router'

// Same fixed short list AccountScreen.jsx used — modeled on how
// Epocrates-style apps collect this at signup (F13 Mini-stage 3 / D34).
const OCCUPATION_OPTIONS = ['Physician', 'Pharmacist', 'Nurse', 'Student', 'Other']

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
    <div style={{ marginBottom: last ? 0 : 'var(--space-4)' }}>
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

export default function AccountEditScreen() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

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

  // Wait for the initial session check to resolve before deciding whether
  // to redirect. useAuth() starts with user=null until its session check
  // finishes (loading stays true until then) — checking !user alone here
  // fired this redirect on the brief null tick every single mount, even
  // for an already-signed-in user, sending them straight back to /account
  // before the real session ever had a chance to load (bug fix, 2026-08-21).
  if (loading) return null

  // Signed out (stale bookmark, deep link, etc.) — nothing to edit.
  if (!user) {
    navigate(ROUTES.ACCOUNT, { replace: true })
    return null
  }

  return (
    <div>
      <header style={{
        position:        'sticky',
        top:             0,
        zIndex:          50,
        backgroundColor: 'var(--color-surface)',
        borderBottom:    '1px solid var(--color-border)',
        padding:         'var(--space-3) var(--space-6)',
        display:         'flex',
        alignItems:      'center',
        gap:             'var(--space-3)',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            border:          'none',
            background:      'none',
            padding:         'var(--space-1)',
            display:         'flex',
            alignItems:      'center',
            cursor:          'pointer',
            color:           'var(--color-text-primary)',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{
          margin:     0,
          fontSize:   17,
          fontWeight: 700,
          color:      'var(--color-text-primary)',
        }}>
          Edit Profile
        </h1>
      </header>

      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  'var(--space-6) var(--space-6) calc(var(--space-12) + 24px)',
      }}>
        {!profileLoading && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius:    'var(--radius-lg)',
              border:          '1px solid var(--color-border)',
              padding:         'var(--space-5)',
            }}
          >
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
                marginTop:       'var(--space-4)',
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
                marginTop:       'var(--space-4)',
              }}>
                Saved.
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                width:           '100%',
                marginTop:       'var(--space-5)',
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
      </main>
    </div>
  )
}
