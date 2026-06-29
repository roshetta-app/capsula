/**
 * src/pages/ConditionsScreen.jsx
 * Phase 5 — Conditions Screen Redesign
 * Phase 6 — Sticky header polish: visual hierarchy, spacing, toolbar balance,
 *            search icon in logo row (scroll-to-search)
 * Phase 8 — SpecialtySelector toolbar redesign: filled muted surface, no border,
 *            radius-md, bare icon (no bubble), chevron rotation, animated clear button,
 *            increased search-bar → filter gap for clearer visual hierarchy.
 * Phase 9 — Pass activeSpecialty to ConditionCard so specialty label is
 *            suppressed when a specific specialty is active (redundant with chip).
 * Phase 14 — StickyLogoHeader specialty pill redesign: merged single pill mirrors
 *             SpecialtySelector pattern — ListFilter icon (idle) or specialty icon
 *             (active) + name + chevron + inline ✕ to clear without opening sheet.
 *
 * Changes from previous:
 *   - AutocompleteDropdown removed; live list is the sole search UI
 *   - showSuggestions / clearSuggestions wiring removed
 *   - showList constant removed — list always visible
 *   - Dark mode toggle added to BrandRow (top-right, sun/moon icon button)
 *   - Static "What are you looking for?" headline replaced with a subtle
 *     rotating tagline (see RotatingTagline below)
 *   - Compact/sliding sticky header removed — header is fixed at the top of
 *     the screen and no longer reacts to scroll position. SearchBar and
 *     SpecialtyFilterPills are rendered once, in their normal place in the
 *     page flow.
 *   - StickyLogoHeader added: slides in once the in-page BrandRow logo
 *     scrolls out of view, slides back out when it re-enters view.
 *
 * List rendering modes:
 *   isSearching (query >= 1)  → flat list with highlight, no dividers
 *   sortMode === 'recent'     → flat list in recency order, no dividers
 *   sortMode === 'az'         → grouped by letter with AlphabetSectionDividers
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, Search, ListFilter } from 'lucide-react'
import Layout                  from '../components/layout'
import SearchBar               from '../components/ui/SearchBar'
import ConditionCard           from '../components/ConditionCard'
import RecentlyViewedChips     from '../components/conditions/RecentlyViewedChips'
import ConditionListHeader     from '../components/conditions/ConditionListHeader'
import AlphabetSectionDivider  from '../components/conditions/AlphabetSectionDivider'
import ConditionsEmptyState    from '../components/conditions/ConditionsEmptyState'
import SpecialtiesBottomSheet  from '../components/conditions/SpecialtiesBottomSheet'
import SpecialtySelector       from '../components/conditions/SpecialtySelector'
import { useConditionContext }  from '../context/ConditionContext'
import { useConditionSearch }  from '../hooks/useConditionSearch'
import { useRecentlyViewed }   from '../hooks/useRecentlyViewed'
import { useSortToggle }       from '../hooks/useSortToggle'
import { useDarkMode }         from '../hooks/useDarkMode'
import { alphabetGroup }                           from '../utils/alphabetGroup'
import { SpecialtyIcon, useIsDark }                from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN, tintedBg }  from '../utils/specialtyTokens'
import { ROUTES }                                  from '../router'

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

function RotatingTagline({
  fontSize   = 16,
  fontWeight = 500,
  color      = 'var(--color-text-primary)',
}) {
  const [textA, setTextA]         = useState(TAGLINES[0])
  const [textB, setTextB]         = useState(TAGLINES[1])
  const [activeIsA, setActiveIsA] = useState(true)

  const indexRef     = useRef(0)
  const pausedRef    = useRef(false)
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
  // content changes between the two stacked layers. fontSize/fontWeight/
  // color are overridable per call site (e.g. StickyLogoHeader uses a
  // smaller, lighter, lower-contrast variant); defaults match BrandRow's
  // original values exactly, so BrandRow's rendering is unaffected.
  const taglineStyle = {
    position:      'absolute',
    top:            0,
    left:           0,
    margin:         0,
    fontSize,
    fontWeight,
    letterSpacing:  '-0.1px',
    lineHeight:     1.4,
    color,
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

function BrandRow({ isSearching, isDark, onToggleDark, brandRowRef }) {
  return (
    <div ref={brandRowRef} style={{
      paddingTop:    'var(--space-6)',  /* was var(--space-4) — added ~8–12px top breathing room */
      paddingBottom: 'calc(var(--space-3) - 4px)',  /* tightened 4px to pull tagline closer to search bar */
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

