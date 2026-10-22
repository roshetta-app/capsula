/**
 * src/pages/ConditionsScreen.jsx
 * 2026-10-22 (UI refresh plan, step 8.6a): the Conditions home gets the same header as the Drugs
 * home. One tinted block with a rounded bottom edge holds the logo row (bell and sun stay), the
 * tall search pill and the Specialty control as one slim pill; the list sits under it on the page
 * colour (the two-layer hero and the rounded panel are gone). The rotating tagline is no longer
 * shown here. The slide-in bar on scroll is now one slim row: a search pill and the Specialty
 * chip, built on the shared ScrollRevealHeader like the Drugs one.
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

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ListFilter, Heart, Bell, WifiOff } from 'lucide-react'
import BackToTopButton         from '../components/ui/BackToTopButton'
import ScrollRevealHeader      from '../components/ui/ScrollRevealHeader'
import SearchBar               from '../components/ui/SearchBar'
import ConditionCard           from '../components/ConditionCard'
import RecentlyViewedChips     from '../components/conditions/RecentlyViewedChips'
import ConditionListHeader     from '../components/conditions/ConditionListHeader'
import AlphabetSectionDivider  from '../components/conditions/AlphabetSectionDivider'
import ConditionsEmptyState    from '../components/conditions/ConditionsEmptyState'
import SpecialtiesBottomSheet  from '../components/conditions/SpecialtiesBottomSheet'
import SpecialtySelector       from '../components/conditions/SpecialtySelector'
import NotificationSheet       from '../components/ui/NotificationSheet'
import { useConditionContext }  from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useDarkMode }         from '../hooks/useDarkMode'
import { useBackToTop }        from '../hooks/useBackToTop'
import { useBackClose }        from '../hooks/useBackClose'
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

// ─── ConditionsErrorState ───────────────────────────────────────────────────
// Phase 6 (2026-09-10): shown when loading finishes trying but nothing
// actually came through — previously this fell straight through to either
// an indefinite skeleton or an empty list, with no explanation and no way
// to recover short of restarting the app. Same icon → headline →
// supporting-line → button shape as DrugsScreen.jsx's LibraryErrorState;
// onRetry is this screen's own refresh() from ConditionContext.

function ConditionsErrorState({ onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <WifiOff size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        Couldn't load your conditions
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        Check your connection and try again
      </div>
      <FilledHintButton onClick={onRetry}>
        Try again
      </FilledHintButton>
    </div>
  )
}

// ─── FilledHintButton ───────────────────────────────────────────────────────
// Same filled/bordered treatment as DrugsScreen.jsx's FilledHintButton —
// var(--color-accent), this app's single action color, not red (red is
// reserved for destructive actions elsewhere).

function FilledHintButton({ onClick, children }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer',
        border: '1.5px solid var(--color-accent)',
        backgroundColor: 'var(--color-accent)',
        color: '#fff',
        fontSize: 13, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        lineHeight: 1,
        flexShrink: 0,
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ─── Dark mode toggle button ──────────────────────────────────────────────────
// account-theme-sync follow-up (2026-08-22): extended from a plain on/off to
// the same 3-way Light/Dark/System model as the Account screen's segmented
// control. No room here for a 3-option pill in this compact brand row, so
// this stays a single 36px icon button that cycles Light → Dark → System →
// Light on each tap instead — same footprint as before, all three states
// reachable, so this no longer locks someone out of System the way the old
// binary toggle did. Icon shown is the DESTINATION state (what tapping goes
// to), same convention this button already used (sun shown while dark, i.e.
// "tap for light" — not "currently light").

const THEME_CYCLE = ['light', 'dark', 'system']

function nextInThemeCycle(theme) {
  const i = THEME_CYCLE.indexOf(theme)
  return THEME_CYCLE[(i + 1) % THEME_CYCLE.length]
}

function DarkModeToggle({ theme, onCycleTheme }) {
  // account-theme-sync follow-up (2026-08-22): this used to show the icon
  // for `next` — the theme tapping would switch TO — while AccountScreen's
  // 3-way control shows the CURRENTLY selected option. Same underlying
  // value the whole time, just displayed two different ways, which read as
  // a genuine mismatch between the two screens. Now shows `theme` (current)
  // here too, so both screens always visually agree on what's active.
  // Tapping still advances via nextInThemeCycle(theme) — see BrandRow's
  // onCycleTheme prop below — only the displayed icon/label changed.
  const labels = {
    light:  'Light mode — tap to switch',
    dark:   'Dark mode — tap to switch',
    system: 'System theme — tap to switch',
  }
  return (
    <button
      onClick={onCycleTheme}
      aria-label={labels[theme]}
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
      {theme === 'light' && (
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
      )}
      {theme === 'dark' && (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
      {theme === 'system' && (
        /* Monitor icon — hand-drawn to match this button's existing
           sun/moon glyphs (24 viewBox, round caps) rather than importing
           lucide's Monitor, even though lucide is already used elsewhere
           in this file for other icons — keeps this one button's own
           established icon style internally consistent. */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )}
    </button>
  )
}

