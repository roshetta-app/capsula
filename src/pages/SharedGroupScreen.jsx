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
 * No edit controls, no heart. The owner is anonymous unless they chose to show their name
 * (2026-11-03): then the line under the group name reads "Shared by <name> \u00b7 3 drugs" (the
 * database function only returns the name when the owner turned it on).
 * 2026-11-21 (Roshetta plan, Phase L, step 13.4): the line now reads "Created by <name> \u00b7 12 Nov \u00b7
 * 3 drugs" ("Created 12 Nov \u00b7 3 drugs" when anonymous), the day being when the group was first
 * made. The owner opening their own link sees this same page, and the Save bar becomes "This is
 * your group" with an Open button to their own page (no copy can be made). The answer depends on
 * who asks, so the page asks again after a sign-in, and a save that waited for sign-in waits for
 * that answer first.
 * 2026-11-03: the "Shared by a Capsula user. The name and description were written by them..."
 * note is gone from the folder; the "Shared group" tag already says what the page is.
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
 * 2026-11-21 (polish step 8.6b): the states follow the shared roshetta page. Loading is a placeholder
 * shaped like the page (GroupPageSkeleton) under the top bar; the three link problems use the open look
 * (round icon, title, one line, one button: grey for not available and offline, amber warning for could
 * not open) UNDER the top bar, so the logo / Back and Open Capsula are always there; an empty group is the
 * open look too ("Nothing here yet"); the Save bar has a soft shadow instead of a line and round buttons.
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
import { FolderX, FolderOpen, Check, WifiOff, AlertTriangle } from 'lucide-react'
import SharedDrugCard from '../components/SharedDrugCard'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import FolderShell from '../components/drugs/groups/FolderShell'
import GroupDescription from '../components/drugs/groups/GroupDescription'
import { folderWash } from '../components/drugs/groups/folderStyles'
import { sortDrugsByTitle } from '../components/drugs/groups/groupDrugText'
import GroupPageSkeleton from '../components/drugs/groups/GroupPageSkeleton'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import { useTapGuard } from '../hooks/useTapGuard'
import ReportSheet, { ReportLink } from '../components/ui/ReportSheet'
import { useItemStar } from '../hooks/useItemStar'
import { StarButton, StarCount, StarNotice } from '../components/ui/StarButton'
import { useViewCount } from '../hooks/useViewCount'
import { useOpenDrug } from '../hooks/useOpenDrug'
import useScrollToTopOnOpen from '../hooks/useScrollToTopOnOpen'
import { useFavouritesContext } from '../context/FavouritesContext'
import { isDrugGroupsOn } from '../constants/features'
import { SAVE_OFFLINE_MESSAGE, SAVE_READ_ONLY_MESSAGE, SAVE_ERROR_MESSAGE, savedGroupMessage } from '../components/drugs/groups/groupMessages'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken } from '../utils/specialtyTokens'
import { fetchSharedGroup } from '../utils/sharedGroup'
import { creditLinkHandle, dayText, findSavedCopy, sharedBarState } from '../utils/shareCredit'
import { logUsageEvent } from '../analytics/usageEvents'
import { ROUTES } from '../router'

const GREY = { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-tertiary)' }
const PROBLEM_LOOK = {
  unavailable: {
    icon: FolderX, accent: GREY,
    title: "This link isn't available",
    body: 'The owner may have stopped sharing it, or the link is incomplete.',
  },
  offline: { icon: WifiOff, accent: GREY, title: "You're offline", body: 'Reconnect to open this group.' },
  error: {
    icon: AlertTriangle, accent: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' },
    title: "Couldn't open this group", body: 'Check your connection and try again.',
  },
}

export default function SharedGroupScreen() {
  useScrollToTopOnOpen()
  const { code } = useParams()
  // Keyed by the code, so opening a different link starts from loading.
  return <SharedGroupBody key={code} code={code} />
}