// ─── Sliding sticky logo header ───────────────────────────────────────────────
// Appears once the in-page BrandRow logo scrolls out of view (above the
// viewport). Slides in from the top with a CSS transition; slides back out
// when the user scrolls back up and the logo re-enters the viewport.
//
// Layout (top to bottom):
//   1. Logo row    — wordmark left, search icon right.
//   2. Toolbar     — merged specialty pill (left), sort toggle (right).
//
// Specialty pill (merged, mirrors SpecialtySelector pattern):
//   Idle:   ListFilter icon + "All Specialties" + chevron
//   Active: specialty icon + name + chevron + inline ✕ (clears without opening sheet)
//   Tapping anywhere on the pill (except ✕) opens the specialty sheet.

function StickyLogoHeader({
  visible,
  isSearching,
  activeSpecialtyObj,
  onClearSpecialty,
  onOpenSpecialties,
  onSearchTap,
}) {
  const isDark    = useIsDark()
  const hasFilter = !!activeSpecialtyObj
  const tokenKey  = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const colors    = resolveToken(tokenKey, isDark)

  // Pill background: tinted wash when active, plain muted surface when idle.
  const idlePillBg   = 'rgba(0, 0, 0, 0.045)'
  const activePillBg = tintedBg(colors.bg, isDark)

  // Icon + name color: accent fg when active, muted primary when idle.
  const iconColor = hasFilter ? colors.fg : 'var(--color-text-primary)'

  // Chevron + clear button: slightly translucent accent when active, muted when idle.
  const [r, g, b]  = colors.fg.startsWith('rgba') ? [0, 0, 0] : (() => {
    const hex   = colors.fg.replace('#', '')
    const ri    = parseInt(hex.slice(0, 2), 16)
    const gi    = parseInt(hex.slice(2, 4), 16)
    const bi    = parseInt(hex.slice(4, 6), 16)
    return [ri, gi, bi]
  })()
  const controlTint  = hasFilter ? `rgba(${r}, ${g}, ${b}, 0.65)` : 'var(--color-text-secondary)'

  return (
    <div
      aria-hidden="true"
      style={{
        position:               'fixed',
        top:                    0,
        left:                   0,
        right:                  0,
        zIndex:                 50,
        backgroundColor:        'var(--color-surface)',
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* 1. Logo row — wordmark only; search icon lives in the toolbar row below */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          padding:    '16px var(--space-6) 0',
        }}>
          <img
            src="/capsula/logo.svg"
            alt="Capsula"
            className="capsula-logo"
            style={{ display: 'block', height: 27, width: 'auto', flexShrink: 0 }}
          />
        </div>

        {/* 2. Toolbar — specialty pill (fills available space), search icon (right).
            Horizontal padding matches var(--space-6) = 24px page margins so the
            pill's left edge and the search pill's right edge align with the
            condition list content and the logo above. */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          marginTop:      10,
          padding:        '0 var(--space-6) 14px',
        }}>

          {/* Specialty pill — flex:1 so it fills all space left of the search icon */}
          <div style={{
            display:         'inline-flex',
            alignItems:      'center',
            background:      hasFilter ? activePillBg : idlePillBg,
            borderRadius:    'var(--radius-full)',
            overflow:        'hidden',
            flex:            1,
            minWidth:        0,
            transition:      'background 0.2s ease',
          }}>

            {/* Main tap area: icon + name + chevron — flex:1 so name can truncate */}
            <button
              onClick={onOpenSpecialties}
              aria-label={hasFilter ? `Specialty: ${activeSpecialtyObj.name}. Tap to change.` : 'Browse specialties'}
              style={{
                display:                 'inline-flex',
                alignItems:              'center',
                gap:                     8,
                flex:                    1,
                minWidth:                0,
                padding:                 '9px 0 9px 14px',
                background:              'none',
                border:                  'none',
                cursor:                  'pointer',
                color:                   iconColor,
                fontSize:                14,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
                transition:              'color 0.2s ease',
              }}
            >
              {/* Icon: specialty icon when active, ListFilter funnel when idle */}
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {hasFilter ? (
                  <SpecialtyIcon
                    iconType={activeSpecialtyObj.iconType   ?? 'lucide'}
                    iconValue={activeSpecialtyObj.iconValue ?? 'Stethoscope'}
                    size={16}
                    color={iconColor}
                  />
                ) : (
                  <ListFilter size={16} strokeWidth={1.9} aria-hidden="true" />
                )}
              </span>

              {/* Name */}
              <span style={{
                flex:          1,
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                whiteSpace:    'nowrap',
                minWidth:      0,
                transition:    'color 0.2s ease',
              }}>
                {hasFilter ? activeSpecialtyObj.name : 'All Specialties'}
              </span>

              {/* Chevron */}
              <svg
                width="11" height="11" viewBox="0 0 10 10"
                aria-hidden="true"
                style={{
                  flexShrink:  0,
                  marginRight: hasFilter ? 0 : 8,
                  color:       controlTint,
                  transition:  'color 0.2s ease',
                }}
              >
                <path d="M1 3 L5 7 L9 3 Z" fill="currentColor" />
              </svg>
            </button>

            {/* ✕ clear button — only when active; gap between chevron and ✕ via padding-left */}
            {hasFilter && (
              <button
                onClick={e => { e.stopPropagation(); onClearSpecialty() }}
                aria-label={`Clear ${activeSpecialtyObj.name} filter`}
                style={{
                  display:                 'flex',
                  alignItems:              'center',
                  justifyContent:          'center',
                  padding:                 '9px 12px 9px 6px',
                  background:              'none',
                  border:                  'none',
                  cursor:                  'pointer',
                  color:                   controlTint,
                  outline:                 'none',
                  WebkitTapHighlightColor: 'transparent',
                  flexShrink:              0,
                  transition:              'color 0.2s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none"
                  aria-hidden="true" style={{ display: 'block' }}>
                  <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.15" />
                  <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5"
                    stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: search icon — taps to scroll-to and focus the main search bar */}
          <button
            onClick={onSearchTap}
            aria-label="Go to search"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              width:                   38,
              height:                  38,
              background:              'rgba(0, 0, 0, 0.045)',
              border:                  'none',
              borderRadius:            'var(--radius-full)',
              cursor:                  'pointer',
              color:                   'var(--color-text-secondary)',
              padding:                 0,
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
              flexShrink:              0,
            }}
          >
            <Search size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </div>

      </div>
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
        right:                   'var(--space-5)',
        bottom:                  'calc(96px + env(safe-area-inset-bottom))',
        width:                   50,
        height:                  50,
        borderRadius:            'var(--radius-full)',
        border:                  'none',
        backgroundColor:         'var(--color-accent)',
        color:                   '#ffffff',
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
      <ArrowUp size={20} strokeWidth={2.5} />
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

  const [bottomSheetOpen, setBottomSheetOpen]     = useState(false)
  const [showBackToTop, setShowBackToTop]         = useState(false)
  const [showStickyHeader, setShowStickyHeader]   = useState(false)
  const brandRowRef    = useRef(null)
  const searchInputRef = useRef(null)
  const listHeaderRef  = useRef(null)

  // ── Back-to-top visibility ───────────────────────────────────────────────────

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > BACK_TO_TOP_THRESHOLD)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Sliding sticky header: visible once BrandRow logo leaves viewport ────────
  // IntersectionObserver fires when brandRowRef crosses the top of the viewport.
  // threshold: 0 means the moment any part of the element is out of view.
  // rootMargin: '-1px' gives a 1px trigger zone so the header appears exactly
  // as the last pixel of the brand row scrolls off the top.

  useEffect(() => {
    const el = brandRowRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // isIntersecting === false → element fully above viewport → show header
        setShowStickyHeader(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleSearchTap() {
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Small delay so scroll completes before focus pulls the keyboard up
    setTimeout(() => searchInputRef.current?.focus(), 300)
  }

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

  const isSearching        = query.length >= 1
  const activeSpecialtyObj = activeSpecialty !== 'all'
    ? specialties.find(s => s.id === activeSpecialty) ?? null
    : null
  const specialtyName      = activeSpecialtyObj?.name ?? ''
  const totalCount         = conditions.length

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

  // When a specialty is chosen via the sticky header (user is scrolled down),
  // scroll the list header into view so the filtered results are immediately
  // visible without having to scroll back up manually.
  function handleSelectSpecialty(id) {
    setActiveSpecialty(id)
    if (showStickyHeader && listHeaderRef.current) {
      // Small delay lets React re-render the new results before we scroll,
      // so the element is in its final position when scrollIntoView fires.
      setTimeout(() => {
        listHeaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
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
      return results.map((condition, i) => (
        <ConditionCard
          key={condition.id}
          condition={condition}
          onTap={handleCardTap}
          highlight={isSearching ? query : ''}
          activeSpecialty={activeSpecialty}
          isLast={i === results.length - 1}
        />
      ))
    }

    return alphabetGroup(results).map(({ letter, items }, index) => {
      const isLastGroup = index === alphabetGroup(results).length - 1
      return (
        <div key={letter}>
          {/* Skip the first divider — it's rendered inline with the sort toggle in ConditionListHeader */}
          {index > 0 && <AlphabetSectionDivider letter={letter} />}
          {items.map((condition, i) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              onTap={handleCardTap}
              highlight=""
              activeSpecialty={activeSpecialty}
              isLast={isLastGroup && i === items.length - 1}
            />
          ))}
        </div>
      )
    })
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
        <div style={shimmer({ width: '100%', height: 46, marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-full)' })} />
        <div style={shimmer({ width: '100%', height: 40, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)' })} />
        {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
      </Layout>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <Layout>

      {/* Sliding sticky logo header — appears once BrandRow scrolls out of view */}
      <StickyLogoHeader
        visible={showStickyHeader}
        isSearching={isSearching}
        activeSpecialtyObj={activeSpecialtyObj}
        onClearSpecialty={handleClearFilter}
        onOpenSpecialties={() => setBottomSheetOpen(true)}
        sortMode={sortMode}
        onSortToggle={cycleSortMode}
        SORT_LABELS={SORT_LABELS}
        onSearchTap={handleSearchTap}
      />

      {/* 1. Brand row + tagline + dark mode toggle */}
      <BrandRow
        isSearching={isSearching}
        isDark={isDark}
        onToggleDark={toggleDark}
        brandRowRef={brandRowRef}
      />

      {/* 2. Search bar */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <SearchBar
          ref={searchInputRef}
          value={query}
          onChange={val => setQuery(val)}
        />
      </div>

      {/* 3. Recently viewed — temporarily hidden (set hidden={isSearching} to re-enable) */}
      <RecentlyViewedChips
        recentlyViewed={recentlyViewed}
        hidden={true}
      />

      {/* 4. Full-width specialty selector — same width as search bar */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <SpecialtySelector
          activeSpecialtyObj={activeSpecialtyObj}
          onOpen={() => setBottomSheetOpen(true)}
          onClear={handleClearFilter}
          isOpen={bottomSheetOpen}
        />
      </div>

      {/* 5. Count + sort row — in A-Z mode, the first letter is shown inline on the left */}
      <div ref={listHeaderRef}>
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
      </div>

      {/* 6. Condition list */}
      {renderList()}

      {/* Back to top */}
      <BackToTopButton visible={showBackToTop} onClick={handleBackToTop} />

      {/* Specialties bottom sheet */}
      <SpecialtiesBottomSheet
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={id => handleSelectSpecialty(id)}
        onClose={() => setBottomSheetOpen(false)}
        isOpen={bottomSheetOpen}
      />

    </Layout>
  )
}
