/**
 * src/pages/SharedGroupScreen.jsx
 * 2026-10-19 (Drug groups plan, step 8.2): the read-only page opened from a
 * share link, at /g/:code. No sign-in is needed.
 *
 * Shows the group's colour icon and name, the number of drugs, the
 * description, a line saying a Capsula user made the group (the name and
 * description are written by the owner, not by Capsula), then the drugs as
 * normal drug cards, A to Z by brand name. Tapping a drug opens it; back
 * returns here.
 *
 * No edit controls, no heart, and the owner is never shown (the database
 * function does not return it). Save to my groups arrives at step 8.3.
 *
 * States (plan section 5, Sharing, Viewer rows):
 *   - loading: placeholder cards.
 *   - link not available: "This link isn't available. The owner may have
 *     stopped sharing it." The same message for a wrong link, a stopped link
 *     and a deleted group.
 *   - offline: "You're offline. Reconnect to open this group." with Retry.
 *   - could not load: Retry.
 *   - empty group: "No drugs in this group."
 *   - a drug removed from the app: left out (the database function does it).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Folder } from 'lucide-react'
import SharedDrugCard from '../components/SharedDrugCard'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { drugRowTitle } from '../components/drugs/groups/groupDrugText'
import { shimmer } from '../components/drugs/home/shimmer'
import { useCategories } from '../hooks/useCategories'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken } from '../utils/specialtyTokens'
import { fetchSharedGroup } from '../utils/sharedGroup'
import { ROUTES } from '../router'

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

export default function SharedGroupScreen() {
  const { code } = useParams()
  // Keyed by the code, so opening a different link starts from loading.
  return <SharedGroupBody key={code} code={code} />
}

function SharedGroupBody({ code }) {
  const navigate = useNavigate()
  // Opened straight from a link, the Drugs home is put behind this page so
  // Back has somewhere to go.
  useDeepLinkParent(ROUTES.DRUGS)

  const isDark = useIsDark()
  const { categories } = useCategories()

  // { status: 'loading' | 'ok' | 'unavailable' | 'offline' | 'error', group? }
  const [result, setResult] = useState({ status: 'loading' })

  // Bumped by Retry, so the effect below asks again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSharedGroup(code).then(r => {
      if (!cancelled) setResult(r)
    })
    return () => { cancelled = true }
  }, [code, attempt])

  const retry = useCallback(() => {
    setResult({ status: 'loading' })
    setAttempt(n => n + 1)
  }, [])

  // Coming back online while the offline message shows: try again by itself.
  useEffect(() => {
    if (result.status !== 'offline') return undefined
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [result.status, retry])

  const drugs = useMemo(() => {
    const list = result.status === 'ok' ? [...result.group.drugs] : []
    list.sort((a, b) => drugRowTitle(a).localeCompare(drugRowTitle(b), undefined, { sensitivity: 'base' }))
    return list
  }, [result])

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

  let content
  if (result.status === 'loading') {
    content = <div><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
  } else if (result.status === 'unavailable') {
    content = (
      <GroupStateMessage
        title="This link isn't available"
        body="The owner may have stopped sharing it."
        actionLabel="Go to Drugs"
        onAction={() => navigate(ROUTES.DRUGS, { replace: true })}
      />
    )
  } else if (result.status === 'offline') {
    content = (
      <GroupStateMessage
        title="You're offline. Reconnect to open this group."
        actionLabel="Retry"
        onAction={retry}
      />
    )
  } else if (result.status === 'error') {
    content = (
      <GroupStateMessage
        title="Couldn't open this group"
        body="Check your connection and try again."
        actionLabel="Retry"
        onAction={retry}
      />
    )
  } else {
    const { group } = result
    const tone = resolveToken(group.color, isDark)
    const count = drugs.length

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
              marginTop: 2, fontSize: 13, color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
            }}>
              {count} {count === 1 ? 'drug' : 'drugs'}
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

        <p style={{
          margin: 'var(--space-3) 0 0', fontSize: 12, lineHeight: 1.4,
          color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
        }}>
          Shared by a Capsula user. The name and description were written by them, not by Capsula.
        </p>

        <div style={{ marginTop: 'var(--space-3)' }}>
          {count === 0 ? (
            <GroupStateMessage title="No drugs in this group" />
          ) : (
            <div>
              {drugs.map((drug, i) => (
                <SharedDrugCard
                  key={drug.id}
                  drug={drug}
                  categories={categories}
                  isDark={isDark}
                  isLast={i === drugs.length - 1}
                  onTap={() => navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))}
                />
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-3) var(--page-gutter) var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        {backButton}
      </div>
      {content}
    </div>
  )
}
