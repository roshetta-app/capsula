/**
 * src/pages/DrugGroupScreen.jsx
 * 2026-10-19 (Drug groups plan, steps 6.1 to 6.3): the group page, opened from
 * a tile or row in My drug groups at /drugs/group/:groupId. Back, an Edit
 * icon, the group's colour icon and name, the count ("9 of 20 drugs"), the
 * description under the name, then the group's drugs as normal drug cards
 * (same cards and heart as the other lists), A to Z by brand name.
 *
 * Tapping a drug opens it; back returns to this page. Edit opens the group
 * editor (rename, colour, add and remove drugs, Delete group). A drug cannot be
 * dragged: the order is always A to Z (decision 16). The Share icon arrives
 * with sharing in Phase 8.
 *
 * States (plan section 5, Group page):
 *   - loading: placeholder cards (account or groups or drug library loading).
 *   - signed out: "Sign in to see this group".
 *   - could not load, no saved copy: Retry.
 *   - group not found (deleted on another device): "This group isn't
 *     available" with a back button.
 *   - empty group: "No drugs in this group yet" with Add drugs (opens the
 *     editor).
 *   - has drugs: the cards. A drug the app no longer has shows "This drug is no
 *     longer available" with Remove.
 *   - full (20 of 20 free, 50 of 50 Pro): a "Full" tag next to the count.
 *   - read only (lapsed): no Edit, no Add, no Remove; a Delete group button
 *     stays at the bottom.
 *
 * 2026-10-21 (Drug groups plan, step 12.2): the header is one tinted block in the group's colour:
 * the icon with the Share and Edit buttons (44 px, round) on the first line, the name, the count
 * with a capacity bar, then the description. Back stays above the block. Nothing else changes.
 *
 * 2026-10-21 (step 12.3): the list gets its own header row, "Drugs" with the count, an Add
 * button (search icon) and a Remove button, both 44 px tall. Not shown to a read-only account
 * or on an empty group (the empty message keeps its own Add drugs button); Remove is only
 * shown when the group has drugs. For now both open the editor, where drugs are added and
 * removed today; step 12.4 (remove mode) and step 12.5 (Add drugs search) replace them.
 * The drug cards are not changed.
 *
 * 2026-10-23 (UI refresh): the 'N of M drugs' line is gone (the bar says it; 'Full' stays). In remove mode
 * the minus is on the right, in the heart's place, the same size as the + on the Add drugs screen. The heart
 * on a drug row only shows that the drug is a favourite; it no longer un-favourites it.
 *
 * 2026-10-21 (steps 12.4 to 12.6): Add opens the Add drugs screen (/drugs/group/:id/add,
 * AddDrugsToGroupScreen.jsx, built from the Drugs search). Remove turns into Done and every
 * card gets a round minus beside it (the card keeps its layout and is not tappable then);
 * a minus removes that drug at once and a "Drug removed" message with Undo shows for 5
 * seconds (Undo puts the last removed drug back). Adds and removes go through
 * useGroupDrugEdits, which sends quick taps one after the other so none is lost. Page
 * states: the empty group invites Add (opens the Add drugs screen); a full group shows
 * its limit line under the list header. The Edit sheet is unchanged until step 13.2.
 *
 * 2026-10-19 (step 8.1): a Share icon left of Edit opens ShareGroupSheet (not
 * shown to a read-only account, whose database rules refuse making or stopping
 * a link). The page also asks whether the group has a live link, so the delete
 * question can say the link stops working too.
 *
 * Deleting (from the editor, or the button on a read-only group) takes the
 * person back to the Drugs home, which offers Undo for 5 seconds
 * (pendingUndo.js). While the editor or delete question is open the page
 * keeps showing the last copy of the group, so a delete in progress never
 * flashes "not found".
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Minus, Pencil, Pill, Plus, Search, Share2, Trash2 } from 'lucide-react'
import SharedDrugCard from '../components/SharedDrugCard'
import RowStarButton from '../components/ui/RowStarButton'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import Snackbar from '../components/ui/Snackbar'
import GroupEditorSheet from '../components/drugs/groups/GroupEditorSheet'
import ShareGroupSheet from '../components/drugs/groups/ShareGroupSheet'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import GroupSyncStatus from '../components/drugs/groups/GroupSyncStatus'
import FolderShell from '../components/drugs/groups/FolderShell'
import GroupDescription from '../components/drugs/groups/GroupDescription'
import { folderWash } from '../components/drugs/groups/folderStyles'
import { drugRowTitle, sortDrugsByTitle } from '../components/drugs/groups/groupDrugText'
import { drugsLimitMessage } from '../components/drugs/groups/groupMessages'
import { useGroupDrugEdits } from '../components/drugs/groups/useGroupDrugEdits'
import { setPendingUndo } from '../components/drugs/groups/pendingUndo'
import { shimmer } from '../components/drugs/home/shimmer'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useIsPro } from '../hooks/useIsPro'
import { useCategories } from '../hooks/useCategories'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken } from '../utils/specialtyTokens'
import { DRUG_GROUP_DRUGS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_PRO } from '../constants/features'
import { ROUTES } from '../router'

const REMOVE_ROW_STYLE = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: '14px var(--space-1)', borderBottom: '1px solid var(--color-border)',
}

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

export default function DrugGroupScreen() {
  const navigate = useNavigate()
  const { groupId } = useParams()
  // Back goes to the real previous screen; opened straight from a link, the
  // Drugs home is put behind it first.
  useDeepLinkParent(ROUTES.DRUGS)

  const { drugs, loading: drugsLoading } = useDrugContext()
  const {
    groups, groupsStatus, isReadOnly, reloadGroups, deleteGroup,
    isDrugFavourited, promptSignIn, getShareCode,
  } = useFavouritesContext()
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const isDark = useIsDark()
  const { categories } = useCategories()

  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  // Whether this group has a live share link (step 8.1): so the delete question
  // can say the link stops too. null = no link or not known (for example offline).
  const [shareCode, setShareCode] = useState(null)
  // Remove mode (step 12.4) and its Undo message (5 seconds, the last drug removed).
  const [removeMode, setRemoveMode] = useState(false)
  // 2026-10-23: Undo works for every drug removed, newest first, not only the last one. 'stack'
  // holds the removed ids (newest at the end). The message stays up while remove mode is on and
  // for 5 seconds after the last tap once it is off; when it goes, the stack is cleared.
  const [undo, setUndo] = useState({ visible: false, stack: [] })
  useEffect(() => {
    if (!undo.visible || removeMode) return undefined
    const timer = setTimeout(() => setUndo({ visible: false, stack: [] }), 5000)
    return () => clearTimeout(timer)
  }, [undo.visible, undo.stack.length, removeMode])

  // Keep the last copy of the group while the editor or delete question is
  // open, so a delete in progress does not flash "not found".
  const live = groups.find(g => g.id === groupId) ?? null
  const [snapshot, setSnapshot] = useState(null)
  if (live && live !== snapshot) setSnapshot(live)
  const group = live ?? ((editorOpen || deleteOpen) ? snapshot : null)

  // Quick adds and removes are sent one after the other (step 12.4); 'ids' is the list as
  // the person's taps have left it.
  const edits = useGroupDrugEdits(group)
  const ids = edits.ids

  const liveGroupId = live?.id
  useEffect(() => {
    if (!user || !liveGroupId) return
    let cancelled = false
    getShareCode(liveGroupId).then(r => {
      if (!cancelled && r.ok) setShareCode(r.code ?? null)
    })
    return () => { cancelled = true }
  }, [user, liveGroupId, getShareCode])

  const drugsCap = isPro ? DRUG_GROUP_DRUGS_CAP_PRO : DRUG_GROUP_DRUGS_CAP_FREE

  // The lookup table depends on the whole drug list only, so a tap on Add or Remove does not rebuild it.
  const byId = useMemo(() => new Map((drugs ?? []).map(d => [d.id, d])), [drugs])
  const { known, missing } = useMemo(() => {
    const known = []
    const missing = []
    for (const id of ids) {
      const d = byId.get(id)
      if (d) known.push(d)
      else missing.push(id)
    }
    return { known: sortDrugsByTitle(known), missing }
  }, [byId, ids])

  function goHome() {
    navigate(ROUTES.DRUGS, { replace: true })
  }

  // Delete finished (from the editor or the read-only button): back to the
  // Drugs home, which offers Undo.
  function handleDeleted(deleted) {
    setPendingUndo(deleted ?? group)
    goHome()
  }

  // Read-only delete question. Throws on failure so the question stays open.
  async function handleReadOnlyDelete() {
    const res = await deleteGroup(group.id)
    if (!res?.ok) throw new Error(res?.reason ?? 'error')
    handleDeleted(res.group ?? group)
  }

  async function handleRemoveMissing(id) {
    if (!group) return
    await edits.remove(id)
  }

  function openAddDrugs() {
    setRemoveMode(false)
    navigate(ROUTES.DRUGS_GROUP_ADD(group.id))
  }

  // A minus in remove mode: the drug goes at once, with an Undo for 5 seconds. If the save is
  // refused (the hook says why), the message is taken back.
  function handleMinus(id) {
    setUndo(u => ({ visible: true, stack: [...u.stack.filter(x => x !== id), id] }))
    edits.remove(id).then(res => {
      if (!res?.ok && res?.reason !== 'missing') {
        setUndo(u => {
          const stack = u.stack.filter(x => x !== id)
          return { visible: stack.length > 0, stack }
        })
      }
    })
  }
  function handleUndo() {
    const id = undo.stack[undo.stack.length - 1]
    if (!id) return
    const stack = undo.stack.slice(0, -1)
    setUndo({ visible: stack.length > 0, stack })
    edits.add(id)
  }

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      aria-label="Back to Drugs"
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
      Drugs
    </button>
  )

  const canEdit = !!group && !isReadOnly

  // Share and Edit: 44 px round buttons, drawn inside the header block (step 12.2).
  const roundButtonStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
    background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
    color: 'var(--color-text-primary)',
    WebkitTapHighlightColor: 'transparent', outline: 'none',
  }
  const actionButtons = canEdit && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <button onClick={() => setShareOpen(true)} aria-label="Share group" style={roundButtonStyle}>
        <Share2 size={20} strokeWidth={2} />
      </button>
      <button onClick={() => { setRemoveMode(false); setEditorOpen(true) }} aria-label="Edit group" style={roundButtonStyle}>
        <Pencil size={20} strokeWidth={2} />
      </button>
    </div>
  )

  // Add and Remove: 44 px tall pill buttons in the list header (step 12.3).
  const pillButtonStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 38, width: 96, padding: 0, boxSizing: 'border-box', borderRadius: 19, flexShrink: 0,
    background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
    transition: 'background-color var(--motion-base) var(--ease-reveal), color var(--motion-base) var(--ease-reveal)',
    WebkitTapHighlightColor: 'transparent', outline: 'none',
  }

  const topRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
      {backButton}
    </div>
  )

  let content
  if (authLoading || (user && groupsStatus === 'loading')) {
    content = <div><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
  } else if (!user) {
    content = (
      <GroupStateMessage
        title="Sign in to see this group"
        body="Your groups are saved to your account."
        actionLabel="Sign in"
        onAction={() => promptSignIn('groups', 'new')}
      />
    )
  } else if (groupsStatus === 'error' && groups.length === 0) {
    content = (
      <GroupStateMessage title="Couldn't load your groups" actionLabel="Try again" onAction={reloadGroups} />
    )
  } else if (!group) {
    content = (
      <GroupStateMessage
        title="This group isn't available"
        body="It may have been deleted on another device."
        actionLabel="Back to Drugs"
        onAction={goHome}
      />
    )
  } else {
    const tone = resolveToken(group.color, isDark)
    const count = ids.length
    const removing = removeMode && count > 0
    const full = count >= drugsCap
    const waitingForDrugs = drugsLoading && (drugs ?? []).length === 0

    let list
    if (count === 0) {
      list = (
        <GroupStateMessage
          open
          icon={Pill}
          accent={{ bg: tone.bg, fg: tone.fg }}
          title="Nothing here yet"
          body={isReadOnly ? undefined : 'Search for drugs and add them to this group.'}
          actionLabel={isReadOnly ? undefined : 'Add drugs'}
          actionIcon={Plus}
          onAction={isReadOnly ? undefined : openAddDrugs}
        />
      )
    } else if (waitingForDrugs) {
      list = <div><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    } else {
      list = (
        <div>
          {known.map((drug, i) => {
            const card = (
              <SharedDrugCard
                key={drug.id}
                drug={drug}
                categories={categories}
                isDark={isDark}
                isLast={i === known.length - 1 && missing.length === 0}
                onTap={() => navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))}
                disableTap={removing}
                trailing={removing ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleMinus(drug.id) }}
                    onPointerDown={e => e.stopPropagation()}
                    aria-label={`Remove ${drugRowTitle(drug)} from this group`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0, padding: 0,
                      border: 'none', background: 'none', cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent', outline: 'none',
                    }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%',
                      backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Minus size={18} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  </button>
                ) : (
                  <RowStarButton
                    isFavourited={isDrugFavourited(drug.id)}
                    readOnly
                  />
                )}
              />
            )
            return card
          })}
          {missing.map(id => (
            <div key={id} style={REMOVE_ROW_STYLE}>
              <div style={{
                flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
              }}>
                This drug is no longer available
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => handleRemoveMissing(id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px',
                    fontSize: 13, fontWeight: 600, color: 'var(--color-accent-text)',
                    fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )
    }

    content = (
      <>
        <FolderShell wash={folderWash(tone.fg)} padding={16} gap={12}>
          {actionButtons ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{actionButtons}</div>
          ) : null}

          <h1 dir="ltr" style={{
            margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.25, textAlign: 'start',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
            overflowWrap: 'anywhere',
          }}>
            {group.name}
          </h1>

          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              fontSize: 13, color: 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)', fontFamily: 'var(--font-body)',
            }}>
              {full && (
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface)',
                  borderRadius: 8, padding: '2px 8px',
                }}>
                  Full
                </span>
              )}
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={drugsCap}
              aria-valuenow={count}
              aria-label={`${count} of ${drugsCap} drugs`}
              style={{
                marginTop: 'var(--space-2)', height: 6, borderRadius: 3, overflow: 'hidden',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div style={{
                width: `${Math.min(100, (count / drugsCap) * 100)}%`, height: '100%',
                borderRadius: 3, backgroundColor: tone.fg, transition: 'width var(--motion-base) var(--ease-settle)',
              }} />
            </div>
          </div>

          <GroupDescription text={group.description} />
        </FolderShell>

        <GroupSyncStatus marginTop="var(--space-3)" />

        {isReadOnly && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <GroupStateMessage
              variant="banner"
              tone="warning"
              title="Your groups are read only. Delete a group or upgrade to edit."
            />
          </div>
        )}

        {!isReadOnly && count > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)',
          }}>
            <h2 style={{
              margin: 0, display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)',
              fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
            }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{count}</span>
              Drugs
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                onClick={openAddDrugs}
                aria-label="Add drugs to this group"
                style={{ ...pillButtonStyle, color: 'var(--color-accent-text)' }}
              >
                <Search size={18} strokeWidth={2} aria-hidden="true" />
                Add
              </button>
              {removing ? (
                <button
                  onClick={() => setRemoveMode(false)}
                  aria-label="Done removing drugs"
                  style={{ ...pillButtonStyle, backgroundColor: 'var(--color-accent-solid)', color: '#fff' }}
                >
                  <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                  Done
                </button>
              ) : (
                <button
                  onClick={() => setRemoveMode(true)}
                  aria-label="Remove drugs from this group"
                  style={{ ...pillButtonStyle, color: 'var(--color-danger)' }}
                >
                  <Minus size={18} strokeWidth={2} aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {!isReadOnly && full && count > 0 && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <GroupStateMessage variant="banner" title={drugsLimitMessage(isPro)} />
          </div>
        )}

        <div style={{ marginTop: 'var(--space-3)' }}>{list}</div>

        {isReadOnly && (
          <button
            onClick={() => setDeleteOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: 'var(--space-4) auto 0',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 12px', fontSize: 14, fontWeight: 600,
              color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete group
          </button>
        )}
      </>
    )
  }

  // Side gap and max width come from Layout (Drug groups plan, step 12.0 / F1); this page adds top and bottom space only.
  return (
    <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>
      {topRow}
      {content}

      <GroupEditorSheet
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        group={group}
        onDeleted={handleDeleted}
        shared={!!shareCode}
      />
      {group && (
        <ShareGroupSheet
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          group={group}
          onShareChange={setShareCode}
        />
      )}
      <Snackbar
        visible={undo.visible}
        message={undo.stack.length > 1 ? `${undo.stack.length} drugs removed` : 'Drug removed'}
        actionLabel="Undo"
        onAction={handleUndo}
      />
      <ConfirmSheet
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleReadOnlyDelete}
        title="Delete group?"
        message={`"${group?.name ?? ''}" and its list of drugs will be deleted. The drugs themselves stay in the app.${shareCode ? ' Its share link will stop working too.' : ''}`}
        confirmLabel="Delete"
        confirmingLabel={'Deleting\u2026'}
        destructive
      />
    </div>
  )
}
