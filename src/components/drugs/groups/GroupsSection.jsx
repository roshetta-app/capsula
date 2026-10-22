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
 *
 * 2026-10-22 (UI refresh plan, step 8.2a): tiles view is one sideways row of cards (name, count,
 * first drug names, New group card at the end); the "N of 3 groups · Full" line shows under it
 * for a free account at its limit. List view and every message state are unchanged.
 *
 * 2026-10-22 (step 8.2b): the sort button and the Tiles / List switch moved to the See all
 * screen (DrugGroupsScreen, which draws this section with all). The home keeps the sideways
 * row and gets a See all link beside the heading.
 *
 * 2026-10-20 (step 11.5): flat look. Colour tiles with a big drug count, flat list rows
 * with thin lines, a dashed New group tile or row at the end, centred messages with no
 * box, and placeholders in the same shapes while loading. A group that is added or
 * renamed fades in softly (not on the first draw of the page); a deleted group goes at
 * once and the Undo message stays. The soft fade uses the app's motion speed, so it
 * is instant when the phone asks for reduced motion.
 */

import { memo, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ChevronRight } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from '../home/DrugsSectionCard'
import { shimmer } from '../home/shimmer'
import GroupTile, { CARD_WIDTH } from './GroupTile'
import GroupRow from './GroupRow'
import GroupViewToggle from './GroupViewToggle'
import { firstNames } from './groupDrugText'

const NAME_ORDER = new Intl.Collator(undefined, { sensitivity: 'base' })
import GroupStateMessage from './GroupStateMessage'
import GroupEditorSheet from './GroupEditorSheet'
import Snackbar from '../../ui/Snackbar'
import { takePendingUndo } from './pendingUndo'
import { ROUTES } from '../../../router'
import { useDrugContext } from '../../../context/DrugContext'
import { useFavouritesContext } from '../../../context/FavouritesContext'
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

function SkeletonTile({ fill = false }) {
  return <div style={shimmer(fill ? { height: 128, borderRadius: 16 } : { flex: `0 0 ${CARD_WIDTH}px`, width: CARD_WIDTH, height: 128, borderRadius: 16 })} />
}

function SkeletonRow({ last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: '12px 0', minHeight: 68, boxSizing: 'border-box',
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
    }}>
      <div style={shimmer({ width: 44, height: 44, borderRadius: 14, flexShrink: 0 })} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={shimmer({ width: '55%', height: 13 })} />
        <div style={shimmer({ width: '35%', height: 11 })} />
      </div>
    </div>
  )
}

// Soft fade-in for a group that was just added or renamed. Written once here for the
// tiles and rows; the speed comes from the motion token, which is near zero when the
// phone asks for reduced motion.
const SOFT_IN_CSS = '@keyframes groupSoftIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } } .group-soft-in { animation: groupSoftIn var(--motion-base) var(--ease-settle) both; } .groups-row::-webkit-scrollbar { display: none; }'

const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-2)' }
// Step 8.2a: on the home the groups sit in one sideways row of cards.
const ROW_STYLE = {
  display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity',
  scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2,
}
const LIST_STYLE = { display: 'flex', flexDirection: 'column' }

