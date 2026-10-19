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
import { Folder, Pencil, Share2, Trash2 } from 'lucide-react'
import SharedDrugCard from '../components/SharedDrugCard'
import RowStarButton from '../components/ui/RowStarButton'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import GroupEditorSheet from '../components/drugs/groups/GroupEditorSheet'
import ShareGroupSheet from '../components/drugs/groups/ShareGroupSheet'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { drugRowTitle } from '../components/drugs/groups/groupDrugText'
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
    groups, groupsStatus, isReadOnly, reloadGroups, setGroupDrugs, deleteGroup,
    isDrugFavourited, toggleDrug, promptSignIn, getShareCode,
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

  // Keep the last copy of the group while the editor or delete question is
  // open, so a delete in progress does not flash "not found".
  const live = groups.find(g => g.id === groupId) ?? null
  const [snapshot, setSnapshot] = useState(null)
  if (live && live !== snapshot) setSnapshot(live)
  const group = live ?? ((editorOpen || deleteOpen) ? snapshot : null)

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

  const { known, missing } = useMemo(() => {
    const byId = new Map((drugs ?? []).map(d => [d.id, d]))
    const known = []
    const missing = []
    for (const id of group?.brandIds ?? []) {
      const d = byId.get(id)
      if (d) known.push(d)
      else missing.push(id)
    }
    known.sort((a, b) => drugRowTitle(a).localeCompare(drugRowTitle(b), undefined, { sensitivity: 'base' }))
    return { known, missing }
  }, [drugs, group])

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
    await setGroupDrugs(group.id, group.brandIds.filter(b => b !== id))
  }

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      aria-label="Back to Drugs"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
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

  const topRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
      {backButton}
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share group"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--color-text-primary)',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <Share2 size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => setEditorOpen(true)}
            aria-label="Edit group"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--color-text-primary)',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <Pencil size={20} strokeWidth={2} />
          </button>
        </div>
      )}
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
      <GroupStateMessage title="Couldn't load your groups" actionLabel="Retry" onAction={reloadGroups} />
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
    const count = group.brandIds.length
    const full = count >= drugsCap
    const waitingForDrugs = drugsLoading && (drugs ?? []).length === 0

    let list
    if (count === 0) {
      list = (
        <GroupStateMessage
          title="No drugs in this group yet"
          actionLabel={isReadOnly ? undefined : 'Add drugs'}
          onAction={isReadOnly ? undefined : () => setEditorOpen(true)}
        />
      )
    } else if (waitingForDrugs) {
      list = <div><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    } else {
      list = (
        <div>
          {known.map((drug, i) => (
            <SharedDrugCard
              key={drug.id}
              drug={drug}
              categories={categories}
              isDark={isDark}
              isLast={i === known.length - 1 && missing.length === 0}
              onTap={() => navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))}
              trailing={
                <RowStarButton
                  isFavourited={isDrugFavourited(drug.id)}
                  onPress={() => toggleDrug(drug.id)}
                />
              }
            />
          ))}
          {missing.map(id => (
            <div key={id} style={REMOVE_ROW_STYLE}>
              <div style={{
                flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-body)',
              }}>
                This drug is no longer available
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => handleRemoveMissing(id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px',
                    fontSize: 13, fontWeight: 600, color: 'var(--color-accent)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            backgroundColor: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Folder size={22} color={tone.fg} aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 dir="ltr" style={{
              margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.25, textAlign: 'start',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
              overflowWrap: 'anywhere',
            }}>
              {group.name}
            </h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2,
              fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
            }}>
              <span>{count} of {drugsCap} drugs</span>
              {full && (
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-muted)',
                  borderRadius: 8, padding: '2px 8px',
                }}>
                  Full
                </span>
              )}
            </div>
          </div>
        </div>

        {group.description && (
          <p dir="ltr" style={{
            margin: 'var(--space-3) 0 0', fontSize: 14, lineHeight: 1.5, textAlign: 'start',
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
            whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          }}>
            {group.description}
          </p>
        )}

        {isReadOnly && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <GroupStateMessage
              variant="banner"
              tone="warning"
              title="Your groups are read only. Delete a group or upgrade to edit."
            />
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

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-3) var(--page-gutter) var(--space-4)' }}>
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
