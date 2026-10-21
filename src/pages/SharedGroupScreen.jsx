/**
 * src/pages/SharedGroupScreen.jsx
 * 2026-10-19 (Drug groups plan, step 8.2): the read-only page opened from a
 * share link, at /g/:code. No sign-in is needed.
 *
 * Shows the group's colour icon and name, the number of drugs, the
 * description, a line saying a Capsula user made the group (the name and
 * description are written by the owner, not by Capsula), then the drugs as
 * normal drug cards, A to Z by brand name. Tapping a drug opens it; back
 * returns here.
 *
 * No welcome screen and no drug library download just to look at the group
 * (OnboardingGate lets /g/ pages through). A guest gets an Open Capsula link at
 * the bottom; that, or opening a drug, is where the welcome screen appears.
 * The first screen of a session has no Back button (nothing behind it).
 *
 * No edit controls, no heart, and the owner is never shown (the database
 * function does not return it).
 *
 * 2026-10-19 (step 8.3): Save to my groups, at the bottom, only when the groups
 * switch is on and the group has drugs. It makes the viewer's own copy (a new
 * group, not linked to this one, nothing about the owner). A guest is asked to
 * sign in first: the page remembers the link (the sign-in prompt keeps
 * 'save:<code>') and finishes the save by itself once signed in; closing the
 * sign-in sheet cancels it. After saving the button becomes "Saved to your
 * groups" with View. Free accounts keep the first 20 drugs as listed here
 * (A to Z), with a note; the limit sheet, read only and offline messages come
 * from the same places as the rest of groups.
 *
 * 2026-10-21 (step 14.1, F21, F22): first impression for someone who has never seen the
 * app. A slim top bar with the Capsula logo and an "Open Capsula" text button (a person
 * who came from inside the app gets the Back button in place of both, because they are
 * already in it), then the group in the same tinted header block as the group page: the
 * folder tile, the name, the drug count, a "Shared group" tag and, inside the block, the
 * note that a Capsula user wrote it. The drug list is unchanged. The old "Open Capsula"
 * link under the list is gone (the top bar has it).
 *
 * 2026-10-21 (step 14.3, F23): the link problem states (not available, which also covers
 * a stopped link and a deleted group; offline; could not open) share one centred layout:
 * the Capsula logo, an icon, a title, one short line and ONE button. Not available says
 * "This link isn't available" / "The owner may have stopped sharing it, or the link is
 * incomplete." with "Open Capsula" (it replaces this page, so Back does not return to a
 * dead link); offline and could not open say what happened with "Try again". The top bar is
 * not shown in these states (the layout carries the logo and the button); a person who
 * arrived from inside the app still gets Back.
 *
 * 2026-10-21 (step 14.2, F22): the Save bar. It stays at the bottom of the screen above
 * the system bar (also when the group is short), and when the list is long it ends up
 * under the last drug, so it never covers one. States: guest (Save opens the sign-in
 * sheet), saving, saved ("Saved to your groups" with View, or the 20-of-34 line when a
 * free account kept only part), group limit (the limit sheet), and three refusals shown as
 * one slim line inside the bar with Save still there to try again: offline, could not
 * save, read only. The floating message bars are gone from this page.
 *
 * States (plan section 5, Sharing, Viewer rows):
 *   - loading: placeholder cards.
 *   - link not available: "This link isn't available. The owner may have
 *     stopped sharing it." The same message for a wrong link, a stopped link
 *     and a deleted group.
 *   - offline: "You're offline. Reconnect to open this group." with Retry.
 *   - could not load: Retry.
 *   - empty group: "No drugs in this group."
 *   - a drug removed from the app: left out (the database function does it).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Folder, FolderX, Check, WifiOff, CircleAlert } from 'lucide-react'
import SharedDrugCard from '../components/SharedDrugCard'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { drugRowTitle } from '../components/drugs/groups/groupDrugText'
import { shimmer } from '../components/drugs/home/shimmer'
import { useCategories } from '../hooks/useCategories'
import { markScreenMounted } from '../hooks/useDeepLinkParent'
import { useAuth } from '../hooks/useAuth'
import { useFavouritesContext } from '../context/FavouritesContext'
import { isDrugGroupsOn } from '../constants/features'
import { SAVE_OFFLINE_MESSAGE, SAVE_READ_ONLY_MESSAGE, SAVE_ERROR_MESSAGE, savedGroupMessage } from '../components/drugs/groups/groupMessages'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken } from '../utils/specialtyTokens'
import { fetchSharedGroup } from '../utils/sharedGroup'
import { logUsageEvent } from '../analytics/usageEvents'
import { ROUTES } from '../router'

function SkeletonCard() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '14px var(--space-1)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={shimmer({ width: '55%', height: 14 })} />
        <div style={shimmer({ width: '35%', height: 11 })} />
      </div>
    </div>
  )
}

// One centred layout for every link problem (step 14.3, F23): logo, icon, title, one line,
// one button. It fills the free height of the page, so there is never a small card at the
// top with an empty page under it.
function LinkProblem({ Icon, title, body, actionLabel, onAction }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '0 var(--space-2) 12vh', fontFamily: 'var(--font-body)',
    }}>
      <img
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt="Capsula"
        className="capsula-logo"
        style={{ display: 'block', height: 24, width: 'auto', marginBottom: 'var(--space-6)' }}
      />
      <div style={{
        width: 72, height: 72, borderRadius: '50%', marginBottom: 'var(--space-4)',
        backgroundColor: 'var(--color-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={32} color="var(--color-text-secondary)" strokeWidth={1.6} aria-hidden="true" />
      </div>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
        {title}
      </h1>
      <p style={{ margin: 'var(--space-2) 0 var(--space-5)', maxWidth: 320, fontSize: 15, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
        {body}
      </p>
      <button
        onClick={onAction}
        style={{
          width: '100%', maxWidth: 320, minHeight: 48, border: 'none', padding: '0 16px',
          borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff',
          fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', outline: 'none',
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}

export default function SharedGroupScreen() {
  const { code } = useParams()
  // Keyed by the code, so opening a different link starts from loading.
  return <SharedGroupBody key={code} code={code} />
}

function SharedGroupBody({ code }) {
  const navigate = useNavigate()
  // This page does not put the Drugs home behind itself (a person opening a
  // link just wants the group), but it counts as a screen that was shown first,
  // so a drug opened from here keeps this page behind it for Back.
  useEffect(() => { markScreenMounted() }, [])

  const location = useLocation()
  // The first screen of the session has nothing behind it, so no Back button.
  const canGoBack = location.key !== 'default'
  const { user, loading: authLoading } = useAuth()
  const { promptSignIn, pendingFavourite, groupsStatus, saveSharedGroup, showGroupLimit } = useFavouritesContext()
  const groupsOn = isDrugGroupsOn()

  const isDark = useIsDark()
  const { categories } = useCategories()

  // { status: 'loading' | 'ok' | 'unavailable' | 'offline' | 'error', group? }
  const [result, setResult] = useState({ status: 'loading' })

  // Bumped by Retry, so the effect below asks again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSharedGroup(code).then(r => {
      if (!cancelled) setResult(r)
    })
    return () => { cancelled = true }
  }, [code, attempt])

  // Analytics (step 9.5): one 'shared_group_open' per link opened, when the group
  // really shows. No code, name or description is sent, and Retry or coming back
  // online does not count it twice.
  const openLoggedFor = useRef(null)
  useEffect(() => {
    if (result.status !== 'ok' || openLoggedFor.current === code) return
    openLoggedFor.current = code
    logUsageEvent('shared_group_open')
  }, [result.status, code])

  const retry = useCallback(() => {
    setResult({ status: 'loading' })
    setAttempt(n => n + 1)
  }, [])

  // Coming back online while the offline message shows: try again by itself.
  useEffect(() => {
    if (result.status !== 'offline') return undefined
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [result.status, retry])

  const drugs = useMemo(() => {
    const list = result.status === 'ok' ? [...result.group.drugs] : []
    list.sort((a, b) => drugRowTitle(a).localeCompare(drugRowTitle(b), undefined, { sensitivity: 'base' }))
    return list
  }, [result])

  // ── Save to my groups (step 8.3) ──────────────────────────────────────────
  // { phase: 'idle' | 'saving' | 'saved', groupId?, saved?, total? }
  const [saveState, setSaveState] = useState({ phase: 'idle' })
  const savingRef = useRef(false)
  // A refused save, shown as one line inside the Save bar (null when there is none).
  const [notice, setNotice] = useState(null)
  const signInId = `save:${code}`
  // A guest tapped Save and is signing in. Also true after a sign-in that
  // reloaded the page, because the prompt keeps the request.
  const armedRef = useRef(pendingFavourite?.type === 'groups' && pendingFavourite.id === signInId)

  const runSave = useCallback(async () => {
    if (savingRef.current || result.status !== 'ok') return
    savingRef.current = true
    setNotice(null)
    setSaveState({ phase: 'saving' })
    const g = result.group
    const r = await saveSharedGroup({
      name: g.name,
      description: g.description,
      color: g.color,
      brandIds: drugs.map(d => d.id),
      signInId,
      quiet: true,
    })
    savingRef.current = false
    if (r.ok) {
      setSaveState({ phase: 'saved', groupId: r.group.id, saved: r.saved, total: r.total })
      return
    }
    setSaveState({ phase: 'idle' })
    // guest opened the sign-in sheet and the limit opens its own sheet; the rest
    // are one line in the bar (the hook was asked not to float its own message).
    if (r.reason === 'limit') showGroupLimit('groups')
    else if (r.reason === 'read_only') setNotice(SAVE_READ_ONLY_MESSAGE)
    else if (r.reason === 'offline') setNotice(SAVE_OFFLINE_MESSAGE)
    else if (r.reason !== 'guest') setNotice(SAVE_ERROR_MESSAGE)
  }, [result, drugs, saveSharedGroup, signInId, showGroupLimit])

  function handleSaveTap() {
    if (authLoading || saveState.phase !== 'idle') return
    if (!user) {
      armedRef.current = true
      promptSignIn('groups', signInId)
      return
    }
    runSave()
  }

  // Finish a save that waited for sign-in, or cancel it when the sign-in sheet
  // was closed without signing in.
  useEffect(() => {
    if (!armedRef.current || authLoading) return
    if (!user) {
      if (!pendingFavourite) armedRef.current = false
      return
    }
    if (groupsStatus === 'loading' || result.status !== 'ok') return
    // Started on the next tick, so the save's own state change is not made
    // inside this effect. The request is only cleared when it really starts.
    const t = setTimeout(() => {
      armedRef.current = false
      runSave()
    }, 0)
    return () => clearTimeout(t)
  }, [authLoading, user, pendingFavourite, groupsStatus, result.status, runSave])

  const showSave = groupsOn && result.status === 'ok' && drugs.length > 0
  const saveBusy = saveState.phase === 'saving' || authLoading || (!!user && groupsStatus === 'loading')

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      aria-label="Back to Drugs"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
        fontFamily: 'var(--font-body)', padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Drugs
    </button>
  )

  // Top bar (F21): the logo says what this is, "Open Capsula" is the way in. Someone who
  // arrived from inside the app (there is a screen behind this one) gets Back instead.
  const topBar = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
      minHeight: 44, marginBottom: 'var(--space-3)',
    }}>
      {canGoBack ? backButton : (
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt="Capsula"
          className="capsula-logo"
          style={{ display: 'block', height: 22, width: 'auto' }}
        />
      )}
      {!canGoBack && (
        <button
          onClick={() => navigate(ROUTES.DRUGS)}
          style={{
            flexShrink: 0, minHeight: 44, padding: '0 var(--space-1)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-accent)',
            fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          Open Capsula
        </button>
      )}
    </div>
  )

  // The problem layout carries its own logo and button, so the top bar is only kept for Back.
  const isProblem = result.status === 'unavailable' || result.status === 'offline' || result.status === 'error'

  let content
  if (result.status === 'loading') {
    content = <div><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
  } else if (result.status === 'unavailable') {
    content = (
      <LinkProblem
        Icon={FolderX}
        title="This link isn't available"
        body="The owner may have stopped sharing it, or the link is incomplete."
        actionLabel="Open Capsula"
        onAction={() => navigate(ROUTES.DRUGS, { replace: true })}
      />
    )
  } else if (result.status === 'offline') {
    content = (
      <LinkProblem
        Icon={WifiOff}
        title="You're offline"
        body="Reconnect to open this group."
        actionLabel="Try again"
        onAction={retry}
      />
    )
  } else if (result.status === 'error') {
    content = (
      <LinkProblem
        Icon={CircleAlert}
        title="Couldn't open this group"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={retry}
      />
    )
  } else {
    const { group } = result
    const tone = resolveToken(group.color, isDark)
    const count = drugs.length

    content = (
      <>
        <div style={{
          backgroundColor: tone.bg, borderRadius: 20, padding: 'var(--space-4)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Folder size={22} color={tone.fg} aria-hidden="true" />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface)',
              borderRadius: 8, padding: '3px 10px', fontFamily: 'var(--font-body)',
            }}>
              Shared group
            </span>
          </div>

          <h1 dir="ltr" style={{
            margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.25, textAlign: 'start',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
            overflowWrap: 'anywhere',
          }}>
            {group.name}
          </h1>

          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {count} {count === 1 ? 'drug' : 'drugs'}
          </div>

          {group.description && (
            <p dir="ltr" style={{
              margin: 0, fontSize: 14, lineHeight: 1.5, textAlign: 'start',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
              whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
            }}>
              {group.description}
            </p>
          )}

          <p style={{
            margin: 0, paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-surface)',
            fontSize: 12, lineHeight: 1.45, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
          }}>
            Shared by a Capsula user. The name and description were written by them, not by Capsula.
          </p>
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          {count === 0 ? (
            <GroupStateMessage title="No drugs in this group" />
          ) : (
            <div>
              {drugs.map((drug, i) => (
                <SharedDrugCard
                  key={drug.id}
                  drug={drug}
                  categories={categories}
                  isDark={isDark}
                  isLast={i === drugs.length - 1}
                  onTap={() => navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))}
                />
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div style={{
      // 2026-10-20 (Drug groups plan, step 14.0 / F20): this route is opened outside
      // Layout, so the side gap is defined here instead of read from Layout.
      // Without it the padding below was invalid and the browser dropped all of it.
      '--page-gutter': 'var(--space-4)',
      maxWidth: 680, margin: '0 auto',
      // Step 14.2: a full-height column, so the Save bar sits at the bottom of the screen
      // even when the group is short. With a Save bar the bar carries the bottom gap.
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      padding: `calc(var(--space-3) + env(safe-area-inset-top, 0px)) var(--page-gutter) ${showSave ? '0' : 'calc(var(--space-4) + env(safe-area-inset-bottom, 0px))'}`,
    }}>
      {isProblem ? (canGoBack && <div style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>{backButton}</div>) : topBar}
      <div style={{
        flex: '1 0 auto', paddingBottom: showSave ? 'var(--space-4)' : 0,
        ...(isProblem ? { display: 'flex', flexDirection: 'column' } : null),
      }}>{content}</div>
      {showSave && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 5,
          margin: '0 calc(-1 * var(--page-gutter))',
          padding: 'var(--space-3) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px))',
          backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
          fontFamily: 'var(--font-body)',
        }}>
          {saveState.phase === 'saved' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                <Check size={18} strokeWidth={2.6} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                <span role="status" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>
                  {savedGroupMessage(saveState.saved, saveState.total)}
                </span>
              </span>
              <button
                onClick={() => navigate(ROUTES.DRUGS_GROUP(saveState.groupId))}
                style={{
                  flexShrink: 0, minHeight: 44, border: 'none', cursor: 'pointer', padding: '0 20px',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                View
              </button>
            </div>
          ) : (
            <>
              {notice && (
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <GroupStateMessage variant="banner" tone="warning" title={notice} />
                </div>
              )}
              <button
                onClick={handleSaveTap}
                disabled={saveBusy}
                style={{
                  display: 'block', width: '100%', minHeight: 48, border: 'none', padding: '0 16px',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff',
                  fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
                  cursor: saveBusy ? 'default' : 'pointer', opacity: saveBusy ? 0.6 : 1,
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {saveState.phase === 'saving' ? 'Saving…' : 'Save to my groups'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
