/**
 * src/components/home/HomeGroupsSection.jsx
 * Phase H, step 9.5: My drug groups on Home. The same layout as My roshettas (a header with the
 * name and "See all" with an arrow, then one sideways swipe row with the grey dashed New card
 * first, the next card peeking in from the edge) with its own personality from step 9.0: cards
 * tinted in each group's own colour, and white folders for every other state.
 *
 * States: loading (three white folders, the last one cut off), guest (a white folder with
 * "Sign in"), could not load (Try again), signed in with none ("Start your first group"; these
 * four are drawn in HomeStateCards.jsx, title, line and button), the list,
 * a refresh that failed while a saved copy is shown, read only (banner, no New card), a full free list (New
 * carries the Pro mark; the line "3 of 3 groups · Full" sits under the row) and the slim notice
 * while changes wait or were refused. The groups data, the sign-in prompt, the limit and read only
 * messages and the editor sheet are the ones the Drugs screen uses today; nothing about groups
 * changes. The decisions shared with the roshettas row come from roshettaSectionState.js and
 * homeRoshettas.js; the new ones are in utils/homeGroups.js.
 *
 * Props: onOpenGroup(group), onSeeAll()
 */

import { memo, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import GroupEditorSheet from '../drugs/groups/GroupEditorSheet'
import FailedChangesSheet from '../drugs/groups/FailedChangesSheet'
import Snackbar from '../ui/Snackbar'
import { takePendingUndo } from '../drugs/groups/pendingUndo'
import { HomeGroupCard } from './HomeGroupCard'
import HomeNewCard from './HomeNewCard'
import HomeSyncLine from './HomeSyncLine'
import { HomeGroupSkeletonCards, HomeGroupStateCard } from './HomeStateCards'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useDrugContext } from '../../context/DrugContext'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useIsPro } from '../../hooks/useIsPro'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { sectionState, newTapAnswer } from '../../utils/roshettaSectionState'
import { noticeKind, statusText, showNewCard, newCardMode } from '../../utils/homeRoshettas'
import { homeGroupCards } from '../../utils/homeGroups'
import { DRUG_GROUPS_CAP_FREE } from '../../constants/features'

const font = 'var(--font-body)'
const HIDE_BAR_CSS = '.home-groups-row::-webkit-scrollbar { display: none; }'

// The row reaches both screen edges (the page keeps a 16 px gutter) so the next card can peek in.
const ROW_STYLE = {
  display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity',
  scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
  marginInline: 'calc(var(--page-gutter) * -1)', paddingInline: 'var(--page-gutter)',
  scrollPaddingInline: 'var(--page-gutter)',
}

function SkeletonRow() {
  return (
    <div aria-hidden="true" style={{ ...ROW_STYLE, overflowX: 'hidden' }}>
      <HomeGroupSkeletonCards />
    </div>
  )
}

