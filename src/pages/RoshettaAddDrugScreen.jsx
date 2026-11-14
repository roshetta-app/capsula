/**
 * src/pages/RoshettaAddDrugScreen.jsx
 * 2026-11-14 (Roshetta plan, step 5.2a): the Add drug screen of a roshetta, at
 * /roshetta/:id/add. It is the same search as the Add drugs screen of a group (the search bar and
 * mode button, the search engine, recent searches and every search message, the Form / Route
 * filter), with Brand and Generic only, Brand to start. Class does not exist here.
 *
 * Differences from the groups screen: there is no "in the group" tick (a drug may be used more
 * than once in a roshetta), no Done button (one chosen drug adds one drug group, or one or / plus
 * partner, and the person goes back to the editor), and one plain line above the results says what
 * the chosen drug is for. Tapping the card itself opens the drug page, and coming back brings the
 * search back, as in groups.
 *
 * What is chosen for: no query part = a new drug group; "?partner=<group id>" = an or / plus
 * partner for that group (utils/roshettaAddDrugState.js).
 *
 * Step 5.2a draws the screen and its states. Step 5.2b: choosing a drug for a new drug group saves
 * the roshetta with that drug group at the end (the dose left empty), says so in a short message
 * and goes back to the editor; a full roshetta or a read only account opens the limit sheet instead
 * and nothing is added. Step 5.2c: with "?partner=<group id>" the chosen drug is added as an "or"
 * partner at the end of that group instead (the chip switches it to "plus"); if that group is gone
 * the person is told and goes back.
 *
 * States: loading, signed out ("Sign in to add drugs"), could not load ("Try again"), not found
 * (deleted on another device), read only (lapsed account), and the search.
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DrugFilterPanel from '../components/drugs/DrugFilterPanel'
import { applyFilters } from '../utils/applyDrugFilters'
import DrugsSearchSection, { MODE_OPTIONS } from '../components/drugs/home/DrugsSearchSection'
import SearchHistoryList from '../components/drugs/home/SearchHistoryList'
import {
  FadeIn, SearchSwitchingState, TooShortState, RecentEmptyState,
  EmptyState, ModeSwitchState, DidYouMeanState, FilterMaskedState,
} from '../components/drugs/search/SearchStates'
import AddDrugsResultList from '../components/drugs/groups/AddDrugsResultList'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { drugRowTitle } from '../components/drugs/groups/groupDrugText'
import { shimmer } from '../components/drugs/home/shimmer'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { useCategories } from '../hooks/useCategories'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useIsDark } from '../utils/specialtyIcon'
import { pageRoshetta } from '../utils/roshettaPageState'
import { addDrugHint, addDrugState, addDrugTarget, addGroupAnswer, addGroupRows, addPartnerRows } from '../utils/roshettaAddDrugState'
import { ROUTES } from '../router'

// Class does not exist in this search (one shared settings object, so the hook sees no change).
const SEARCH_OPTIONS = { allowClass: false }
const NO_KEYWORDS = []
// No drug is marked as "in the roshetta": the same drug may be used again.
const NONE_CHOSEN = new Set()

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

export default function RoshettaAddDrugScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { search } = useLocation()
  useDeepLinkParent(ROUTES.ROSHETTA(id))

  const { drugs, loading: drugsLoading } = useDrugContext()
  const { roshettasApi } = useFavouritesContext()
  const {
    roshettas = [], roshettasStatus = 'loading', isGuest = false, isReadOnly = false, reloadRoshettas,
    saveRoshetta, showRoshettaLimit, showRoshettaReadOnly,
  } = roshettasApi ?? {}
  const { loading: authLoading, signInWithGoogle } = useAuth()
  const isDark = useIsDark()
  const { categories } = useCategories()
  const { toast } = useToast()

  const roshetta = pageRoshetta(roshettas, id)
  const target = addDrugTarget(search)
  const screenState = addDrugState({
    authLoading, isGuest, status: roshettasStatus, found: !!roshetta, listCount: roshettas.length, isReadOnly,
  })

  // ── Search (its own, Brand and Generic only) ───────────────────────────────
  const [mode, setMode] = useState(() => (keptSearch?.id === id ? keptSearch.mode : 'brand'))
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const {
    query, setQuery, results, queryTooShort, suggestions, crossModeMatch, searchPending,
  } = useDrugSearch(drugs, mode, NO_KEYWORDS, SEARCH_OPTIONS)
  const { history, addSearch, clearHistory } = useSearchHistory()
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false)
  const hasQuery = query.trim().length > 0
  const searchInputRef = useRef(null)

  // The Form / Route filter (this screen's own).
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState(null)
  const hasFilters = !!activeFilters
  function handleApplyFilters(filters) {
    setActiveFilters(filters.forms.includes('all') ? null : filters)
  }

  // Back from an opened drug: the typed text comes back, once.
  useEffect(() => {
    if (keptSearch?.id === id) {
      setQuery(keptSearch.query)
    }
    keptSearch = null
  }, [id, setQuery])

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
  // (the keyboard's Search key, a tapped hint or past search, or a drug chosen or opened).
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

  const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function goBack() {
    navigate(-1)
  }
  // Step 5.2b adds a new drug group; step 5.2c adds an or / plus partner to the group in the address.
  const addingRef = useRef(false)
  async function handleChoose(drug) {
    if (hasQuery) addSearch(savedName(drug), mode)
    if (addingRef.current || !roshetta) return
    let rows
    if (target.kind === 'partner') {
      const made = addPartnerRows(roshetta.rows, target.rowId, drug)
      if (!made.ok && made.reason === 'no_group') {
        toast.error("This drug group isn't available")
        goBack()
        return
      }
      rows = made.ok ? made.rows : null
    } else {
      rows = addGroupRows(roshetta.rows, drug)
    }
    if (!rows) { toast.error("Couldn't add this drug. Try again."); return }
    addingRef.current = true
    try {
      const answer = addGroupAnswer(await saveRoshetta?.(id, { rows }))
      if (answer === 'done') {
        toast.success(`Added ${drug.name}`)
        goBack()
      } else if (answer === 'drugs_full') showRoshettaLimit?.('drugs')
      else if (answer === 'read_only') showRoshettaReadOnly?.()
      else if (answer === 'sign_in') toast.error('Sign in to add drugs')
      else if (answer === 'gone') toast.error("This roshetta isn't available")
      else if (answer === 'failed') toast.error("Couldn't add this drug. Try again.")
    } finally {
      addingRef.current = false
    }
  }
  function handleOpen(drug) {
    if (hasQuery) addSearch(savedName(drug), mode)
    keptSearch = { id, query, mode }
    navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))
  }

  // ── What is drawn ──────────────────────────────────────────────────────────
  let message = null
  if (screenState === 'loading') {
    message = <div style={{ paddingTop: 'var(--space-4)' }}><SkeletonRows /></div>
  } else if (screenState === 'guest') {
    message = (
      <GroupStateMessage
        title="Sign in to add drugs"
        body="Your roshettas are saved to your account."
        actionLabel="Sign in"
        onAction={() => signInWithGoogle?.()}
      />
    )
  } else if (screenState === 'error') {
    message = <GroupStateMessage title="Couldn't load your roshettas" actionLabel="Try again" onAction={reloadRoshettas} />
  } else if (screenState === 'missing') {
    message = (
      <GroupStateMessage
        title="This roshetta isn't available"
        body="It may have been deleted on another device."
        actionLabel="Back to Topics"
        onAction={() => navigate(ROUTES.CONDITIONS, { replace: true })}
      />
    )
  } else if (screenState === 'readonly') {
    message = (
      <GroupStateMessage
        title="Your roshettas are read only"
        body="Delete a roshetta or upgrade to edit."
        actionLabel="Back to roshetta"
        onAction={() => navigate(ROUTES.ROSHETTA(id), { replace: true })}
      />
    )
  }

  if (message) {
    return <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>{message}</div>
  }

  const otherMode = mode === 'brand' ? 'generic' : 'brand'
  const waitingForDrugs = drugsLoading && (drugs ?? []).length === 0
  const shownResults = applyFilters(results, activeFilters)

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
            onClear={() => setShowClearHistoryConfirm(true)}
          />
        )}
      </FadeIn>
    )
  } else if (queryTooShort) {
    body = <TooShortState />
  } else if (slowPending) {
    body = <SearchSwitchingState />
  } else if (results.length > 0 && shownResults.length === 0) {
    body = <FilterMaskedState count={results.length} query={query} onClearFilter={() => setActiveFilters(null)} />
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
          {hasFilters ? `${shownResults.length}/${results.length}` : shownResults.length} drug{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          {results.length > 100 && ' · type more to narrow'}
        </div>
        <AddDrugsResultList
          key="results"
          drugs={shownResults}
          inGroup={NONE_CHOSEN}
          onAdd={handleChoose}
          onOpen={handleOpen}
          categories={categories}
          isDark={isDark}
          highlight={query}
          searchMode={mode}
          nameOf={drugRowTitle}
          targetName="roshetta"
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
          onFilter={() => setFilterOpen(true)}
          hasActiveFilters={hasFilters}
          showClear={hasFilters}
          onClearFilters={() => setActiveFilters(null)}
          showRecent={false}
          recentDrugs={[]}
          categories={categories}
          isDark={isDark}
          allowClass={false}
        />
        <div
          dir="auto"
          style={{
            padding: '2px var(--space-1) 0', textAlign: 'start', overflowWrap: 'anywhere',
            fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
          }}
        >
          {addDrugHint(target, roshetta?.name)}
        </div>
      </div>

      <div style={{ paddingTop: 'var(--space-3)', paddingBottom: 'calc(var(--space-4) + 24px)' }}>
        {body}
      </div>

      <DrugFilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        activeFilters={activeFilters}
      />

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
