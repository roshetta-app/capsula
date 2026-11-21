/**
 * src/pages/RoshettaScreen.jsx
 * 2026-11-14 (Roshetta plan, step 4.2a): the roshetta page at /roshetta/:id, opened from a
 * row in My roshettas. Read view only: Back, the name, the description, the safety label
 * ("Doses written by the author. Not checked by Capsula."), then the sheet drawn by the
 * same viewer the topic pages use, with line breaks kept in doses.
 *
 * 2026-11-21 (step 8.3b, your overhaul): the page is built like a topic sheet. A white header with
 * a rounded bottom (Back and the specialty, Share and the options menu), a hairline in the specialty
 * colour, a faint Rx, the name, the description (added and edited in place there, never in a
 * sheet) and the day; the content below has no card, with the topic sheet's margins; there is no
 * safety footnote at the bottom (removed 2026-11-21); a round floating Edit button sits at the bottom
 * end like the Contents button on a topic page, only when the roshetta has content;
 * an empty roshetta shows the group page's open empty state ("Nothing here yet", Add drugs). The letterhead below is the
 * earlier look (still used by the shared page until step 8.5).
 *
 * 2026-11-21 (step 8.3e): the header was made short (about 155 px): a small specialty row under the
 * top bar, and the dates and the status line sharing one foot line.
 *
 * 2026-11-21 (step 8.3d): the header was redrawn on white (specialty tile and name above the title,
 * Created and Edited as small labelled days) and the one status line is the Home My roshettas line
 * (HomeSyncLine, same words, "See" opens the failed-changes sheet), inside the header's foot; the
 * grey status box above the content is gone.
 *
 * 2026-11-16 (step 10.7): the name and description sit in the letterhead (RoshettaPageHeader): a
 * header band with the roshetta's specialty (or "Roshetta" in the app's blue when there is none).
 *
 * 2026-11-14 (step 4.2b): a "more" button at the top right opens a small menu with
 * "Edit details" (name, description, specialty) and "Delete roshetta" (asks first, then goes back to Home); the one status line of the
 * groups wording sits under the Back row (saving, waiting, offline, changes that could not
 * be saved, with Try again). 2026-11-14 (step 6.1b): Share opens the share sheet, and the delete question adds
 * "Its share link will stop working too." when the roshetta has a live link. 2026-11-14 (step 5.3a): Edit opens
 * the editor, /roshetta/:id/edit. The extras show only while a roshetta is shown (pageControls).
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
import { FileText, Plus } from 'lucide-react'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import Icon from '../components/ui/Icon'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import RoshettaPadHeader from '../components/roshettas/RoshettaPadHeader'
import ShareRoshettaSheet from '../components/roshettas/ShareRoshettaSheet'
import RoshettaDetailsSheet from '../components/roshettas/RoshettaDetailsSheet'
import PrescriptionSheetBlock from '../components/conditions/PrescriptionSheetBlock'
import { shimmer } from '../components/drugs/home/shimmer'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useIsPro } from '../hooks/useIsPro'
import { useTapGuard } from '../hooks/useTapGuard'
import { useBackLabel } from '../hooks/useBackLabel'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import useScrollToTopOnOpen from '../hooks/useScrollToTopOnOpen'
import RoshettaFailedChangesSheet from '../components/roshettas/RoshettaFailedChangesSheet'
import { noticeKind, statusText } from '../utils/homeRoshettas'
import { sheetRowsForDisplay } from '../utils/roshettaDrugLines'
import { findSpecialty, specialtyColors } from '../utils/roshettaSpecialty'
import { useIsDark } from '../utils/specialtyIcon'
import { pageRoshetta, pageState, pageControls, deleteOutcome, shownRoshetta } from '../utils/roshettaPageState'
import { ROUTES } from '../router'

const font = 'var(--font-body)'
const READ_ONLY_MESSAGE = 'Your roshettas are read only. Delete a roshetta or upgrade to edit.'
// Room the floating Edit button needs under the content (46 + 12 above the tab bar + a gap), so the last line is never covered.
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
  useScrollToTopOnOpen()
  const navigate = useNavigate()
  const { openPage } = useTapGuard()
  const { id } = useParams()
  // Back goes to the real previous screen; opened straight from a link, the Home screen is put behind it first.
  useDeepLinkParent()
  const backLabel = useBackLabel() || 'Home'

  const { roshettasApi } = useFavouritesContext()
  const { specialties } = useConditionContext()
  const {
    roshettas = [], roshettasStatus = 'loading', isGuest = false, reloadRoshettas,
    waitingCount = 0, failedCount = 0, syncState = 'idle', deleteRoshetta,
    waitingRoshettaIds = [], getRoshettaShareCode, saveRoshetta, isReadOnly = false, roshettasLoadError = false,
  } = roshettasApi ?? {}
  const isPro = useIsPro()
  const isDark = useIsDark()
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const { isOnline } = useOnlineStatus()

  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // True while the description is being typed in the header: the bottom bar steps aside.
  const [editingDescription, setEditingDescription] = useState(false)
  // The "See" list of changes that could not be saved (the same sheet the Home section opens).
  const [seeOpen, setSeeOpen] = useState(false)
  // The live share code (null = not shared or not known), so the delete question can say the link stops working.
  const [shareCode, setShareCode] = useState(null)
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
  // The one status line, the same words and rules as the My roshettas section on Home.
  const syncArgs = { online: isOnline, failedCount, waitingCount, syncState }
  const refreshFailed = controls.statusLine && roshettasLoadError && isOnline
  let syncKind = controls.statusLine ? noticeKind(syncArgs) : ''
  let syncText = statusText(syncKind, failedCount)
  let syncAction = failedCount > 0 && syncKind === 'failed' ? { label: 'See', run: () => setSeeOpen(true) } : null
  if (!syncKind && refreshFailed) {
    syncKind = 'refresh'
    syncText = statusText('refresh')
    syncAction = { label: 'Try again', run: reloadRoshettas }
  }

  // Learn once per roshetta whether it has a live link (online only; unknown counts as not shared).
  const roshettaId = roshetta?.id
  useEffect(() => {
    if (!roshettaId || !getRoshettaShareCode) return undefined
    let cancelled = false
    getRoshettaShareCode(roshettaId).then(r => { if (!cancelled && r?.ok) setShareCode(r.code ?? null) }, () => {})
    return () => { cancelled = true }
  }, [roshettaId, getRoshettaShareCode])

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

  function goHome() {
    navigate(ROUTES.HOME, { replace: true })
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
    goHome()
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={`Back to ${backLabel}`}
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
      {backLabel}
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
            position: 'absolute', top: 40, insetInlineEnd: 0, zIndex: 10, minWidth: 180,
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
            onClick={() => { setMenuOpen(false); setDetailsOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44,
              padding: '8px 10px', fontSize: 14, fontFamily: font,
              color: 'var(--color-text-primary)', background: 'none', border: 'none',
              borderRadius: 'var(--radius-sm)', textAlign: 'start', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name="Pencil" size={16} color="var(--color-text-secondary)" />
            Edit details
          </button>
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

  const shareButton = controls.menu ? (
    <button
      type="button"
      onClick={() => setShareOpen(true)}
      aria-label="Share roshetta"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, margin: '-8px 0', background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', color: 'var(--color-text-secondary)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon name="Share2" size={20} />
    </button>
  ) : null

  const topRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
      {backButton}
      {moreMenu}
    </div>
  )

  // Edit opens the editor. A round floating button at the bottom end, the same size, place and look
  // as the Contents button on a topic page; drawn only when the roshetta has content, and it steps
  // aside while the description is being typed.
  const actionBar = controls.bar && !editingDescription ? (
    <button
      type="button"
      onClick={() => openPage(ROUTES.ROSHETTA_EDIT(id))}
      aria-label="Edit roshetta"
      style={{
        position: 'fixed', insetInlineEnd: 16, zIndex: 90,
        bottom: 'calc(60px + env(safe-area-inset-bottom) + 12px)',
        width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', background: 'var(--color-accent-solid)',
        border: 'none', borderRadius: '50%', padding: 0,
        boxShadow: '0 6px 18px rgba(0,0,0,0.22)', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon name="Pencil" size={20} />
    </button>
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
        actionLabel="Back to Home"
        onAction={goHome}
      />
    )
  } else {
    content = (
      <>
        <RoshettaPadHeader
          name={roshetta.name}
          description={roshetta.description ?? ''}
          specialty={findSpecialty(roshetta.specialtyId, specialties)}
          createdAt={roshetta.createdAt}
          updatedAt={roshetta.updatedAt}
          topLeft={backButton}
          topRight={<>{shareButton}{moreMenu}</>}
          editable={!isReadOnly && !!saveRoshetta}
          onSaveDescription={text => saveRoshetta(roshetta.id, { description: text })}
          onEditingChange={setEditingDescription}
          isPro={isPro}
          syncKind={syncKind}
          syncText={syncText}
          syncActionLabel={syncAction?.label}
          onSyncAction={syncAction?.run}
        />

        {/* The sheet itself: no card, the topic sheet's side margins and spacing. */}
        <div style={{ padding: 'var(--space-5) calc(var(--space-6) - var(--page-gutter, 16px)) 0' }}>
          {isReadOnly && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />
            </div>
          )}
          {state === 'empty' ? (
            // The same open look as an empty drug group: a big tinted icon in the specialty's colour.
            <GroupStateMessage
              open
              icon={FileText}
              accent={(() => { const look = specialtyColors(findSpecialty(roshetta.specialtyId, specialties), isDark); return { bg: look.bg, fg: look.fg } })()}
              title="Nothing here yet"
              body={isReadOnly ? undefined : 'Add drugs and notes to build your roshetta.'}
              actionLabel={isReadOnly ? undefined : 'Add drugs'}
              actionIcon={Plus}
              onAction={isReadOnly ? undefined : () => openPage(ROUTES.ROSHETTA_EDIT(id))}
            />
          ) : (
            <PrescriptionSheetBlock sheet={{ rows: sheetRowsForDisplay(rows) }} hasContentAfter={false} keepDoseLineBreaks />
          )}

        </div>
      </>
    )
  }

  // Side gap and max width come from Layout; this page adds top and bottom space only.
  return (
    <div style={{ padding: `${controls.menu ? 0 : 'var(--space-3)'} 0 calc(var(--space-4) + ${controls.bar ? BAR_SPACE : 0}px)` }}>
      {controls.menu ? null : topRow}
      {content}
      {actionBar}
      <ShareRoshettaSheet
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        roshetta={roshetta}
        waiting={waitingRoshettaIds.includes(id)}
        onShareChange={setShareCode}
      />
      <RoshettaDetailsSheet
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        roshetta={roshetta}
        onSaved={() => {}}
      />
      <RoshettaFailedChangesSheet isOpen={seeOpen} onClose={() => setSeeOpen(false)} />
      <ConfirmSheet
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete roshetta?"
        message={`"\u2068${roshetta?.name ?? ''}\u2069" and everything in it will be deleted. This can't be undone.${shareCode ? ' Its share link will stop working too.' : ''}`}
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        destructive
      />
    </div>
  )
}