function HomeGroupsSection({ onOpenGroup, onSeeAll }) {
  const {
    groups = [], groupsStatus = 'loading', groupsLoadError = false, isReadOnly = false, canCreateGroup = true,
    reloadGroups, restoreGroup, showGroupLimit, showGroupReadOnly, waitingGroupIds = [],
    waitingCount = 0, failedCount = 0, syncState = 'idle',
  } = useFavouritesContext()
  const { groupsSortMode } = useDrugContext()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const isPro = useIsPro()
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()
  const [editorOpen, setEditorOpen] = useState(false)
  const [seeOpen, setSeeOpen] = useState(false)

  // Undo for Delete group (moved here from the Drugs screen in step 9.7): a group deleted from its
  // page hands itself over through pendingUndo.js, and the message shows for 5 seconds.
  const [undo, setUndo] = useState(() => {
    const g = takePendingUndo()
    return { group: g, visible: !!g }
  })
  useEffect(() => {
    if (!undo.visible) return undefined
    const t = setTimeout(() => setUndo(u => ({ ...u, visible: false })), 5000)
    return () => clearTimeout(t)
  }, [undo.visible, undo.group])

  async function handleUndo() {
    const restored = undo.group
    setUndo(u => ({ ...u, visible: false }))
    const res = await restoreGroup?.(restored)
    if (res?.ok) return
    if (res?.reason === 'limit') showGroupLimit?.('groups')
    else if (res?.reason === 'read_only') showGroupReadOnly?.()
  }

  const count = groups.length
  const state = sectionState({ authLoading, isGuest: !user, status: groupsStatus, count })

  // The guest button goes straight to Google sign-in (no sheet in between).
  async function handleSignIn() {
    const res = await signInWithGoogle?.()
    if (res?.error) toast.error(res.error.message ?? 'Sign-in failed. Please try again.')
  }

  function handleNew() {
    const answer = newTapAnswer({ isGuest: !user, isReadOnly, canCreate: canCreateGroup })
    if (answer === 'signin') { handleSignIn(); return }
    if (answer === 'readonly') { showGroupReadOnly?.(); return }
    if (answer === 'limit') { showGroupLimit?.('groups'); return }
    setEditorOpen(true)
  }

  const atFreeCap = !isPro && count >= DRUG_GROUPS_CAP_FREE
  const syncArgs = { online: isOnline, failedCount, waitingCount, syncState }
  const refreshFailed = state === 'list' && groupsLoadError && isOnline
  let kind = state === 'list' ? noticeKind(syncArgs) : ''
  let text = statusText(kind, failedCount)
  let noticeAction = failedCount > 0 ? { label: 'See', run: () => setSeeOpen(true) } : null
  if (!kind && refreshFailed) {
    kind = 'refresh'
    text = statusText('refresh')
    noticeAction = { label: 'Try again', run: reloadGroups }
  }

  let content
  if (state === 'loading') {
    content = <SkeletonRow />
  } else if (state === 'guest') {
    content = (
      <HomeGroupStateCard
        title="Organize drugs in groups"
        body="Sign in to save your groups and open them anywhere."
        actionLabel="Sign in"
        onAction={handleSignIn}
      />
    )
  } else if (state === 'error') {
    content = (
      <HomeGroupStateCard
        tone="error"
        title="Couldn't load your groups"
        body={isOnline ? 'Something went wrong. Please try again.' : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={reloadGroups}
      />
    )
  } else if (state === 'empty') {
    content = (
      <HomeGroupStateCard
        title="Start your first group"
        body="Keep the drugs you use most in a single list."
        actionLabel="Create group"
        withIcon
        onAction={handleNew}
      />
    )
  } else {
    content = (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div className="home-groups-row" style={ROW_STYLE}>
          {showNewCard({ state }) && <HomeNewCard kind="group" mode={newCardMode({ isReadOnly, atFreeCap })} onTap={handleNew} />}
          {homeGroupCards(groups, groupsSortMode).map(g => (
            <HomeGroupCard
              key={`${g.id}:${g.name}`}
              group={g}
              waiting={waitingGroupIds.includes(g.id)}
              onOpen={() => onOpenGroup?.(g)}
            />
          ))}
        </div>
        <HomeSyncLine kind={kind} text={text} actionLabel={noticeAction?.label} onAction={noticeAction?.run} />
      </div>
    )
  }

  return (
    <section aria-label="My drug groups">
      <style>{HIDE_BAR_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 'var(--space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', color: 'var(--color-text-primary)', fontFamily: font }}>My drug groups</h2>
        </div>
        {state === 'list' && (
          <button
            type="button"
            onClick={onSeeAll}
            aria-label={`See all ${count} drug groups`}
            style={{
              minHeight: 44, padding: '0 0 0 12px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            See all
            <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
      </div>
      {content}
      <GroupEditorSheet isOpen={editorOpen} onClose={() => setEditorOpen(false)} group={null} />
      <FailedChangesSheet isOpen={seeOpen} onClose={() => setSeeOpen(false)} />
      <Snackbar visible={undo.visible} message="Group deleted" actionLabel="Undo" onAction={handleUndo} />
    </section>
  )
}

export default memo(HomeGroupsSection)