// ─── Brand row ────────────────────────────────────────────────────────────────
// 2026-10-22 (step 8.6a): the logo row of the tinted header: wordmark left, bell and sun right.
// The tagline under it is gone (the Drugs header has none).

function BrandRow({ theme, onCycleTheme, onOpenNotifications }) {
  return (
    <div style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 44 }}>
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt="Capsula"
          className="capsula-logo"
          style={{ display: 'block', height: 30, width: 'auto' }}
        />
        <span style={{ flex: 1 }} />

        {/* Notification bell: opens the persistent status sheet */}
        <button
          onClick={onOpenNotifications}
          aria-label="Notifications"
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
            outline:                 'none',
            WebkitTapHighlightColor: 'transparent',
            marginRight:             'var(--space-2)',
          }}
        >
          <Bell size={16} />
        </button>

        {/* Dark mode toggle */}
        <DarkModeToggle theme={theme} onCycleTheme={onCycleTheme} />
      </div>
    </div>
  )
}

// ─── Sliding sticky header ───────────────────────────────────────────────────
// Slides in from the top (shared ScrollRevealHeader) once the tinted header block has scrolled
// out of view, and slides back out when it returns. One slim row (step 8.6a):
//   search pill (left, taps scroll to the real search field) + Specialty chip (right).
//
// Specialty chip (mirrors the SpecialtySelector pattern):
//   Idle:   ListFilter icon + "All Specialties" + chevron
//   Active: specialty icon + name + chevron + inline ✕ (clears without opening sheet)
//   Tapping anywhere on the chip (except ✕) opens the specialty sheet.

