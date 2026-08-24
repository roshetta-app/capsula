/**
 * src/pages/AccountEditScreen.jsx
 * Phase F13 Mini-stage 5 (Account redesign)
 * account-edit-view-mode (2026-08-22): added the read-only view + pencil-
 * to-edit shell (see below).
 * profile-wizard-redesign: the previous flat single-page edit form is
 * replaced by the shared ProfileWizard.jsx (2-step: personal, then
 * professional/location) — this file is now a thin wrapper: it fetches
 * the profile, renders read-only rows for every field in view mode, and
 * renders <ProfileWizard> pre-filled when editing. The wizard owns its
 * own fields/validation/conditional-logic/step navigation; this screen
 * only owns the fetch, the save call, and the view/edit shell around it.
 *
 * Rendered outside the shared Layout group (see router.jsx) — own
 * back-arrow header, no BottomNav, same convention as
 * ConditionDetailScreen/DrugDetailScreen.
 *
 * Reachable only from a signed-in AccountScreen row; if somehow reached
 * while signed out (e.g. a stale bookmark), redirects back to /account
 * rather than rendering a broken form with no user id to load against.
 *
 * account-screen-redesign — after a successful save, also calls
 * AuthContext's refreshProfile() so the name shown on AccountScreen (now
 * read from shared Context, not its own fetch) updates immediately
 * instead of only after a full sign-out/sign-in.
 *
 * profile-wizard-redesign — the view mode + pencil shell survives, but is
 * skipped automatically the first time: if the loaded profile still has
 * profile_setup_dismissed = false (first-time signup, routed here by
 * ProfileSetupRedirect.jsx in place of the old modal), this screen opens
 * straight into the wizard instead of the view. Existing users who have
 * already completed setup keep the normal view-first, pencil-to-edit
 * flow. Completing the wizard from either path always writes
 * profile_setup_dismissed = true, same effect the old modal's Save had.
 *
 * account-edit-redesign (2026-08-22):
 *   - Wizard now renders full-width in edit mode — the bordered/padded
 *     card wrapper around <ProfileWizard> was dropped. The wizard fills
 *     the screen directly under the header (nav chrome, unchanged).
 *   - Read-only view redesigned: hero header (avatar + name + occupation)
 *     up top, then two grouped, icon-led sections below — Personal
 *     (gender, phone, email, country, governorate) and Professional
 *     (occupation, specialty/student type). Replaces the old flat
 *     undifferentiated ProfileValue stack. Tap target stays pencil-only
 *     (unchanged) — tapping the row body does not open the wizard.
 *   - Empty/conditional fields (Specialty, Student type, Governorate) no
 *     longer hide their row when not applicable — they always render,
 *     showing "Not set" like every other empty field.
 *   - Sticky header restyled to match AccountScreen.jsx's title bar:
 *     backgroundColor var(--color-bg), no border — was
 *     var(--color-surface) with a borderBottom.
 *   - Added a skeleton placeholder shown while profileLoading is true.
 *     Previously this state rendered nothing (blank gap under the
 *     header) until the fetch resolved.
 * account-header-tweaks (2026-08-23) — The mandatory first-time wizard
 *     view (editing && !canCancel — no saved profile to cancel back to)
 *     now shows a friendly "Tell us a bit more about yourself" title
 *     instead of "Manage Profile", and drops the back arrow entirely —
 *     nothing meaningful to navigate back to on a first-time signup, and
 *     the wizard's own Skip button already covers leaving this view.
 *     Existing users editing via the pencil icon see no change.
 * header-skip-country-tweaks (2026-08-23) — Reverses the account-edit-
 *     redesign (2026-08-22) call above for Governorate, Specialty, and
 *     Student type specifically: those three hide their row again when
 *     not applicable, instead of always showing an empty "Not set" row.
 *     Country and Occupation are unaffected and always render. (The
 *     "Other" occupation showing its typed-in specification instead of
 *     the literal word "Other" was already handled by occupationDisplay
 *     below — no change needed there.)
 * governorate-collection-removed (2026-08-23), same-day follow-up —
 *     Governorate is no longer collected or shown at all: removed from
 *     EMPTY_FIELDS, the loaded-profile mapping, and the read-only view
 *     (Country is now last in the Personal group). Country alone is kept.
 * manage-profile-reopens-wizard-fix (2026-08-23) — Fixed: the forced
 *     first-time wizard's footer Back button used to navigate away via
 *     `onBack` without ever persisting profileSetupDismissed, so opening
 *     Manage Profile again always forced the same wizard right back up,
 *     with no visible reason why. onBack is now undefined for that flow —
 *     Skip for now is the only step-1 exit, and it does persist the
 *     dismissal. Existing users (canCancel true) are unaffected.
 * unify-profile-avatar (2026-08-25) — ProfileHero's hand-built avatar
 *     circle (photo-with-initials-fallback, broken-image handling) is now
 *     the shared ProfileAvatar.jsx component, also used by
 *     AccountScreen.jsx and ProfileWizard.jsx, so the three screens can't
 *     drift out of sync with each other again. This screen's circle grows
 *     from 64px to the standard 72px, and its one-letter initials become
 *     two, matching the other two screens. ReadOnlySkeleton's placeholder
 *     circle is bumped to 72px too, so there's no layout jump when the
 *     real avatar loads in.
 * welcome-header-skip (2026-08-25) — First-time signup header: title text
 *     shortened to just "Welcome" (the actual grab-attention welcome
 *     headline moved down into ProfileWizard's own body, above Personal
 *     info, where there's room for it — see that file). The "Skip for
 *     now" link also moved here, into the header's top-right corner
 *     (previously a small text link next to the Step 1/2 progress bar in
 *     the wizard body) — same handleSkip action as before, just
 *     relocated to where people expect a Skip option on a welcome
 *     screen, and where this header already had empty space for the
 *     first-time case. Existing users editing via the pencil icon are
 *     unaffected either way — this only changes the forced first-time path.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Pencil, X, User, Phone, Mail, MapPin, Stethoscope, HeartPulse, GraduationCap, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { fetchOwnProfile, updateOwnProfile, deleteOwnAccount } from '../lib/queries'
import { ROUTES } from '../router'
import ProfileWizard from '../components/ProfileWizard'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import DeleteAccountSheet from '../components/ui/DeleteAccountSheet'

const EMPTY_FIELDS = {
  fullName:              '',
  gender:                '',
  phoneCountryCode:      '',
  phoneNumber:           '',
  occupation:            '',
  occupationOther:       '',
  specialty:             '',
  studentType:           '',
  country:               '',
  profileSetupDismissed: false,
}

const GENDER_LABELS = {
  male:         'Male',
  female:       'Female',
  undisclosed:  'Prefer not to say',
}

function GroupLabel({ children }) {
  return (
    <p style={{
      fontSize:      11,
      color:         'var(--color-text-tertiary)',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      margin:        '0 0 var(--space-2)',
      padding:       '0 var(--space-1)',
    }}>
      {children}
    </p>
  )
}

function ReadOnlyRow({ icon, label, value, last }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          'var(--space-3)',
      padding:      'var(--space-3) var(--space-1)',
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
    }}>
      <span style={{ display: 'flex', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{
        fontSize: 13,
        color:    'var(--color-text-secondary)',
        flex:     1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        color:    value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
      }}>
        {value || 'Not set'}
      </span>
    </div>
  )
}

function ReadOnlyGroup({ children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius:    'var(--radius-lg)',
      border:          '1px solid var(--color-border)',
      padding:         '0 var(--space-4)',
      marginBottom:    'var(--space-5)',
    }}>
      {children}
    </div>
  )
}

function ProfileHero({ user, fullName, occupationLine }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      marginBottom:  'var(--space-6)',
    }}>
      {/* unify-profile-avatar: shared ProfileAvatar component — see that
          file for the photo/initials/broken-image-fallback logic, now
          common to this screen, Account screen, and Profile Wizard.
          marginBottom keeps this screen's original spacing to the
          name/occupation text below it. */}
      <ProfileAvatar user={user} fullName={fullName} style={{ marginBottom: 'var(--space-3)' }} />
      <h2 style={{
        margin:     0,
        fontSize:   17,
        fontWeight: 700,
        color:      'var(--color-text-primary)',
      }}>
        {fullName || 'Not set'}
      </h2>
      {occupationLine && (
        <p style={{
          margin:    'var(--space-1) 0 0',
          fontSize:  13,
          color:     'var(--color-text-secondary)',
        }}>
          {occupationLine}
        </p>
      )}
    </div>
  )
}

