/**
 * src/components/home/HomeGroupsSection.jsx
 * Phase H, step 9.5: My drug groups on Home. The same layout as My roshettas (a header with the
 * name, a count pill and "See all", then one sideways swipe row with the grey dashed New card
 * first, the next card peeking in from the edge) with its own personality from step 9.0: cards
 * tinted in each group's own colour, a soft grey empty card, and a slim grey row for a guest.
 *
 * States: loading (grey cards, the last one cut off), guest (the slim sign-in row), could not load
 * (Try again), signed in with none (the grey "Start your first group" card), the list, a refresh
 * that failed while a saved copy is shown, read only (banner, no New card), a full free list (New
 * carries the Pro mark; the line "3 of 3 groups · Full" sits under the row) and the slim notice
 * while changes wait or were refused. The groups data, the sign-in prompt, the limit and read only
 * messages and the editor sheet are the ones the Drugs screen uses today; nothing about groups
 * changes. The decisions shared with the roshettas row come from roshettaSectionState.js and
 * homeRoshettas.js; the new ones are in utils/homeGroups.js.
 *
 * Props: onOpenGroup(group), onSeeAll()
 */

import { memo, useState } from 'react'
import { Folder } from 'lucide-react'
import { shimmer } from '../drugs/home/shimmer'
import GroupStateMessage from '../drugs/groups/GroupStateMessage'
import GroupEditorSheet from '../drugs/groups/GroupEditorSheet'
import FailedChangesSheet from '../drugs/groups/FailedChangesSheet'
import { HomeGroupCard, HomeNewGroupCard } from './HomeGroupCard'
import { CARD_W, CARD_H } from './HomeRoshettaCard'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useDrugContext } from '../../context/DrugContext'
import { useAuth } from '../../hooks/useAuth'
import { useIsPro } from '../../hooks/useIsPro'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { sectionState, newTapAnswer } from '../../utils/roshettaSectionState'
import { homeNotice, showNewCard } from '../../utils/homeRoshettas'
import { homeGroupCards, groupLimitLine } from '../../utils/homeGroups'
import { DRUG_GROUPS_CAP_FREE } from '../../constants/features'

const font = 'var(--font-body)'
const GREY = 'color-mix(in srgb, var(--color-text-primary) 5%, var(--color-bg))'
const READ_ONLY_MESSAGE = 'Your groups are read only. Delete a group or upgrade to edit.'
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
      {[0, 1, 2].map(i => (
        <div key={i} style={shimmer({ flex: `0 0 ${CARD_W}px`, width: CARD_W, height: CARD_H, borderRadius: 16 })} />
      ))}
    </div>
  )
}

// The signed-in person's empty row: one full-width soft grey card, a round white icon chip, one
// white outlined button.
function EmptyCard({ onAction }) {
  return (
    <div style={{ backgroundColor: GREY, borderRadius: 16, padding: '24px 16px', textAlign: 'center', fontFamily: font }}>
      <div
        aria-hidden="true"
        style={{
          width: 40, height: 40, borderRadius: 9999, margin: '0 auto 12px',
          backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Folder size={22} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Start your first group</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Keep the drugs you use most in one list.
      </div>
      <button
        type="button"
        onClick={onAction}
        style={{
          minHeight: 44, padding: '0 24px', borderRadius: 9999, cursor: 'pointer',
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-accent-text)',
          fontFamily: font, fontSize: 14, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
        }}
      >
        Create group
      </button>
    </div>
  )
}

// A guest sees only a slim grey row, so the screen does not repeat two big cards.
function GuestRow({ onSignIn }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
      backgroundColor: GREY, borderRadius: 14, padding: '0 var(--space-3)', minHeight: 48, fontFamily: font,
    }}>
      <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', minWidth: 0 }}>Sign in to keep drug groups</span>
      <button
        type="button"
        onClick={onSignIn}
        style={{
          minHeight: 44, padding: '0 0 0 12px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
          color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600, flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Sign in
      </button>
    </div>
  )
}

