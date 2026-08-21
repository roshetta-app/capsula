/**
 * src/components/ProfileSetupModal.jsx
 * Phase F13 Mini-stage 4 — one-time profile setup prompt
 *
 * Shown once, right after a person's first sign-in, asking for the same
 * five personal-info fields AccountScreen.jsx already makes editable
 * (full name, occupation, specialty, country, governorate). Skippable —
 * either skipping or saving sets profiles.profile_setup_dismissed so this
 * never shows again for that account (D34/Mini-stage 2's explicit flag,
 * chosen over inferring "already asked" from blank fields).
 *
 * Deliberately a separate component from OnboardingScreen.jsx /
 * OnboardingGate.jsx — those run device-level, before any sign-in, gated
 * by localStorage, and aren't accountable to a specific signed-in user.
 * This one is account-level: it only ever applies to a signed-in user's
 * own profiles row, via the same fetchOwnProfile/updateOwnProfile pair
 * Mini-stage 3 already built for AccountScreen.
 *
 * Overlay/animation structure (portal to document.body, fade + scale-in,
 * delayed unmount on exit) copied from the app's existing ConfirmSheet.jsx
 * pattern rather than invented fresh — same token language (surface,
 * radius-lg, border), sized as a centered dialog like ConfirmSheet since
 * this is a short one-off form, not a bottom-anchored sheet.
 *
 * Mounted once in App.jsx, as a sibling to OnboardingGate/AppRoutes — not
 * tied to any specific route, since it can trigger right after sign-in
 * regardless of which screen the person happens to be on.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchOwnProfile, updateOwnProfile } from '../lib/queries'

const OCCUPATION_OPTIONS = ['Physician', 'Pharmacist', 'Nurse', 'Student', 'Other']

const fieldInputStyle = {
  width:           '100%',
  padding:         'var(--space-2) var(--space-3)',
  borderRadius:    'var(--radius-sm)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color:           'var(--color-text-primary)',
  fontSize:        14,
  fontFamily:      'var(--font-body)',
}

function SetupField({ label, last, children }) {
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

export default function ProfileSetupModal() {
  const { user } = useAuth()
  const overlayRef = useRef(null)

  // Whether the modal should be showing at all — starts false, flips true
  // only after fetchOwnProfile confirms profile_setup_dismissed is false
  // for the current user. Stays false for signed-out visitors and for
  // anyone who has already seen/dismissed this.
  const [shouldShow, setShouldShow] = useState(false)
  const [checked,    setChecked]    = useState(false)

  // Same shouldRender/animateIn delayed-unmount pattern as ConfirmSheet.jsx.
  const [shouldRender, setShouldRender] = useState(false)
  const [animateIn,    setAnimateIn]    = useState(false)

  const [fields, setFields] = useState({
    fullName:    '',
    occupation:  '',
    specialty:   '',
    country:     '',
    governorate: '',
  })
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Check once per signed-in user whether this has already been dismissed.
  useEffect(() => {
    if (!user) {
      setShouldShow(false)
      setChecked(false)
      return
    }

    let cancelled = false
    fetchOwnProfile(supabase, user.id)
      .then(data => {
        if (cancelled) return
        setShouldShow(!data.profileSetupDismissed)
        setFields({
          fullName:    data.fullName ?? '',
          occupation:  data.occupation ?? '',
          specialty:   data.specialty ?? '',
          country:     data.country ?? '',
          governorate: data.governorate ?? '',
        })
      })
      .catch(() => {
        // If the check itself fails, don't show an unpromptable modal —
        // stay silent rather than risk blocking the app on a network hiccup.
        setShouldShow(false)
      })
      .finally(() => {
        if (!cancelled) setChecked(true)
      })

    return () => { cancelled = true }
  }, [user])

  const isOpen = checked && shouldShow

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  function handleFieldChange(field, value) {
    setFields(prev => ({ ...prev, [field]: value }))
  }

  async function dismiss(withFields) {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateOwnProfile(supabase, user.id, {
        ...(withFields ? fields : {}),
        profileSetupDismissed: true,
      })
      setShouldShow(false)
    } catch (err) {
      setSaveError(err.message ?? 'Could not save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  function handleSkip() {
    dismiss(false)
  }

  function handleSave(e) {
    e.preventDefault()
    dismiss(true)
  }

  if (!shouldRender) return null

  return createPortal(
    <div
      ref={overlayRef}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        opacity:         animateIn ? 1 : 0,
        transition:      'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <form
        onSubmit={handleSave}
        role="dialog"
        aria-modal="true"
        aria-label="Set up your profile"
        style={{
          width:           '100%',
          maxWidth:        360,
          maxHeight:       '85vh',
          overflowY:       'auto',
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          padding:         'var(--space-5)',
          fontFamily:      'var(--font-body)',
          opacity:         animateIn ? 1 : 0,
          transform:       animateIn ? 'scale(1)' : 'scale(0.96)',
          transition:      'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle)',
        }}
      >
        <div style={{
          fontSize:     16,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          Tell us a bit about yourself
        </div>
        <p style={{
          margin:     '0 0 var(--space-5)',
          fontSize:   14,
          lineHeight: 1.55,
          color:      'var(--color-text-secondary)',
        }}>
          This helps us tailor Capsula to you. You can skip this or edit it later from your Account page.
        </p>

        <SetupField label="Full name">
          <input
            type="text"
            value={fields.fullName}
            onChange={e => handleFieldChange('fullName', e.target.value)}
            style={fieldInputStyle}
          />
        </SetupField>

        <SetupField label="Occupation">
          <select
            value={fields.occupation}
            onChange={e => handleFieldChange('occupation', e.target.value)}
            style={fieldInputStyle}
          >
            <option value="">Select…</option>
            {OCCUPATION_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </SetupField>

        <SetupField label="Specialty">
          <input
            type="text"
            value={fields.specialty}
            onChange={e => handleFieldChange('specialty', e.target.value)}
            style={fieldInputStyle}
          />
        </SetupField>

        <SetupField label="Country">
          <input
            type="text"
            value={fields.country}
            onChange={e => handleFieldChange('country', e.target.value)}
            style={fieldInputStyle}
          />
        </SetupField>

        <SetupField label="Governorate" last>
          <input
            type="text"
            value={fields.governorate}
            onChange={e => handleFieldChange('governorate', e.target.value)}
            style={fieldInputStyle}
          />
        </SetupField>

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

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-2)',
        }}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            style={{
              padding:         'var(--space-2) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color:           'var(--color-text-secondary)',
              fontSize:        14,
              fontWeight:      500,
              fontFamily:      'var(--font-body)',
              cursor:          saving ? 'not-allowed' : 'pointer',
            }}
          >
            Skip
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding:         'var(--space-2) var(--space-4)',
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
        </div>
      </form>
    </div>,
    document.body
  )
}
