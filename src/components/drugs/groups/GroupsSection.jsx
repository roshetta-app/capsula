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
import { ArrowUpDown, ChevronRight, Plus } from 'lucide-react'
import BrowseHeader from '../home/BrowseHeader'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from '../home/DrugsSectionCard'
import { shimmer } from '../home/shimmer'
import GroupTile, { CARD_WIDTH, ProPill } from './GroupTile'
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
// Step 8.12: the sort is a two-option switch that shows the mode you are on.

// Step 8.9: the folder card is about 128 tall (14 tab + 114 body).
function SkeletonTile({ fill = false }) {
  return <div style={shimmer(fill ? { height: 128, borderRadius: 20 } : { flex: `0 0 ${CARD_WIDTH}px`, width: CARD_WIDTH, height: 128, borderRadius: 20 })} />
}

function SkeletonRow() {
  return <div style={shimmer({ height: 64, borderRadius: 16 })} />
}

// Soft fade-in for a group that was just added or renamed. Written once here for the
// tiles and rows; the speed comes from the motion token, which is near zero when the
// phone asks for reduced motion.
const SOFT_IN_CSS = '@keyframes groupSoftIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } } .group-soft-in { animation: groupSoftIn var(--motion-base) var(--ease-settle) both; } .groups-row::-webkit-scrollbar { display: none; }'

const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }
// Step 8.2a: on the home the groups sit in one sideways row of cards.
const ROW_STYLE = {
  display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity',
  scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2,
}
const LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: 8 }

// 'all' (step 8.2b): the See all screen. It shows every group with the sort button and the
// Tiles / List switch, in a 2-column grid or a list. Without it (the home) the section is
// the sideways row with a See all link.
function GroupsSection({ all = false, headerProps = null }) {
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
  // Step 8.13 (third try): two plain controls, no boxes. Left: the sort as a text button that
  // switches between Newest first and A to Z (same look as the sort button on the Class page).
  // Right: one icon that switches between grid and list, showing the view a tap changes to.
  const controls = showControls && all ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
      <button
        type="button"
        onClick={() => setGroupsSortMode(groupsSortMode === 'az' ? 'newest' : 'az')}
        aria-label={`Sorted ${groupsSortMode === 'az' ? 'A to Z' : 'newest first'}. Tap to change`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: 0,
          background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
          color: 'var(--color-text-secondary)', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ArrowUpDown size={16} aria-hidden="true" />
        {SORT_LABELS[groupsSortMode] ?? SORT_LABELS.newest}
      </button>
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
      ? <div style={LIST_STYLE}><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      : all
        ? <div style={GRID_STYLE}><SkeletonTile fill /><SkeletonTile fill /><SkeletonTile fill /><SkeletonTile fill /></div>
        : <div className="groups-row" style={ROW_STYLE}><SkeletonTile /><SkeletonTile /><SkeletonTile /></div>
  } else if (!user) {
    content = (
      <GroupStateMessage
        title="Build your own drug lists"
        body="Sign in to create groups and open them on any device."
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
        secondary
      />
    )
  } else if (groups.length === 0) {
    content = (
      <GroupStateMessage
        title="Create your first group"
        body="Organise drugs by ward, shift or condition for quick access."
        actionLabel="Create group"
        actionIcon={Plus}
        onAction={handleNewGroup}
        flat
      />
    )
  } else {
    const showNew = !isReadOnly && !all   // step 8.13: on See all, New group is in the header
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
            {sorted.map(g => (
              <GroupRow
                key={`${g.id}:${g.name}`} group={g} drugNames={previewNames(g)}
                waiting={waitingGroupIds.includes(g.id)} animate={isFresh(g)}
                onOpen={() => handleOpenGroup(g)}
              />
            ))}
            {showNew && <GroupRow isNew showProBadge={showPro} onOpen={handleNewGroup} />}
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

  // Step 8.13: New group is a round plus at the right end of the title row in the See all header (PRO tag at the
  // limit). Shown once there is at least one group; the empty state has its own Create group button.
  const newGroupButton = all && showControls && !isReadOnly ? (
    <button
      type="button"
      onClick={handleNewGroup}
      aria-label="New group"
      style={{
        position: 'relative', width: 44, height: 44, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer', outline: 'none',
        backgroundColor: 'var(--color-surface)', color: 'var(--color-accent-text)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
      {!isPro && groups.length >= DRUG_GROUPS_CAP_FREE ? (
        <span style={{ position: 'absolute', top: -6, right: -6 }}><ProPill /></span>
      ) : null}
    </button>
  ) : null

  return (
    <>
      <style>{SOFT_IN_CSS}</style>
      {all ? (
        <div>
          {headerProps ? <BrowseHeader {...headerProps} action={newGroupButton} /> : null}
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
