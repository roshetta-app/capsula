/**
 * src/pages/AddDrugsToGroupScreen.jsx
 * 2026-10-21 (Drug groups plan, step 12.5): the Add drugs screen, opened by Add on a group's
 * page at /drugs/group/:groupId/add. It is the Drugs screen's search focus mode, built from the
 * same parts (the search bar and mode button, the search engine, the recent searches and every
 * search message), with Brand and Generic only, Brand to start. Class does not exist here: no
 * Class in the mode pop-up or the info sheet, no Class strip or results, no Class entry in
 * "found in other modes", no Class searches in recent searches (the 'allowClass' setting).
 *
 * 2026-10-22 (UI refresh plan, step 8.4b): the group strip moved into the tinted header, above
 * the search bar: a folder tile in the group's colour, the group name with "12 of 20 drugs"
 * (and "Full" at the limit), and a Done button that returns to the group page. A drug that is
 * already in the group shows a tick with the word Added.
 * Before that, under the bar sat a slim strip with the group's name and "12 of 20". Each result is the
 * normal drug card with a round + to add the drug, or a tick when it is already in the group.
 * A tap adds at once and the search stays open, so several drugs can be added; tapping the
 * card itself opens the drug page, and coming back brings the search back. At the limit the
 * existing limit message shows and nothing is added. Back (the arrow in the bar, or the
 * phone's) returns to the group page with the new drugs in the list.
 *
 * The search here is its own: it does not touch the Drugs screen's typed text or mode.
 * Plan section 20.1 and step 12.5. Read only (lapsed) and signed-out accounts see a message
 * instead of the search.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Folder } from 'lucide-react'
import DrugsSearchSection, { MODE_OPTIONS } from '../components/drugs/home/DrugsSearchSection'
import SearchHistoryList from '../components/drugs/home/SearchHistoryList'
import {
  FadeIn, SearchSwitchingState, TooShortState, RecentEmptyState,
  EmptyState, ModeSwitchState, DidYouMeanState,
} from '../components/drugs/search/SearchStates'
import AddDrugsResultList from '../components/drugs/groups/AddDrugsResultList'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { useGroupDrugEdits } from '../components/drugs/groups/useGroupDrugEdits'
import { drugRowTitle } from '../components/drugs/groups/groupDrugText'
import { shimmer } from '../components/drugs/home/shimmer'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { useIsPro } from '../hooks/useIsPro'
import { useCategories } from '../hooks/useCategories'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken } from '../utils/specialtyTokens'
import { DRUG_GROUP_DRUGS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_PRO } from '../constants/features'
import { ROUTES } from '../router'

// Class does not exist in this search (one shared settings object, so the hook sees no change).
const SEARCH_OPTIONS = { allowClass: false }
const NO_KEYWORDS = []

// The search kept while a drug is opened from here, so Back from the drug page finds it again.
let keptSearch = null

function SkeletonRows() {
  return (
    <div>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '14px var(--space-1)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={shimmer({ width: '55%', height: 14 })} />
            <div style={shimmer({ width: '35%', height: 11 })} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AddDrugsToGroupScreen() {
  const navigate = useNavigate()
  const { groupId } = useParams()
  useDeepLinkParent(ROUTES.DRUGS_GROUP(groupId))

  const { drugs, loading: drugsLoading } = useDrugContext()
  const {
    groups, groupsStatus, isReadOnly, reloadGroups, promptSignIn, showGroupLimit, showGroupReadOnly,
  } = useFavouritesContext()
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const isDark = useIsDark()
  const { categories } = useCategories()
  const { toast } = useToast()

  const group = groups.find(g => g.id === groupId) ?? null
  const edits = useGroupDrugEdits(group)
  const drugsCap = isPro ? DRUG_GROUP_DRUGS_CAP_PRO : DRUG_GROUP_DRUGS_CAP_FREE
  const inGroup = new Set(edits.ids)
  const count = edits.ids.length
  const full = count >= drugsCap

  // ── Search (its own, Brand and Generic only) ───────────────────────────────
  const [mode, setMode] = useState(() => (keptSearch?.groupId === groupId ? keptSearch.mode : 'brand'))
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const {
    query, setQuery, results, queryTooShort, suggestions, crossModeMatch, searchPending,
  } = useDrugSearch(drugs, mode, NO_KEYWORDS, SEARCH_OPTIONS)
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory()
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false)
  const hasQuery = query.trim().length > 0
  const searchInputRef = useRef(null)

  // Back from an opened drug: the typed text comes back, once.
  useEffect(() => {
    if (keptSearch?.groupId === groupId) {
      setQuery(keptSearch.query)
    }
    keptSearch = null
  }, [groupId, setQuery])

  // Same short toast as the Drugs screen when the mode changes.
  const modeToastRef = useRef(null)
  function handleModeChange(value) {
    if (value === 'class') return
    setMode(value)
    const picked = MODE_OPTIONS.find(o => o.value === value)
    if (!picked) return
    if (modeToastRef.current != null) toast.dismiss(modeToastRef.current)
    modeToastRef.current = toast.custom(<>Searching in <strong style={{ fontWeight: 700 }}>{picked.label}</strong> mode</>, {
      color: picked.color,
      icon: picked.icon,
      duration: 2000,
    })
  }

  // A search is kept in recent searches only when it found something and was committed
  // (the keyboard's Search key, a tapped hint or past search, or a drug added or opened).
  const commitRef = useRef(false)
  const [commitTick, setCommitTick] = useState(0)
  function commitSearch() {
    commitRef.current = true
    setCommitTick(t => t + 1)
  }
  const foundSomething = results.length > 0 && !queryTooShort
  useEffect(() => {
    if (!commitRef.current || !hasQuery || searchPending) return
    commitRef.current = false
    if (foundSomething) addSearch(query.trim(), mode)
  }, [commitTick, query, mode, hasQuery, searchPending, foundSomething, addSearch])

  function handlePickHint(name) {
    setQuery(name)
    commitSearch()
  }
  function handlePickHistory(entry) {
    if (entry.mode !== mode && entry.mode !== 'class') handleModeChange(entry.mode)
    setQuery(entry.text)
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
    commitSearch()
  }
  function savedName(drug) {
    return (mode === 'generic' ? drug.genericName : drug.tradenameClean) || query.trim()
  }

  // Typing: only a search that takes longer than 300 ms swaps the cards for placeholder rows.
  const [slowPending, setSlowPending] = useState(false)
  useEffect(() => {
    if (!searchPending) return undefined
    const timer = setTimeout(() => setSlowPending(true), 300)
    return () => { clearTimeout(timer); setSlowPending(false) }
  }, [searchPending])

  // The thin line under the bar shows only once the list has scrolled.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', check, { passive: true })
    const frame = requestAnimationFrame(check)
    return () => { window.removeEventListener('scroll', check); cancelAnimationFrame(frame) }
  }, [])

  // The keyboard folds away when the person drags the results.
  useEffect(() => {
    let startY = null
    const onStart = (e) => { startY = e.touches && e.touches[0] ? e.touches[0].clientY : null }
    const onMove = (e) => {
      if (startY === null || !e.touches || !e.touches[0]) return
      if (Math.abs(e.touches[0].clientY - startY) > 12) {
        startY = null
        const el = document.activeElement
        if (el && el === searchInputRef.current) el.blur()
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
    }
  }, [])

  // The cursor goes into the bar once the search is on screen.
  const ready = Boolean(user && group && !isReadOnly)
  useEffect(() => {
    if (!ready) return undefined
    const frame = requestAnimationFrame(() => {
      const input = searchInputRef.current
      if (input && document.activeElement !== input && !keptSearch) input.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [ready])

  const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function goBack() {
    navigate(-1)
  }
  function handleAdd(drug) {
    if (!group) return
    if (isReadOnly) { showGroupReadOnly(); return }
    if (inGroup.has(drug.id)) return
    if (count >= drugsCap) { showGroupLimit('drugs'); return }
    if (hasQuery) addSearch(savedName(drug), mode)
    edits.add(drug.id)
  }
  function handleOpen(drug) {
    if (hasQuery) addSearch(savedName(drug), mode)
    keptSearch = { groupId, query, mode }
    navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))
  }

  // ── What is drawn ──────────────────────────────────────────────────────────
  const backToGroup = () => navigate(ROUTES.DRUGS_GROUP(groupId), { replace: true })
  let message = null
  if (authLoading || (user && groupsStatus === 'loading')) {
    message = <div style={{ paddingTop: 'var(--space-4)' }}><SkeletonRows /></div>
  } else if (!user) {
    message = (
      <GroupStateMessage
        title="Sign in to add drugs"
        body="Your groups are saved to your account."
        actionLabel="Sign in"
        onAction={() => promptSignIn('groups', 'new')}
      />
    )
  } else if (groupsStatus === 'error' && groups.length === 0) {
    message = <GroupStateMessage title="Couldn't load your groups" actionLabel="Try again" onAction={reloadGroups} />
  } else if (!group) {
    message = (
      <GroupStateMessage
        title="This group isn't available"
        body="It may have been deleted on another device."
        actionLabel="Back to Drugs"
        onAction={() => navigate(ROUTES.DRUGS, { replace: true })}
      />
    )
  } else if (isReadOnly) {
    message = (
      <GroupStateMessage
        title="Your groups are read only"
        body="Delete a group or upgrade to change it."
        actionLabel="Back to group"
        onAction={backToGroup}
      />
    )
  }

  if (message) {
    return <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>{message}</div>
  }

  const tone = resolveToken(group.color, isDark)
  const otherMode = mode === 'brand' ? 'generic' : 'brand'
  const waitingForDrugs = drugsLoading && (drugs ?? []).length === 0

  let body
  if (waitingForDrugs) {
    body = <SkeletonRows />
  } else if (!hasQuery) {
    body = (
      <FadeIn key="recent-searches" disabled={reduceMotion}>
        {history.filter(h => h.mode !== 'class').length === 0 ? (
          <RecentEmptyState />
        ) : (
          <SearchHistoryList
            history={history}
            allowClass={false}
            onPick={handlePickHistory}
            onRemove={removeSearch}
            onClear={() => setShowClearHistoryConfirm(true)}
          />
        )}
      </FadeIn>
    )
  } else if (queryTooShort) {
    body = <TooShortState />
  } else if (slowPending) {
    body = <SearchSwitchingState />
  } else if (results.length === 0) {
    body = crossModeMatch ? (
      <ModeSwitchState
        query={query}
        mode={mode}
        hint={null}
        targets={[otherMode]}
        onSwitch={handleModeChange}
        allowClass={false}
      />
    ) : suggestions.length > 0 ? (
      <DidYouMeanState query={query} suggestions={suggestions} onSelect={handlePickHint} />
    ) : (
      <EmptyState query={query} mode={mode} onClear={() => setQuery('')} allowClass={false} />
    )
  } else {
    body = (
      <div style={{ opacity: searchPending ? 0.7 : 1, transition: 'opacity var(--motion-fast) var(--ease-reveal)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
          {results.length} drug{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          {results.length > 100 && ' · type more to narrow'}
        </div>
        <AddDrugsResultList
          key="results"
          drugs={results}
          inGroup={inGroup}
          onAdd={handleAdd}
          onOpen={handleOpen}
          categories={categories}
          isDark={isDark}
          highlight={query}
          searchMode={mode}
          nameOf={drugRowTitle}
        />
      </div>
    )
  }

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'var(--color-bg)',
        paddingTop: 0, paddingBottom: 8,
        borderBottom: `1px solid ${scrolled ? 'var(--color-border)' : 'transparent'}`,
        transition: 'border-color var(--motion-base) var(--ease-reveal)',
      }}>
        <DrugsSearchSection
          searchOpen
          onSearchFocus={() => {}}
          onSearchCancel={goBack}
          onSearchSubmit={commitSearch}
          searchInputRef={searchInputRef}
          mode={mode}
          onModeChange={handleModeChange}
          modeMenuOpen={modeMenuOpen}
          onModeMenuChange={setModeMenuOpen}
          query={query}
          onQueryChange={setQuery}
          placeholder={mode === 'generic' ? 'Search generic names…' : 'Search brand names…'}
          showClear={false}
          showRecent={false}
          recentDrugs={[]}
          categories={categories}
          isDark={isDark}
          allowClass={false}
          top={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', fontFamily: 'var(--font-body)' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                backgroundColor: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Folder size={18} color={tone.fg} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span dir="ltr" style={{
                  fontSize: 16, fontWeight: 700, lineHeight: 1.2, textAlign: 'start',
                  color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {group.name}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>
                  {count} of {drugsCap} drugs{full ? ' · Full' : ''}
                </span>
              </div>
              <button
                onClick={goBack}
                style={{
                  flexShrink: 0, minHeight: 44, padding: '0 4px 0 12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 16, fontWeight: 600, color: 'var(--color-accent)',
                  fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
                }}
              >
                Done
              </button>
            </div>
          )}
        />
      </div>

      <div style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-4)' }}>
        {body}
      </div>

      <ConfirmSheet
        isOpen={showClearHistoryConfirm}
        onClose={() => setShowClearHistoryConfirm(false)}
        onConfirm={clearHistory}
        title="Clear recent searches?"
        message="This removes all your recent searches from this phone."
        confirmLabel="Clear all"
        destructive
      />
    </>
  )
}
