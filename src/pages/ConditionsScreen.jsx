/**
 * src/pages/ConditionsScreen.jsx
 * Phase 5 — Conditions Screen Redesign
 *
 * Changes from previous:
 *   - AutocompleteDropdown removed; live list is the sole search UI
 *   - showSuggestions / clearSuggestions wiring removed
 *   - showList constant removed — list always visible
 *   - Dark mode toggle added to BrandRow (top-right, sun/moon icon button)
 *   - Static "What are you looking for?" headline replaced with a subtle
 *     rotating tagline (see RotatingTagline below)
 *
 * List rendering modes:
 *   isSearching (query >= 1)  → flat list with highlight, no dividers
 *   sortMode === 'recent'     → flat list in recency order, no dividers
 *   sortMode === 'az'         → grouped by letter with AlphabetSectionDividers
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import Layout                  from '../components/layout'
import SearchBar               from '../components/ui/SearchBar'
import ConditionCard           from '../components/ConditionCard'
import SpecialtyFilterPills    from '../components/conditions/SpecialtyFilterPills'
import RecentlyViewedChips     from '../components/conditions/RecentlyViewedChips'
import ConditionListHeader     from '../components/conditions/ConditionListHeader'
import AlphabetSectionDivider  from '../components/conditions/AlphabetSectionDivider'
import ConditionsEmptyState    from '../components/conditions/ConditionsEmptyState'
import SpecialtiesBottomSheet  from '../components/conditions/SpecialtiesBottomSheet'
import { useConditionContext }  from '../context/ConditionContext'
import { useConditionSearch }  from '../hooks/useConditionSearch'
import { useRecentlyViewed }   from '../hooks/useRecentlyViewed'
import { useSortToggle }       from '../hooks/useSortToggle'
import { useDarkMode }         from '../hooks/useDarkMode'
import { alphabetGroup }       from '../utils/alphabetGroup'
import { ROUTES }              from '../router'

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius:    'var(--radius-sm)',
    animation:       'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

function SkeletonCard() {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          'var(--space-3)',
      padding:      '8px 0',
      borderBottom: '0.5px solid var(--color-border-subtle)',
    }}>
      <div style={shimmer({ width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0 })} />
      <div style={{ flex: 1 }}>
        <div style={shimmer({ width: 60, height: 10, marginBottom: 6 })} />
        <div style={shimmer({ width: '60%', height: 15 })} />
      </div>
    </div>
  )
}

// ─── Dark mode toggle button ──────────────────────────────────────────────────

function DarkModeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width:                   36,
        height:                  36,
        borderRadius:            'var(--radius-full)',
        border:                  '1.5px solid var(--color-border)',
        backgroundColor:         'var(--color-surface)',
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        cursor:                  'pointer',
        flexShrink:              0,
        color:                   'var(--color-text-secondary)',
        transition:              'background-color 0.15s ease, border-color 0.15s ease',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2"  x2="12" y2="4"/>
          <line x1="12" y1="20" x2="12" y2="22"/>
          <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="2"  y1="12" x2="4"  y2="12"/>
          <line x1="20" y1="12" x2="22" y2="12"/>
          <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

// ─── Rotating tagline ──────────────────────────────────────────────────────────
// Sits in the exact spot the static "What are you looking for?" headline
// used to occupy, beneath the logo. Cycles through TAGLINES with a gentle
// crossfade, pauses on any home-screen interaction, and resumes after a
// short idle period. Uses refs (not state) for pause/idle bookkeeping so
// frequent events like scroll/keydown don't trigger extra re-renders.

const TAGLINES = [
  'Treat With Confidence',
  'Medicine At Your Fingertips',
  'The Clinic In Your Pocket',
]

const TAGLINE_VISIBLE_MS     = 6500 // time each tagline stays on screen (5–8s range)
const TAGLINE_FADE_MS        = 400  // crossfade duration (300–500ms range)
const TAGLINE_IDLE_RESUME_MS = 4000 // idle time before rotation resumes (3–5s range)

function RotatingTagline() {
  const [textA, setTextA]         = useState(TAGLINES[0])
  const [textB, setTextB]         = useState(TAGLINES[1])
  const [activeIsA, setActiveIsA] = useState(true)

  const indexRef     = useRef(0)
  const pausedRef     = useRef(false)
  const idleTimerRef = useRef(null)

  useEffect(() => {
    function advance() {
      if (pausedRef.current) return
      const nextIndex = (indexRef.current + 1) % TAGLINES.length
      indexRef.current = nextIndex
      setActiveIsA(prevActiveIsA => {
        if (prevActiveIsA) {
          setTextB(TAGLINES[nextIndex])
        } else {
          setTextA(TAGLINES[nextIndex])
        }
        return !prevActiveIsA
      })
    }

    const intervalId = setInterval(advance, TAGLINE_VISIBLE_MS)

    // Any interaction on the home screen (typing, scrolling, tapping
    // filters, etc.) pauses rotation; resumes once idle again.
    function handleInteraction() {
      pausedRef.current = true
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        pausedRef.current = false
      }, TAGLINE_IDLE_RESUME_MS)
    }

    window.addEventListener('scroll', handleInteraction, { passive: true })
    window.addEventListener('pointerdown', handleInteraction, { passive: true })
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('input', handleInteraction)

    return () => {
      clearInterval(intervalId)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      window.removeEventListener('scroll', handleInteraction)
      window.removeEventListener('pointerdown', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('input', handleInteraction)
    }
  }, [])

  // Identical typography to the headline this replaces — only the text
  // content changes between the two stacked layers.
  const taglineStyle = {
    position:      'absolute',
    top:            0,
    left:           0,
    margin:         0,
    fontSize:       16,
    fontWeight:     450,
    letterSpacing:  '-0.1px',
    lineHeight:     1.4,
    color:          'var(--color-text-primary)',
    whiteSpace:     'nowrap',
    transition:     `opacity ${TAGLINE_FADE_MS}ms ease`,
  }

  return (
    <div style={{ position: 'relative', height: 23, overflow: 'hidden' }}>
      <p style={{ ...taglineStyle, opacity: activeIsA ? 1 : 0 }}>{textA}</p>
      <p style={{ ...taglineStyle, opacity: activeIsA ? 0 : 1 }}>{textB}</p>
    </div>
  )
}

// ─── Brand row + headline ─────────────────────────────────────────────────────

function BrandRow({ isSearching, isDark, onToggleDark }) {
  return (
    <div style={{
      paddingTop:    'var(--space-6)',  /* was var(--space-4) — added ~8–12px top breathing room */
      paddingBottom: 'var(--space-3)',
    }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-2)',
        marginBottom: isSearching ? 0 : 10,
        transition:   'margin-bottom 0.15s ease',
      }}>
        {/* Logo wordmark */}
        <img
          src="/capsula/logo.svg"
          alt="Capsula"
          className="capsula-logo"
          style={{ display: 'block', height: 32, width: 'auto' }}
        />
        <span style={{ flex: 1 }} />

        {/* Dark mode toggle — top right */}
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {!isSearching && <RotatingTagline />}
    </div>
  )
}