function StickyLogoHeader({
  watchRef,
  activeSpecialtyObj,
  onClearSpecialty,
  onOpenSpecialties,
  onSearchTap,
}) {
  const isDark    = useIsDark()
  const hasFilter = !!activeSpecialtyObj
  const tokenKey  = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const colors    = resolveToken(tokenKey, isDark)

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
    <ScrollRevealHeader watchRef={watchRef}>
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* One slim row (step 8.6a, rule 13): a search pill that scrolls up to the real search
            field, and the Specialty chip. The logo row is gone. */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            8,
          padding:        '8px var(--page-gutter, var(--space-4))',
        }}>

          {/* Search pill */}
          <button
            onClick={onSearchTap}
            aria-label="Go to search"
            style={{
              flex:                    1,
              minWidth:                0,
              height:                  44,
              display:                 'flex',
              alignItems:              'center',
              gap:                     8,
              padding:                 '0 14px',
              background:              'var(--color-header-tint)',
              border:                  'none',
              borderRadius:            'var(--radius-full)',
              cursor:                  'pointer',
              color:                   'var(--color-text-secondary)',
              fontSize:                14,
              fontFamily:              'var(--font-body)',
              textAlign:               'left',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Search size={17} strokeWidth={2.1} color="var(--color-accent)" aria-hidden="true" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Search conditions…</span>
          </button>

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
              flex:            '0 1 auto',
              maxWidth:        '48%',
              minWidth:        0,
              minHeight:       44,
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
                minHeight:               44,
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

        </div>

      </div>
    </ScrollRevealHeader>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const {
    conditions, specialties, loading, error, refresh,
    recentlyViewed, recentOrder,
    sortMode, cycleSortMode, SORT_LABELS,
    query, setQuery,
    activeSpecialty, setActiveSpecialty,
    results, resultCount,
  } = useConditionContext()
  const { isConditionFavourited }             = useFavouritesContext()
  const { theme, setTheme }                  = useDarkMode()

  const [bottomSheetOpen, setBottomSheetOpen]     = useState(false)
  const [notifSheetOpen, setNotifSheetOpen]       = useState(false)
  // The slim bar is shown and hidden by ScrollRevealHeader, watching heroRef (the tinted header block).
  const { visible: showBackToTop, scrollToTop: handleBackToTop } = useBackToTop()
  const heroRef        = useRef(null)
  const searchInputRef = useRef(null)
  const listHeaderRef  = useRef(null)

  // ── Cold-start skeleton row count — proportional-skeleton-fill.
  // Previously hardcoded to 5 rows regardless of device height, which left
  // a large empty gap on taller screens and could underfill vs. what the
  // real list shows. skeletonHeaderRef marks the bottom edge of the fixed
  // skeleton header block (title/subtitle + search bar + selector); the
  // remaining space down to the bottom nav is divided by one skeleton
  // row's height to decide how many rows to render. Recomputed on resize
  // (covers rotation/foldables) but this only ever runs while the cold-
  // start skeleton itself is showing.
  const skeletonHeaderRef = useRef(null)
  const [skeletonRowCount, setSkeletonRowCount] = useState(5)

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

  // True while the tinted header block is scrolled out of view (the slim bar is showing).
  function isStickyShown() {
    const el = heroRef.current
    return !!el && el.getBoundingClientRect().bottom <= 1
  }

  // Waits for the cold-start skeleton to clear before triggering the fade —
  // flipping entranceIn as soon as this effect first ran (ignoring loading)
  // would let it become true while the skeleton was still showing, so the
  // header/search/list would already be at rest the moment they first paint.
  useEffect(() => {
    if (!playEntrance || loading) return
    const raf = requestAnimationFrame(() => setEntranceIn(true))
    return () => cancelAnimationFrame(raf)
  }, [playEntrance, loading])

  // Recomputes the cold-start skeleton's row count to fill the actual
  // available space instead of a hardcoded 5 — see skeletonHeaderRef above.
  // window.visualViewport is the same source useVisualViewport.js already
  // uses app-wide, so this stays consistent with how "available height" is
  // measured everywhere else. 60 is BottomNav's own fixed height, matching
  // the literal Layout.jsx already uses for its bottom-nav clearance.
  useEffect(() => {
    if (!(loading && conditions.length === 0)) return

    const BOTTOM_NAV_HEIGHT = 60
    const ROW_HEIGHT = 53 // SkeletonCard: 36px icon + 8px top/bottom padding + ~0.5px border

    function computeRows() {
      if (!skeletonHeaderRef.current) return
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const headerBottom   = skeletonHeaderRef.current.getBoundingClientRect().bottom
      const available      = viewportHeight - headerBottom - BOTTOM_NAV_HEIGHT
      setSkeletonRowCount(Math.max(3, Math.floor(available / ROW_HEIGHT)))
    }

    computeRows()
    window.addEventListener('resize', computeRows)
    return () => window.removeEventListener('resize', computeRows)
  }, [loading, conditions.length])

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

  // Phase 6 (search-clears-on-back): while the search box has text, back
  // clears it — same action as the existing clear/X button — instead of
  // leaving the screen. Once the box is already empty, isSearching is
  // false and this hook's guard goes fully inactive, so back behaves
  // completely normally.
  useBackClose(isSearching, handleClearSearch)

  function snapToListHeader() {
    if (!listHeaderRef.current) return
    const el            = listHeaderRef.current
    const STICKY_HEIGHT = 60
    const GAP           = 16
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
    if (isStickyShown()) snapToListHeader()
  }

  // When a specialty is chosen via the sticky header (user is scrolled down),
  // snap instantly so the list header sits just below the sticky header with
  // a small gap. If the page isn't tall enough to reach that scroll position
  // (filtered list is short), snap to top instead so the sticky header hides.
  function handleSelectSpecialty(id) {
    setActiveSpecialty(id)
    if (isStickyShown()) setTimeout(snapToListHeader, 50)
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

  // ── Fail state — Phase 6. Sibling to the cold-start skeleton check above:
  // once loading has finished trying and nothing came through, show a
  // recoverable message instead of falling through to an empty list or
  // sitting on the skeleton forever. Mirrors DrugsScreen.jsx's
  // LibraryErrorState (icon, message, Try again button), calling this
  // context's own refresh() instead of DrugContext's retry().
  if (!loading && error && conditions.length === 0) {
    return <ConditionsErrorState onRetry={refresh} />
  }

  // ── Cold start skeleton ──────────────────────────────────────────────────────

  if (loading && conditions.length === 0) {
    return (
      <>
        <div ref={skeletonHeaderRef}>
          <div style={{
            margin: '0 calc(-1 * var(--page-gutter, var(--space-4))) var(--space-4)',
            padding: 'var(--space-2) var(--page-gutter, var(--space-4)) 16px',
            backgroundColor: 'var(--color-header-tint)',
            borderRadius: '0 0 24px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, marginBottom: 'var(--space-3)' }}>
              <div style={shimmer({ width: 154, height: 27, borderRadius: 'var(--radius-sm)' })} />
            </div>
            <div style={shimmer({ width: '100%', height: 52, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-full)' })} />
            <div style={shimmer({ width: '100%', height: 44, borderRadius: 'var(--radius-full)' })} />
          </div>
        </div>
        {Array.from({ length: skeletonRowCount }, (_, i) => <SkeletonCard key={i} />)}
      </>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <>

      {/* Slim bar: slides in once the tinted header block scrolls out of view */}
      <StickyLogoHeader
        watchRef={heroRef}
        activeSpecialtyObj={activeSpecialtyObj}
        onClearSpecialty={handleClearFilter}
        onOpenSpecialties={() => setBottomSheetOpen(true)}
        onSearchTap={handleSearchTap}
      />

      {/* ─── Tinted header block (step 8.6a) ──────────────────────────────────
          Same look as the Drugs home header: tint, full width to the screen edges (the layout's
          side gap as a negative margin), rounded bottom edge. Logo row with the bell and sun,
          the tall search pill, and the Specialty control as one slim pill. The list sits under
          it on the page colour. The title stays for screen readers only, like the Drugs home. */}
      <div
        ref={heroRef}
        style={{
          margin:          '0 calc(-1 * var(--page-gutter, var(--space-4)))',
          padding:         '0 var(--page-gutter, var(--space-4)) 16px',
          backgroundColor: 'var(--color-header-tint)',
          borderRadius:    '0 0 24px 24px',
        }}
      >
        <h1 style={{
          position: 'absolute', width: 1, height: 1, margin: -1, padding: 0,
          overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
        }}>
          Conditions
        </h1>

        <div style={entranceStyle(0)}>
          <BrandRow
            theme={theme}
            onCycleTheme={() => setTheme(nextInThemeCycle(theme))}
            onOpenNotifications={() => setNotifSheetOpen(true)}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-3)', ...entranceStyle(1) }}>
          <SearchBar
            ref={searchInputRef}
            value={query}
            onChange={val => setQuery(val)}
            tall
          />
        </div>

        {/* Recently viewed: temporarily hidden (set hidden={isSearching} to re-enable) */}
        <RecentlyViewedChips
          recentlyViewed={recentlyViewed}
          hidden={true}
        />

        <div style={entranceStyle(1)}>
          <SpecialtySelector
            activeSpecialtyObj={activeSpecialtyObj}
            onOpen={() => setBottomSheetOpen(true)}
            onClear={handleClearFilter}
            isOpen={bottomSheetOpen}
          />
        </div>
      </div>

      {/* The list: flat on the page colour, under the header block. */}
      <div style={{ paddingTop: 'var(--space-4)', ...entranceStyle(2) }}>

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

      {/* Notification status sheet — portals to body, placement here doesn't matter */}
      <NotificationSheet
        isOpen={notifSheetOpen}
        onClose={() => setNotifSheetOpen(false)}
      />

      {/* Specialties bottom sheet */}
      <SpecialtiesBottomSheet
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={id => handleSelectSpecialty(id)}
        onClose={() => setBottomSheetOpen(false)}
        isOpen={bottomSheetOpen}
      />

    </>
  )
}
