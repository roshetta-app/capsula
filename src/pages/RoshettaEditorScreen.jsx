/**
 * src/pages/RoshettaEditorScreen.jsx
 * 2026-11-14 (Roshetta plan, step 5.3a): the editor of a roshetta at /roshetta/:id/edit, opened by
 * Edit on the roshetta page. A vertical list of cards, one per drug group (DrugGroupCard) and one per
 * text block (TextBlockCard), and a fixed bar with Add drug (opens the Add drug screen) and Add text
 * (adds an empty text block at the end). While there are no cards a short hint is shown.
 *
 * This is the shell. What it does not do yet:
 *   - saving what is typed or changed (autosave and the status word are step 5.3b; until then the
 *     changes live on this screen only and are lost when it is left, except what the Add drug
 *     screen saves itself);
 *   - the up, down and delete buttons on the cards (step 5.3c; they are drawn but do nothing yet);
 *   - the counts in the bar and the limit messages for text blocks and entries (step 5.3d).
 *
 * Read only (lapsed account): the cards are locked and the add bar is not drawn.
 *
 * States (the decisions are in utils/roshettaEditorState.js): loading, signed out, could not load,
 * not found (deleted on another device), empty, and the cards.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import DrugGroupCard from '../components/roshettas/editor/DrugGroupCard'
import TextBlockCard from '../components/roshettas/editor/TextBlockCard'
import { shimmer } from '../components/drugs/home/shimmer'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { pageRoshetta } from '../utils/roshettaPageState'
import { addPartnerQuery } from '../utils/roshettaAddDrugState'
import { addTextRows, changeEntry, editorHint, editorState, libraryIdSet } from '../utils/roshettaEditorState'
import { ROSHETTA_ROW_TYPES } from '../utils/roshettaRows'
import { ROUTES } from '../router'

const font = 'var(--font-body)'
// Room under the cards for the fixed add bar (10 + 48 + 10 + 1) and the bottom tab bar (60).
const BAR_ROOM = 'calc(69px + 60px + env(safe-area-inset-bottom) + var(--space-4))'

function SkeletonCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[0, 1].map(i => (
        <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={shimmer({ width: '30%', height: 12 })} />
          <div style={shimmer({ width: '65%', height: 14 })} />
          <div style={shimmer({ width: '100%', height: 56 })} />
        </div>
      ))}
    </div>
  )
}

export default function RoshettaEditorScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  useDeepLinkParent(ROUTES.ROSHETTA(id))

  const { drugs, loading: drugsLoading } = useDrugContext()
  const { roshettasApi } = useFavouritesContext()
  const {
    roshettas = [], roshettasStatus = 'loading', isGuest = false, isReadOnly = false, reloadRoshettas,
  } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()

  const roshetta = pageRoshetta(roshettas, id)
  // The cards edit this working copy; until something is changed the saved rows are shown.
  const [workingRows, setWorkingRows] = useState(null)
  const rows = workingRows ?? roshetta?.rows ?? []
  const state = editorState({
    authLoading, isGuest, status: roshettasStatus,
    found: !!roshetta, rowCount: rows.length, listCount: roshettas.length,
  })
  const libraryIds = useMemo(() => libraryIdSet(drugs, drugsLoading), [drugs, drugsLoading])
  const locked = !!isReadOnly

  function change(entryId, entry) {
    setWorkingRows(changeEntry(rows, entryId, entry))
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back to roshetta"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500,
        fontFamily: font, padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Roshetta
    </button>
  )

  let content
  if (state === 'loading') {
    content = <SkeletonCards />
  } else if (state === 'guest') {
    content = (
      <GroupStateMessage
        title="Sign in to edit this roshetta"
        body="Your roshettas are saved to your account."
        actionLabel="Sign in"
        onAction={() => signInWithGoogle?.()}
      />
    )
  } else if (state === 'error') {
    content = <GroupStateMessage title="Couldn't load your roshettas" actionLabel="Try again" onAction={reloadRoshettas} />
  } else if (state === 'missing') {
    content = (
      <GroupStateMessage
        title="This roshetta isn't available"
        body="It may have been deleted on another device."
        actionLabel="Back to Topics"
        onAction={() => navigate(ROUTES.CONDITIONS, { replace: true })}
      />
    )
  } else if (state === 'empty') {
    content = (
      <p style={{ margin: 0, padding: 'var(--space-6) var(--space-3)', textAlign: 'center', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)', fontFamily: font }}>
        {editorHint(locked)}
      </p>
    )
  } else {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map((row, index) => {
          if (row?.row_type === ROSHETTA_ROW_TYPES.DRUG) {
            return (
              <DrugGroupCard
                key={row.id}
                row={row}
                index={index}
                count={rows.length}
                libraryIds={libraryIds}
                onChange={next => change(row.id, next)}
                onAddPartner={() => navigate(ROUTES.ROSHETTA_ADD(id) + addPartnerQuery(row.id))}
                disabled={locked}
              />
            )
          }
          if (row?.row_type === ROSHETTA_ROW_TYPES.PLAIN_TEXT) {
            return (
              <TextBlockCard
                key={row.id}
                block={row}
                index={index}
                count={rows.length}
                onChange={text => change(row.id, { ...row, content: text })}
                disabled={locked}
              />
            )
          }
          return null
        })}
      </div>
    )
  }

  const showBar = (state === 'empty' || state === 'ready') && !locked
  const barButton = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 24, boxSizing: 'border-box', cursor: 'pointer',
    fontSize: 15, fontWeight: 600, fontFamily: font,
    WebkitTapHighlightColor: 'transparent',
  }
  const addBar = showBar ? (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, zIndex: 90,
        bottom: 'calc(60px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '10px var(--page-gutter)', display: 'flex', gap: 10, boxSizing: 'border-box' }}>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ROSHETTA_ADD(id))}
          style={{ ...barButton, backgroundColor: 'var(--color-accent-solid)', color: '#fff', border: 'none' }}
        >
          <Icon name="Plus" size={16} />
          Add drug
        </button>
        <button
          type="button"
          onClick={() => setWorkingRows(addTextRows(rows))}
          style={{ ...barButton, backgroundColor: 'var(--color-surface)', color: 'var(--color-accent-text)', border: '1px solid var(--color-border)' }}
        >
          <Icon name="Type" size={16} />
          Add text
        </button>
      </div>
    </div>
  ) : null

  return (
    <div style={{ padding: 'var(--space-3) 0', paddingBottom: showBar ? BAR_ROOM : 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        {backButton}
      </div>
      {roshetta?.name && (state === 'empty' || state === 'ready') && (
        <h1 dir="auto" style={{ margin: '0 0 var(--space-3)', fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)', fontFamily: font, overflowWrap: 'anywhere' }}>
          {roshetta.name}
        </h1>
      )}
      {content}
      {addBar}
    </div>
  )
}
