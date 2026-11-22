/**
 * src/pages/AccountEditScreen.jsx
 * 2026-11-22 (public profile plan, step 14.7c-1): the ONE Edit screen. It replaces the read-only view +
 * pencil + two-step wizard. Same screen from every entry point (Profile tab, Settings "Account details",
 * the first sign-in), two groups:
 *
 *   Your details                       occupation (+ specialty), country, gender, phone (optional);
 *                                      line: "Not shown on your public profile"
 *   Shown on your public profile       name, username, avatar, bio, "Old addresses keep working"
 *                                      (the name sits here: it is asked once and is also the public name)
 *
 * Welcome mode (first sign-in only, while profile_setup_dismissed is still false): the name, occupation
 * (+ specialty) and country only, with a Skip. Skip and finishing both land on the Profile tab.
 * profile_setup_dismissed has one job: it stops the welcome from opening again.
 *
 * Two separate saves, details first (utils/editProfile.js, utils/profileData.js): a refusal of the public
 * part leaves the details saved and says so under the field. Offline, the screen says so and saving waits
 * for the connection (nothing is queued). The chosen avatar is shown here, never the sign-in photo.
 * Delete account stays at the bottom (not in welcome). Remove public profile comes in 14.7c-2.
 * The rules live in utils/editProfile.js; the old wizard file is retired in 14.7c-2.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Mail, Stethoscope, PenLine, HeartPulse, GraduationCap, MapPin, User, Phone, Trash2, WifiOff, ChevronDown, Contact } from 'lucide-react'
import { validatePhoneNumberLength } from 'libphonenumber-js'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useBackClose } from '../hooks/useBackClose'
import { useToast } from '../context/ToastContext'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { supabase } from '../lib/supabase'
import { deleteOwnAccount } from '../lib/queries'
import { ROUTES } from '../router'
import PublicAvatar from '../components/ui/PublicAvatar'
import DeleteAccountSheet from '../components/ui/DeleteAccountSheet'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import PublicSetupSheet from '../components/ui/PublicSetupSheet'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { shimmer } from '../components/drugs/home/shimmer'
import PublicFieldsGroup from '../components/profile/PublicFieldsGroup'
import { WizardField, WizardDropdown, PhoneCodeSheet, PillInput, wizardCardStyle, fieldIconStyle } from '../components/profile/FormParts'
import {
  GENDER_OPTIONS, OCCUPATION_OPTIONS, STUDENT_TYPE_OPTIONS, SPECIALTY_OPTIONS, COUNTRY_OPTIONS,
  DIAL_TO_ISO2, formatPhoneDisplay,
} from '../utils/profileOptions'
import { handleChangeDaysLeft } from '../utils/profileRules'
import {
  valuesFromRow, applyChange, visibleFields, detailsProblems, detailsPayload, publicPayload, publicProblems,
  fieldForPublicRefusal, hasChanges, hasHandle, mergeDetails, groupFromState, NOT_PUBLIC_LINE, PHONE_HELP,
} from '../utils/editProfile'

const TEXT = { fontFamily: 'var(--font-body)' }
const iconProps = { size: 14, strokeWidth: 1.8, color: 'var(--color-text-secondary)', style: fieldIconStyle }
const OFFLINE_SAVE = "You're offline. Reconnect to save."
const SECTION_TITLE = { margin: '0 0 var(--space-1)', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', ...TEXT }
const SECTION_LINE = { margin: '0 0 var(--space-3)', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }

function EditSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 'var(--space-2) 0' }}>
      <div style={shimmer({ width: 72, height: 72, borderRadius: '50%', alignSelf: 'center' })} />
      <div style={shimmer({ width: '100%', height: 48 })} />
      <div style={shimmer({ width: '100%', height: 48 })} />
      <div style={shimmer({ width: '100%', height: 48 })} />
    </div>
  )
}

export default function AccountEditScreen() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth()
  const userId = user?.id ?? null
  const { isOnline } = useOnlineStatus()
  const isOffline = !isOnline
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { loadProfile, savePublicCard, saveDetails } = usePublicProfile()

  // Welcome mode is decided once, when the sign-in has settled, from the same flag the first-run
  // redirect reads. Saving or skipping flips the flag, which must not change the screen under the person.
  const [welcome, setWelcome] = useState(null)
  if (welcome === null && !loading && user) setWelcome(profile ? !profile.profileSetupDismissed : false)
  const inWelcome = welcome === true

  // status: 'loading' | 'ready' | 'offline' | 'error'
  const [status, setStatus] = useState('loading')
  const [row, setRow] = useState(null)
  const [saved, setSaved] = useState(null)
  const [values, setValues] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const pendingExitRef = useRef(null) // 'back' | 'skip'
  const publicRef = useRef(null)
  const group = groupFromState(location.state)

  // Signed out (a stale bookmark): nothing to edit.
  useEffect(() => {
    if (!loading && !user) navigate(ROUTES.ACCOUNT, { replace: true })
  }, [loading, user, navigate])

  // The row is read from the server every time the screen opens (the details and the public card together).
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const r = await loadProfile()
      if (cancelled) return
      if (!r.ok) { setStatus(r.kind === 'retry' ? 'offline' : 'error'); return }
      const v = valuesFromRow(r.profile)
      setRow(r.profile)
      setSaved(v)
      setValues(v)
      setErrors({})
      setStatus('ready')
    })()
    return () => { cancelled = true }
  }, [userId, attempt, loadProfile])

  // Opened at the group that was asked for.
  useEffect(() => {
    if (status === 'ready' && group === 'public') publicRef.current?.scrollIntoView({ block: 'start' })
  }, [status, group])

  function retry() { setStatus('loading'); setAttempt((a) => a + 1) }

  const ready = status === 'ready' && values && saved
  const isDirty = ready ? hasChanges(values, saved) : false
  const show = ready ? visibleFields(values, { welcome: inWelcome }) : null
  const handleDaysLeft = row ? handleChangeDaysLeft(row) : 0
  const liveProblems = ready ? publicProblems(values, saved, { savedRow: row }) : {}

  function change(field, value) {
    setValues((v) => applyChange(v, field, value))
    const key = field === 'fullName' ? 'name' : field === 'avatarCode' ? 'avatar' : field === 'phoneNumber' || field === 'phoneCountryCode' ? 'phone' : field
    setErrors((e) => {
      if (!e[key] && !e.general) return e
      const next = { ...e }
      delete next[key]
      delete next.general
      return next
    })
  }

  // ── Leaving ────────────────────────────────────────────────────────────────
  async function finishSkip() {
    if (skipping) return
    if (isOffline) { toast.error("You're offline. Reconnect to continue."); return }
    setSkipping(true)
    try {
      const res = await saveDetails({ profile_setup_dismissed: true }, { hasHandle: hasHandle(saved ?? {}) })
      if (!res.ok) { toast.error(res.message ?? 'Could not skip. Try again.'); return }
      await refreshProfile()
      navigate(ROUTES.ACCOUNT)
    } finally {
      setSkipping(false)
    }
  }

  function runExit(action) {
    if (action === 'skip') return finishSkip()
    // Edit stays behind the Profile tab (Back rules, 14.7a).
    navigate(ROUTES.ACCOUNT)
    return undefined
  }

  function attemptExit(action) {
    if (isDirty) { pendingExitRef.current = action; setUnsavedOpen(true); return }
    if (action === 'back') { navigate(-1); return }
    runExit(action)
  }

  // Welcome: back means Skip (as before). Otherwise back only needs a guard while something is unsaved.
  useBackClose(inWelcome, () => attemptExit('skip'))
  useBackClose(!inWelcome && isDirty, () => attemptExit('back'))

  // ── Saving ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (saving || !ready) return
    if (isOffline) { setErrors({ general: OFFLINE_SAVE }); return }
    const dProblems = detailsProblems(values, { welcome: inWelcome })
    const pProblems = publicProblems(values, saved, { savedRow: row })
    const first = {
      ...(dProblems.fullName ? { name: dProblems.fullName } : {}),
      ...(dProblems.occupation ? { occupation: dProblems.occupation } : {}),
      ...(dProblems.occupationOther ? { occupationOther: dProblems.occupationOther } : {}),
      ...(dProblems.specialty ? { specialty: dProblems.specialty } : {}),
      ...(dProblems.country ? { country: dProblems.country } : {}),
      ...(dProblems.phone ? { phone: dProblems.phone } : {}),
      ...pProblems,
    }
    if (Object.keys(first).length > 0) { setErrors(first); return }

    setSaving(true)
    setErrors({})
    try {
      const d = await saveDetails(detailsPayload(values, { welcome: inWelcome }), { hasHandle: hasHandle(saved) })
      if (!d.ok) { setErrors({ general: d.message }); return }

      const payload = publicPayload(values, saved, { savedRow: row })
      if (payload) {
        const p = await savePublicCard(payload, values.fullName)
        if (!p.ok || p.waiting) {
          // The details are saved; the public part was not. Say where, keep what was typed.
          setSaved((s) => mergeDetails(s, values))
          const where = p.ok ? 'general' : fieldForPublicRefusal(p)
          const message = p.ok ? 'No connection. Your public changes were not saved. Try again.' : p.message
          setErrors({ [where]: message })
          refreshProfile()
          return
        }
      }

      await refreshProfile()
      setSaved(values)
      toast.success('Profile saved')
      navigate(ROUTES.ACCOUNT)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (isOffline) { toast.error("You're offline. Reconnect to delete your account."); return }
    setDeleting(true)
    const { error } = await deleteOwnAccount(supabase)
    if (error) {
      toast.error('Could not delete your account. Please try again.')
      setDeleting(false)
      return
    }
    setDeleting(false)
    setDeleteSheetOpen(false)
    await signOut()
    navigate(ROUTES.ACCOUNT, { replace: true })
  }

  const busy = saving || skipping
  const logo = `${import.meta.env.BASE_URL}logo.svg`

  return (
    <div>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'var(--color-bg)',
        padding: 'var(--space-5) var(--page-gutter, var(--space-4)) var(--space-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {!inWelcome && (
            <button
              type="button"
              onClick={() => attemptExit('back')}
              aria-label="Back"
              style={{ border: 'none', background: 'none', padding: 'var(--space-1)', display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--color-text-primary)' }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          {inWelcome ? (
            <img src={logo} alt="Capsula" style={{ height: 24, width: 'auto' }} />
          ) : (
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>Edit profile</h1>
          )}
        </div>

        {inWelcome && !loading && (
          <button
            type="button"
            onClick={() => attemptExit('skip')}
            disabled={skipping}
            aria-label="I'll do it later"
            style={{
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', background: 'var(--color-surface)',
              padding: '6px 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)',
              cursor: skipping ? 'default' : 'pointer', opacity: skipping ? 0.6 : 1, flexShrink: 0, WebkitTapHighlightColor: 'transparent',
            }}
          >
            {skipping ? 'Skipping…' : "I'll do it later"}
          </button>
        )}
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-4) var(--page-gutter, var(--space-4)) calc(var(--space-12) + 24px)' }}>
        {(loading || status === 'loading') && <EditSkeleton />}

        {!loading && status === 'offline' && (
          <GroupStateMessage title="No connection" body="Connect to edit your profile." actionLabel="Try again" onAction={retry} />
        )}
        {!loading && status === 'error' && (
          <GroupStateMessage title="Couldn't open your profile" actionLabel="Try again" onAction={retry} />
        )}

        {!loading && ready && (
          <div style={{ fontFamily: 'var(--font-body)' }}>
            {inWelcome && (
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, color: 'var(--color-text-primary)', margin: '0 0 var(--space-5)' }}>
                Welcome to Capsula<br />Let's set up your profile
              </div>
            )}

            {!inWelcome && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                <PublicAvatar code={values.avatarCode} name={values.fullName} size={72} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-text-secondary)' }}>
                  <Mail size={15} strokeWidth={1.8} />
                  <span style={{ fontSize: 15 }}>{user?.email ?? ''}</span>
                </div>
              </div>
            )}

            {isOffline && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-5)', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)',
              }}>
                <WifiOff size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span>You're offline. Saving and deleting your account need a connection.</span>
              </div>
            )}

            {/* Welcome asks the name once, first; later it sits in the public group. */}
            {inWelcome && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <h2 style={SECTION_TITLE}>Your name</h2>
                <div style={wizardCardStyle}>
                  <WizardField label="Name" icon={<Contact {...iconProps} />} error={errors.name} last>
                    <PillInput
                      type="text"
                      value={values.fullName}
                      onChange={(e) => change('fullName', e.target.value)}
                      dir="auto"
                      autoComplete="off"
                      error={Boolean(errors.name)}
                      placeholder="Your name"
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }}>
                      Shown on your public profile if you make one. A nickname is fine.
                    </p>
                  </WizardField>
                </div>
              </div>
            )}

            <h2 style={SECTION_TITLE}>Your details</h2>
            <p style={SECTION_LINE}>{NOT_PUBLIC_LINE}</p>
            <div style={wizardCardStyle}>
              <WizardField
                label="Occupation"
                icon={<Stethoscope {...iconProps} />}
                error={errors.occupation}
              >
                <WizardDropdown value={values.occupation} onChange={(v) => change('occupation', v)} options={OCCUPATION_OPTIONS} error={Boolean(errors.occupation)} />
              </WizardField>

              {show.occupationOther && (
                <WizardField label="Please specify" icon={<PenLine {...iconProps} />} error={errors.occupationOther}>
                  <PillInput
                    type="text"
                    value={values.occupationOther}
                    onChange={(e) => change('occupationOther', e.target.value)}
                    placeholder="e.g. Physiotherapist"
                    error={Boolean(errors.occupationOther)}
                  />
                </WizardField>
              )}

              {show.specialty && (
                <WizardField label="Specialty" icon={<HeartPulse {...iconProps} />} error={errors.specialty}>
                  <WizardDropdown value={values.specialty} onChange={(v) => change('specialty', v)} options={SPECIALTY_OPTIONS} error={Boolean(errors.specialty)} />
                </WizardField>
              )}

              {show.studentType && (
                <WizardField label="Student type" icon={<GraduationCap {...iconProps} />}>
                  <WizardDropdown value={values.studentType} onChange={(v) => change('studentType', v)} options={STUDENT_TYPE_OPTIONS} />
                </WizardField>
              )}

              <WizardField label="Country" icon={<MapPin {...iconProps} />} error={errors.country} last={!show.gender && !show.phone}>
                <WizardDropdown value={values.country} onChange={(v) => change('country', v)} options={COUNTRY_OPTIONS} error={Boolean(errors.country)} />
              </WizardField>

              {show.gender && (
                <WizardField label="Gender (optional)" icon={<User {...iconProps} />}>
                  <WizardDropdown value={values.gender} onChange={(v) => change('gender', v)} options={GENDER_OPTIONS} />
                </WizardField>
              )}

              {show.phone && (
                <WizardField label="Phone (optional)" icon={<Phone {...iconProps} />} error={errors.phone} last>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => setPhoneSheetOpen(true)}
                      aria-label="Phone country code"
                      style={{
                        flex: '0 0 30%', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer',
                        padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid transparent',
                        backgroundColor: 'var(--color-surface-muted)', fontSize: 15, fontFamily: 'var(--font-body)',
                        color: values.phoneCountryCode ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                      }}
                    >
                      {values.phoneCountryCode || 'Code'}
                      <ChevronDown size={14} strokeWidth={1.8} color="var(--color-text-secondary)" />
                    </button>
                    <PillInput
                      type="tel"
                      inputMode="numeric"
                      value={formatPhoneDisplay(values.phoneCountryCode, values.phoneNumber)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^\d]/g, '')
                        // Stop at the longest number that country allows (its own rule, not a fixed length).
                        const iso2 = DIAL_TO_ISO2[values.phoneCountryCode]
                        if (iso2 && digits.length > values.phoneNumber.length && validatePhoneNumberLength(digits, iso2) === 'TOO_LONG') return
                        change('phoneNumber', digits)
                      }}
                      placeholder="Phone number"
                      error={Boolean(errors.phone)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }}>{PHONE_HELP}</p>
                </WizardField>
              )}
            </div>

            {show.publicGroup && (
              <div ref={publicRef} style={{ marginTop: 'var(--space-6)', scrollMarginTop: 80 }}>
                <h2 style={SECTION_TITLE}>Shown on your public profile</h2>
                <p style={SECTION_LINE}>This is what people see when you make a roshetta or drug group public.</p>
                <PublicFieldsGroup
                  values={values}
                  onChange={change}
                  errors={{ ...liveProblems, ...errors }}
                  handleDaysLeft={handleDaysLeft}
                  disabled={busy}
                  onSetUp={() => setSetupOpen(true)}
                  setUpBlockedLine={isDirty ? 'Save your changes first.' : isOffline ? 'Connect to set up your public profile.' : null}
                />
              </div>
            )}

            {errors.general && !show.publicGroup && (
              <div role="alert" style={{ marginTop: 'var(--space-4)', fontSize: 13, color: 'var(--color-danger)', ...TEXT }}>{errors.general}</div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || skipping || (!inWelcome && !isDirty) || isOffline}
              style={{
                width: '100%', minHeight: 48, marginTop: 'var(--space-6)', borderRadius: 999, border: 'none', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
                cursor: saving || (!inWelcome && !isDirty) || isOffline ? 'not-allowed' : 'pointer',
                backgroundColor: saving || (!inWelcome && !isDirty) || isOffline ? 'var(--color-border)' : 'var(--color-accent-solid)',
                color: saving || (!inWelcome && !isDirty) || isOffline ? 'var(--color-text-tertiary)' : '#fff',
              }}
            >
              {saving ? 'Saving…' : inWelcome ? 'Save and continue' : 'Save'}
            </button>

            {!inWelcome && (
              <div style={{ marginTop: 'var(--space-8)' }}>
                <h2 style={{ ...SECTION_TITLE, fontSize: 15 }}>Danger zone</h2>
                <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => { if (!isOffline) setDeleteSheetOpen(true) }}
                    disabled={isOffline}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', border: 'none',
                      backgroundColor: 'transparent', fontFamily: 'var(--font-body)', textAlign: 'left', cursor: isOffline ? 'not-allowed' : 'pointer',
                      color: isOffline ? 'var(--color-text-tertiary)' : 'var(--color-danger)', opacity: isOffline ? 0.6 : 1, WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <Trash2 size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Delete Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <PhoneCodeSheet
        isOpen={phoneSheetOpen}
        value={values?.phoneCountryCode ?? ''}
        onSelect={(code) => change('phoneCountryCode', code)}
        onClose={() => setPhoneSheetOpen(false)}
      />

      <PublicSetupSheet
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onDone={() => { setSetupOpen(false); retry() }}
        actionLabel="Save"
      />

      <DeleteAccountSheet
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        onConfirm={handleDeleteAccount}
        busy={deleting}
      />

      <ConfirmSheet
        isOpen={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onConfirm={() => runExit(pendingExitRef.current)}
        title="Unsaved changes"
        message="You have unsaved changes. Are you sure you want to leave without saving?"
        confirmLabel="Discard"
        destructive
      />
    </div>
  )
}
