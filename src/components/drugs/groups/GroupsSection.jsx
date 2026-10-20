/**
 * src/components/drugs/groups/GroupsSection.jsx
 * 2026-10-18 (Drug groups plan, step 3.6): the 'My drug groups' area of the
 * Drugs home, under Browse. It shows the person's groups as tiles or rows
 * (switch at the top right), with a small sort button (Newest first or
 * A to Z) and a New group tile or row. Both choices are remembered
 * (groupsView and groupsSortMode in DrugContext).
 *
 * Home states drawn here (plan section 5): loading, guest, signed in with
 * none, has groups, free account at its limit (PRO pill on New group), Pro
 * account at its limit (message on tap), could not load with a saved copy
 * (banner with Retry), could not load with no saved copy, offline (saved
 * copy plus a line), and the lapsed read-only banner.
 *
 * 2026-10-19 (step 4.1): New group and the empty-state Create group button
 * open the group editor sheet. 2026-10-19 (step 6.2): tapping a group opens its
 * own page (/drugs/group/:id); changing or deleting it now happens from there.
 * The Undo message for a group deleted from its page is shown here, handed
 * over by pendingUndo.js.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from '../home/DrugsSectionCard'
import { shimmer } from '../home/shimmer'
import GroupTile from './GroupTile'
import GroupRow from './GroupRow'
import GroupViewToggle from './GroupViewToggle'
import GroupStateMessage from './GroupStateMessage'
import GroupEditorSheet from './GroupEditorSheet'
import Snackbar from '../../ui/Snackbar'
import { takePendingUndo } from './pendingUndo'
import { ROUTES } from '../../../router'
import { useDrugContext } from '../../../context/DrugContext'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useIsPro } from '../../../hooks/useIsPro'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import GroupSyncStatus from './GroupSyncStatus'
import { toTitleCase } from '../../../utils/drugTitleFormat'
import { DRUG_GROUPS_CAP_FREE } from '../../../constants/features'

const SORT_LABELS = { newest: 'Newest first', az: 'A \u2013 Z' }
const READ_ONLY_MESSAGE = 'Your groups are read only. Delete a group or upgrade to edit.'

// Same look as the sort button on the Class page: no box, arrow icon, 13px
// medium text in the secondary colour. Shows the order a tap switches to.
function GroupSortButton({ sortMode, onToggle }) {
  const nextMode = sortMode === 'newest' ? 'az' : 'newest'
  return (
    <button
      onClick={onToggle}
      aria-label={`Sort: currently ${SORT_LABELS[sortMode]}. Tap to switch to ${SORT_LABELS[nextMode]}.`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 0 4px 8px', fontSize: 13, fontWeight: 500,
        color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <ArrowUpDown size={13} strokeWidth={1.8} aria-hidden="true" />
      {SORT_LABELS[nextMode]}
    </button>
  )
}

function SkeletonTile() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
      backgroundColor: 'var(--color-surface-muted)', borderRadius: 16,
      padding: 'var(--space-3)', minHeight: 84, boxSizing: 'border-box',
    }}>
      <div style={shimmer({ width: 32, height: 32, borderRadius: '50%' })} />
      <div style={shimmer({ width: '70%', height: 13 })} />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      backgroundColor: 'var(--color-surface-muted)', borderRadius: 16,
      padding: 'var(--space-3)',
    }}>
      <div style={shimmer({ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 })} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={shimmer({ width: '55%', height: 13 })} />
        <div style={shimmer({ width: '30%', height: 11 })} />
      </div>
    </div>
  )
}

const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-2)' }
const LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }

export default function GroupsSection() {
  const { drugs, groupsView, setGroupsView, groupsSortMode, setGroupsSortMode } = useDrugContext()
  const {
    groups, groupsStatus, groupsLoadError, isReadOnly,
    canCreateGroup, reloadGroups, restoreGroup, promptSignIn, showGroupLimit,
    waitingGroupIds = [],
  } = useFavouritesContext()
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const { toast } = useToast()
  const [editor, setEditor] = useState({ open: false, group: null })

  const navigate = useNavigate()

  // Undo for Delete group (step 4.4): a message with Undo for 5 seconds. Starts
  // already showing when the group was just deleted from its page (6.2).
  const [undo, setUndo] = useState(() => {
    const g = takePendingUndo()
    return { group: g, visible: !!g }
  })
  useEffect(() => {
    if (!undo.visible) return
    const t = setTimeout(() => setUndo(u => ({ ...u, visible: false })), 5000)
    return () => clearTimeout(t)
  }, [undo.visible, undo.group])

  const { isOnline: appOnline } = useOnlineStatus()
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Brand names by id, for the first three drug names shown on list rows.
  const brandNameById = useMemo(() => {
    const m = new Map()
    for (const d of drugs ?? []) m.set(d.id, toTitleCase(d.tradenameClean || ''))
    return m
  }, [drugs])

  const sorted = useMemo(() => {
    const list = groups.slice()
    if (groupsSortMode === 'az') {
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    }
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }, [groups, groupsSortMode])

  function previewNames(g) {
    return g.brandIds
      .map(id => brandNameById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 3)
  }

  // New group: the message cases come first, otherwise the editor opens.
  function handleNewGroup() {
    if (!user) { promptSignIn('groups', 'new'); return }
    if (isReadOnly) { toast.info(READ_ONLY_MESSAGE); return }
    if (!canCreateGroup) { showGroupLimit('groups'); return }
    setEditor({ open: true, group: null })
  }

  function handleOpenGroup(g) {
    navigate(ROUTES.DRUGS_GROUP(g.id))
  }

  async function handleUndo() {
    const restored = undo.group
    setUndo(u => ({ ...u, visible: false }))
    const res = await restoreGroup(restored)
    if (res?.ok) return
    if (res?.reason === 'limit') {
      showGroupLimit('groups')
    } else if (res?.reason === 'read_only') {
      toast.info(READ_ONLY_MESSAGE)
    }
  }

  function closeEditor() {
    setEditor(e => ({ ...e, open: false }))
  }

  const title = <span style={SECTION_TITLE_STYLE}>My drug groups</span>
  const showControls = !!user && groupsStatus === 'ready' && groups.length > 0
  const trailing = showControls ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <GroupSortButton
        sortMode={groupsSortMode}
        onToggle={() => setGroupsSortMode(groupsSortMode === 'newest' ? 'az' : 'newest')}
      />
      <GroupViewToggle value={groupsView} onChange={setGroupsView} />
    </div>
  ) : null

  let content
  if (authLoading || (user && groupsStatus === 'loading')) {
    content = groupsView === 'list'
      ? <div style={LIST_STYLE}><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      : <div style={GRID_STYLE}><SkeletonTile /><SkeletonTile /><SkeletonTile /><SkeletonTile /></div>
  } else if (!user) {
    content = (
      <GroupStateMessage
        title="Sign in to keep your groups"
        body="Collect drugs into your own lists and reach them in one tap."
        actionLabel="Sign in"
        onAction={() => promptSignIn('groups', 'new')}
      />
    )
  } else if (groupsStatus === 'error' && groups.length === 0) {
    content = (
      <GroupStateMessage
        title="Couldn't load your groups"
        body={online ? undefined : "You're offline. Check your connection and try again."}
        actionLabel="Retry"
        onAction={reloadGroups}
      />
    )
  } else if (groups.length === 0) {
    content = (
      <GroupStateMessage
        title="Group your drugs for quick access"
        body="Make a group for a ward, a shift or a patient type."
        actionLabel="Create group"
        onAction={handleNewGroup}
      />
    )
  } else {
    const showNew = !isReadOnly
    const showPro = !isPro && groups.length >= DRUG_GROUPS_CAP_FREE
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {isReadOnly && (
          <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />
        )}
        <GroupSyncStatus />
        {groupsLoadError && online && appOnline ? (
          <GroupStateMessage variant="banner" title="Couldn't refresh your groups" actionLabel="Retry" onAction={reloadGroups} />
        ) : null}
        {groupsView === 'list' ? (
          <div style={LIST_STYLE}>
            {sorted.map(g => (
              <GroupRow key={g.id} group={g} drugNames={previewNames(g)} waiting={waitingGroupIds.includes(g.id)} onOpen={() => handleOpenGroup(g)} />
            ))}
            {showNew && <GroupRow isNew showProBadge={showPro} onOpen={handleNewGroup} />}
          </div>
        ) : (
          <div style={GRID_STYLE}>
            {sorted.map(g => (
              <GroupTile key={g.id} group={g} waiting={waitingGroupIds.includes(g.id)} onOpen={() => handleOpenGroup(g)} />
            ))}
            {showNew && <GroupTile isNew showProBadge={showPro} onOpen={handleNewGroup} />}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <DrugsSectionCard label="My drug groups" flat title={title} trailing={trailing}>
        {content}
      </DrugsSectionCard>
      <GroupEditorSheet isOpen={editor.open} onClose={closeEditor} group={editor.group} />
      <Snackbar visible={undo.visible} message="Group deleted" actionLabel="Undo" onAction={handleUndo} />
    </>
  )
}