function HomeGroupsSection({ onOpenGroup, onSeeAll }) {
  const {
    groups = [], groupsStatus = 'loading', groupsLoadError = false, isReadOnly = false, canCreateGroup = true,
    reloadGroups, promptSignIn, showGroupLimit, showGroupReadOnly, waitingGroupIds = [],
    waitingCount = 0, failedCount = 0, syncState = 'idle',
  } = useFavouritesContext()
  const { groupsSortMode } = useDrugContext()
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const { isOnline } = useOnlineStatus()
  const [editorOpen, setEditorOpen] = useState(false)
  const [seeOpen, setSeeOpen] = useState(false)

  const count = groups.length
  const state = sectionState({ authLoading, isGuest: !user, status: groupsStatus, count })

  function handleNew() {
    const answer = newTapAnswer({ isGuest: !user, isReadOnly, canCreate: canCreateGroup })
    if (answer === 'signin') { promptSignIn?.('groups', 'new'); return }
    if (answer === 'readonly') { showGroupReadOnly?.(); return }
    if (answer === 'limit') { showGroupLimit?.('groups'); return }
    setEditorOpen(true)
  }

  const atFreeCap = !isPro && count >= DRUG_GROUPS_CAP_FREE
  const notice = state === 'list' ? homeNotice({ online: isOnline, failedCount, waitingCount, syncState }) : null

  let content
  if (state === 'loading') {
    content = <SkeletonRow />
  } else if (state === 'guest') {
    content = <GuestRow onSignIn={handleNew} />
  } else if (state === 'error') {
    content = (
      <GroupStateMessage
        title="Couldn't load your groups"
        body={isOnline ? undefined : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={reloadGroups}
        secondary
      />
    )
  } else if (state === 'empty') {
    content = <EmptyCard onAction={handleNew} />
  } else {
    const line = groupLimitLine({ isPro, count, cap: DRUG_GROUPS_CAP_FREE })
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {isReadOnly && <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />}
        {notice && (
          <GroupStateMessage
            variant="banner"
            tone={notice.tone}
            title={notice.title}
            actionLabel={failedCount > 0 ? 'See' : undefined}
            onAction={failedCount > 0 ? () => setSeeOpen(true) : undefined}
          />
        )}
        {groupsLoadError && isOnline && (
          <GroupStateMessage variant="banner" title="Couldn't refresh your groups" actionLabel="Try again" onAction={reloadGroups} />
        )}
        <div className="home-groups-row" style={ROW_STYLE}>
          {showNewCard({ state, isReadOnly }) && <HomeNewGroupCard onTap={handleNew} showPro={atFreeCap} />}
          {homeGroupCards(groups, groupsSortMode).map(g => (
            <HomeGroupCard
              key={`${g.id}:${g.name}`}
              group={g}
              waiting={waitingGroupIds.includes(g.id)}
              onOpen={() => onOpenGroup?.(g)}
            />
          ))}
        </div>
        {line && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font }}>{line}</div>}
      </div>
    )
  }

  return (
    <section aria-label="My drug groups">
      <style>{HIDE_BAR_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 'var(--space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: font }}>My drug groups</span>
          {state === 'list' && (
            <span style={{
              fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: font,
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 9999, padding: '1px 8px',
            }}>
              {count}
            </span>
          )}
        </div>
        {state === 'list' && (
          <button
            type="button"
            onClick={onSeeAll}
            aria-label={`See all ${count} drug groups`}
            style={{
              minHeight: 44, padding: '0 0 0 12px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
              color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            See all
          </button>
        )}
      </div>
      {content}
      <GroupEditorSheet isOpen={editorOpen} onClose={() => setEditorOpen(false)} group={null} />
      <FailedChangesSheet isOpen={seeOpen} onClose={() => setSeeOpen(false)} />
    </section>
  )
}

export default memo(HomeGroupsSection)