// 'all' (step 8.2b): the See all screen. It shows every group with the sort button and the
// Tiles / List switch, in a 2-column grid or a list. Without it (the home) the section is
// the sideways row with a See all link.
function GroupsSection({ all = false }) {
  const { drugs, groupsView, setGroupsView, groupsSortMode, setGroupsSortMode } = useDrugContext()
  const {
    groups, groupsStatus, groupsLoadError, isReadOnly,
    canCreateGroup, reloadGroups, restoreGroup, promptSignIn, showGroupLimit, showGroupReadOnly,
    waitingGroupIds = [],
  } = useFavouritesContext()
  const { user, loading: authLoading } = useAuth()
  const asList = all && groupsView === 'list'
  const isPro = useIsPro()
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
      return list.sort((a, b) => NAME_ORDER.compare(a.name, b.name))
    }
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }, [groups, groupsSortMode])

  // Soft change: a group whose id and name were not on screen a moment ago fades in.
  // 'known' is empty (null) until the first real list has been drawn, so the first
  // draw of the page never animates; later it trails the list by a short delay so a
  // new tile finishes its fade before it counts as known.
  const [known, setKnown] = useState(null)
  const listKey = groupsStatus === 'ready' ? groups.map(g => `${g.id}:${g.name}`).join('|') : null
  useEffect(() => {
    if (listKey === null) return undefined
    const next = new Set(groups.map(g => `${g.id}:${g.name}`))
    const t = setTimeout(() => setKnown(next), known === null ? 0 : 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey])
  const isFresh = g => known !== null && !known.has(`${g.id}:${g.name}`)

  function previewNames(g) {
    return firstNames(g.brandIds, brandNameById, 3)
  }

  // New group: the message cases come first, otherwise the editor opens.
  function handleNewGroup() {
    if (!user) { promptSignIn('groups', 'new'); return }
    if (isReadOnly) { showGroupReadOnly(); return }
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
      showGroupReadOnly()
    }
  }

  function closeEditor() {
    setEditor(e => ({ ...e, open: false }))
  }

  const title = <span style={SECTION_TITLE_STYLE}>My drug groups</span>
  const showControls = !!user && groupsStatus === 'ready' && groups.length > 0
  const controls = showControls && all ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
      <GroupSortButton
        sortMode={groupsSortMode}
        onToggle={() => setGroupsSortMode(groupsSortMode === 'newest' ? 'az' : 'newest')}
      />
      <GroupViewToggle value={groupsView} onChange={setGroupsView} />
    </div>
  ) : null
  const trailing = showControls && !all ? (
    <button
      onClick={() => navigate(ROUTES.DRUGS_GROUPS)}
      aria-label="See all my drug groups"
      style={{
        display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none',
        cursor: 'pointer', padding: '4px 0 4px 8px', fontSize: 14, fontWeight: 600,
        color: 'var(--color-accent)', fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      See all
      <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  ) : null

  let content
  if (authLoading || (user && groupsStatus === 'loading')) {
    content = asList
      ? <div style={LIST_STYLE}><SkeletonRow /><SkeletonRow /><SkeletonRow last /></div>
      : all
        ? <div style={GRID_STYLE}><SkeletonTile fill /><SkeletonTile fill /><SkeletonTile fill /><SkeletonTile fill /></div>
        : <div className="groups-row" style={ROW_STYLE}><SkeletonTile /><SkeletonTile /><SkeletonTile /></div>
  } else if (!user) {
    content = (
      <GroupStateMessage
        title="Sign in to keep your groups"
        body="Collect drugs into your own lists and reach them in one tap."
        actionLabel="Sign in"
        onAction={() => promptSignIn('groups', 'new')}
        flat
      />
    )
  } else if (groupsStatus === 'error' && groups.length === 0) {
    content = (
      <GroupStateMessage
        title="Couldn't load your groups"
        body={online ? undefined : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={reloadGroups}
        flat
      />
    )
  } else if (groups.length === 0) {
    content = (
      <GroupStateMessage
        title="Group your drugs for quick access"
        body="Make a group for a ward, a shift or a patient type."
        actionLabel="Create group"
        onAction={handleNewGroup}
        flat
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
          <GroupStateMessage variant="banner" title="Couldn't refresh your groups" actionLabel="Try again" onAction={reloadGroups} />
        ) : null}
        {asList ? (
          <div style={LIST_STYLE}>
            {sorted.map((g, i) => (
              <GroupRow
                key={`${g.id}:${g.name}`} group={g} drugNames={previewNames(g)}
                waiting={waitingGroupIds.includes(g.id)} animate={isFresh(g)}
                last={!showNew && i === sorted.length - 1}
                onOpen={() => handleOpenGroup(g)}
              />
            ))}
            {showNew && <GroupRow isNew last showProBadge={showPro} onOpen={handleNewGroup} />}
          </div>
        ) : (
          <div className={all ? undefined : 'groups-row'} style={all ? GRID_STYLE : ROW_STYLE}>
            {sorted.map(g => (
              <GroupTile
                fill={all}
                key={`${g.id}:${g.name}`} group={g} drugNames={previewNames(g)}
                waiting={waitingGroupIds.includes(g.id)} animate={isFresh(g)}
                onOpen={() => handleOpenGroup(g)}
              />
            ))}
            {showNew && <GroupTile fill={all} isNew showProBadge={showPro} onOpen={handleNewGroup} />}
          </div>
        )}
        {showPro && !asList && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {groups.length} of {DRUG_GROUPS_CAP_FREE} groups · Full
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{SOFT_IN_CSS}</style>
      {all ? (
        <div>
          {controls}
          {content}
        </div>
      ) : (
        <DrugsSectionCard label="My drug groups" flat title={title} trailing={trailing}>
          {content}
        </DrugsSectionCard>
      )}
      <GroupEditorSheet isOpen={editor.open} onClose={closeEditor} group={editor.group} />
      <Snackbar visible={undo.visible} message="Group deleted" actionLabel="Undo" onAction={handleUndo} />
    </>
  )
}

// The area takes no props, so it only redraws when its own data changes, not when the Drugs
// page around it redraws (for example on every letter typed in search).
export default memo(GroupsSection)
