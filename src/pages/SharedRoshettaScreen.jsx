/**
 * src/pages/SharedRoshettaScreen.jsx
 * 2026-11-14 (Roshetta plan, step 6.2b): the read-only page opened from a roshetta share
 * link, at /r/:code. Public: no sign-in, outside the shared layout, and no welcome screen
 * (OnboardingGate lets /r/ pages through), the same as the shared group page.
 *
 * Shows the roshetta's name, description, the grey safety label ("Doses written by the
 * author. Not checked by Capsula.") and the sheet drawn by the existing viewer, with line
 * breaks kept in doses. Everything the author typed is plain text. The owner is never
 * shown. No edit controls. Drug links appear only when the drug library is loaded; drug
 * names always come from the roshetta itself.
 *
 * Top bar: a person who arrived from inside the app gets Back; a first-time visitor gets
 * the Capsula logo and an Open Capsula button.
 *
 * States: loading (placeholder), link not available (a wrong, stopped or deleted link, all
 * one message), offline (Try again, and it tries by itself when the phone is back online),
 * could not open (Try again), a roshetta with nothing in it, and the roshetta.
 *
 * 2026-11-14 (step 6.2c): the Save a copy bar, fixed at the bottom while the roshetta shows.
 * It makes the viewer's own NEW roshetta (same name, description and rows; not linked to this
 * one, nothing about the owner) through the roshettas hook, so it is saved on the phone first
 * and sent when online. A guest is asked to sign in first: the page remembers the link (the
 * sign-in prompt keeps 'rsave:<code>') and finishes the save by itself once signed in; closing
 * the sign-in sheet cancels it. After saving the bar says "Saved to your roshettas" with View.
 * The roshetta limit, drug limit and read only messages open the same sheets as the rest of
 * roshettas; any other refusal is one line in the bar with Save still there to try again.
 *
 * 2026-11-14 (step 6.2d): a roshetta with more drugs than the account may keep is saved in
 * part: the first drugs in order up to the account's limit (partners count), all text blocks.
 * The bar then says "Saved 10 of 14 drugs. Upgrade to Pro to keep all of them." (a Pro account
 * is not told to upgrade). The drug limit sheet is no longer opened for this case.
 *
 * 2026-11-16 (Phase I step 10.8): the name and description sit in the same letterhead as the
 * owner's roshetta page (RoshettaPageHeader), with the specialty the author chose (its name,
 * icon and colour come with the shared data, so the page needs nothing else loaded); no specialty
 * shows "Roshetta" in the app's blue. Save a copy gives the copy the same specialty. The
 * specialty is a public library item; the owner is still never shown.
 *
 * 2026-11-21 (step 8.5): the page mirrors the owner's roshetta page (step 8.3): the same white header
 * (RoshettaPadHeader) with the specialty icon, name and description, the same content area (no card,
 * the topic sheet's margins, each drug in its own box), the same open-look states with a round icon,
 * and the same loading shape. What differs, because it is someone else's roshetta: no Share, menu or
 * Edit, no description editing, no dates or status line (the public link does not carry them), Back or
 * the logo with Open Capsula in the header's top bar, the safety footnote kept at the end of the sheet
 * (it is a stranger's dose text), and the fixed Save a copy bar.
 *
 * 2026-11-21 (Phase L, step 13.5): who made it and when, and the owner opening their own link. The header's
 * last line reads "Created by Dr Sara · 12 Nov", or "Created 12 Nov" when the owner is anonymous (the name
 * shows only when the owner chose it for this link or in Account; the database decides, the page just
 * draws what it is given). When the signed-in viewer is the owner, the page looks exactly as a visitor
 * sees it, and the bottom bar says "This is your roshetta" with an Open button to their own page, so no
 * copy can be made of your own roshetta. The answer depends on who is asking, so the page asks again when
 * the signed-in person changes, and a save that waited for sign-in waits for that second answer first:
 * signing in can never save a copy of your own roshetta.
 *
 * 2026-11-14 (step 6.3): two analytics events, never a code, name or text: 'shared_roshetta_open'
 * once per link when the roshetta really shows (Try again or coming back online does not count
 * it twice) and 'shared_roshetta_save' when a copy is saved (the new roshetta's id).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FileX, FileText, WifiOff, AlertTriangle, Check } from 'lucide-react'
import RoshettaDisclaimer from '../components/roshettas/RoshettaDisclaimer'
import RoshettaPadHeader from '../components/roshettas/RoshettaPadHeader'
import RoshettaPageSkeleton from '../components/roshettas/RoshettaPageSkeleton'
import PrescriptionSheetBlock from '../components/conditions/PrescriptionSheetBlock'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { useAuth } from '../hooks/useAuth'
import { useTapGuard } from '../hooks/useTapGuard'
import { useIsPro } from '../hooks/useIsPro'
import { useFavouritesContext } from '../context/FavouritesContext'
import useScrollToTopOnOpen from '../hooks/useScrollToTopOnOpen'
import { fetchSharedRoshetta } from '../utils/sharedRoshetta'
import { sheetRowsForDisplay } from '../utils/roshettaDrugLines'
import { specialtyColors } from '../utils/roshettaSpecialty'
import { useIsDark } from '../utils/specialtyIcon'
import { sharedPageState, sharedProblemText } from '../utils/roshettaSharedPageState'
import { sharedBarState } from '../utils/shareCredit'
import { copyFields, trimToDrugCap, savedCopyMessage, saveSignInId, isRoshettaSaveRequest, saveCopyAnswer, showSaveBar } from '../utils/roshettaSaveCopy'
import { logUsageEvent } from '../analytics/usageEvents'
import { ROUTES } from '../router'

// The three link problems use the open look of the owner's page: a big round icon, one title, one line, one button.
const PROBLEM_LOOK = {
  unavailable: { icon: FileX, accent: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-tertiary)' } },
  offline: { icon: WifiOff, accent: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-tertiary)' } },
  error: { icon: AlertTriangle, accent: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' } },
}

export default function SharedRoshettaScreen() {
  useScrollToTopOnOpen()
  const { code } = useParams()
  // Keyed by the code, so opening a different link starts from loading.
  return <SharedRoshettaBody key={code} code={code} />
}

function SharedRoshettaBody({ code }) {
  const navigate = useNavigate()
  const { openPage } = useTapGuard()
  // A person opening a link just wants this page, so no screen is put behind it (navRules.js:
  // laysBehind false). A drug opened from here keeps this page behind it, because the page is
  // no longer the arrival once the person moves on.

  const location = useLocation()
  // The first screen of the session has nothing behind it, so no Back button.
  const canGoBack = location.key !== 'default'

  // { status: 'loading' | 'ok' | 'unavailable' | 'offline' | 'error', roshetta?, forUser? }
  const [result, setResult] = useState({ status: 'loading' })
  // Bumped by Try again, so the effect below asks again.
  const [attempt, setAttempt] = useState(0)

  // The answer depends on who is asking (the owner is told so), so it is asked again when the signed-in
  // person changes, and each answer remembers who it was asked for (forUser). A page that was already
  // showing is kept if the second ask fails.
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  useEffect(() => {
    let cancelled = false
    fetchSharedRoshetta(code).then(r => {
      if (cancelled) return
      setResult(prev => (prev.status === 'ok' && r.status !== 'ok' ? prev : { ...r, forUser: userId }))
    })
    return () => { cancelled = true }
  }, [code, attempt, userId])

  // Analytics (step 6.3): one 'shared_roshetta_open' per link opened, when the roshetta really
  // shows. No code, name or text is sent.
  const openLoggedFor = useRef(null)
  useEffect(() => {
    if (result.status !== 'ok' || openLoggedFor.current === code) return
    openLoggedFor.current = code
    logUsageEvent('shared_roshetta_open')
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

  const state = sharedPageState(result)
  const isProblem = state === 'unavailable' || state === 'offline' || state === 'error'

  // ── Save a copy (step 6.2c) ───────────────────────────────────────────────
  const { promptSignIn, pendingFavourite, roshettasApi } = useFavouritesContext()
  const { roshettasStatus, createRoshetta, roshettaDrugCap, showRoshettaLimit, showRoshettaReadOnly } = roshettasApi
  const isPro = useIsPro()
  const isDark = useIsDark()
  // { phase: 'idle' | 'saving' | 'saved', roshettaId?, saved?, total? }
  const [saveState, setSaveState] = useState({ phase: 'idle' })
  const savingRef = useRef(false)
  // A refused save, shown as one line in the bar (null when there is none).
  const [notice, setNotice] = useState(null)
  // A guest tapped Save and is signing in. Also true after a sign-in that reloaded the page,
  // because the prompt keeps the request.
  const armedRef = useRef(isRoshettaSaveRequest(pendingFavourite, code))

  const runSave = useCallback(async () => {
    if (savingRef.current || result.status !== 'ok') return
    if (result.roshetta.isOwner) return   // your own roshetta is never saved again as a copy
    savingRef.current = true
    setNotice(null)
    setSaveState({ phase: 'saving' })
    // Over the account's drug limit: keep the first drugs (step 6.2d) and say so afterwards.
    const fields = copyFields(result.roshetta)
    const kept = trimToDrugCap(fields.rows, roshettaDrugCap)
    let answer
    try {
      answer = await createRoshetta({ ...fields, rows: kept.rows })
    } catch {
      answer = { ok: false, reason: 'error' }
    }
    savingRef.current = false
    const r = saveCopyAnswer(answer)
    if (r.kind === 'saved') {
      logUsageEvent('shared_roshetta_save', r.roshetta ? r.roshetta.id : null)
      setSaveState({ phase: 'saved', roshettaId: r.roshetta ? r.roshetta.id : null, saved: kept.saved, total: kept.total })
      return
    }
    setSaveState({ phase: 'idle' })
    if (r.kind === 'sheet') {
      if (r.sheet === 'readonly') showRoshettaReadOnly()
      else showRoshettaLimit(r.sheet)
    } else if (r.kind === 'notice') {
      setNotice(r.message)
    }
  }, [result, createRoshetta, roshettaDrugCap, showRoshettaLimit, showRoshettaReadOnly])

  function handleSaveTap() {
    if (authLoading || saveState.phase !== 'idle' || answerIsStale) return
    if (!user) {
      armedRef.current = true
      promptSignIn('groups', saveSignInId(code))
      return
    }
    runSave()
  }

  // Finish a save that waited for sign-in, or cancel it when the sign-in sheet was closed
  // without signing in.
  useEffect(() => {
    if (!armedRef.current || authLoading) return undefined
    if (!user) {
      if (!pendingFavourite) armedRef.current = false
      return undefined
    }
    if (roshettasStatus === 'loading' || result.status !== 'ok') return undefined
    // Wait for the answer asked after signing in: it tells whether this is the person's own roshetta.
    if (result.forUser !== user.id) return undefined
    // Started on the next tick, so the save's own state change is not made inside this effect.
    const t = setTimeout(() => {
      armedRef.current = false
      runSave()
    }, 0)
    return () => clearTimeout(t)
  }, [authLoading, user, pendingFavourite, roshettasStatus, result.status, result.forUser, runSave])

  // The page shows an answer asked before the person signed in: the Save bar waits a moment.
  const answerIsStale = result.status === 'ok' && !!user && result.forUser !== user.id
  const bar = sharedBarState({
    kind: 'roshetta',
    isOwner: result.status === 'ok' && result.roshetta.isOwner,
    ownId: result.status === 'ok' ? result.roshetta.ownId : null,
  })
  const showOwnerBar = result.status === 'ok' && bar.mode === 'owner'
  const showSave = showSaveBar(state) && !showOwnerBar
  const showBottom = showSave || showOwnerBar
  const saveBusy = saveState.phase === 'saving' || authLoading || answerIsStale || (!!user && roshettasStatus === 'loading')

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500,
        fontFamily: 'var(--font-body)', padding: '4px 0', minHeight: 44,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  )

  // The top bar: a person who came from inside the app gets Back; a first-time visitor gets the
  // logo and an Open Capsula button on the end side.
  const topLeft = canGoBack ? backButton : (
    <img
      src={`${import.meta.env.BASE_URL}logo.svg`}
      alt="Capsula"
      className="capsula-logo"
      style={{ display: 'block', height: 22, width: 'auto' }}
    />
  )
  const topRight = canGoBack ? null : (
    <button
      type="button"
      onClick={() => navigate(ROUTES.HOME, { replace: true })}
      style={{
        flexShrink: 0, minHeight: 44, padding: '0 var(--space-1)', background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-accent-text)',
        fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      Open Capsula
    </button>
  )

  let content
  if (state === 'loading') {
    content = (
      <RoshettaPageSkeleton
        top={(
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 36 }}>
            {topLeft}
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{topRight}</div>
          </div>
        )}
      />
    )
  } else if (isProblem) {
    const t = sharedProblemText(state)
    const look = PROBLEM_LOOK[state]
    content = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, marginTop: 'var(--space-3)' }}>
          {topLeft}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{topRight}</div>
        </div>
        <GroupStateMessage
          open
          icon={look.icon}
          accent={look.accent}
          title={t.title}
          body={t.body}
          actionLabel={t.actionLabel}
          onAction={t.action === 'retry' ? retry : () => navigate(ROUTES.HOME, { replace: true })}
        />
      </>
    )
  } else {
    const { roshetta } = result
    const look = specialtyColors(roshetta.specialty, isDark)
    content = (
      <>
        <RoshettaPadHeader
          name={roshetta.name}
          description={roshetta.description}
          specialty={roshetta.specialty}
          credit={{ ownerName: roshetta.ownerName, createdAt: roshetta.createdAt }}
          topLeft={topLeft}
          topRight={topRight}
        />

        {/* The sheet itself: no card, the topic sheet's side margins and spacing, as on the owner's page. */}
        <div style={{ padding: 'var(--space-5) calc(var(--space-6) - var(--page-gutter, 16px)) 0' }}>
          {state === 'empty' ? (
            <GroupStateMessage
              open
              icon={FileText}
              accent={{ bg: look.bg, fg: look.fg }}
              title="Nothing here yet"
              body="This roshetta has no drugs or notes in it."
            />
          ) : (
            <>
              <PrescriptionSheetBlock sheet={{ rows: sheetRowsForDisplay(roshetta.rows) }} hasContentAfter={false} keepDoseLineBreaks separateDrugCards />
              <RoshettaDisclaimer variant="footnote" marginTop={24} />
            </>
          )}
        </div>
      </>
    )
  }

  const hasHeader = state === 'loading' || state === 'ready' || state === 'empty'

  return (
    <div style={{
      // This route is opened outside Layout, so the side gap is defined here (as on the
      // shared group page).
      '--page-gutter': 'var(--space-4)',
      maxWidth: 680, margin: '0 auto',
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      padding: `0 var(--page-gutter) ${showBottom ? '0' : 'calc(var(--space-4) + env(safe-area-inset-bottom, 0px))'}`,
    }}>
      {/* The white header starts at the very top, so the phone's status bar area is painted the same white. */}
      <div aria-hidden="true" style={{
        height: 'env(safe-area-inset-top, 0px)', flexShrink: 0,
        margin: '0 calc(-1 * var(--page-gutter))',
        backgroundColor: hasHeader ? 'var(--color-surface)' : 'transparent',
      }} />
      <div style={{ flex: '1 0 auto', paddingBottom: showBottom ? 'var(--space-4)' : 0 }}>{content}</div>
      {showBottom && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 5,
          margin: '0 calc(-1 * var(--page-gutter))',
          padding: 'var(--space-3) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px))',
          backgroundColor: 'var(--color-surface)', boxShadow: '0 -6px 18px rgba(0,0,0,0.06)',
          fontFamily: 'var(--font-body)',
        }}>
          {showOwnerBar ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FileText size={18} strokeWidth={1.8} color="var(--color-text-secondary)" aria-hidden="true" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>{bar.text}</span>
              </span>
              <button
                onClick={() => openPage(ROUTES.ROSHETTA(bar.targetId))}
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
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                <Check size={18} strokeWidth={2.6} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                <span role="status" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>
                  {savedCopyMessage(saveState.saved, saveState.total, isPro)}
                </span>
              </span>
              {saveState.roshettaId && (
                <button
                  onClick={() => openPage(ROUTES.ROSHETTA(saveState.roshettaId))}
                  style={{
                    flexShrink: 0, minHeight: 44, border: 'none', cursor: 'pointer', padding: '0 20px',
                    borderRadius: 999, backgroundColor: 'var(--color-accent-solid)', color: '#fff',
                    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                    WebkitTapHighlightColor: 'transparent', outline: 'none',
                  }}
                >
                  View
                </button>
              )}
            </div>
          ) : (
            <>
              {notice && (
                <div role="alert" style={{ marginBottom: 'var(--space-2)' }}>
                  <GroupStateMessage variant="banner" tone="warning" title={notice} />
                </div>
              )}
              <button
                onClick={handleSaveTap}
                disabled={saveBusy}
                style={{
                  display: 'block', width: '100%', minHeight: 48, border: 'none', padding: '0 16px',
                  borderRadius: 999, backgroundColor: 'var(--color-accent-solid)', color: '#fff',
                  fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
                  cursor: saveBusy ? 'default' : 'pointer', opacity: saveBusy ? 0.6 : 1,
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {saveState.phase === 'saving' ? 'Saving\u2026' : 'Save a copy'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