// ─── Back-to-top floating button ───────────────────────────────────────────────

const BACK_TO_TOP_THRESHOLD = 400 // px scrolled before the button appears

function BackToTopButton({ visible, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position:                'fixed',
        right:                   'var(--space-4)',
        bottom:                  'calc(76px + env(safe-area-inset-bottom))',
        width:                   44,
        height:                  44,
        borderRadius:            'var(--radius-full)',
        border:                  '1px solid var(--color-border)',
        backgroundColor:         'var(--color-surface)',
        color:                   'var(--color-text-secondary)',
        boxShadow:               'var(--shadow-elevated)',
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        cursor:                  'pointer',
        zIndex:                  60,
        opacity:                 visible ? 1 : 0,
        transform:               visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents:           visible ? 'auto' : 'none',
        transition:              'opacity 0.2s ease, transform 0.2s ease',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ArrowUp size={18} strokeWidth={2} />
    </button>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const { conditions, specialties, loading } = useConditionContext()
  const { recentlyViewed, recentOrder }      = useRecentlyViewed()
  const { sortMode, cycleSortMode, SORT_LABELS } = useSortToggle()
  const { isDark, toggleDark }               = useDarkMode()

  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [showBackToTop, setShowBackToTop]     = useState(false)

  // ── Back-to-top visibility ───────────────────────────────────────────────────

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > BACK_TO_TOP_THRESHOLD)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleBackToTop() {
    const start    = window.scrollY
    if (start === 0) return

    const duration = 350 // ms — constant regardless of scroll distance
    const startTime = performance.now()

    // easeOutCubic — fast start, gentle landing
    const ease = t => 1 - Math.pow(1 - t, 3)

    function step(now) {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      window.scrollTo(0, start * (1 - ease(progress)))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }

  const {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    resultCount,
  } = useConditionSearch(conditions, sortMode, recentOrder)

  const isSearching   = query.length >= 1
  const specialtyName = specialties.find(s => s.id === activeSpecialty)?.name ?? ''
  const totalCount    = conditions.length

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleCardTap(condition) {
    navigate(ROUTES.CONDITION_DETAIL(condition.slug))
  }

  function handleClearSearch() {
    setQuery('')
  }

  function handleClearFilter() {
    setActiveSpecialty('all')
  }

  // ── List rendering ───────────────────────────────────────────────────────────

  function renderList() {
    if (resultCount === 0) {
      return (
        <ConditionsEmptyState
          query={query}
          activeSpecialty={activeSpecialty}
          specialtyName={specialtyName}
          onClearSearch={handleClearSearch}
          onClearFilter={handleClearFilter}
        />
      )
    }

    if (isSearching || sortMode === 'recent') {
      return results.map(condition => (
        <ConditionCard
          key={condition.id}
          condition={condition}
          onTap={handleCardTap}
          highlight={isSearching ? query : ''}
        />
      ))
    }

    return alphabetGroup(results).map(({ letter, items }, index) => (
      <div key={letter}>
        {/* Skip the first divider — it's rendered inline with the sort toggle in ConditionListHeader */}
        {index > 0 && <AlphabetSectionDivider letter={letter} />}
        {items.map(condition => (
          <ConditionCard
            key={condition.id}
            condition={condition}
            onTap={handleCardTap}
            highlight=""
          />
        ))}
      </div>
    ))
  }

  // ── Cold start skeleton ──────────────────────────────────────────────────────

  if (loading && conditions.length === 0) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <div style={shimmer({ width: 154, height: 27, borderRadius: 'var(--radius-sm)' })} />
          </div>
          <div style={shimmer({ width: '55%', height: 16, borderRadius: 'var(--radius-sm)' })} />
        </div>
        <div style={shimmer({ width: '100%', height: 46, marginBottom: 'var(--space-2)', borderRadius: 'var(--radius-full)' })} />
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', overflow: 'hidden' }}>
          {[60, 80, 60, 70, 90].map((w, i) => (
            <div key={i} style={shimmer({ width: w, height: 32, borderRadius: 'var(--radius-full)', flexShrink: 0 })} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
      </Layout>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <Layout>

      {/* 1. Brand row + tagline + dark mode toggle */}
      <BrandRow
        isSearching={isSearching}
        isDark={isDark}
        onToggleDark={toggleDark}
      />

      {/* 2. Search bar */}
      <div style={{ marginBottom: 'var(--space-5)' }}>  {/* was var(--space-2) — added ~12–16px gap before filter chips */}
        <SearchBar
          value={query}
          onChange={val => setQuery(val)}
        />
      </div>

      {/* 3. Recently viewed — temporarily hidden (set hidden={isSearching} to re-enable) */}
      <RecentlyViewedChips
        recentlyViewed={recentlyViewed}
        hidden={true}
      />

      {/* 4. Specialty filter pills */}
      <SpecialtyFilterPills
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={setActiveSpecialty}
        onMoreTap={() => setBottomSheetOpen(true)}
      />

      {/* 5. Count + sort row — in A–Z mode, the first letter is shown inline on the left */}
      <ConditionListHeader
        totalCount={totalCount}
        resultCount={resultCount}
        activeSpecialty={activeSpecialty}
        specialtyName={specialtyName}
        isSearching={isSearching}
        sortMode={sortMode}
        onSortToggle={cycleSortMode}
        SORT_LABELS={SORT_LABELS}
        firstLetter={
          !isSearching && sortMode === 'az' && resultCount > 0
            ? alphabetGroup(results)[0]?.letter
            : undefined
        }
      />

      {/* 6. Condition list */}
      {renderList()}

      {/* Back to top */}
      <BackToTopButton visible={showBackToTop} onClick={handleBackToTop} />

      {/* Specialties bottom sheet */}
      <SpecialtiesBottomSheet
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={id => {
          setActiveSpecialty(id)
          setBottomSheetOpen(false)
        }}
        onClose={() => setBottomSheetOpen(false)}
        isOpen={bottomSheetOpen}
      />

    </Layout>
  )
}
