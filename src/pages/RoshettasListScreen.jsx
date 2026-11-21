// All of a person's roshettas, with search and sort (Phase G step 8.2). Opened from "See all" on the
// My roshettas shelf on Topics. Looks only: the data, limits and sync come from the same hook as the shelf.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTapGuard } from '../hooks/useTapGuard'
import { ArrowUpDown, Plus, Search, X } from 'lucide-react'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { ProPill } from '../components/drugs/groups/GroupTile'
import RoshettaRow from '../components/roshettas/RoshettaRow'
import RoshettaStateCard from '../components/roshettas/RoshettaStateCard'
import RoshettaDetailsSheet from '../components/roshettas/RoshettaDetailsSheet'
import { shimmer } from '../components/drugs/home/shimmer'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useBackLabel } from '../hooks/useBackLabel'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useIsPro } from '../hooks/useIsPro'
import useListScrollMemory from '../hooks/useListScrollMemory'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncStatusLine } from '../utils/groupSyncStatus'
import { findSpecialty } from '../utils/roshettaSpecialty'
import { sectionState, newTapAnswer } from '../utils/roshettaSectionState'
import { filterRoshettas, groupRoshettas, listMeta } from '../utils/roshettaShelfText'
import { ROUTES } from '../router'

const font = 'var(--font-body)'
const READ_ONLY_MESSAGE = 'Your roshettas are read only. Delete a roshetta or upgrade to edit.'
const CARD_STYLE = { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }
const LABEL_STYLE = {
  fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
  letterSpacing: '0.06em', padding: '8px 0 4px', fontFamily: font,
}

export default function RoshettasListScreen() {
  const navigate = useNavigate()
  const { openPage } = useTapGuard()
  useDeepLinkParent()
  const backLabel = useBackLabel() || 'Home'
  const { roshettasApi } = useFavouritesContext()
  const { specialties } = useConditionContext()
  const {
    roshettas = [], roshettasStatus = 'loading', roshettasLoadError = false, isGuest = false,
    reloadRoshettas, waitingRoshettaIds = [], waitingCount = 0, failedCount = 0, syncState = 'idle',
    retryFailedChanges, isReadOnly = false, canCreateRoshetta = true, roshettaCap = 3,
    showRoshettaLimit, showRoshettaReadOnly,
  } = roshettasApi ?? {}
  useListScrollMemory('list:roshettas', roshettasStatus !== 'loading')
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const isPro = useIsPro()
  const { isOnline } = useOnlineStatus()
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [sheetOpen, setSheetOpen] = useState(false)

  const count = roshettas.length
  const state = sectionState({ authLoading, isGuest, status: roshettasStatus, count })
  const searching = query.trim() !== ''
  const found = useMemo(() => filterRoshettas(roshettas, query), [roshettas, query])
  const groups = useMemo(() => groupRoshettas(found, sortMode), [found, sortMode])
  const nextMode = sortMode === 'recent' ? 'az' : 'recent'
  const labelOf = mode => (mode === 'az' ? 'A to Z' : 'Recent first')
  const atFreeCap = !isPro && count >= roshettaCap
  const line = syncStatusLine({ online: isOnline, failedCount, waitingCount, syncState })

  function handleNew() {
    const answer = newTapAnswer({ isGuest, isReadOnly, canCreate: canCreateRoshetta })
    if (answer === 'signin') { signInWithGoogle?.(); return }
    if (answer === 'readonly') { showRoshettaReadOnly?.(); return }
    if (answer === 'limit') { showRoshettaLimit?.('roshettas'); return }
    setSheetOpen(true)
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={`Back to ${backLabel}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500, fontFamily: font, padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {backLabel}
    </button>
  )

  const newButton = state === 'list' && !isReadOnly ? (
    <button
      type="button"
      onClick={handleNew}
      aria-label="New roshetta"
      style={{
        display: 'flex', alignItems: 'center', minHeight: 44, padding: 0, background: 'none', border: 'none',
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
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

  let body
  if (state === 'loading') {
    body = <div aria-hidden="true" style={shimmer({ height: 56 * 4, borderRadius: 16 })} />
  } else if (state === 'guest') {
    body = (
      <RoshettaStateCard
        title="Sign in to write roshettas"
        body="Your roshettas save to your account and work offline."
        actionLabel="Sign in"
        onAction={handleNew}
      />
    )
  } else if (state === 'error') {
    body = (
      <GroupStateMessage
        title="Couldn't load your roshettas"
        body={isOnline ? undefined : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={reloadRoshettas}
        secondary
      />
    )
  } else if (state === 'empty') {
    body = (
      <RoshettaStateCard
        title="Write your first roshetta"
        body="Build a prescription from library drugs, then share it as a link."
        actionLabel="Create roshetta"
        onAction={handleNew}
      />
    )
  } else {
    body = (
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

        <div style={{ position: 'relative' }}>
          <Search
            size={16} strokeWidth={2} aria-hidden="true"
            style={{ position: 'absolute', insetInlineStart: 14, top: 14, color: 'var(--color-accent)' }}
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search names or drugs"
            aria-label="Search your roshettas"
            maxLength={60}
            style={{
              width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 9999,
              border: '1px solid var(--color-search-border)', backgroundColor: 'var(--color-surface)',
              padding: '0 40px', fontFamily: font, fontSize: 14, color: 'var(--color-text-primary)', outline: 'none',
            }}
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              style={{
                position: 'absolute', insetInlineEnd: 4, top: 0, width: 44, height: 44, border: 'none',
                background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 0' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: font }}>
            {searching ? `${found.length} found` : ''}
          </span>
          <button
            type="button"
            onClick={() => setSortMode(nextMode)}
            aria-label={`Sort: currently ${labelOf(sortMode)}. Tap to switch to ${labelOf(nextMode)}.`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '0 0 0 8px',
              background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
              fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: font,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ArrowUpDown size={13} strokeWidth={1.8} aria-hidden="true" />
            {labelOf(nextMode)}
          </button>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 12px', fontFamily: font }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>No roshettas match</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Check the spelling or try a drug name.</div>
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                minHeight: 44, padding: '0 16px', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600,
              }}
            >
              Clear search
            </button>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.label}>
              <div style={LABEL_STYLE}>{g.label}</div>
              <div style={CARD_STYLE}>
                {g.items.map((r, i) => (
                  <RoshettaRow
                    key={r.id}
                    roshetta={r}
                    specialty={findSpecialty(r.specialtyId, specialties)}
                    waiting={waitingRoshettaIds.includes(r.id)}
                    showDivider={i < g.items.length - 1}
                    onOpen={() => openPage(ROUTES.ROSHETTA(r.id))}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        {backButton}
        {newButton}
      </div>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)', fontFamily: font }}>
        My roshettas
      </h1>
      {state === 'list' && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: font, margin: '2px 0 var(--space-3)' }}>
          {listMeta({ count, cap: roshettaCap })}
          {atFreeCap && (
            <>
              {' \u00b7 '}
              <button
                type="button"
                onClick={() => showRoshettaLimit?.('roshettas')}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--color-accent-text)', fontFamily: font, fontSize: 13, fontWeight: 600,
                }}
              >
                Upgrade to Pro
              </button>
            </>
          )}
        </div>
      )}
      {state !== 'list' && <div style={{ height: 'var(--space-3)' }} />}
      {body}
      <RoshettaDetailsSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        roshetta={null}
        onSaved={r => { if (r) openPage(ROUTES.ROSHETTA(r.id)) }}
      />
    </div>
  )
}
