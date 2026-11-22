/**
 * src/pages/PublicProfileScreen.jsx
 * 14.7b (public profile plan, 2026-11-22): the public profile page at /u/<username>. Public: no sign-in,
 * outside the shared layout, and no welcome screen first (OnboardingGate lets /u/ pages through), the same
 * as the shared roshetta and group pages.
 *
 * Shows the chosen avatar, the name and @username on two separate lines (the name in its own direction, the
 * username always left to right), the bio, Share profile, the two lists (Roshettas default; Drug groups when
 * only groups are public) and the grey safety line. A signed-in owner sees the same page plus "This is your
 * profile" with an Open button to their Profile tab.
 *
 * Top bar: a person who arrived from inside the app gets Back; a first-time visitor gets the Capsula logo
 * and Open Capsula.
 *
 * States: loading, profile not found (unknown, removed, or an old username with forwarding off: one
 * message), too many tries, offline (Try again, and it tries by itself when the phone is back online), could
 * not open (Try again). An old username that forwards replaces the address with the current one.
 *
 * Nothing is kept on the phone: the page asks the server again every time it is shown, and again when the
 * signed-in person changes (the answer says whether the viewer is the owner). It asks search engines not to
 * list it (noindex), a request and not a lock.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FileX, WifiOff, AlertTriangle, Clock } from 'lucide-react'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { shimmer } from '../components/drugs/home/shimmer'
import { ProfileHeader, ShareProfileButton, ProfileLists, SafetyLine } from '../components/profile/PublicProfileView'
import ReportSheet, { ReportLink } from '../components/ui/ReportSheet'
import { useAuth } from '../hooks/useAuth'
import useScrollToTopOnOpen from '../hooks/useScrollToTopOnOpen'
import { fetchPublicProfile } from '../utils/publicProfile'
import { setNoIndex } from '../utils/noindex'
import { PROFILE_WORDS, profilePageState, problemText, forwardTarget } from '../utils/profileView'
import { ROUTES } from '../router'

const MUTED = { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-tertiary)' }
const PROBLEM_LOOK = {
  not_found: { icon: FileX, accent: MUTED },
  hidden: { icon: FileX, accent: MUTED },
  too_many: { icon: Clock, accent: MUTED },
  offline: { icon: WifiOff, accent: MUTED },
  error: { icon: AlertTriangle, accent: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' } },
}

export default function PublicProfileScreen() {
  useScrollToTopOnOpen()
  const { handle } = useParams()
  // Keyed by the username, so opening a different profile starts from loading.
  return <PublicProfileBody key={handle} handle={handle} />
}

function PublicProfileBody({ handle }) {
  const navigate = useNavigate()
  const location = useLocation()
  // The first screen of the session has nothing behind it, so no Back button.
  const canGoBack = location.key !== 'default'

  const [result, setResult] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => setNoIndex(), [])

  useEffect(() => {
    let cancelled = false
    fetchPublicProfile(handle).then((r) => {
      if (cancelled) return
      // A page already showing is kept if the second ask (after sign-in) fails.
      setResult((prev) => (prev.status === 'ok' && r.status !== 'ok' ? prev : r))
      const target = forwardTarget(r, handle)
      if (target) navigate(ROUTES.PUBLIC_PROFILE(target), { replace: true })
    })
    return () => { cancelled = true }
  }, [handle, attempt, userId, navigate])

  // Coming back online while the offline message shows: try again by itself.
  useEffect(() => {
    if (result.status !== 'offline') return undefined
    const again = () => setAttempt((n) => n + 1)
    window.addEventListener('online', again)
    return () => window.removeEventListener('online', again)
  }, [result.status])

  const retry = useCallback(() => {
    setResult({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const state = profilePageState(result)

  const topLeft = canGoBack ? (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
        padding: '4px 0', minHeight: 44, WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  ) : (
    <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Capsula" className="capsula-logo" style={{ display: 'block', height: 22, width: 'auto' }} />
  )
  const topRight = canGoBack ? null : (
    <button
      type="button"
      onClick={() => navigate(ROUTES.HOME, { replace: true })}
      style={{
        flexShrink: 0, minHeight: 44, padding: '0 var(--space-1)', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 600, color: 'var(--color-accent-text)', fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      Open Capsula
    </button>
  )
  const topBar = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, marginTop: 'var(--space-3)' }}>
      {topLeft}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{topRight}</div>
    </div>
  )

  let content
  if (state === 'loading') {
    content = (
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={shimmer({ width: 72, height: 72, borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-2)' })} />
          <div style={shimmer({ width: 120, height: 17, marginBottom: 6 })} />
          <div style={shimmer({ width: 90, height: 14 })} />
        </div>
        <div style={shimmer({ width: '100%', height: 60, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-2)' })} />
        <div style={shimmer({ width: '100%', height: 60, borderRadius: 'var(--radius-lg)' })} />
      </div>
    )
  } else if (state !== 'ok') {
    const t = problemText(state)
    const look = PROBLEM_LOOK[state]
    content = (
      <GroupStateMessage
        open
        icon={look.icon}
        accent={look.accent}
        title={t.title}
        body={t.body}
        actionLabel={t.actionLabel}
        onAction={t.action === 'retry' ? retry : () => navigate(ROUTES.HOME, { replace: true })}
      />
    )
  } else {
    const { profile } = result
    content = (
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <ProfileHeader profile={profile} />
        {profile.isOwner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{PROFILE_WORDS.ownerTitle}</div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)' }}>{PROFILE_WORDS.ownerLine}</div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.ACCOUNT)}
              style={{
                flexShrink: 0, minHeight: 44, padding: '0 var(--space-4)', borderRadius: 'var(--radius-full)', border: 'none',
                backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Open
            </button>
          </div>
        )}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ShareProfileButton name={profile.name} handle={profile.handle} />
        </div>
        <ProfileLists profile={profile} own={profile.isOwner} />
        <SafetyLine />
        {!profile.isOwner && (
          <>
            <ReportLink onClick={() => setReportOpen(true)} />
            <ReportSheet isOpen={reportOpen} onClose={() => setReportOpen(false)} kind="profile" reference={profile.handle} />
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {topBar}
      {content}
    </div>
  )
}
