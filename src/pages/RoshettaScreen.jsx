/**
 * src/pages/RoshettaScreen.jsx
 * 2026-11-14 (Roshetta plan, step 4.2a): the roshetta page at /roshetta/:id, opened from a
 * row in My roshettas. Read view only: Back, the name, the description, the safety label
 * ("Doses written by the author. Not checked by Capsula."), then the sheet drawn by the
 * same viewer the topic pages use, with line breaks kept in doses. Edit, Share and
 * Delete arrive in step 4.2b and the editor in Phase D.
 *
 * The roshetta comes from the person's own list (useRoshettas, through the favourites
 * context), so it also opens from the saved copy while offline. Everything the author typed
 * (name, description, doses, text blocks) is drawn as plain text, never as HTML or markdown,
 * and follows its own direction (Arabic from the right).
 *
 * States (the decisions are in utils/roshettaPageState.js):
 *   - loading: placeholder lines (account or list loading, this roshetta not shown yet).
 *   - signed out: "Sign in to see this roshetta" (starts the Google sign-in directly, as the
 *     My roshettas area does).
 *   - could not load, nothing saved: "Try again".
 *   - not found (deleted on another device): "This roshetta isn't available".
 *   - empty roshetta (no drugs or text yet): the name, description and label, and one plain line.
 *   - ready: the sheet.
 */

import { useNavigate, useParams } from 'react-router-dom'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import RoshettaDisclaimer from '../components/roshettas/RoshettaDisclaimer'
import PrescriptionSheetBlock from '../components/conditions/PrescriptionSheetBlock'
import { shimmer } from '../components/drugs/home/shimmer'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { pageRoshetta, pageState } from '../utils/roshettaPageState'
import { ROUTES } from '../router'

const font = 'var(--font-body)'

function PageSkeleton() {
  return (
    <div aria-hidden="true">
      <div style={shimmer({ width: '60%', height: 22, marginBottom: 10 })} />
      <div style={shimmer({ width: '85%', height: 13, marginBottom: 6 })} />
      <div style={shimmer({ width: '40%', height: 13, marginBottom: 20 })} />
      <div style={shimmer({ width: '100%', height: 120 })} />
    </div>
  )
}

export default function RoshettaScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  // Back goes to the real previous screen; opened straight from a link, the Topics screen is put behind it first.
  useDeepLinkParent(ROUTES.CONDITIONS)

  const { roshettasApi } = useFavouritesContext()
  const { roshettas = [], roshettasStatus = 'loading', isGuest = false, reloadRoshettas } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()

  const roshetta = pageRoshetta(roshettas, id)
  const rows = roshetta?.rows ?? []
  const state = pageState({
    authLoading, isGuest, status: roshettasStatus,
    found: !!roshetta, rowCount: rows.length, listCount: roshettas.length,
  })

  function goTopics() {
    navigate(ROUTES.CONDITIONS, { replace: true })
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back to Topics"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-3)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500,
        fontFamily: font, padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Topics
    </button>
  )

  let content
  if (state === 'loading') {
    content = <PageSkeleton />
  } else if (state === 'guest') {
    content = (
      <GroupStateMessage
        title="Sign in to see this roshetta"
        body="Your roshettas are saved to your account."
        actionLabel="Sign in"
        onAction={() => signInWithGoogle?.()}
      />
    )
  } else if (state === 'error') {
    content = (
      <GroupStateMessage title="Couldn't load your roshettas" actionLabel="Try again" onAction={reloadRoshettas} />
    )
  } else if (state === 'missing') {
    content = (
      <GroupStateMessage
        title="This roshetta isn't available"
        body="It may have been deleted on another device."
        actionLabel="Back to Topics"
        onAction={goTopics}
      />
    )
  } else {
    const description = (roshetta.description ?? '').trim()
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
          <p
            style={{
              margin: '24px 0 0', textAlign: 'center', fontSize: 14, lineHeight: 1.5,
              color: 'var(--color-text-secondary)', fontFamily: font,
            }}
          >
            Nothing in this roshetta yet.
          </p>
        ) : (
          <div
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <PrescriptionSheetBlock sheet={{ rows }} hasContentAfter={false} keepDoseLineBreaks />
          </div>
        )}
      </>
    )
  }

  // Side gap and max width come from Layout; this page adds top and bottom space only.
  return (
    <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>
      {backButton}
      {content}
    </div>
  )
}
