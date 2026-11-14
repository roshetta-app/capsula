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
 * Not here yet: the "Save a copy" bar (6.2c, 6.2d) and the analytics events (6.3).
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FileX, WifiOff, CircleAlert } from 'lucide-react'
import RoshettaDisclaimer from '../components/roshettas/RoshettaDisclaimer'
import PrescriptionSheetBlock from '../components/conditions/PrescriptionSheetBlock'
import { shimmer } from '../components/drugs/home/shimmer'
import { markScreenMounted } from '../hooks/useDeepLinkParent'
import { fetchSharedRoshetta } from '../utils/sharedRoshetta'
import { sharedPageState, sharedProblemText } from '../utils/roshettaSharedPageState'
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
      padding: `calc(var(--space-3) + env(safe-area-inset-top, 0px)) var(--page-gutter) calc(var(--space-4) + env(safe-area-inset-bottom, 0px))`,
    }}>
      {isProblem ? (canGoBack && <div style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>{backButton}</div>) : topBar}
      <div style={{
        flex: '1 0 auto',
        ...(isProblem ? { display: 'flex', flexDirection: 'column' } : null),
      }}>{content}</div>
    </div>
  )
}
