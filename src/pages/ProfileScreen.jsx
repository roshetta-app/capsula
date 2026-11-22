/**
 * src/pages/ProfileScreen.jsx
 * 14.7a (public profile plan, 2026-11-22): the Profile tab. It replaces the old Account tab screen; what
 * that screen did now lives in Settings (AccountScreen.jsx at /account/settings, opened from the gear
 * here).
 *
 * What it shows, one thing at a time (the rules are in utils/profileTab.js):
 *   - the avatar the person chose (never the sign-in photo), their name and @username
 *   - ONE card: "Finish your details" first (name, occupation, country, specialty for a physician),
 *     then "Set up your public profile", then (14.7b) the person's own view of their public profile: bio,
 *     Share profile, Add to profile, and the two lists (Roshettas, Drug groups) as other people see them
 *   - a guest sees a sign-in card; a failed read says no connection or could not load, with Try again
 *
 * The profile is read from the server every time this screen opens and is never kept on the phone.
 * "Finish your details" opens the existing Edit screen (the wizard until 14.7c); "Set up your public
 * profile" opens the same setup sheet the share sheets use (14.5b).
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, ChevronRight, UserCircle, WifiOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePublicProfile } from '../hooks/usePublicProfile'
import PublicAvatar from '../components/ui/PublicAvatar'
import PublicSetupSheet from '../components/ui/PublicSetupSheet'
import AddToProfileSheet from '../components/ui/AddToProfileSheet'
import { ProfileHeader, ShareProfileButton, ProfileLists, SafetyLine } from '../components/profile/PublicProfileView'
import { useFavouritesContext } from '../context/FavouritesContext'
import { fetchPublicProfile } from '../utils/publicProfile'
import { PROFILE_WORDS } from '../utils/profileView'
import { shimmer } from '../components/drugs/home/shimmer'
import { ROUTES } from '../router'
import {
  profileTabView, statusForFailure, heroLines, detailsPercent, TAB_WORDS,
} from '../utils/profileTab'

const CARD = {
  backgroundColor: 'var(--color-surface)',
  border:          '1px solid var(--color-border)',
  borderRadius:    'var(--radius-lg)',
  padding:         'var(--space-4)',
  marginBottom:    'var(--space-3)',
}

function Tile({ children }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 'var(--radius-full)', flexShrink: 0,
      backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}

function PillButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: 'none',
        backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600,
        fontFamily: 'var(--font-body)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function MessageCard({ icon, title, line, action }) {
  return (
    <div style={{ ...CARD, textAlign: 'center', padding: 'var(--space-5) var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <Tile>{icon}</Tile>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
        {title}
      </div>
      <p style={{ margin: '0 0 var(--space-4)', fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
        {line}
      </p>
      {action}
    </div>
  )
}

function Skeleton() {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={shimmer({ width: 72, height: 72, borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-2)' })} />
        <div style={shimmer({ width: 120, height: 17, marginBottom: 6 })} />
        <div style={shimmer({ width: 90, height: 14 })} />
      </div>
      <div style={shimmer({ width: '100%', height: 76, borderRadius: 'var(--radius-lg)' })} />
    </div>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const { loadProfile } = usePublicProfile()
  const [status, setStatus] = useState('loading')
  const [profile, setProfile] = useState(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const signedIn = !!user

  // Reading again: Try again and a finished setup bump this counter, which runs the effect below once more.
  const [reloadKey, setReloadKey] = useState(0)
  function reload() {
    setStatus('loading')
    setReloadKey((n) => n + 1)
  }

  useEffect(() => {
    if (authLoading || !signedIn) return undefined
    let cancelled = false
    loadProfile().then((res) => {
      if (cancelled) return
      setProfile(res.ok ? res.profile : null)
      setStatus(statusForFailure(res))
    })
    return () => { cancelled = true }
  }, [authLoading, signedIn, loadProfile, reloadKey])

  // 14.7b: once both cards are done, the public profile is read from the server (the same answer a visitor
  // gets, so the person sees exactly what others see). Read again every time the tab opens, never kept.
  const handle = profile?.handle ?? null
  const [pub, setPub] = useState({ status: 'loading' })
  const [pubKey, setPubKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab] = useState('roshettas')
  const { roshettasApi, groups, createShareLink } = useFavouritesContext()

  useEffect(() => {
    if (!signedIn || !handle || authLoading) return undefined
    let cancelled = false
    fetchPublicProfile(handle).then((r) => { if (!cancelled) setPub(r) })
    return () => { cancelled = true }
  }, [signedIn, handle, authLoading, pubKey])

  function reloadPub() {
    setPub({ status: 'loading' })
    setPubKey((n) => n + 1)
  }
  function openAdd(tab) {
    setAddTab(tab === 'groups' ? 'groups' : 'roshettas')
    setAddOpen(true)
  }

  const view = profileTabView({ authLoading, signedIn, status, profile })
  const hero = heroLines(profile)
  const showHero = view === 'details' || view === 'public' || view === 'ready'

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-5) 0 var(--space-3)', marginBottom: 'var(--space-3)',
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>Profile</h1>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ACCOUNT_SETTINGS)}
          aria-label="Settings"
          style={{
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Settings size={22} strokeWidth={1.8} />
        </button>
      </div>

      {view === 'loading' && <Skeleton />}

      {showHero && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <PublicAvatar code={profile?.avatar_code ?? null} name={profile?.full_name ?? ''} size={72} style={{ marginBottom: 'var(--space-2)' }} />
          <div dir="auto" style={{ fontSize: 19, fontWeight: 600, color: 'var(--color-text-primary)' }}>{hero.name}</div>
          {hero.handle && (
            <div dir="ltr" style={{ marginTop: 2, fontSize: 14, color: 'var(--color-text-secondary)' }}>{hero.handle}</div>
          )}
        </div>
      )}

      {view === 'guest' && (
        <MessageCard
          icon={<UserCircle size={20} strokeWidth={1.8} />}
          title={TAB_WORDS.guestTitle}
          line={TAB_WORDS.guestLine}
          action={<PillButton onClick={() => signInWithGoogle?.()}>Continue with Google</PillButton>}
        />
      )}

      {view === 'offline' && (
        <MessageCard
          icon={<WifiOff size={20} strokeWidth={1.8} />}
          title={TAB_WORDS.offlineTitle}
          line={TAB_WORDS.offlineLine}
          action={<PillButton onClick={reload}>Try again</PillButton>}
        />
      )}

      {view === 'error' && (
        <MessageCard
          icon={<AlertCircle size={20} strokeWidth={1.8} />}
          title={TAB_WORDS.errorTitle}
          line={TAB_WORDS.errorLine}
          action={<PillButton onClick={reload}>Try again</PillButton>}
        />
      )}

      {view === 'details' && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.ACCOUNT_EDIT, { state: { openWizard: true } })}
          style={{
            ...CARD, width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
            border: '1px solid var(--color-accent)',
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{TAB_WORDS.detailsTitle}</div>
            <div style={{ marginTop: 2, marginBottom: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>{TAB_WORDS.detailsLine}</div>
            <div style={{ height: 6, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{
                width: `${detailsPercent(profile)}%`, height: '100%', borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-accent)', transition: 'width var(--motion-fast) var(--ease-settle)',
              }} />
            </div>
          </div>
          <ChevronRight size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
        </button>
      )}

      {view === 'public' && (
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{TAB_WORDS.publicTitle}</div>
            <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>{TAB_WORDS.publicLine}</div>
          </div>
          <PillButton onClick={() => setSetupOpen(true)}>Set up</PillButton>
        </div>
      )}

      {view === 'ready' && pub.status === 'loading' && (
        <div>
          <div style={shimmer({ width: '100%', height: 60, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-2)' })} />
          <div style={shimmer({ width: '100%', height: 60, borderRadius: 'var(--radius-lg)' })} />
        </div>
      )}

      {view === 'ready' && (pub.status === 'offline' || pub.status === 'error' || pub.status === 'not_found' || pub.status === 'too_many') && (
        <MessageCard
          icon={pub.status === 'offline' ? <WifiOff size={20} strokeWidth={1.8} /> : <AlertCircle size={20} strokeWidth={1.8} />}
          title={pub.status === 'offline' ? TAB_WORDS.offlineTitle : TAB_WORDS.errorTitle}
          line={pub.status === 'offline' ? TAB_WORDS.offlineLine : TAB_WORDS.errorLine}
          action={<PillButton onClick={reloadPub}>Try again</PillButton>}
        />
      )}

      {view === 'ready' && pub.status === 'ok' && (
        <div>
          <ProfileHeader profile={pub.profile} showAvatarAndName={false} />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <ShareProfileButton name={pub.profile.name} handle={pub.profile.handle} />
            <button
              type="button"
              onClick={() => openAdd(null)}
              style={{
                minHeight: 44, padding: '0 var(--space-4)', borderRadius: 'var(--radius-full)', border: 'none',
                backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {PROFILE_WORDS.addToProfile}
            </button>
          </div>
          <ProfileLists profile={pub.profile} own onAdd={openAdd} />
          <SafetyLine />
        </div>
      )}

      <AddToProfileSheet
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        roshettas={roshettasApi?.roshettas ?? []}
        groups={groups ?? []}
        publishRoshetta={(id) => roshettasApi.createRoshettaShare(id, undefined, true)}
        publishGroup={(id) => createShareLink(id, undefined, true)}
        initialTab={addTab}
        onChanged={reloadPub}
      />

      <PublicSetupSheet
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onDone={() => { setSetupOpen(false); reload() }}
        actionLabel="Save"
      />
    </div>
  )
}
