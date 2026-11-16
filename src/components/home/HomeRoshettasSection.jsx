/**
 * src/components/home/HomeRoshettasSection.jsx
 * Phase H, step 9.4: My roshettas on Home. One sideways swipe row (the look decided in step 9.0):
 * a header (name, count pill, "See all" on the right), then the dashed New card (112 wide) followed
 * by the roshetta cards (148 wide) with the next card peeking in from the edge.
 *
 * States: loading (grey cards, the last one cut off), guest (the sign-in card), could not load
 * (Try again), signed in with none (the full-width "Write your first roshetta" card), the list,
 * a refresh that failed while a saved copy is shown, read only (banner, no New card), a full free
 * list (New carries the Pro mark and opens the limit sheet; the line "3 of 3 on the free plan.
 * Upgrade to Pro for 100." sits under the row), and the slim notice while changes wait or were
 * refused. The decisions are shared with the Topics shelf (roshettaSectionState.js) and the new
 * ones are in utils/homeRoshettas.js.
 *
 * Props: onOpenRoshetta(roshetta), onSeeAll()
 */

import { memo, useState } from 'react'
import { shimmer } from '../drugs/home/shimmer'
import GroupStateMessage from '../drugs/groups/GroupStateMessage'
import RoshettaStateCard from '../roshettas/RoshettaStateCard'
import RoshettaDetailsSheet from '../roshettas/RoshettaDetailsSheet'
import { useConditionContext } from '../../context/ConditionContext'
import { findSpecialty } from '../../utils/roshettaSpecialty'
import { HomeRoshettaCard, HomeNewCard, CARD_W, CARD_H } from './HomeRoshettaCard'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useAuth } from '../../hooks/useAuth'
import { useIsPro } from '../../hooks/useIsPro'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { sectionState, newTapAnswer } from '../../utils/roshettaSectionState'
import { homeNotice, homeRowCards, limitLine, showNewCard } from '../../utils/homeRoshettas'
import { ROSHETTAS_CAP_PRO } from '../../constants/features'

const font = 'var(--font-body)'
const READ_ONLY_MESSAGE = 'Your roshettas are read only. Delete a roshetta or upgrade to edit.'
const HIDE_BAR_CSS = '.home-roshettas-row::-webkit-scrollbar { display: none; }'

// The row reaches both screen edges (the page keeps a 16 px gutter) so the next card can peek in.
const ROW_STYLE = {
  display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity',
  scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
  marginInline: 'calc(var(--page-gutter) * -1)', paddingInline: 'var(--page-gutter)',
  scrollPaddingInline: 'var(--page-gutter)',
}

function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      style={{ ...ROW_STYLE, overflowX: 'hidden' }}
    >
      {[0, 1, 2].map(i => (
        <div key={i} style={shimmer({ flex: `0 0 ${CARD_W}px`, width: CARD_W, height: CARD_H, borderRadius: 16 })} />
      ))}
    </div>
  )
}

function HomeRoshettasSection({ onOpenRoshetta, onSeeAll }) {
  const { roshettasApi } = useFavouritesContext()
  const { specialties } = useConditionContext()
  const {
    roshettas = [], roshettasStatus = 'loading', roshettasLoadError = false, isGuest = false,
    reloadRoshettas, waitingRoshettaIds = [], waitingCount = 0, failedCount = 0, syncState = 'idle',
    retryFailedChanges, isReadOnly = false, canCreateRoshetta = true, roshettaCap = 3,
    showRoshettaLimit, showRoshettaReadOnly,
  } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const isPro = useIsPro()
  const { isOnline } = useOnlineStatus()
  const [sheetOpen, setSheetOpen] = useState(false)

  const count = roshettas.length
  const state = sectionState({ authLoading, isGuest, status: roshettasStatus, count })

  function handleNew() {
    const answer = newTapAnswer({ isGuest, isReadOnly, canCreate: canCreateRoshetta })
    if (answer === 'signin') { signInWithGoogle?.(); return }
    if (answer === 'readonly') { showRoshettaReadOnly?.(); return }
    if (answer === 'limit') { showRoshettaLimit?.('roshettas'); return }
    setSheetOpen(true)
  }

  const atFreeCap = !isPro && count >= roshettaCap
  const notice = state === 'list' ? homeNotice({ online: isOnline, failedCount, waitingCount, syncState }) : null

  let content
  if (state === 'loading') {
    content = <SkeletonRow />
  } else if (state === 'guest') {
    content = (
      <RoshettaStateCard
        title="Sign in to write roshettas"
        body="Your roshettas save to your account and work offline."
        actionLabel="Sign in"
        onAction={handleNew}
      />
    )
  } else if (state === 'error') {
    content = (
      <GroupStateMessage
        title="Couldn't load your roshettas"
        body={isOnline ? undefined : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={reloadRoshettas}
        secondary
      />
    )
  } else if (state === 'empty') {
    content = (
      <RoshettaStateCard
        title="Write your first roshetta"
        body="Build a prescription from library drugs, then share it as a link."
        actionLabel="Create roshetta"
        onAction={handleNew}
      />
    )
  } else {
    const line = limitLine({ isPro, count, cap: roshettaCap, proCap: ROSHETTAS_CAP_PRO })
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {isReadOnly && <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />}
        {notice && (
          <GroupStateMessage
            variant="banner"
            tone={notice.tone}
            title={notice.title}
            actionLabel={failedCount > 0 ? 'Try again' : undefined}
            onAction={failedCount > 0 ? retryFailedChanges : undefined}
          />
        )}
        {roshettasLoadError && isOnline && (
          <GroupStateMessage variant="banner" title="Couldn't refresh your roshettas" actionLabel="Try again" onAction={reloadRoshettas} />
        )}
        <div className="home-roshettas-row" style={ROW_STYLE}>
          {showNewCard({ state, isReadOnly }) && <HomeNewCard onTap={handleNew} showPro={atFreeCap} />}
          {homeRowCards(roshettas).map(r => (
            <HomeRoshettaCard
              key={r.id}
              roshetta={r}
              specialty={findSpecialty(r.specialtyId, specialties)}
              waiting={waitingRoshettaIds.includes(r.id)}
              onOpen={() => onOpenRoshetta?.(r)}
            />
          ))}
        </div>
        {line && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font }}>{line}</div>}
      </div>
    )
  }

  return (
    <section aria-label="My roshettas">
      <style>{HIDE_BAR_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 'var(--space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: font }}>My roshettas</span>
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
            aria-label={`See all ${count} roshettas`}
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
      <RoshettaDetailsSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        roshetta={null}
        onSaved={r => { if (r) onOpenRoshetta?.(r) }}
      />
    </section>
  )
}

export default memo(HomeRoshettasSection)
