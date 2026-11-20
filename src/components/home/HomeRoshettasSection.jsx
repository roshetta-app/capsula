/**
 * src/components/home/HomeRoshettasSection.jsx
 * Phase H, step 9.4: My roshettas on Home. One sideways swipe row (the look decided in step 9.0):
 * a header (name, "See all" with an arrow on the right), then the dashed New card (112 wide) followed
 * by the roshetta cards (148 wide) with the next card peeking in from the edge.
 *
 * States: loading (three grey pads, the last one cut off), guest (the sign-in pad), could not load
 * (Try again, on the same pad), signed in with none (the full-width "Write your first roshetta"
 * pad; all four drawn in HomeStateCards.jsx in the look of the real card), the list,
 * read only (banner, no New card), a full free
 * list (New carries the Pro mark and opens the limit sheet; the line "3 of 3 on the free plan.
 * Upgrade to Pro for 100." sits under the row), and the slim notice while changes wait or were
 * refused. The decisions are shared with the Topics shelf (roshettaSectionState.js) and the new
 * ones are in utils/homeRoshettas.js.
 *
 * Props: onOpenRoshetta(roshetta), onSeeAll()
 */

import { memo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { HomeRoshettaStateCard, HomeRoshettaSkeletonCards } from './HomeStateCards'
import RoshettaDetailsSheet from '../roshettas/RoshettaDetailsSheet'
import HomeSyncLine from './HomeSyncLine'
import RoshettaFailedChangesSheet from '../roshettas/RoshettaFailedChangesSheet'
import { useConditionContext } from '../../context/ConditionContext'
import { findSpecialty } from '../../utils/roshettaSpecialty'
import { HomeRoshettaCard } from './HomeRoshettaCard'
import HomeNewCard from './HomeNewCard'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useIsPro } from '../../hooks/useIsPro'
import { useSoftSwap } from '../../hooks/useSoftSwap'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import useRowScrollMemory from '../../hooks/useRowScrollMemory'
import { sectionState, newTapAnswer } from '../../utils/roshettaSectionState'
import { noticeKind, statusText, homeRowCards, showNewCard, newCardMode } from '../../utils/homeRoshettas'

const font = 'var(--font-body)'
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
      <HomeRoshettaSkeletonCards />
    </div>
  )
}

function HomeRoshettasSection({ onOpenRoshetta, onSeeAll }) {
  const { roshettasApi } = useFavouritesContext()
  const { specialties } = useConditionContext()
  const {
    roshettas = [], roshettasStatus = 'loading', roshettasLoadError = false, isGuest = false,
    reloadRoshettas, waitingRoshettaIds = [], waitingCount = 0, failedCount = 0, syncState = 'idle',
    isReadOnly = false, canCreateRoshetta = true, roshettaCap = 3,
    showRoshettaLimit, showRoshettaReadOnly,
  } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const isPro = useIsPro()
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()
  const rowRef = useRowScrollMemory('row:home-roshettas')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [seeOpen, setSeeOpen] = useState(false)

  const count = roshettas.length
  const state = sectionState({ authLoading, isGuest, status: roshettasStatus, count })

  // The guest button goes straight to Google sign-in (no sheet in between).
  async function handleSignIn() {
    const res = await signInWithGoogle?.()
    if (res?.error) toast.error(res.error.message ?? 'Sign-in failed. Please try again.')
  }

  function handleNew() {
    const answer = newTapAnswer({ isGuest, isReadOnly, canCreate: canCreateRoshetta })
    if (answer === 'signin') { handleSignIn(); return }
    if (answer === 'readonly') { showRoshettaReadOnly?.(); return }
    if (answer === 'limit') { showRoshettaLimit?.('roshettas'); return }
    setSheetOpen(true)
  }

  const atFreeCap = !isPro && count >= roshettaCap
  const syncArgs = { online: isOnline, failedCount, waitingCount, syncState }
  const refreshFailed = state === 'list' && roshettasLoadError && isOnline
  let kind = state === 'list' ? noticeKind(syncArgs) : ''
  let text = statusText(kind, failedCount)
  let noticeAction = failedCount > 0 ? { label: 'See', run: () => setSeeOpen(true) } : null
  if (!kind && refreshFailed) {
    kind = 'refresh'
    text = statusText('refresh')
    noticeAction = { label: 'Try again', run: reloadRoshettas }
  }

  const swapClass = useSoftSwap(state === 'loading')

  let content
  if (state === 'loading') {
    content = <SkeletonRow />
  } else if (state === 'guest') {
    content = (
      <HomeRoshettaStateCard
        title="Create your own roshettas"
        body="Sign in to save your prescriptions and open them anywhere."
        actionLabel="Sign in"
        onAction={handleSignIn}
      />
    )
  } else if (state === 'error') {
    content = (
      <HomeRoshettaStateCard
        tone="error"
        title="Couldn't load your roshettas"
        body={isOnline ? 'Something went wrong. Please try again.' : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={reloadRoshettas}
      />
    )
  } else if (state === 'empty') {
    content = (
      <HomeRoshettaStateCard
        title="Write your first roshetta"
        body="Prepare a prescription with doses and keep it ready to use again."
        actionLabel="Create roshetta"
        withIcon
        onAction={handleNew}
      />
    )
  } else {
    content = (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div ref={rowRef} className="home-roshettas-row" style={ROW_STYLE}>
          {showNewCard({ state }) && <HomeNewCard kind="roshetta" mode={newCardMode({ isReadOnly, atFreeCap })} onTap={handleNew} />}
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
        <HomeSyncLine kind={kind} text={text} actionLabel={noticeAction?.label} onAction={noticeAction?.run} />
      </div>
    )
  }

  return (
    <section aria-label="My roshettas">
      <style>{HIDE_BAR_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 'var(--space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', color: 'var(--color-text-primary)', fontFamily: font }}>My roshettas</h2>
        </div>
        {state === 'list' && (
          <button
            type="button"
            onClick={onSeeAll}
            aria-label={`See all ${count} roshettas`}
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
      <div className={swapClass || undefined}>{content}</div>
      <RoshettaFailedChangesSheet isOpen={seeOpen} onClose={() => setSeeOpen(false)} />
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
