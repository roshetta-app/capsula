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
 * Phase 16 — Hero/content seam fix: the hero panel's white background
 *             (var(--color-surface)) sat only ~1% apart in lightness from
 *             the content panel's background (var(--color-bg)), so the
 *             rounded overlap between them was invisible in light mode.
 *             Hero now uses a dedicated var(--color-hero-bg) tint. Content
 *             panel's curve radius bumped 16px → 24px (locally scoped, not
 *             the shared --radius-lg token) with a lifted box-shadow added
 *             above it, so the seam reads via elevation as well as color.
 *             Hero panel also gained paddingBottom so its color visibly
 *             extends past the specialty selector before the curve begins.
 * Phase 17 — Feedback pass on Phase 16: hero tint (#EEF1F5, cool blue-grey)
 *             clashed against this palette's warm undertone — swapped to a
 *             warm greige (#F3F1EC, in globals.css) matching
 *             --color-border-subtle/--color-note-bg. Content panel gained
 *             paddingTop — the sort row previously sat flush against the
 *             curve with no buffer.
 * Phase 18 — Feedback pass on Phase 17: warm greige (#F3F1EC) still read as
 *             a dull/muddy color choice. Settled on a crisper near-white
 *             (#FCFAF7, in globals.css) after visualizing three options
 *             side by side — this one leans on the curve radius and lift
 *             shadow to read as a separate zone rather than a strong color
 *             jump. Also fixed a spacing bug: the specialty selector's
 *             wrapper still carried its own 20px marginBottom on top of the
 *             hero's 24px paddingBottom, double-stacking into a 44px gap —
 *             removed the wrapper's margin so paddingBottom (now 12px) is
 *             the single source of that spacing.
 * Phase 19 — Bug fix on Phase 18: shrinking the hero's paddingBottom to
 *             12px without also shrinking the content panel's overlap
 *             (still 24px from Phase 16) meant the curve ate 12px further
 *             up than the hero's padding allowed, burying the bottom of
 *             the specialty selector. Overlap radius/marginTop brought
 *             down to 12px to match paddingBottom exactly — the two must
 *             always be kept equal, or the curve buries whatever sits
 *             above it. Also tightened the search-bar → selector gap
 *             16px → 12px per feedback.
 * Phase 20 — Bug fix on Phase 19: "kept equal" in the note above was
 *             itself wrong — matching paddingBottom to the overlap exactly
 *             zeroes the visible gap out completely (visible gap =
 *             paddingBottom MINUS overlap, not paddingBottom alone), so
 *             the curve started right at the selector's edge with zero
 *             breathing room. Corrected: paddingBottom back to 24px
 *             (--space-6), overlap back to --radius-lg (16px, the
 *             original shared token — restored instead of a scoped
 *             magic number since 16px was always fine, invisibility
 *             was a color/shadow problem fixed in Phase 18/16). This
 *             leaves a deliberate 8px flat gap before the curve.
 * Phase 21 — Structural fix, not just another number tweak: three rounds
 *             (19/20/this one) kept drifting because paddingBottom and the
 *             curve overlap were two independently hardcoded values that
 *             happened to need a fixed relationship. Added --radius-xl
 *             (24px) to globals.css, extending the existing sm/md/lg
 *             radius scale rather than another one-off number. Hero
 *             paddingBottom is now calc(var(--space-3) + var(--radius-xl))
 *             — the 12px visible gap (matching the search→selector gap,
 *             as requested) and the curve radius are the same two tokens
 *             the content panel uses for its own radius/marginTop, so they
 *             cannot drift apart again. Content panel paddingTop trimmed
 *             --space-5 → --space-4 (20px → 16px) above the sort row.
 * Phase 22 — Bugfix pass on the "Premium Elevation & Scroll" work (Phases
 *             16-21's continuous-interpolation approach): the 21-step
 *             IntersectionObserver threshold array and the logoVisibility
 *             float it drove are reverted back to a single-purpose
 *             boolean (showStickyHeader). BrandRow's fade (brandRowOpacity)
 *             is now a hard opacity toggle with no transition — the
 *             continuous fade caused a React re-render on every ~5% scroll
 *             step, reading as glitchy/sluggish rather than smooth. The
 *             content panel's glide (panelLiftExtra) and ambient shadow
 *             (panelShadowOpacity) are no longer recalculated per
 *             intersection step either — the panel sits still at rest and
 *             makes exactly one CSS-transitioned transform+shadow move the
 *             instant showStickyHeader flips, coordinated with the sticky
 *             header and BrandRow toggle in the same render.
 *             Feedback pass on Phase 22: threshold changed [0,1] → [1] so
 *             showStickyHeader flips on the very first pixel of scroll
 *             instead of waiting for the logo to fully leave view. Slide
 *             distance increased from a flat 12px to var(--space-5) —
 *             exactly the hero panel's flat visible gap before its curve —
 *             so the panel's total attached overlap (--radius-xl +
 *             --space-5) matches the hero's full paddingBottom and no hero
 *             background shows between the sticky header and the panel.
 *             Duration tightened 250ms → 180ms so the larger move still
 *             reads as fast, not slow.
 * Phase 23 — Hard two-view dock (replaces Phase 22's transform nudge): the
 *             content panel's small translateY(-20px) nudge only closed
 *             the visible seam between it and the hero — the hero itself
 *             (BrandRow, SearchBar, SpecialtySelector, hero-bg) stayed
 *             fully visible underneath, since the panel was still a normal
 *             in-flow sibling of the hero. Replaced with position: sticky
 *             on the content panel (top pinned to the sticky header's
 *             live-measured height, via ResizeObserver — no more hardcoded
 *             90px assumption) plus a JS-animated window.scrollTo (same
 *             requestAnimationFrame pattern as useBackToTop, eased with a
 *             cubicBezierEase(0.4, 0, 0.2, 1) matching the app's existing
 *             "fast-out-slow-in" CSS curve) that snaps the scroll position
 *             straight to where the panel sits flush under the header the
 *             instant the same single IntersectionObserver fires — rather
 *             than waiting for native sticky's own continuous scroll-linked
 *             behavior, which would only reach that point once the user
 *             had genuinely scrolled past the hero's full height. Reverses
 *             the same way on the observer's falling edge: an animated
 *             scrollTo(0) snaps straight back to the top so the hero is
 *             instantly fully visible again. No scroll-lock, no fixed
 *             positioning, no gesture capture — window scroll stays real
 *             throughout, so useBackToTop and BackToTopButton are
 *             unaffected. snapToListHeader (and listHeaderRef, which only
 *             existed to support it) removed — it existed to re-align the
 *             list under the sticky header after a filter change while
 *             scrolled down, but sticky positioning keeps the panel flush
 *             at all times now, so there's nothing left to re-align.
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

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ListFilter, Heart } from 'lucide-react'
import Layout                  from '../components/layout'
import BackToTopButton         from '../components/ui/BackToTopButton'
import SearchBar               from '../components/ui/SearchBar'
import ConditionCard           from '../components/ConditionCard'
import RecentlyViewedChips     from '../components/conditions/RecentlyViewedChips'
import ConditionListHeader     from '../components/conditions/ConditionListHeader'
import AlphabetSectionDivider  from '../components/conditions/AlphabetSectionDivider'
import ConditionsEmptyState    from '../components/conditions/ConditionsEmptyState'
import SpecialtiesBottomSheet  from '../components/conditions/SpecialtiesBottomSheet'
import SpecialtySelector       from '../components/conditions/SpecialtySelector'
import { useConditionContext }  from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useConditionSearch }  from '../hooks/useConditionSearch'
import { useRecentlyViewed }   from '../hooks/useRecentlyViewed'
import { useSortToggle }       from '../hooks/useSortToggle'
import { useDarkMode }         from '../hooks/useDarkMode'
import { useBackToTop }        from '../hooks/useBackToTop'
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
      paddingTop:    'var(--space-5)',
      // Tagline → search gap increased ~8px → 20px per premium polish pass
      // (was calc(var(--space-3) - 4px)). Uses the --space-5 token rather
      // than a one-off magic number.
      paddingBottom: 'var(--space-5)',
    }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-2)',
        // Logo → tagline gap increased 8px → 12px (--space-3) per premium
        // polish pass — was a bare 8 magic number.
        marginBottom: isSearching ? 0 : 12,
        transition:   'margin-bottom 0.15s ease',
      }}>
        {/* Logo wordmark */}
        <img
          src="/capsula/logo.svg"
          alt="Capsula"
          className="capsula-logo"
          style={{ display: 'block', height: 30, width: 'auto' }}
        />
        <span style={{ flex: 1 }} />

        {/* Dark mode toggle — top right */}
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {!isSearching && (
        <RotatingTagline
          fontSize={13}
          fontWeight={400}
          color="var(--color-text-secondary)"
        />
      )}
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
  headerRef,
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
      ref={headerRef}
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

          {/* Right: search icon — blue accent icon on light blue bg */}
          <button
            onClick={onSearchTap}
            aria-label="Go to search"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              width:                   38,
              height:                  38,
              background:              'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border:                  'none',
              borderRadius:            'var(--radius-full)',
              cursor:                  'pointer',
              color:                   'var(--color-accent)',
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

