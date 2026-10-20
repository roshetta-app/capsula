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
 * No welcome screen and no drug library download just to look at the group
 * (OnboardingGate lets /g/ pages through). A guest gets an Open Capsula link at
 * the bottom; that, or opening a drug, is where the welcome screen appears.
 * The first screen of a session has no Back button (nothing behind it).
 *
 * No edit controls, no heart, and the owner is never shown (the database
 * function does not return it).
 *
 * 2026-10-19 (step 8.3): Save to my groups, at the bottom, only when the groups
 * switch is on and the group has drugs. It makes the viewer's own copy (a new
 * group, not linked to this one, nothing about the owner). A guest is asked to
 * sign in first: the page remembers the link (the sign-in prompt keeps
 * 'save:<code>') and finishes the save by itself once signed in; closing the
 * sign-in sheet cancels it. After saving the button becomes "Saved to your
 * groups" with View. Free accounts keep the first 20 drugs as listed here
 * (A to Z), with a note; the limit sheet, read only and offline messages come
 * from the same places as the rest of groups.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Folder } from 'lucide-react'
import SharedDrugCard from '../components/SharedDrugCard'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { drugRowTitle } from '../components/drugs/groups/groupDrugText'
import { shimmer } from '../components/drugs/home/shimmer'
import { useCategories } from '../hooks/useCategories'
import { markScreenMounted } from '../hooks/useDeepLinkParent'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { isDrugGroupsOn } from '../constants/features'
import { SAVE_READ_ONLY_MESSAGE, savedGroupMessage } from '../components/drugs/groups/groupMessages'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken } from '../utils/specialtyTokens'
import { fetchSharedGroup } from '../utils/sharedGroup'
import { logUsageEvent } from '../analytics/usageEvents'
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
  // This page does not put the Drugs home behind itself (a person opening a
  // link just wants the group), but it counts as a screen that was shown first,
  // so a drug opened from here keeps this page behind it for Back.
  useEffect(() => { markScreenMounted() }, [])

  const location = useLocation()
  // The first screen of the session has nothing behind it, so no Back button.
  const canGoBack = location.key !== 'default'
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { promptSignIn, pendingFavourite, groupsStatus, saveSharedGroup, showGroupLimit } = useFavouritesContext()
  const groupsOn = isDrugGroupsOn()

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

  // Analytics (step 9.5): one 'shared_group_open' per link opened, when the group
  // really shows. No code, name or description is sent, and Retry or coming back
  // online does not count it twice.
  const openLoggedFor = useRef(null)
  useEffect(() => {
    if (result.status !== 'ok' || openLoggedFor.current === code) return
    openLoggedFor.current = code
    logUsageEvent('shared_group_open')
  }, [result.status, code])

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

  // ── Save to my groups (step 8.3) ──────────────────────────────────────────
  // { phase: 'idle' | 'saving' | 'saved', groupId?, saved?, total? }
  const [saveState, setSaveState] = useState({ phase: 'idle' })
  const savingRef = useRef(false)
  const signInId = `save:${code}`
  // A guest tapped Save and is signing in. Also true after a sign-in that
  // reloaded the page, because the prompt keeps the request.
  const armedRef = useRef(pendingFavourite?.type === 'groups' && pendingFavourite.id === signInId)

  const runSave = useCallback(async () => {
    if (savingRef.current || result.status !== 'ok') return
    savingRef.current = true
    setSaveState({ phase: 'saving' })
    const g = result.group
    const r = await saveSharedGroup({
      name: g.name,
      description: g.description,
      color: g.color,
      brandIds: drugs.map(d => d.id),
      signInId,
    })
    savingRef.current = false
    if (r.ok) {
      setSaveState({ phase: 'saved', groupId: r.group.id, saved: r.saved, total: r.total })
      return
    }
    setSaveState({ phase: 'idle' })
    // guest, offline and error already told the person; these two are ours.
    if (r.reason === 'limit') showGroupLimit('groups')
    else if (r.reason === 'read_only') toast.info(SAVE_READ_ONLY_MESSAGE)
  }, [result, drugs, saveSharedGroup, signInId, showGroupLimit, toast])

  function handleSaveTap() {
    if (authLoading || saveState.phase !== 'idle') return
    if (!user) {
      armedRef.current = true
      promptSignIn('groups', signInId)
      return
    }
    runSave()
  }

  // Finish a save that waited for sign-in, or cancel it when the sign-in sheet
  // was closed without signing in.
  useEffect(() => {
    if (!armedRef.current || authLoading) return
    if (!user) {
      if (!pendingFavourite) armedRef.current = false
      return
    }
    if (groupsStatus === 'loading' || result.status !== 'ok') return
    // Started on the next tick, so the save's own state change is not made
    // inside this effect. The request is only cleared when it really starts.
    const t = setTimeout(() => {
      armedRef.current = false
      runSave()
    }, 0)
    return () => clearTimeout(t)
  }, [authLoading, user, pendingFavourite, groupsStatus, result.status, runSave])

  const showSave = groupsOn && result.status === 'ok' && drugs.length > 0
  const saveBusy = saveState.phase === 'saving' || authLoading || (!!user && groupsStatus === 'loading')

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
    <div style={{
      // 2026-10-20 (Drug groups plan, step 14.0 / F20): this route is opened outside
      // Layout, so the side gap is defined here instead of read from Layout.
      // Without it the padding below was invalid and the browser dropped all of it.
      '--page-gutter': 'var(--space-4)',
      maxWidth: 680, margin: '0 auto',
      padding: 'calc(var(--space-3) + env(safe-area-inset-top, 0px)) var(--page-gutter) calc(var(--space-4) + env(safe-area-inset-bottom, 0px))',
    }}>
      {canGoBack && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          {backButton}
        </div>
      )}
      {content}
      {showSave && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          {saveState.phase === 'saved' ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
              padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', fontFamily: 'var(--font-body)',
            }}>
              <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>
                {savedGroupMessage(saveState.saved, saveState.total)}
              </span>
              <button
                onClick={() => navigate(ROUTES.DRUGS_GROUP(saveState.groupId))}
                style={{
                  flexShrink: 0, border: 'none', cursor: 'pointer', padding: '8px 16px',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                View
              </button>
            </div>
          ) : (
            <button
              onClick={handleSaveTap}
              disabled={saveBusy}
              style={{
                display: 'block', width: '100%', border: 'none', padding: '12px 16px',
                borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff',
                fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
                cursor: saveBusy ? 'default' : 'pointer', opacity: saveBusy ? 0.6 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {saveState.phase === 'saving' ? 'Saving…' : 'Save to my groups'}
            </button>
          )}
        </div>
      )}
      {!authLoading && !user && result.status !== 'loading' && (
        <button
          onClick={() => navigate(ROUTES.DRUGS)}
          style={{
            display: 'block', margin: `${showSave ? 'var(--space-3)' : 'var(--space-5)'} auto 0`,
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
            fontSize: 14, fontWeight: 600, color: 'var(--color-accent)',
            fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
          }}
        >
          Open Capsula
        </button>
      )}
    </div>
  )
}
