/**
 * src/components/roshettas/RoshettasSection.jsx
 * 2026-11-14 (Roshetta plan, step 4.1d): the 'My roshettas' area, to sit at the top of
 * the Topics screen (placed there in step 4.1e). A title with a New roshetta button on
 * the right, then one card of rows (name, "N drugs, changed ..."), newest changed first,
 * then a small line with the free-plan count.
 *
 * States drawn here (plan section 6): loading (grey placeholders), guest (sign in),
 * could not load with nothing saved (Try again), signed in with none (create the first),
 * the list, a refresh that failed while a saved copy is shown (banner with Try again),
 * the lapsed read only banner, and one status line for offline, saving, waiting and
 * changes the server refused (the groups wording, utils/groupSyncStatus.js).
 *
 * New roshetta: the message cases come first, as in the groups. A guest is asked to sign
 * in, a read only account and a full list get the limit sheet (RoshettaLimitSheet,
 * mounted in SignInNudge), otherwise the details sheet opens. After a new roshetta is
 * made, onOpenRoshetta is called with it, so the screen can open it.
 *
 * Opening a roshetta (a tap on a row, or a new one) is handed to the screen through
 * onOpenRoshetta(roshetta), because the roshetta page is built in step 4.2a. Until a
 * screen passes it, a tap opens nothing.
 *
 * Sign in for a guest starts the Google sign-in directly. A sign-in sheet with roshetta
 * wording is not built (the favourites sign-in path does not know roshettas yet).
 *
 * Colours come from the app's own variables, light and dark. Roshetta names are the
 * person's own text and are drawn as plain text by RoshettaRow.
 *
 * Props:
 *   onOpenRoshetta   (roshetta) => void   optional
 */

import { memo, useState } from 'react'
import { Plus } from 'lucide-react'
import { shimmer } from '../drugs/home/shimmer'
import { ProPill } from '../drugs/groups/GroupTile'
import GroupStateMessage from '../drugs/groups/GroupStateMessage'
import RoshettaRow from './RoshettaRow'
import RoshettaStateCard from './RoshettaStateCard'
import RoshettaDetailsSheet from './RoshettaDetailsSheet'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useAuth } from '../../hooks/useAuth'
import { useIsPro } from '../../hooks/useIsPro'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { syncStatusLine } from '../../utils/groupSyncStatus'
import { sectionState, newTapAnswer, countLine } from '../../utils/roshettaSectionState'
import { shelfRows } from '../../utils/roshettaShelfText'

const READ_ONLY_MESSAGE = 'Your roshettas are read only. Delete a roshetta or upgrade to edit.'
const font = 'var(--font-body)'

function SkeletonCard() {
  return <div style={shimmer({ height: 64 * 3, borderRadius: 16 })} />
}

const TITLE_STYLE = { fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: font }
const CARD_STYLE = { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }

function RoshettasSection({ onOpenRoshetta, onSeeAll }) {
  const { roshettasApi } = useFavouritesContext()
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
  const showNewButton = state === 'list' && !isReadOnly
  const newButton = showNewButton ? (
    <button
      type="button"
      onClick={handleNew}
      aria-label="New roshetta"
      style={{
        display: 'flex', alignItems: 'center', minHeight: 44, padding: 0,
        background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', boxSizing: 'border-box',
          border: '1px solid var(--color-chip-line)', borderRadius: 9999,
          color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600,
        }}
      >
        <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
        New
        {atFreeCap ? <ProPill /> : null}
      </span>
    </button>
  ) : null

  const line = syncStatusLine({ online: isOnline, failedCount, waitingCount, syncState })

  let content
  if (state === 'loading') {
    content = <SkeletonCard />
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
    const free = countLine({ isPro, count, cap: roshettaCap })
    const shelf = shelfRows(roshettas)
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {isReadOnly && <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />}
        {line && (
          <GroupStateMessage
            variant="banner"
            tone={line.tone}
            title={line.title}
            actionLabel={failedCount > 0 ? 'Try again' : undefined}
            onAction={failedCount > 0 ? retryFailedChanges : undefined}
          />
        )}
        {roshettasLoadError && isOnline && (
          <GroupStateMessage variant="banner" title="Couldn't refresh your roshettas" actionLabel="Try again" onAction={reloadRoshettas} />
        )}
        <div style={CARD_STYLE}>
          {shelf.rows.map((r, i) => (
            <RoshettaRow
              key={r.id}
              roshetta={r}
              waiting={waitingRoshettaIds.includes(r.id)}
              showDivider={i < shelf.rows.length - 1 || shelf.hasMore}
              onOpen={() => onOpenRoshetta?.(r)}
            />
          ))}
          {shelf.hasMore && (
            <button
              type="button"
              onClick={onSeeAll}
              style={{
                width: '100%', minHeight: 44, padding: '0 16px', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
                color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              See all {count}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
        {free && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font, marginTop: 'var(--space-1)' }}>{free}</div>
        )}
      </div>
    )
  }

  return (
    <section aria-label="My roshettas" style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 'var(--space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={TITLE_STYLE}>My roshettas</span>
          {state === 'list' && (
            <span
              style={{
                fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: font,
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 9999, padding: '1px 8px',
              }}
            >
              {count}
            </span>
          )}
        </div>
        {newButton}
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

// The area redraws only when its own data changes, not when the screen around it does.
export default memo(RoshettasSection)