// ─── Cubic-bezier easing (matches CSS cubic-bezier(0.4, 0, 0.2, 1),
//     the app's existing "fast-out-slow-in" curve) ─────────────────────────────
// Standard Newton-Raphson bezier solver — solves for t given x (elapsed
// progress 0–1), then evaluates y at that t. Used to drive the JS scrollTo
// dock/undock snap below, so the forced scroll matches the same curve the
// panel's box-shadow transition already uses, rather than a different feel.

function cubicBezierEase(p1x, p1y, p2x, p2y) {
  const a = (a1, a2) => 1.0 - 3.0 * a2 + 3.0 * a1
  const b = (a1, a2) => 3.0 * a2 - 6.0 * a1
  const c = a1        => 3.0 * a1

  const calcBezier = (t, a1, a2) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t
  const getSlope    = (t, a1, a2) => 3.0 * a(a1, a2) * t * t + 2.0 * b(a1, a2) * t + c(a1)

  function getTForX(x) {
    let t = x
    for (let i = 0; i < 8; i++) {
      const slope = getSlope(t, p1x, p2x)
      if (slope === 0) return t
      t -= (calcBezier(t, p1x, p2x) - x) / slope
    }
    return t
  }

  return x => calcBezier(getTForX(x), p1y, p2y)
}

