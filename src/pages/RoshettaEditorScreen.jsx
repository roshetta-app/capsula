/**
 * src/pages/RoshettaEditorScreen.jsx
 * 2026-11-14 (Roshetta plan, step 5.3a): the editor of a roshetta at /roshetta/:id/edit, opened by
 * Edit on the roshetta page. A vertical list of cards, one per drug group (DrugGroupCard) and one per
 * text block (TextBlockCard), and a fixed bar with Add drug (opens the Add drug screen) and Add text
 * (adds an empty text block at the end). While there are no cards a short hint is shown.
 *
 * Autosave (step 5.3b): every change (typing, the chip, Add text) is saved on its own 800 ms after
 * the last change, as the whole roshetta, through saveRoshetta (so it is saved on the phone first and
 * sent when online). Leaving the screen, opening the Add drug screen, or the app going to the
 * background saves at once what is still waiting for the short pause. A small word at the top says
 * Saving, Waiting to save, Saved or Couldn't save (decisions in utils/roshettaEditorState.js). A save
 * the limits refuse opens the same sheets as the Add drug screen.
 *
 * Up, down and delete (step 5.3c): move up and down swap a card with its neighbour, delete removes it;
 * all three are changes like any other, so they autosave. A card with something typed in it asks
 * first ("Delete this drug group?" / "Delete this text?"), an empty one goes at once. Removing the
 * last drug of a group deletes the group by the same rule. On a read only roshetta delete opens the
 * read only sheet.
 *
 * Counts and limits (step 5.3d): the bar shows "7 of 10 drugs" and "1 of 10 text blocks". The limits
 * are checked at the tap, before anything changes: a full roshetta (drug limit) opens the drug limit
 * sheet from Add drug and from "Add or / plus drug"; ten text blocks or forty cards give a plain
 * message instead (decisions in utils/roshettaEditorState.js). The database stays the real guard.
 *
 * Read only (lapsed account): the cards are locked and the add bar is not drawn.
 *
 * States (the decisions are in utils/roshettaEditorState.js): loading, signed out, could not load,
 * not found (deleted on another device), empty, and the cards.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import DrugGroupCard from '../components/roshettas/editor/DrugGroupCard'
import TextBlockCard from '../components/roshettas/editor/TextBlockCard'
import { shimmer } from '../components/drugs/home/shimmer'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { pageRoshetta } from '../utils/roshettaPageState'
import { addPartnerQuery } from '../utils/roshettaAddDrugState'
import {
  AUTOSAVE_DELAY_MS, addRefusal, addTextRows, barCounts, limitMessage, changeEntry, deleteEntryById, deleteNeedsQuestion, deleteQuestion, editorHint, editorState,
  libraryIdSet, moveEntryById, saveAnswer, saveRefused, saveStatus,
} from '../utils/roshettaEditorState'
import { ROSHETTA_ROW_TYPES } from '../utils/roshettaRows'
import { ROUTES } from '../router'

const font = 'var(--font-body)'
// Room under the cards for the fixed add bar (counts line 26 + 10 + 48 + 10 + 1) and the bottom tab bar (60).
const BAR_ROOM = 'calc(95px + 60px + env(safe-area-inset-bottom) + var(--space-4))'

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
    saveRoshetta, showRoshettaLimit, showRoshettaReadOnly, roshettaDrugCap = 10,
    waitingRoshettaIds = [], failedList = [], syncState = 'idle',
  } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()

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

  // ── Autosave ──────────────────────────────────────────────────────────────
  const [touched, setTouched] = useState(false)   // something was changed on this screen
  const [typing, setTyping] = useState(false)     // changed, and the short pause is not over
  const [saving, setSaving] = useState(0)         // saves being put on the phone right now
  const [refused, setRefused] = useState(false)   // the last save was refused
  const latestRows = useRef(null)                 // the rows as last changed
  const waitingSave = useRef(false)               // changed and not yet handed to the saving
  const timer = useRef(null)
  const mounted = useRef(true)
  const live = useRef({})                         // what a save needs, kept current for the exit save
  useEffect(() => {
    live.current = { id, saveRoshetta, showRoshettaLimit, showRoshettaReadOnly }
  })

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (!waitingSave.current) return
    waitingSave.current = false
    const { id: roshettaId, saveRoshetta: save, showRoshettaLimit: openLimit, showRoshettaReadOnly: openReadOnly } = live.current
    if (mounted.current) {
      setTyping(false)
      setSaving(n => n + 1)
    }
    let res
    try {
      res = await save?.(roshettaId, { rows: latestRows.current })
    } catch {
      res = null
    }
    const answer = saveAnswer(res)
    if (answer === 'drugs_full') openLimit?.('drugs')
    else if (answer === 'read_only') openReadOnly?.()
    if (mounted.current) {
      setSaving(n => n - 1)
      setRefused(saveRefused(answer))
    }
  }, [])

  // Going to the background, closing the page or leaving this screen saves what is still waiting.
  useEffect(() => {
    mounted.current = true
    function onHide() {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      mounted.current = false
      flush()
    }
  }, [flush])

  function edit(nextRows) {
    if (locked) return
    latestRows.current = nextRows
    waitingSave.current = true
    setWorkingRows(nextRows)
    setTouched(true)
    setTyping(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS)
  }

  function change(entryId, entry) {
    edit(changeEntry(latestRows.current ?? rows, entryId, entry))
  }

  function move(entryId, dir) {
    edit(moveEntryById(latestRows.current ?? rows, entryId, dir))
  }

  // A tap that adds something is checked first: the drug limit opens its sheet, the others say why.
  // Returns true when the tap may go on.
  function mayAdd(kind) {
    const why = addRefusal(kind, latestRows.current ?? rows, roshettaDrugCap)
    if (!why) return true
    if (why === 'drugs') showRoshettaLimit?.('drugs')
    else toast.error(limitMessage(why))
    return false
  }

  // Delete: a card with something typed asks first; an empty one goes at once.
  const [askDeleteId, setAskDeleteId] = useState(null)
  function requestDelete(row) {
    if (locked) {
      showRoshettaReadOnly?.()
      return
    }
    if (deleteNeedsQuestion(row)) setAskDeleteId(row.id)
    else edit(deleteEntryById(latestRows.current ?? rows, row.id))
  }
  function confirmDelete() {
    edit(deleteEntryById(latestRows.current ?? rows, askDeleteId))
  }
  const askDeleteRow = askDeleteId ? rows.find(r => r?.id === askDeleteId) : null
  const question = askDeleteRow ? deleteQuestion(askDeleteRow) : null

  const status = saveStatus({
    touched, typing, saving: saving > 0, refused,
    online: isOnline,
    waitingHere: waitingRoshettaIds.includes(id),
    failedHere: failedList.some(c => c.roshettaId === id),
    syncState,
  })

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
                onAddPartner={() => { if (mayAdd('partner')) navigate(ROUTES.ROSHETTA_ADD(id) + addPartnerQuery(row.id)) }}
                onMoveUp={() => move(row.id, 'up')}
                onMoveDown={() => move(row.id, 'down')}
                onDelete={() => requestDelete(row)}
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
                onMoveUp={() => move(row.id, 'up')}
                onMoveDown={() => move(row.id, 'down')}
                onDelete={() => requestDelete(row)}
                disabled={locked}
              />
            )
          }
          return null
        })}
      </div>
    )
  }

  const counts = barCounts(rows, roshettaDrugCap)
  const showBar = (state === 'empty' || state === 'ready') && !locked
  const barButton = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 48, padding: '8px 12px', borderRadius: 24, boxSizing: 'border-box', cursor: 'pointer',
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
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px var(--page-gutter) 0', display: 'flex', justifyContent: 'center', gap: 16, boxSizing: 'border-box', fontSize: 13, fontFamily: font, lineHeight: '18px' }}>
        <span style={{ color: counts.drugsFull ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: counts.drugsFull ? 600 : 400 }}>{counts.drugs}</span>
        <span style={{ color: counts.textsFull ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: counts.textsFull ? 600 : 400 }}>{counts.texts}</span>
      </div>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px var(--page-gutter) 10px', display: 'flex', gap: 10, boxSizing: 'border-box' }}>
        <button
          type="button"
          onClick={() => { if (mayAdd('drug')) navigate(ROUTES.ROSHETTA_ADD(id)) }}
          style={{ ...barButton, backgroundColor: 'var(--color-accent-solid)', color: '#fff', border: 'none' }}
        >
          <Icon name="Plus" size={16} />
          Add drug
        </button>
        <button
          type="button"
          onClick={() => { if (mayAdd('text')) edit(addTextRows(latestRows.current ?? rows)) }}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        {backButton}
        <span
          role="status"
          aria-live="polite"
          style={{
            fontSize: 13, fontWeight: 500, fontFamily: font,
            color: status?.tone === 'warning' ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          }}
        >
          {(state === 'empty' || state === 'ready') && status ? status.word : ''}
        </span>
      </div>
      {roshetta?.name && (state === 'empty' || state === 'ready') && (
        <h1 dir="auto" style={{ margin: '0 0 var(--space-3)', fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)', fontFamily: font, overflowWrap: 'anywhere' }}>
          {roshetta.name}
        </h1>
      )}
      {content}
      {addBar}
      <ConfirmSheet
        isOpen={!!askDeleteRow}
        onClose={() => setAskDeleteId(null)}
        onConfirm={confirmDelete}
        title={question?.title ?? ''}
        message={question?.message ?? ''}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
