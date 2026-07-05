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
 * Phase 22 — Premium polish pass (Phases 16–21) reverted in favor of a
 *             static, flat two-layer look. logoVisibility's continuous
 *             21-step IntersectionObserver replaced with a plain
 *             showStickyHeader boolean (threshold: 0), same pattern as
 *             FavouritesScreen's heroRef watch. brandRowOpacity,
 *             panelLiftExtra, panelShadowOpacity, and their usages removed
 *             entirely — BrandRow no longer fades, the panel no longer
 *             glides upward or grows its shadow on scroll. The panel's
 *             marginTop overlap and boxShadow are now fixed values
 *             (var(--shadow-ambient-panel-attached)). Base layer
 *             (var(--color-hero-bg)) and panel (var(--color-bg)) are now
 *             genuinely distinct static colors (#FAFAFA / #F7F8FA in light
 *             mode, see globals.css) instead of matching values relying on
 *             the curve + animated shadow alone for separation.
 * Phase 23 — BrandRow gap tightening: logo→tagline 12px→8px, tagline→search
 *             20px→12px, so the search bar reads as anchored to the brand
 *             block instead of floating below it. StickyLogoHeader idle
 *             pill: flat grey wash replaced with the same neutral
 *             surface+hairline-border treatment SpecialtySelector's idle
 *             card already uses; the search icon button picks up the same
 *             idle surface/border (was a blue-tint fill) so the two
 *             controls read as one consistent idle system. Icon glyph
 *             color split from text color (iconGlyphColor vs textColor) so
 *             the idle ListFilter icon can go accent blue — matching the
 *             search icon glyph — without recoloring the specialty name.
 * Phase 24 — Tagline weight bump (conditions-screen-polish-master-plan,
 *             Phase 1): RotatingTagline's BrandRow call site fontWeight
 *             400 → 500. Phase 23's hierarchy fix correctly quieted the
 *             specialty label, but feedback afterward was that the
 *             tagline itself had become under-noticeable rather than
 *             balanced — this raises it one step without reintroducing
 *             competition with the search bar below it.
 * Phase 6 (conditions-screen-polish-master-plan) — Sort interaction
 *             crossfade: toggling sortMode no longer hard-cuts between
 *             A–Z and Recent. handleSortToggle intercepts the tap, fades
 *             the currently-rendered list out over --motion-fast, swaps
 *             sortMode (and therefore the underlying results/tree shape)
 *             only once fully faded, then fades the new list in over
 *             --motion-fast. No FLIP/position animation — letter dividers
 *             appear/disappear between modes, so only the container-level
 *             opacity handoff is animated, never row position. Respects
 *             prefers-reduced-motion by skipping the delay and swapping
 *             instantly. Scoped to this file only — useSortToggle.js,
 *             ConditionCard.jsx, and alphabetGroup.js are unchanged; row
 *             identity (condition.id key) and grouping logic were already
 *             correct, and the visible "hard cut" was the container tree
 *             reshaping between flat/grouped layouts, not a per-card issue.
 * Phase 11 (conditions-screen-polish-master-plan) — Initial screen
 *             entrance: header → search/specialty → list stagger, played
 *             once per browser session the first time real content (not
 *             the skeleton) renders, using a sessionStorage flag (session-
 *             scoped, unlike OnboardingGate's permanent localStorage flag)
 *             plus a prefers-reduced-motion check. Reuses Phase 2's
 *             --motion-base/--ease-reveal (opacity) and --ease-settle
 *             (transform) tokens — same split-curve pattern as the sheet
 *             components' fade+scale — with a 40ms per-stage delay,
 *             finishing at 280ms — under the 300ms budget. First pass used
 *             --motion-fast (100ms) with one shared curve, which read as
 *             an abrupt snap rather than a smooth glide. See
 *             entranceStyle() below.
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

// ─── Entrance stagger (session-scoped) ────────────────────────────────────────
// conditions-screen-polish-master-plan Phase 11. Plays once per browser
// session (sessionStorage flag — deliberately not OnboardingGate's permanent
// localStorage flag, since this should replay on a future visit, just not a
// return to this screen within the same session). Stage delays stack on top
// of Phase 2's --motion-fast/--ease-settle tokens rather than inventing new
// timing values.

const ENTRANCE_SESSION_KEY = 'capsula_conditions_entrance_played'
const ENTRANCE_STAGGER_MS  = 40 // gap between each stage's transitionDelay

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
      // Tagline → search gap. Was 20px (--space-5, premium polish pass);
      // brought down to 12px (--space-3) per hierarchy pass — the search
      // bar should feel anchored to the brand block, not floating below it.
      paddingBottom: 'var(--space-3)',
    }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-2)',
        // Logo → tagline gap. Was 12px (--space-3, premium polish pass);
        // brought back down to 8px (--space-2) per hierarchy pass — the
        // extra gap plus the tagline→search gap left the search bar
        // feeling too far from the brand block above it.
        marginBottom: isSearching ? 0 : 8,
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
          fontWeight={500}
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
}) {
  const isDark    = useIsDark()
  const hasFilter = !!activeSpecialtyObj
  const tokenKey  = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const colors    = resolveToken(tokenKey, isDark)

  // Search icon press feedback — conditions-screen-polish-master-plan Phase 5.
  // Tracks pointer down/up so the icon can shrink slightly and tint toward
  // accent while pressed, releasing right as onSearchTap's scroll begins.
  const [searchPressed, setSearchPressed] = useState(false)

  // Specialty pill press feedback — matches SpecialtySelector's own pressed
  // state exactly (same pressedBg swap + scale(0.985) + --motion-fast/
  // --ease-settle transition), so tapping the pill in the sticky header
  // feels identical to tapping the standalone card in the page body.
  const [specialtyPressed, setSpecialtyPressed] = useState(false)
  const pressedPillBg = isDark ? '#262D3A' : '#F5F4F2'

  // Pill background: tinted wash when active; neutral card surface + hairline
  // border when idle — matches the idle treatment already used by the
  // standalone SpecialtySelector card, and pairs with the search icon's
  // matching idle treatment below (Option A: same neutral chrome for both,
  // rather than the flat grey wash this used to be).
  const idlePillBg     = isDark ? 'var(--color-surface)' : '#FFFFFF'
  const idlePillBorder = '1px solid var(--color-border)'
  const activePillBg   = tintedBg(colors.bg, isDark)

  // Text color: accent fg when active, primary text when idle — unchanged,
  // drives the button's base color and therefore the specialty name.
  const textColor = hasFilter ? colors.fg : 'var(--color-text-primary)'

  // Icon glyph color: accent fg when active (same as text), app blue when
  // idle — the idle funnel icon now matches the search icon's blue glyph,
  // set independently of textColor so the name stays its existing color.
  const iconGlyphColor = hasFilter ? colors.fg : 'var(--color-accent)'

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
          <div
            onPointerDown={() => setSpecialtyPressed(true)}
            onPointerUp={() => setSpecialtyPressed(false)}
            onPointerLeave={() => setSpecialtyPressed(false)}
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              // Active tint is layered over idlePillBg (not left to composite
              // against this header's own backgroundColor, which is
              // var(--color-surface) — a different backdrop than the white
              // hero panel SpecialtySelector's card sits on). Same alpha
              // wash, baked onto the same backdrop, so both read as the
              // identical tint instead of "same hue, different shade."
              background:      specialtyPressed
                ? pressedPillBg
                : hasFilter
                  ? `linear-gradient(${activePillBg}, ${activePillBg}), ${idlePillBg}`
                  : idlePillBg,
              border:          hasFilter ? `1px solid rgba(${r}, ${g}, ${b}, 0.3)` : idlePillBorder,
              borderRadius:    'var(--radius-full)',
              overflow:        'hidden',
              flex:            1,
              minWidth:        0,
              transform:       specialtyPressed ? 'scale(0.985)' : 'scale(1)',
              transition:      'background 0.2s ease, border-color 0.2s ease, transform var(--motion-fast) var(--ease-settle)',
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
                color:                   textColor,
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
                    color={iconGlyphColor}
                  />
                ) : (
                  <ListFilter size={16} strokeWidth={1.9} color={iconGlyphColor} aria-hidden="true" />
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
                  <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5"
                    stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: search icon — same neutral idle surface as the specialty
              pill (Option A), blue accent glyph. Was a blue-tint fill; now
              matches the pill's chrome so the two controls read as one
              consistent idle system, with blue reserved for the icon glyphs. */}
          <button
            onClick={onSearchTap}
            onPointerDown={() => setSearchPressed(true)}
            onPointerUp={() => setSearchPressed(false)}
            onPointerLeave={() => setSearchPressed(false)}
            onPointerCancel={() => setSearchPressed(false)}
            aria-label="Go to search"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              width:                   38,
              height:                  38,
              background:              searchPressed ? 'var(--color-accent-light)' : idlePillBg,
              border:                  idlePillBorder,
              borderRadius:            'var(--radius-full)',
              cursor:                  'pointer',
              color:                   'var(--color-accent)',
              padding:                 0,
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
              flexShrink:              0,
              transform:               searchPressed ? 'scale(0.99)' : 'scale(1)',
              transition:              'background var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
            }}
          >
            <Search size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const { conditions, specialties, loading } = useConditionContext()
  const { isConditionFavourited }             = useFavouritesContext()
  const { recentlyViewed, recentOrder }      = useRecentlyViewed()
  const { sortMode, cycleSortMode, SORT_LABELS } = useSortToggle()
  const { isDark, toggleDark }               = useDarkMode()

  const [bottomSheetOpen, setBottomSheetOpen]     = useState(false)
  // showStickyHeader: plain boolean, flips once the BrandRow (logo) leaves
  // the viewport. Same approach as FavouritesScreen's showStickyHeader —
  // no continuous signal, no derived opacity/lift/shadow values. The base
  // layer and panel are a static two-tone look now, not a scroll-driven
  // animation, so a single fire-once boolean is all the header needs.
  const [showStickyHeader, setShowStickyHeader]   = useState(false)
  const { visible: showBackToTop, scrollToTop: handleBackToTop } = useBackToTop()
  const brandRowRef    = useRef(null)
  const searchInputRef = useRef(null)
  const listHeaderRef  = useRef(null)

  // ── Entrance stagger — conditions-screen-polish-master-plan Phase 11.
  // playEntrance is decided once, on first mount: false if this session has
  // already shown the entrance, or if the user prefers reduced motion.
  // entranceIn flips true (via rAF) only once real content is ready, so the
  // fade genuinely starts from a hidden state instead of skipping straight
  // to visible before the header/search/list ever paint.
  const [playEntrance] = useState(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem(ENTRANCE_SESSION_KEY) === 'true'
      sessionStorage.setItem(ENTRANCE_SESSION_KEY, 'true')
      if (alreadyPlayed) return false
      return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  const [entranceIn, setEntranceIn] = useState(false)

  // ── Sort crossfade — conditions-screen-polish-master-plan Phase 6.
  // isListFading drives an opacity handoff on the list container:
  // handleSortToggle fades the currently-shown list out first, then only
  // flips sortMode (and lets results/renderList recompute) once fully
  // faded, then fades the new list in. No FLIP/position animation — just
  // a container-level opacity swap, since the tree shape (flat vs.
  // grouped-with-dividers) changes between modes anyway.
  const [isListFading, setIsListFading] = useState(false)
  const fadeTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    }
  }, [])

  function handleSortToggle() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      cycleSortMode()
      return
    }
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    setIsListFading(true)
    // Matches --motion-fast (100ms, Phase 2) — kept as a JS constant since
    // this delay gates *when* sortMode actually flips, not just a CSS
    // transition duration a stylesheet-level reduced-motion rule could
    // shrink on its own.
    fadeTimeoutRef.current = setTimeout(() => {
      cycleSortMode()
      setIsListFading(false)
    }, 100)
  }

  // Sets the sticky header's correct state before the browser paints, so
  // navigating back to this screen already scrolled down (BrandRow already
  // out of view) shows it already in place instead of replaying the
  // slide-down animation. Without this, showStickyHeader always starts
  // false on remount regardless of actual scroll position, and the
  // IntersectionObserver effect below only corrects it after the first
  // paint — by then the false→true flip has already animated visibly.
  useLayoutEffect(() => {
    const el = brandRowRef.current
    if (!el) return
    setShowStickyHeader(el.getBoundingClientRect().bottom <= 0)
  }, [])

  useEffect(() => {
    const el = brandRowRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Waits for the cold-start skeleton to clear before triggering the fade —
  // flipping entranceIn as soon as this effect first ran (ignoring loading)
  // would let it become true while the skeleton was still showing, so the
  // header/search/list would already be at rest the moment they first paint.
  useEffect(() => {
    if (!playEntrance || loading) return
    const raf = requestAnimationFrame(() => setEntranceIn(true))
    return () => cancelAnimationFrame(raf)
  }, [playEntrance, loading])

  // Returns the fade/rise + stagger delay for entrance stage 0/1/2, or an
  // empty object on any repeat visit within this session (or reduced
  // motion) so nothing about normal rendering changes. Opacity and
  // transform get separate curves (--ease-reveal / --ease-settle) rather
  // than one shared transition — same split used by the sheet components'
  // fade+scale — so the motion reads as a smooth glide instead of a snap.
  function entranceStyle(stageIndex) {
    if (!playEntrance) return {}
    const delay = `${stageIndex * ENTRANCE_STAGGER_MS}ms`
    return {
      opacity:    entranceIn ? 1 : 0,
      transform:  entranceIn ? 'translateY(0)' : 'translateY(6px)',
      transition: `opacity var(--motion-base) var(--ease-reveal) ${delay}, `
                 + `transform var(--motion-base) var(--ease-settle) ${delay}`,
    }
  }

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
  } = useConditionSearch(conditions, sortMode, recentOrder, 'capsula_conditions_specialty')

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

  function snapToListHeader() {
    if (!listHeaderRef.current) return
    const el            = listHeaderRef.current
    const STICKY_HEIGHT = 90
    const GAP           = 28
    const targetScroll  = el.offsetTop - STICKY_HEIGHT - GAP
    const maxScroll     = document.documentElement.scrollHeight - window.innerHeight
    // Temporarily disable CSS scroll-behavior: smooth so the jump is truly instant
    document.documentElement.style.scrollBehavior = 'auto'
    if (targetScroll > 0 && maxScroll >= targetScroll) {
      window.scrollTo(0, targetScroll)
    } else {
      window.scrollTo(0, 0)
    }
    document.documentElement.style.scrollBehavior = ''
  }

  function handleClearFilter() {
    setActiveSpecialty('all')
    if (showStickyHeader) snapToListHeader()
  }

  // When a specialty is chosen via the sticky header (user is scrolled down),
  // snap instantly so the list header sits just below the sticky header with
  // a small gap. If the page isn't tall enough to reach that scroll position
  // (filtered list is short), snap to top instead so the sticky header hides.
  function handleSelectSpecialty(id) {
    setActiveSpecialty(id)
    if (showStickyHeader) setTimeout(snapToListHeader, 50)
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
        onSortToggle={handleSortToggle}
        SORT_LABELS={SORT_LABELS}
        onSearchTap={handleSearchTap}
      />

      {/* ─── Base layer ───────────────────────────────────────────────────────
          Static flat background, var(--color-hero-bg) — now a distinct,
          non-animated color (#FAFAFA light) from the panel's var(--color-bg)
          (#F7F8FA light), see globals.css. Bled edge-to-edge past Layout's
          <main> side padding (negative margin equal to that padding,
          restored as this panel's own padding for its children). Contains
          everything above the sort row: brand row, search, recently-viewed,
          specialty selector.
          paddingBottom is a calc() of two named tokens — visible gap
          (var(--space-5), 20px) plus the panel's curve radius
          (var(--radius-xl)) below it — so the gap and the curve can't drift
          out of sync. (Previously documented here as var(--space-3)/12px —
          that was stale; the actual token has been --space-5 since Phase 21
          and the current 20px gap is the intended look, kept as-is.) */}
      <div style={{
        backgroundColor: 'var(--color-hero-bg)',
        marginLeft:      'calc(var(--space-6) * -1)',
        marginRight:     'calc(var(--space-6) * -1)',
        paddingLeft:     'var(--space-6)',
        paddingRight:    'var(--space-6)',
        paddingBottom:   'calc(var(--space-5) + var(--radius-xl))',
      }}>

        {/* 1. Brand row + tagline + dark mode toggle — entrance stage 0
            (Phase 11): fades/rises in first, on first load this session
            only; otherwise renders at full opacity as before, no animation. */}
        <div style={entranceStyle(0)}>
          <BrandRow
            isSearching={isSearching}
            isDark={isDark}
            onToggleDark={toggleDark}
            brandRowRef={brandRowRef}
          />
        </div>

        {/* 2. Search bar — entrance stage 1 (Phase 11), grouped with the
            specialty selector below as one "search/specialty" stage. */}
        <div style={{ marginBottom: 'var(--space-3)', ...entranceStyle(1) }}>
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

        {/* 4. Full-width specialty selector — same width as search bar.
            Same entrance stage as the search bar above (Phase 11). */}
        <div style={entranceStyle(1)}>
          <SpecialtySelector
            activeSpecialtyObj={activeSpecialtyObj}
            onOpen={() => setBottomSheetOpen(true)}
            onClear={handleClearFilter}
            isOpen={bottomSheetOpen}
          />
        </div>
      </div>

      {/* ─── Panel ─────────────────────────────────────────────────────────────
          var(--color-bg) — pulled up over the base layer's bottom edge by
          exactly its own corner radius (var(--radius-xl)), so the rounded
          top corners cut a static curve into the base layer above instead
          of sitting flush against it. Same edge-to-edge bleed as the base
          layer, for the same reason. Extends from here to the bottom of
          the page — no separate wrapper below it.
          No scroll-driven animation: border and shadow are both fixed
          values. borderTop (not a full border) traces the rounded top
          corners so the curve itself has a visible hairline edge. boxShadow
          uses a negative y-offset with a tight blur/low opacity so the
          shadow only reads just above the curve, not around the whole
          panel — dark-mode-aware since a black shadow on the darker,
          bleaker dark-mode base layer would be nearly invisible.
          Entrance stage 2 (Phase 11) fades/rises this whole panel in last,
          on first load this session only — see entranceStyle() above. */}
      <div style={{
        backgroundColor: 'var(--color-bg)',
        borderTopLeftRadius:  'var(--radius-xl)',
        borderTopRightRadius: 'var(--radius-xl)',
        borderTop:       isDark
          ? '1px solid rgba(255, 255, 255, 0.11)'
          : '1px solid rgba(15, 23, 42, 0.09)',
        marginTop:       'calc(var(--radius-xl) * -1)',
        marginLeft:      'calc(var(--space-6) * -1)',
        marginRight:     'calc(var(--space-6) * -1)',
        paddingLeft:     'var(--space-6)',
        paddingRight:    'var(--space-6)',
        paddingTop:      'var(--space-4)',
        boxShadow:       '0 -6px 14px rgba(15, 23, 42, 0.035)',
        ...entranceStyle(2),
      }}>

        {/* 5. Count + sort row — in A-Z mode, the first letter is shown inline on the left */}
        <div ref={listHeaderRef}>
          <ConditionListHeader
            totalCount={totalCount}
            resultCount={resultCount}
            activeSpecialty={activeSpecialty}
            specialtyName={specialtyName}
            isSearching={isSearching}
            sortMode={sortMode}
            onSortToggle={handleSortToggle}
            SORT_LABELS={SORT_LABELS}
            firstLetter={
              !isSearching && sortMode === 'az' && resultCount > 0
                ? alphabetGroup(results)[0]?.letter
                : undefined
            }
          />
        </div>

        {/* 6. Condition list — wrapped for the sort-toggle crossfade
            (conditions-screen-polish-master-plan Phase 6). Opacity-only;
            no position/FLIP animation, since the tree shape (flat vs.
            grouped-with-dividers) changes between modes anyway. */}
        <div style={{
          opacity:    isListFading ? 0 : 1,
          transition: 'opacity var(--motion-fast) var(--ease-settle)',
        }}>
          {renderList()}
        </div>
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

