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
 * Not here yet: keeping only part of a roshetta that is over the drug limit (6.2d; for now the
 * drug limit sheet opens and nothing is saved) and the analytics events (6.3).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FileX, WifiOff, CircleAlert, Check } from 'lucide-react'
import RoshettaDisclaimer from '../components/roshettas/RoshettaDisclaimer'
import PrescriptionSheetBlock from '../components/conditions/PrescriptionSheetBlock'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { shimmer } from '../components/drugs/home/shimmer'
import { useAuth } from '../hooks/useAuth'
import { useFavouritesContext } from '../context/FavouritesContext'
import { markScreenMounted } from '../hooks/useDeepLinkParent'
import { fetchSharedRoshetta } from '../utils/sharedRoshetta'
import { sharedPageState, sharedProblemText } from '../utils/roshettaSharedPageState'
import { copyFields, saveSignInId, isRoshettaSaveRequest, saveCopyAnswer, showSaveBar } from '../utils/roshettaSaveCopy'
import { ROUTES } from '../router'

const PROBLEM_ICONS = { unavailable: FileX, offline: WifiOff, error: CircleAlert }

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
          borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
          fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', outline: 'none',
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}

function Placeholder() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div style={shimmer({ width: '60%', height: 24, marginBottom: 10 })} />
      <div style={shimmer({ width: '85%', height: 14, marginBottom: 18 })} />
      <div style={shimmer({ width: '100%', height: 38, marginBottom: 18 })} />
      <div style={shimmer({ width: '100%', height: 120 })} />
    </div>
  )
}

export default function SharedRoshettaScreen() {
  const { code } = useParams()
  // Keyed by the code, so opening a different link starts from loading.
  return <SharedRoshettaBody key={code} code={code} />
}

function SharedRoshettaBody({ code }) {
  const navigate = useNavigate()
  // A person opening a link just wants the roshetta, so no Topics screen is put behind it,
  // but it counts as a screen that was shown first (a drug opened from here keeps it for Back).
  useEffect(() => { markScreenMounted() }, [])

  const location = useLocation()
  // The first screen of the session has nothing behind it, so no Back button.
  const canGoBack = location.key !== 'default'

  // { status: 'loading' | 'ok' | 'unavailable' | 'offline' | 'error', roshetta? }
  const [result, setResult] = useState({ status: 'loading' })
  // Bumped by Try again, so the effect below asks again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSharedRoshetta(code).then(r => {
      if (!cancelled) setResult(r)
    })
    return () => { cancelled = true }
  }, [code, attempt])

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
  const { user, loading: authLoading } = useAuth()
  const { promptSignIn, pendingFavourite, roshettasApi } = useFavouritesContext()
  const { roshettasStatus, createRoshetta, showRoshettaLimit, showRoshettaReadOnly } = roshettasApi
  // { phase: 'idle' | 'saving' | 'saved', roshettaId? }
  const [saveState, setSaveState] = useState({ phase: 'idle' })
  const savingRef = useRef(false)
  // A refused save, shown as one line in the bar (null when there is none).
  const [notice, setNotice] = useState(null)
  // A guest tapped Save and is signing in. Also true after a sign-in that reloaded the page,
  // because the prompt keeps the request.
  const armedRef = useRef(isRoshettaSaveRequest(pendingFavourite, code))

  const runSave = useCallback(async () => {
    if (savingRef.current || result.status !== 'ok') return
    savingRef.current = true
    setNotice(null)
    setSaveState({ phase: 'saving' })
    let answer
    try {
      answer = await createRoshetta(copyFields(result.roshetta))
    } catch {
      answer = { ok: false, reason: 'error' }
    }
    savingRef.current = false
    const r = saveCopyAnswer(answer)
    if (r.kind === 'saved') {
      setSaveState({ phase: 'saved', roshettaId: r.roshetta ? r.roshetta.id : null })
      return
    }
    setSaveState({ phase: 'idle' })
    if (r.kind === 'sheet') {
      if (r.sheet === 'readonly') showRoshettaReadOnly()
      else showRoshettaLimit(r.sheet)
    } else if (r.kind === 'notice') {
      setNotice(r.message)
    }
  }, [result, createRoshetta, showRoshettaLimit, showRoshettaReadOnly])

  function handleSaveTap() {
    if (authLoading || saveState.phase !== 'idle') return
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
    // Started on the next tick, so the save's own state change is not made inside this effect.
    const t = setTimeout(() => {
      armedRef.current = false
      runSave()
    }, 0)
    return () => clearTimeout(t)
  }, [authLoading, user, pendingFavourite, roshettasStatus, result.status, runSave])

  const showSave = showSaveBar(state)
  const saveBusy = saveState.phase === 'saving' || authLoading || (!!user && roshettasStatus === 'loading')

  const backButton = (
    <button
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
  if (state === 'loading') {
    content = <Placeholder />
  } else if (isProblem) {
    const t = sharedProblemText(state)
    content = (
      <LinkProblem
        Icon={PROBLEM_ICONS[state]}
        title={t.title}
        body={t.body}
        actionLabel={t.actionLabel}
        onAction={t.action === 'retry' ? retry : () => navigate(ROUTES.DRUGS, { replace: true })}
      />
    )
  } else {
    const { roshetta } = result
    const description = (roshetta.description || '').trim()
    const font = 'var(--font-body)'
    content = (
      <>
        <h1
          dir="auto"
          style={{
            margin: 0, textAlign: 'start', overflowWrap: 'anywhere',
            fontSize: 22, fontWeight: 700, lineHeight: 1.25,
            color: 'var(--color-text-primary)', fontFamily: font,
          }}
        >
          {roshetta.name}
        </h1>
        {description ? (
          <p
            dir="auto"
            style={{
              margin: '6px 0 0', textAlign: 'start', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
              fontSize: 14, lineHeight: 1.5,
              color: 'var(--color-text-secondary)', fontFamily: font,
            }}
          >
            {description}
          </p>
        ) : null}

        <RoshettaDisclaimer marginTop={14} />

        {state === 'empty' ? (
          <p style={{
            margin: '24px 0 0', textAlign: 'center', fontSize: 14, lineHeight: 1.5,
            color: 'var(--color-text-secondary)', fontFamily: font,
          }}>
            Nothing in this roshetta.
          </p>
        ) : (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <PrescriptionSheetBlock sheet={{ rows: roshetta.rows }} hasContentAfter={false} keepDoseLineBreaks />
          </div>
        )}
      </>
    )
  }

  return (
    <div style={{
      // This route is opened outside Layout, so the side gap is defined here (as on the
      // shared group page).
      '--page-gutter': 'var(--space-4)',
      maxWidth: 680, margin: '0 auto',
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
                  Saved to your roshettas
                </span>
              </span>
              {saveState.roshettaId && (
                <button
                  onClick={() => navigate(ROUTES.ROSHETTA(saveState.roshettaId))}
                  style={{
                    flexShrink: 0, minHeight: 44, border: 'none', cursor: 'pointer', padding: '0 20px',
                    borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
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
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <GroupStateMessage variant="banner" tone="warning" title={notice} />
                </div>
              )}
              <button
                onClick={handleSaveTap}
                disabled={saveBusy}
                style={{
                  display: 'block', width: '100%', minHeight: 48, border: 'none', padding: '0 16px',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
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
