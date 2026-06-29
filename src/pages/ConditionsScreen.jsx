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
import { ArrowUp, ArrowUpDown, Search } from 'lucide-react'
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
import { alphabetGroup }               from '../utils/alphabetGroup'
import { SpecialtyIcon, useIsDark }    from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'
import { ROUTES }                       from '../router'

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
//   1. Logo row    — wordmark left, search icon right. No tagline; logo alone
//                    is sufficient for brand recognition and keeps the header
//                    compact.
//   2. Toolbar     — 'Specialties' pill trigger + optional active-specialty
//                    chip (left), sort toggle (right).

function StickyLogoHeader({
  visible,
  isSearching,
  activeSpecialtyObj,
  onClearSpecialty,
  onOpenSpecialties,
  sortMode,
  onSortToggle,
  SORT_LABELS,
  onSearchTap,
}) {
  const isDark    = useIsDark()
  const nextMode  = sortMode === 'az' ? 'recent' : 'az'
  const hasFilter = !!activeSpecialtyObj
  const tokenKey  = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const colors    = resolveToken(tokenKey, isDark)

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
        // Top stays flush with the status bar; bottom corners soften so
        // the header reads as a floating card attached to the top of the
        // screen rather than a rigid toolbar. Separation from scrolling
        // content now comes from this rounding plus the shadow below —
        // no internal divider line.
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        // Very soft ambient shadow — short blur, barely-there opacity.
        // The rounded corners define the separation; the shadow is almost
        // imperceptible, just enough to prevent the header reading as flat.
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        // Slide in from above when visible, slide back out when not
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        // Prevent interaction when hidden
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* 1. Logo row — wordmark left, search icon right. The search icon
            occupies the dead space on the right of the branding block and
            taps to scroll-to and focus the main search bar below. */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '12px var(--space-5) 0',
        }}>
          <img
            src="/capsula/logo.svg"
            alt="Capsula"
            className="capsula-logo"
            style={{ display: 'block', height: 25, width: 'auto', flexShrink: 0 }}
          />
          <button
            onClick={onSearchTap}
            aria-label="Go to search"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              width:                   44,
              height:                  44,
              background:              'none',
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
            <Search size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* 2. Toolbar — specialty trigger + active chip (left), sort (right).
            No tagline between logo and toolbar: logo alone anchors the brand,
            and removing it reduces height and clutter. Gap of 8px gives just
            enough breathing room without the visual disconnect of the previous
            larger spacing. */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            'var(--space-2)',
          marginTop:      8,
          padding:        '0 var(--space-5) var(--space-2)',
        }}>
          {/* Left: "Specialty Picker" + "active filter" read as one logical
              group — "choose filter" → "current filter" — via a tighter
              internal gap than the space separating this group from the
              sort control on the far right (justify-content: space-between
              already provides that larger separation). */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            minWidth:   0,
          }}>
            <button
              onClick={onOpenSpecialties}
              aria-label="Browse specialties"
              style={{
                display:                 'inline-flex',
                alignItems:              'center',
                gap:                     4,
                // Subtle filled pill — shape and weight signal tappability,
                // no border needed. Tighter padding than previous pass
                // (2–3 dp shorter) for a more compact, native feel.
                background:              'rgba(0, 0, 0, 0.045)',
                border:                  'none',
                borderRadius:            'var(--radius-full)',
                padding:                 '4px 9px 4px 7px',
                margin:                  0,
                cursor:                  'pointer',
                color:                   'var(--color-text-primary)',
                fontSize:                13,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
                flexShrink:              0,
              }}
            >
              Specialties
              {/* Slightly smaller chevron than previous pass — 7px reads
                  crisply at this label size without over-asserting. */}
              <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M1 3 L5 7 L9 3 Z" fill="currentColor" />
              </svg>
            </button>

            {hasFilter && (
              <button
                onClick={onClearSpecialty}
                aria-label={`Clear ${activeSpecialtyObj.name} filter`}
                style={{
                  display:                 'inline-flex',
                  alignItems:              'center',
                  gap:                     4,
                  background:              colors.bg,
                  border:                  'none',
                  borderRadius:            'var(--radius-full)',
                  padding:                 '3px 8px 3px 6px',
                  cursor:                  'pointer',
                  color:                   colors.fg,
                  fontSize:                11,
                  fontWeight:              500,
                  fontFamily:              'var(--font-body)',
                  outline:                 'none',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth:                0,
                  overflow:                'hidden',
                  // Subtle crossfade when specialty changes — color and
                  // background transition together at 200ms so the pill
                  // feels polished without being distracting.
                  transition:              'background 200ms ease, color 200ms ease',
                }}
              >
                <SpecialtyIcon
                  iconType={activeSpecialtyObj.iconType   ?? 'lucide'}
                  iconValue={activeSpecialtyObj.iconValue ?? 'Stethoscope'}
                  size={11}
                  color={colors.fg}
                />
                <span style={{
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {activeSpecialtyObj.name}
                </span>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  aria-hidden="true" style={{ flexShrink: 0 }}>
                  <line x1="2" y1="2" x2="10" y2="10"/>
                  <line x1="10" y1="2" x2="2"  y2="10"/>
                </svg>
              </button>
            )}
          </div>

          {/* Right: sort toggle — semibold, primary color, tighter icon/label
              gap so the control reads as one unit. 44×44 tap target preserved
              via minWidth/minHeight + negative margin trick. */}
          <button
            onClick={onSortToggle}
            aria-label={`Sort: currently ${SORT_LABELS[sortMode]}. Tap to switch to ${SORT_LABELS[nextMode]}.`}
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     3,
              minWidth:                44,
              minHeight:               44,
              margin:                  '-12px 0',
              background:              'none',
              border:                  'none',
              padding:                 '0 var(--space-3)',
              cursor:                  'pointer',
              color:                   'var(--color-text-primary)',
              fontSize:                13,
              fontWeight:              600,
              fontFamily:              'var(--font-body)',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
              flexShrink:              0,
            }}
          >
            <ArrowUpDown size={13} strokeWidth={2.0} aria-hidden="true" />
            {SORT_LABELS[nextMode]}
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

  const [bottomSheetOpen, setBottomSheetOpen]     = useState(false)
  const [showBackToTop, setShowBackToTop]         = useState(false)
  const [showStickyHeader, setShowStickyHeader]   = useState(false)
  const brandRowRef    = useRef(null)
  const searchInputRef = useRef(null)

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
          activeSpecialty={activeSpecialty}
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
            activeSpecialty={activeSpecialty}
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
      <div style={{ marginBottom: 'var(--space-3)' }}>  {/* was var(--space-4) — tightened gap to selector below */}
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
        onSelect={id => setActiveSpecialty(id)}
        onClose={() => setBottomSheetOpen(false)}
        isOpen={bottomSheetOpen}
      />

    </Layout>
  )
}
