/**
 * src/pages/RoshettaScreen.jsx
 * 2026-11-14 (Roshetta plan, step 4.2a): the roshetta page at /roshetta/:id, opened from a
 * row in My roshettas. Read view only: Back, the name, the description, the safety label
 * ("Doses written by the author. Not checked by Capsula."), then the sheet drawn by the
 * same viewer the topic pages use, with line breaks kept in doses.
 *
 * 2026-11-14 (step 4.2b): a "more" button at the top right opens a small menu with
 * "Delete roshetta" (asks first, then goes back to Topics); the one status line of the
 * groups wording sits under the Back row (saving, waiting, offline, changes that could not
 * be saved, with Try again); and a fixed Edit and Share bar sits just above the bottom tab
 * bar. Edit and Share are only drawn for now: a tap opens nothing (the editor is Phase D,
 * sharing comes later). The extras show only while a roshetta is shown (pageControls).
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

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import Icon from '../components/ui/Icon'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import RoshettaDisclaimer from '../components/roshettas/RoshettaDisclaimer'
import PrescriptionSheetBlock from '../components/conditions/PrescriptionSheetBlock'
import { shimmer } from '../components/drugs/home/shimmer'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncStatusLine } from '../utils/groupSyncStatus'
import { pageRoshetta, pageState, pageControls, deleteOutcome, shownRoshetta } from '../utils/roshettaPageState'
import { ROUTES } from '../router'

const font = 'var(--font-body)'
// Height of the fixed Edit and Share bar (10 + 48 + 10 + 1 line), so the page can leave room for it.
const BAR_SPACE = 72

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
  const {
    roshettas = [], roshettasStatus = 'loading', isGuest = false, reloadRoshettas,
    waitingCount = 0, failedCount = 0, syncState = 'idle', retryFailedChanges, deleteRoshetta,
  } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const { isOnline } = useOnlineStatus()

  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // The roshetta as it was when Delete was confirmed: kept on screen while the delete runs.
  const [snapshot, setSnapshot] = useState(null)
  const menuRef = useRef(null)

  const roshetta = shownRoshetta({ live: pageRoshetta(roshettas, id), last: snapshot, deleting: snapshot !== null })
  const rows = roshetta?.rows ?? []
  const state = pageState({
    authLoading, isGuest, status: roshettasStatus,
    found: !!roshetta, rowCount: rows.length, listCount: roshettas.length,
  })
  const controls = pageControls(state)
  const line = controls.statusLine
    ? syncStatusLine({ online: isOnline, failedCount, waitingCount, syncState })
    : null

  // The menu closes on a tap outside it and on Escape.
  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointer(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function goTopics() {
    navigate(ROUTES.CONDITIONS, { replace: true })
  }

  // The delete question. Throws on failure so the question stays open (ConfirmSheet shows its
  // message). A delete is saved on the phone first, so it also works offline.
  async function handleDelete() {
    if (!roshetta) return
    setSnapshot(roshetta)
    let res
    try {
      res = await deleteRoshetta?.(roshetta.id)
    } catch {
      res = null
    }
    if (deleteOutcome(res) === 'failed') {
      setSnapshot(null)
      throw new Error(res?.reason ?? 'error')
    }
    goTopics()
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back to Topics"
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
      Topics
    </button>
  )

  const moreMenu = controls.menu ? (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Roshetta options"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, margin: '-8px 0', background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', color: 'var(--color-text-secondary)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Icon name="MoreVertical" size={20} />
      </button>
      {menuOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 40, right: 0, zIndex: 10, minWidth: 180,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 4,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44,
              padding: '8px 10px', fontSize: 14, fontFamily: font,
              color: 'var(--color-danger)', background: 'none', border: 'none',
              borderRadius: 'var(--radius-sm)', textAlign: 'start', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name="Trash2" size={16} color="var(--color-danger)" />
            Delete roshetta
          </button>
        </div>
      )}
    </div>
  ) : null

  const topRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
      {backButton}
      {moreMenu}
    </div>
  )

  const barButton = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 24, boxSizing: 'border-box', cursor: 'pointer',
    fontSize: 15, fontWeight: 600, fontFamily: font,
    WebkitTapHighlightColor: 'transparent',
  }

  // Edit and Share: drawn only; a tap opens nothing yet (Edit is Phase D, Share comes later).
  // Fixed just above the bottom tab bar (60 px plus the phone's bottom safe area).
  const actionBar = controls.bar ? (
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
          style={{ ...barButton, backgroundColor: 'var(--color-accent-solid)', color: '#fff', border: 'none' }}
        >
          <Icon name="Pencil" size={16} />
          Edit
        </button>
        <button
          type="button"
          style={{ ...barButton, backgroundColor: 'var(--color-surface)', color: 'var(--color-accent-text)', border: '1px solid var(--color-border)' }}
        >
          <Icon name="Share2" size={16} />
          Share
        </button>
      </div>
    </div>
  ) : null

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
        {line && (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <GroupStateMessage
              variant="banner"
              tone={line.tone}
              title={line.title}
              actionLabel={failedCount > 0 ? 'Try again' : undefined}
              onAction={failedCount > 0 ? retryFailedChanges : undefined}
            />
          </div>
        )}
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
    <div style={{ padding: `var(--space-3) 0 calc(var(--space-4) + ${controls.bar ? BAR_SPACE : 0}px)` }}>
      {topRow}
      {content}
      {actionBar}
      <ConfirmSheet
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete roshetta?"
        message={`"${roshetta?.name ?? ''}" and everything in it will be deleted. This can't be undone.`}
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        destructive
      />
    </div>
  )
}