function ReadOnlySkeleton() {
  return (
    <div>
      <style>{`
        @keyframes capsulaSkeletonPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .capsula-skeleton {
          animation: capsulaSkeletonPulse 1.4s ease-in-out infinite;
          background-color: var(--color-border);
          border-radius: var(--radius-sm);
        }
      `}</style>

      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        marginBottom:  'var(--space-6)',
      }}>
        <div className="capsula-skeleton" style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-3)' }} />
        <div className="capsula-skeleton" style={{ width: 140, height: 16, marginBottom: 'var(--space-2)' }} />
        <div className="capsula-skeleton" style={{ width: 100, height: 12 }} />
      </div>

      {[5, 2].map((rowCount, groupIdx) => (
        <div key={groupIdx} style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          border:          '1px solid var(--color-border)',
          padding:         '0 var(--space-4)',
          marginBottom:    'var(--space-5)',
        }}>
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-3)',
              padding:      'var(--space-3) var(--space-1)',
              borderBottom: i === rowCount - 1 ? 'none' : '1px solid var(--color-border)',
            }}>
              <div className="capsula-skeleton" style={{ width: 17, height: 17, flexShrink: 0 }} />
              <div className="capsula-skeleton" style={{ width: '40%', height: 12 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AccountEditScreen() {
  const { user, loading, refreshProfile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  // open-wizard-directly: AccountScreen's completeness nudge passes this
  // flag via router state so tapping it always opens the wizard, even for
  // someone who already dismissed setup once (e.g. via Skip) — previously
  // the wizard only opened automatically when profileSetupDismissed was
  // still false, so tapping the banner after a Skip landed on the
  // read-only view instead of the wizard it promised.
  const openWizard = location.state?.openWizard === true

  const [saved, setSaved]                   = useState(EMPTY_FIELDS)
  const [editing, setEditing]               = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  // profile-danger-zone: sheet open state + a busy flag so the confirm
  // button can show "Deleting…" and disable itself while the request is
  // in flight, same convention as AccountScreen's sign-out confirm.
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const [deleting, setDeleting]               = useState(false)
  // welcome-header-skip: header-level Skip link's busy state, guards
  // against a double-tap firing handleSkip twice while it's in flight.
  // Previously this lived inside ProfileWizard itself, alongside its own
  // Skip for now link — moved here along with the link, see header below.
  const [skipping, setSkipping] = useState(false)

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
        const loaded = {
          fullName:              data.fullName ?? '',
          gender:                data.gender ?? '',
          phoneCountryCode:      data.phoneCountryCode ?? '',
          phoneNumber:           data.phoneNumber ?? '',
          occupation:            data.occupation ?? '',
          occupationOther:       data.occupationOther ?? '',
          specialty:             data.specialty ?? '',
          studentType:           data.studentType ?? '',
          country:               data.country ?? '',
          profileSetupDismissed: data.profileSetupDismissed ?? false,
        }
        setSaved(loaded)
        // First-time signup (routed here by ProfileSetupRedirect) — skip
        // the view and open straight into the wizard, same as the old
        // modal appearing automatically. open-wizard-directly: also open
        // straight into the wizard whenever the nudge card sent us here.
        if (!loaded.profileSetupDismissed || openWizard) setEditing(true)
      })
      .catch(() => {
        // Leave fields blank on a failed load — the wizard can still be
        // filled in and saved from scratch.
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  function handleStartEdit() {
    setEditing(true)
  }

  // Only offered once setup has already been completed at least once —
  // for the forced first-time wizard there's no saved view to cancel
  // back to, so the header doesn't show an X in that case (see canCancel).
  function handleCancelEdit() {
    setEditing(false)
  }

  // profile-nudge-system: lets a first-time signup bail out of the
  // wizard without finishing it. Persists profile_setup_dismissed alone
  // — deliberately skips the wizard's own step1Valid/step2Valid checks,
  // since the whole point is to let someone leave without having filled
  // anything in. AccountScreen's own persistent nudge (driven by the
  // actual field values, independent of this flag) picks up from here
  // for anyone who still has required fields missing.
  async function handleSkip() {
    await updateOwnProfile(supabase, user.id, { profileSetupDismissed: true })
    await refreshProfile()
    navigate(ROUTES.ACCOUNT)
  }

  async function handleWizardComplete(values) {
    await updateOwnProfile(supabase, user.id, {
      ...values,
      profileSetupDismissed: true,
    })
    await refreshProfile()
    setSaved({ ...values, profileSetupDismissed: true })
    setEditing(false)
    toast.success('Profile saved')
  }

  // profile-danger-zone: permanently deletes the account (server-side —
  // see delete-account/index.ts for what it removes) then reuses
  // AuthContext's own signOut(), which already clears local notes/
  // recently-viewed storage, rather than duplicating that cleanup here.
  // The account no longer exists at this point regardless of outcome, so
  // there's nothing meaningful left to cancel back to on success — this
  // always ends at the signed-out /account screen.
  async function handleDeleteAccount() {
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

  const canCancel = editing && saved.profileSetupDismissed

  // account-header-tweaks (2026-08-23): the mandatory first-time wizard
  // (no saved profile to cancel back to — same condition canCancel above
  // already keys off) gets its own friendly title instead of the normal
  // "Manage Profile" header, and drops the back arrow since there's
  // nothing meaningful to go back to on a first-time signup — the header's
  // own Skip button (see welcome-header-skip below) is already the escape
  // hatch for this view.
  const isFirstTimeSetup = editing && !canCancel

  const genderLabel = GENDER_LABELS[saved.gender] || ''
  const phoneLabel = saved.phoneNumber ? `${saved.phoneCountryCode} ${saved.phoneNumber}` : ''
  const isPhysician = saved.occupation === 'Specialist Physician' || saved.occupation === 'Junior Resident Physician' || saved.occupation === 'Senior Resident Physician'
  const isStudent = saved.occupation === 'Medical Student'
  // Same display rules as ProfileWizard's OCCUPATION_OPTIONS: "Medical
  // Student" shows as "Student", and "Other" shows the person's own typed
  // text instead of the literal word "Other".
  const occupationDisplay = saved.occupation === 'Other'
    ? (saved.occupationOther || 'Other')
    : isStudent
      ? 'Student'
      : saved.occupation
  const occupationLine = isPhysician && saved.specialty
    ? `${occupationDisplay} \u00b7 ${saved.specialty}`
    : occupationDisplay || ''

  return (
    <div>
      <header style={{
        position:        'sticky',
        top:             0,
        zIndex:          50,
        backgroundColor: 'var(--color-bg)',
        padding:         'var(--space-5) var(--space-6) var(--space-3)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {!isFirstTimeSetup && (
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
          )}
          <h1 style={{
            margin:     0,
            fontSize:   17,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
          }}>
            {isFirstTimeSetup ? 'Welcome' : 'Manage Profile'}
          </h1>
        </div>

        {!profileLoading && (
          canCancel ? (
            <button
              onClick={handleCancelEdit}
              aria-label="Cancel editing"
              style={{
                border:     'none',
                background: 'none',
                padding:    'var(--space-1)',
                display:    'flex',
                alignItems: 'center',
                cursor:     'pointer',
                color:      'var(--color-text-secondary)',
                flexShrink: 0,
              }}
            >
              <X size={20} strokeWidth={1.8} />
            </button>
          ) : isFirstTimeSetup ? (
            // welcome-header-skip: moved here from inside the wizard body
            // (was a quiet text link next to the Step 1/2 progress bar,
            // easy to miss under the avatar/name field above it) — the
            // top-right corner of a welcome screen is the spot people
            // already expect a Skip option, and it was sitting empty here
            // for this exact case (no back arrow, no Edit/Cancel button).
            <button
              onClick={async () => {
                if (skipping) return
                setSkipping(true)
                try {
                  await handleSkip()
                } finally {
                  // handleSkip navigates away on success, so this mostly
                  // only matters if it throws — keeps the link from
                  // getting stuck disabled/busy on a failed attempt.
                  setSkipping(false)
                }
              }}
              disabled={skipping}
              aria-label="Skip for now"
              style={{
                border:                  'none',
                background:              'none',
                padding:                 'var(--space-1)',
                fontSize:                13,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                color:                   'var(--color-text-secondary)',
                textDecoration:          'underline',
                cursor:                  skipping ? 'default' : 'pointer',
                opacity:                 skipping ? 0.6 : 1,
                flexShrink:              0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {skipping ? 'Skipping…' : 'Skip'}
            </button>
          ) : (!editing && (
            <button
              onClick={handleStartEdit}
              aria-label="Edit profile"
              style={{
                display:                 'flex',
                alignItems:              'center',
                gap:                     6,
                border:                  'none',
                backgroundColor:         'var(--color-accent-light)',
                borderRadius:            999,
                padding:                 'var(--space-1) var(--space-3)',
                cursor:                  'pointer',
                color:                   'var(--color-accent)',
                fontSize:                13,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                flexShrink:              0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Pencil size={15} strokeWidth={1.8} />
              Edit
            </button>
          ))
        )}
      </header>

      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  'var(--space-6) var(--space-6) calc(var(--space-12) + 24px)',
      }}>
        {profileLoading ? (
          <ReadOnlySkeleton />
        ) : editing ? (
          <ProfileWizard
            initialValues={saved}
            user={user}
            onComplete={handleWizardComplete}
            // manage-profile-reopens-wizard-fix (2026-08-23): onBack used to
            // fall back to `() => navigate(ROUTES.ACCOUNT)` for the forced
            // first-time flow, which let someone leave step 1 via the
            // footer Back button without ever persisting
            // profileSetupDismissed — so the next time they opened Manage
            // Profile, this screen forced them straight back into the same
            // wizard, with no visible reason why. The header's own Skip
            // button already persists the dismissal and is meant to be the
            // only step-1 exit for this flow — passing undefined here hides the footer Back button on step 1 entirely, same
            // as the header's own back arrow already being dropped for
            // this case. Step 2 -> step 1 navigation inside the wizard is
            // unaffected either way. Existing users editing via the pencil
            // icon (canCancel true) are unaffected.
            onBack={canCancel ? handleCancelEdit : undefined}
            // welcome-header-skip: Skip itself moved to the header button
            // above — the wizard just needs to know whether this is the
            // first-time welcome flow, to show its big welcome headline
            // (see ProfileWizard.jsx). Same canCancel condition as before,
            // just renamed for clarity now that it's not tied to Skip.
            isWelcome={!canCancel}
          />
        ) : (
          <div>
            <ProfileHero
              user={user}
              fullName={saved.fullName}
              occupationLine={occupationLine}
            />

            <GroupLabel>Personal</GroupLabel>
            <ReadOnlyGroup>
              <ReadOnlyRow icon={<User size={17} strokeWidth={1.8} />}     label="Gender"      value={genderLabel} />
              <ReadOnlyRow icon={<Phone size={17} strokeWidth={1.8} />}    label="Phone"       value={phoneLabel} />
              <ReadOnlyRow icon={<Mail size={17} strokeWidth={1.8} />}     label="Email"       value={user.email} />
              {/* governorate-collection-removed (2026-08-23): Governorate
                  row removed entirely — it's no longer collected at all,
                  Country is now the only location field. Country is last
                  in this group as a result. */}
              <ReadOnlyRow icon={<MapPin size={17} strokeWidth={1.8} />}   label="Country"     value={saved.country} last />
            </ReadOnlyGroup>

            <GroupLabel>Professional</GroupLabel>
            <ReadOnlyGroup>
              {/* header-skip-country-tweaks (2026-08-23): same reversal as
                  Governorate above, for Specialty/Student type — each only
                  renders when the occupation actually calls for it (a
                  pharmacist, dentist, etc. gets neither row, rather than an
                  empty "Not set" Specialty row every non-physician saw
                  before). Occupation itself is unaffected and always shows. */}
              <ReadOnlyRow icon={<Stethoscope size={17} strokeWidth={1.8} />} label="Occupation" value={occupationDisplay} last={!isStudent && !isPhysician} />
              {isStudent && (
                <ReadOnlyRow icon={<GraduationCap size={17} strokeWidth={1.8} />} label="Student type" value={saved.studentType} last />
              )}
              {isPhysician && (
                <ReadOnlyRow icon={<HeartPulse size={17} strokeWidth={1.8} />} label="Specialty" value={saved.specialty} last />
              )}
            </ReadOnlyGroup>

            {/* profile-danger-zone (2026-08-23): read-only-view only —
                not shown while the wizard is open, keeps this separate
                from data entry. Own red-toned styling (not ReadOnlyGroup)
                since this is the one destructive action on the screen and
                should read as visually distinct, not just another row. */}
            <GroupLabel>Danger Zone</GroupLabel>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius:    'var(--radius-lg)',
              border:          '1px solid var(--color-danger)',
              overflow:        'hidden',
            }}>
              <button
                onClick={() => setDeleteSheetOpen(true)}
                style={{
                  width:                   '100%',
                  display:                 'flex',
                  alignItems:              'center',
                  gap:                     'var(--space-3)',
                  padding:                 'var(--space-3) var(--space-4)',
                  border:                  'none',
                  backgroundColor:         'transparent',
                  fontFamily:              'var(--font-body)',
                  textAlign:               'left',
                  cursor:                  'pointer',
                  color:                   'var(--color-danger)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Trash2 size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Delete Account</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <DeleteAccountSheet
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        onConfirm={handleDeleteAccount}
        busy={deleting}
      />
    </div>
  )
}