function SharedGroupBody({ code }) {
  const navigate = useNavigate()
  const { openPage } = useTapGuard()
  const openDrug = useOpenDrug()
  // A person opening a link just wants this page, so no screen is put behind it (navRules.js:
  // laysBehind false). A drug opened from here keeps this page behind it, because the page is
  // no longer the arrival once the person moves on.

  const location = useLocation()
  // The first screen of the session has nothing behind it, so no Back button.
  const canGoBack = location.key !== 'default'
  const { user, loading: authLoading } = useAuth()
  const { promptSignIn, pendingFavourite, groups, groupsStatus, saveSharedGroup, showGroupLimit } = useFavouritesContext()
  const groupsOn = isDrugGroupsOn()

  const isDark = useIsDark()
  const { categories } = useCategories()

  // { status: 'loading' | 'ok' | 'unavailable' | 'offline' | 'error', group? }
  const [result, setResult] = useState({ status: 'loading' })
  const [reportOpen, setReportOpen] = useState(false)

  // Bumped by Retry, so the effect below asks again.
  const [attempt, setAttempt] = useState(0)

  // The answer depends on who is asking (the owner is told so), so it is asked again when the
  // signed-in person changes, and each answer remembers who it was asked for (forUser). A page
  // that was already showing is kept if the second ask fails.
  const userId = user?.id ?? null
  useEffect(() => {
    let cancelled = false
    fetchSharedGroup(code).then(r => {
      if (cancelled) return
      setResult(prev => (prev.status === 'ok' && r.status !== 'ok' ? prev : { ...r, forUser: userId }))
    })
    return () => { cancelled = true }
  }, [code, attempt, userId])

  // Analytics (step 9.5): one 'shared_group_open' per link opened, when the group
  // really shows. No code, name or description is sent, and Retry or coming back
  // online does not count it twice.
  const openLoggedFor = useRef(null)
  useEffect(() => {
    if (result.status !== 'ok' || openLoggedFor.current === code) return
    openLoggedFor.current = code
    logUsageEvent('shared_group_open')
  }, [result.status, code])

  // Unique view count (step H3): sent once the group shows and has been visible about 2 seconds; never the owner.
  useViewCount('group', code, result.status === 'ok' && !result.group?.isOwner)

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
    return result.status === 'ok' ? sortDrugsByTitle(result.group.drugs) : []
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

  // The copy this link already made in the person's own groups, if any (step 13.7). A group saved
  // while offline counts at once: the waiting create carries the link too.
  const savedCopy = useMemo(() => findSavedCopy(groups, code), [groups, code])

  const runSave = useCallback(async () => {
    if (savingRef.current || result.status !== 'ok') return
    if (result.group.isOwner) return   // your own group is never saved again as a copy
    if (savedCopy) return              // this link is already saved in your groups (step 13.7)
    savingRef.current = true
    setNotice(null)
    setSaveState({ phase: 'saving' })
    const g = result.group
    const r = await saveSharedGroup({
      name: g.name,
      description: g.description,
      color: g.color,
      brandIds: drugs.map(d => d.id),
      sourceCode: code,   // so the same link later says "Already in your groups"
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
    else if (r.reason === 'already_saved') setNotice(null)   // another phone saved it first: the bar now says so (step 13.8)
    else if (r.reason !== 'guest') setNotice(SAVE_ERROR_MESSAGE)
  }, [result, drugs, saveSharedGroup, signInId, showGroupLimit, code, savedCopy])

  function handleSaveTap() {
    if (authLoading || saveState.phase !== 'idle' || answerIsStale) return
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
    // Wait for the answer asked after signing in: it tells whether this is the person's own group.
    if (result.forUser !== user.id) return
    // Started on the next tick, so the save's own state change is not made
    // inside this effect. The request is only cleared when it really starts.
    const t = setTimeout(() => {
      armedRef.current = false
      runSave()
    }, 0)
    return () => clearTimeout(t)
  }, [authLoading, user, pendingFavourite, groupsStatus, result.status, result.forUser, runSave])

  // The page shows an answer asked before the person signed in: the Save bar waits a moment.
  const answerIsStale = result.status === 'ok' && !!user && result.forUser !== user.id
  // Star button (Track H, step H7): shown only when the page's answer carries a star count.
  const star = useItemStar('group', code, {
    stars: result.status === 'ok' ? (result.group.stars ?? null) : null,
    starred: result.status === 'ok' && result.group.starred === true,
    ready: result.status === 'ok' && !!user && !answerIsStale,
    isOwner: result.status === 'ok' && result.group.isOwner === true,
  })
  const bar = sharedBarState({
    kind: 'group',
    isOwner: result.status === 'ok' && result.group.isOwner,
    ownId: result.status === 'ok' ? result.group.ownId : null,
    savedId: savedCopy ? savedCopy.id : null,
    savedCount: savedCopy ? (savedCopy.brandIds ?? []).length : undefined,
    totalCount: drugs.length,
  })
  const showOwnerBar = result.status === 'ok' && bar.mode === 'owner'
  const showSave = groupsOn && result.status === 'ok' && drugs.length > 0 && !showOwnerBar
  const showBottom = showSave || showOwnerBar
  const saveBusy = saveState.phase === 'saving' || authLoading || answerIsStale || (!!user && groupsStatus === 'loading')

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      aria-label="Back"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500,
        fontFamily: 'var(--font-body)', padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
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
          onClick={() => navigate(ROUTES.HOME, { replace: true })}
          style={{
            flexShrink: 0, minHeight: 44, padding: '0 var(--space-1)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-accent-text)',
            fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          Open Capsula
        </button>
      )}
    </div>
  )

  let content
  if (result.status === 'loading') {
    content = <GroupPageSkeleton />
  } else if (PROBLEM_LOOK[result.status]) {
    const look = PROBLEM_LOOK[result.status]
    content = (
      <GroupStateMessage
        open
        icon={look.icon}
        accent={look.accent}
        title={look.title}
        body={look.body}
        actionLabel={result.status === 'unavailable' ? 'Open Capsula' : 'Try again'}
        onAction={result.status === 'unavailable' ? () => navigate(ROUTES.HOME, { replace: true }) : retry}
      />
    )
  } else {
    const { group } = result
    const tone = resolveToken(group.color, isDark)
    const count = drugs.length
    const day = dayText(group.createdAt)

    content = (
      <>
        <FolderShell wash={folderWash(tone.fg)} padding={16} gap={12}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, rowGap: 2,
            fontSize: 13, color: 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)', fontFamily: 'var(--font-body)',
          }}>
            {/* "Created by X · 12 Nov · 12 drugs", or "Created 12 Nov · 12 drugs" when anonymous
                (the same words as groupCreditLine in shareCredit.js, with the name in bold). */}
            {group.ownerName && (
              <span>
                Created by{' '}
                {creditLinkHandle(group)
                  ? <button type="button" dir="auto" onClick={() => openPage(ROUTES.PUBLIC_PROFILE(group.ownerHandle))}
                      style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{group.ownerName}</button>
                  : <span dir="auto" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{group.ownerName}</span>}
              </span>
            )}
            {group.ownerName && day && <span aria-hidden="true">{'\u00b7'}</span>}
            {day && <span>{group.ownerName ? day : `Created ${day}`}</span>}
            {(group.ownerName || day) && <span aria-hidden="true">{'\u00b7'}</span>}
            <span>{count} {count === 1 ? 'drug' : 'drugs'}</span>
          </div>

          <GroupDescription text={group.description} />
        </FolderShell>

        <div style={{ marginTop: 'var(--space-4)' }}>
          {count === 0 ? (
            <GroupStateMessage open icon={FolderOpen} accent={GREY} title="Nothing here yet" body="The owner hasn't added any drugs to this group." />
          ) : (
            <div>
              {drugs.map((drug, i) => (
                <SharedDrugCard
                  key={drug.id}
                  drug={drug}
                  categories={categories}
                  isDark={isDark}
                  isLast={i === drugs.length - 1}
                  onTap={() => openDrug(drug)}
                />
              ))}
            </div>
          )}
          {!group.isOwner && <ReportLink onClick={() => setReportOpen(true)} />}
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
      padding: `calc(var(--space-3) + env(safe-area-inset-top, 0px)) var(--page-gutter) ${showBottom ? '0' : 'calc(var(--space-4) + env(safe-area-inset-bottom, 0px))'}`,
    }}>
      {topBar}
      <div style={{ flex: '1 0 auto', paddingBottom: showBottom ? 'var(--space-4)' : 0 }}>{content}</div>
      {showBottom && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 5,
          margin: '0 calc(-1 * var(--page-gutter))',
          padding: 'var(--space-3) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px))',
          backgroundColor: 'var(--color-surface)', boxShadow: '0 -6px 18px rgba(0,0,0,0.06)',
          fontFamily: 'var(--font-body)',
        }}>
          <StarNotice notice={star.notice} />
          {showOwnerBar ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FolderOpen size={18} strokeWidth={1.8} color="var(--color-text-secondary)" aria-hidden="true" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>{bar.text}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}><StarCount stars={result.group.stars} /></span>
              </span>
              <button
                onClick={() => openPage(ROUTES.DRUGS_GROUP(bar.targetId))}
                style={{
                  flexShrink: 0, minHeight: 44, border: 'none', cursor: 'pointer', padding: '0 20px',
                  borderRadius: 999, backgroundColor: 'var(--color-accent-solid)', color: '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {bar.button}
              </button>
            </div>
          ) : saveState.phase !== 'saved' && bar.mode === 'saved' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <StarButton star={star} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Check size={18} strokeWidth={2.6} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0 }} />
                <span role="status" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>{bar.text}</span>
              </span>
              <button
                onClick={() => openPage(ROUTES.DRUGS_GROUP(bar.targetId))}
                style={{
                  flexShrink: 0, minHeight: 44, border: 'none', cursor: 'pointer', padding: '0 20px',
                  borderRadius: 999, backgroundColor: 'var(--color-accent-solid)', color: '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {bar.button}
              </button>
            </div>
          ) : saveState.phase === 'saved' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <StarButton star={star} />
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                <Check size={18} strokeWidth={2.6} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                <span role="status" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>
                  {savedGroupMessage(saveState.saved, saveState.total)}
                </span>
              </span>
              <button
                onClick={() => openPage(ROUTES.DRUGS_GROUP(saveState.groupId))}
                style={{
                  flexShrink: 0, minHeight: 44, border: 'none', cursor: 'pointer', padding: '0 20px',
                  borderRadius: 999, backgroundColor: 'var(--color-accent-solid)', color: '#fff',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <StarButton star={star} />
              <button
                onClick={handleSaveTap}
                disabled={saveBusy}
                style={{
                  flex: 1, minWidth: 0, minHeight: 48, border: 'none', padding: '0 16px',
                  borderRadius: 999, backgroundColor: 'var(--color-accent-solid)', color: '#fff',
                  fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
                  cursor: saveBusy ? 'default' : 'pointer', opacity: saveBusy ? 0.6 : 1,
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {saveState.phase === 'saving' ? 'Saving…' : 'Save to my groups'}
              </button>
              </div>
            </>
          )}
        </div>
      )}
      <ReportSheet isOpen={reportOpen} onClose={() => setReportOpen(false)} kind="group" reference={code} />
    </div>
  )
}