const DOCK_EASE = cubicBezierEase(0.4, 0, 0.2, 1)

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const { conditions, specialties, loading } = useConditionContext()
  const { isConditionFavourited }             = useFavouritesContext()
  const { recentlyViewed, recentOrder }      = useRecentlyViewed()
  const { sortMode, cycleSortMode, SORT_LABELS } = useSortToggle()
  const { isDark, toggleDark }               = useDarkMode()

  const [bottomSheetOpen, setBottomSheetOpen]     = useState(false)
  // showStickyHeader: true once the in-page BrandRow logo has fully
  // scrolled out of view, false while it's still visible. Bugfix pass:
  // reverted from a continuous logoVisibility float (0–1, driven by a
  // 21-step IntersectionObserver threshold array) back to this simple
  // boolean — nothing downstream should scroll-link to a continuous
  // signal anymore (see BrandRow hard-toggle below), so a single
  // fire-on-cross boolean is the right shape for this state again.
  const [showStickyHeader, setShowStickyHeader]   = useState(false)
  const { visible: showBackToTop, scrollToTop: handleBackToTop } = useBackToTop()
  const brandRowRef    = useRef(null)
  const searchInputRef = useRef(null)
  // Phase 23 additions — sticky-header height measurement and dock/undock
  // scroll-snap bookkeeping. stickyHeaderRef is attached to StickyLogoHeader's
  // own root div so its real rendered height can be measured (translateY
  // doesn't affect getBoundingClientRect's height, so this works even while
  // the header is off-screen). contentPanelRef is the content panel itself,
  // used to compute the exact scroll offset where its sticky point meets the
  // header. dockedRef mirrors showStickyHeader in a ref (not state) purely so
  // the observer callback can detect the rising/falling edge without an
  // impure side effect inside a setState updater. scrollAnimRef holds the
  // in-flight requestAnimationFrame id so a new dock/undock snap (or a real
  // user scroll) can cancel a still-running one instead of fighting it.
  const stickyHeaderRef = useRef(null)
  const contentPanelRef = useRef(null)
  const dockedRef       = useRef(false)
  const scrollAnimRef   = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(90) // fallback matches the old hardcoded snap value until measured

  // Measure the sticky header's real height (ResizeObserver keeps it correct
  // across viewport/content changes) rather than assuming a fixed number —
  // the content panel's sticky 'top' must match it exactly for the panel to
  // sit flush with zero gap once docked.
  useLayoutEffect(() => {
    const el = stickyHeaderRef.current
    if (!el) return

    function measure() {
      setHeaderHeight(el.getBoundingClientRect().height)
    }
    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [])

  // Animates window scroll from its current position to 'target' over
  // 'duration'ms using DOCK_EASE, cancelling any animation already in
  // flight first so a rapid dock/undock/dock sequence (or a real user
  // scroll) never fights a stale one.
  function animateScrollTo(target, duration = 240) {
    if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current)

    const start    = window.scrollY
    const distance = target - start
    if (distance === 0) return

    const startTime = performance.now()

    function step(now) {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      window.scrollTo(0, start + distance * DOCK_EASE(progress))
      scrollAnimRef.current = progress < 1 ? requestAnimationFrame(step) : null
    }

    scrollAnimRef.current = requestAnimationFrame(step)
  }

  // ── Sliding sticky header + docked content panel: both driven by the same
  //    showStickyHeader boolean, sourced from one IntersectionObserver on
  //    the BrandRow (logo) — single source of truth, no separate scroll
  //    listener. Threshold [1] fires the instant the logo drops below 100%
  //    visible, i.e. on the very first pixel of scroll.
  //
  //    Phase 23: the same fire also drives an animated window.scrollTo —
  //    on the rising edge (docking), straight to where the content panel's
  //    'position: sticky' point sits flush under the header; on the falling
  //    edge (undocking), straight back to 0. Native sticky positioning alone
  //    would only reach the flush point once the user had actually scrolled
  //    past the hero's full height — the forced scrollTo is what makes the
  //    switch instant and "first pixel"-triggered instead of a slow
  //    continuous scroll-linked drag.

  useEffect(() => {
    const el = brandRowRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextDocked = entry.intersectionRatio < 1

        if (nextDocked !== dockedRef.current) {
          dockedRef.current = nextDocked
          if (nextDocked) {
            const panelEl = contentPanelRef.current
            if (panelEl) animateScrollTo(panelEl.offsetTop - headerHeight)
          } else {
            animateScrollTo(0)
          }
        }

        setShowStickyHeader(nextDocked)
      },
      { threshold: [1] }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [headerHeight])

  function handleSearchTap() {
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Small delay so scroll completes before focus pulls the keyboard up
    setTimeout(() => searchInputRef.current?.focus(), 300)
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

  function handleSelectSpecialty(id) {
    setActiveSpecialty(id)
  }

  // Static (non-interactive) favourite indicator for the trailing slot —
  // shown only when the condition is already favourited, matching the
  // heart used on the Favourites screen's RowStarButton (Heart, 13px,
  // var(--color-favourite) fill/stroke). Not tappable: no button wrapper,
  // no onClick, no tap padding — display-only.
  function renderFavouriteHeart(condition) {
    return isConditionFavourited(condition.id)
      ? (
          <span style={{ display: 'flex', alignItems: 'center', paddingRight: 8 }}>
            <Heart
              size={13}
              fill="var(--color-favourite)"
              strokeWidth={1.8}
              style={{ color: 'var(--color-favourite)' }}
              aria-hidden="true"
            />
          </span>
        )
      : null
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
          trailing={renderFavouriteHeart(condition)}
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
              trailing={renderFavouriteHeart(condition)}
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
        headerRef={stickyHeaderRef}
      />

      {/* ─── Hero panel ───────────────────────────────────────────────────────
          var(--color-hero-bg) — a dedicated tint distinct from both
          --color-surface and --color-bg. Bled edge-to-edge past Layout's
          <main> side padding (negative margin equal to that padding,
          restored as this panel's own padding for its children). Contains
          everything above the sort row: brand row, search, recently-viewed,
          specialty selector.
          paddingBottom is intentionally a calc() of two named tokens, not
          a standalone value — visible gap (var(--space-3), matching the
          search-bar → selector gap above it) plus the content panel's
          curve radius (var(--radius-lg... now --radius-xl, see content
          panel comment) below it. Writing it this way makes it structurally
          impossible for the gap and the curve to drift out of sync the way
          they did in Phase 19/20, since paddingBottom is defined *in terms
          of* the same --radius-xl the content panel uses for its overlap —
          change the radius token once and both update together. */}
      <div style={{
        backgroundColor: 'var(--color-hero-bg)',
        marginLeft:      'calc(var(--space-6) * -1)',
        marginRight:     'calc(var(--space-6) * -1)',
        paddingLeft:     'var(--space-6)',
        paddingRight:    'var(--space-6)',
        paddingBottom:   'calc(var(--space-5) + var(--radius-xl))',
      }}>

        {/* 1. Brand row + tagline + dark mode toggle — bugfix pass: reverted
            from a continuous opacity fade (tied to the 21-step
            intersectionRatio, which triggered a re-render on every ~5%
            scroll step) to a hard, instant toggle: opacity flips straight
            between 1 and 0 with no transition property, so there's no
            in-between frame. BrandRow itself stays mounted at all times —
            it must, since brandRowRef is the exact node the
            IntersectionObserver above watches; unmounting it would break
            re-entry detection when the user scrolls back up. */}
        <div style={{ opacity: showStickyHeader ? 0 : 1 }}>
          <BrandRow
            isSearching={isSearching}
            isDark={isDark}
            onToggleDark={toggleDark}
            brandRowRef={brandRowRef}
          />
        </div>

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
        <div>
          <SpecialtySelector
            activeSpecialtyObj={activeSpecialtyObj}
            onOpen={() => setBottomSheetOpen(true)}
            onClear={handleClearFilter}
            isOpen={bottomSheetOpen}
          />
        </div>
      </div>

      {/* ─── Content panel ────────────────────────────────────────────────────
          Phase 23: position: sticky (top pinned to the live-measured sticky
          header height) replaces the old transform nudge. Sticky alone would
          only reach its flush position once the user had scrolled past the
          hero's full height — the IntersectionObserver-driven animateScrollTo
          above is what makes it snap there the instant showStickyHeader flips,
          so the hero is either fully visible (View A, at rest) or fully
          covered (View B, docked) with no partial states in between. Because
          this stays in normal document flow (never position: fixed), window
          scroll stays real throughout, and Layout's existing bottom-nav
          padding on <main> keeps applying with no extra handling needed.
          Same page background as before (var(--color-bg)) — visually
          unchanged from the rest of the page — but pulled up over the hero
          panel's bottom edge by exactly its own corner radius, so the
          rounded top corners cut a visible curve into the hero above
          instead of sitting flush against it. Same edge-to-edge bleed as
          the hero panel, for the same reason.
          Curve bumped var(--radius-lg) → var(--radius-xl) (16px → 24px, a
          new token added to the existing sm/md/lg radius scale rather than
          a one-off magic number) for a more visible curve. The hero
          panel's paddingBottom is written as a calc() of this same
          --radius-xl plus var(--space-3), so the 12px visible gap and this
          24px curve can never drift out of sync again (see hero panel
          comment) — this was the actual root cause of the last two rounds
          of spacing bugs, not the specific numbers chosen.
          paddingTop trimmed var(--space-5) → var(--space-4) — the sort row
          had slightly more clearance than needed above it.
          boxShadow added above the panel (negative y-offset) so the curve
          reads as a lifted edge via elevation, not color contrast alone. */}
      <div
        ref={contentPanelRef}
        style={{
          backgroundColor: 'var(--color-bg)',
          borderTopLeftRadius:  'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          position:        'sticky',
          top:             `${headerHeight}px`,
          // Base --radius-xl overlap — fixed at rest, matching the hero's
          // paddingBottom relationship described above.
          marginTop:       'calc(var(--radius-xl) * -1)',
          marginLeft:      'calc(var(--space-6) * -1)',
          marginRight:     'calc(var(--space-6) * -1)',
          paddingLeft:     'var(--space-6)',
          paddingRight:    'var(--space-6)',
          paddingTop:      'var(--space-4)',
          // Feedback pass: added --shadow-panel-top as a second, always-on
          // layer alongside the existing floating/attached ambient shadow —
          // CSS box-shadow supports multiple comma-separated shadows on one
          // element. This one is a soft, diffused, low-opacity shadow cast
          // upward into the hero above the curve (see globals.css comment),
          // constant across both panel states — it's a fixed accent on the
          // seam itself, not part of the floating/attached interpolation.
          boxShadow:       showStickyHeader
            ? 'var(--shadow-panel-top), var(--shadow-ambient-panel-attached)'
            : 'var(--shadow-panel-top), var(--shadow-ambient-panel-full)',
          transition:      'box-shadow 180ms ease-out',
        }}
      >

        {/* 5. Count + sort row — in A-Z mode, the first letter is shown inline on the left */}
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
      </div>

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
