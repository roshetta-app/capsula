/**
 * src/pages/FavouritesScreen.jsx
 * Phase 2H — Favourites Screen rebuild
 *
 * Changes from stub:
 *  - Symmetric pill tabs: equal width, centered, Star icon, count badge
 *  - Empty state: Star icon (not Bookmark)
 *  - Drug card onTap → navigate to /drugs/:slug (FIX — was dead () => {})
 *  - Removing a favourite shows a brief snackbar: "Removed from favourites"
 *  - Snackbar is triggered by wrapping toggleDrug / toggleCondition
 *
 * Phase 2I — bug fix: condition card onTap was wired to remove-from-favourites
 *  instead of navigating (row tap silently un-favourited the condition and
 *  never opened it). ConditionCard's onTap is a single full-row tap target
 *  meant purely for navigation — mirrors DrugCard's onTap below.
 *  - Condition card onTap → navigate to /conditions/:slug (FIX)
 *  - Trailing star control added per row so removal is still possible
 *    from this screen.
 *
 * Phase 2J — polish pass on the 2I star row:
 *  - Removing a favourite now confirms first via ConfirmSheet (the
 *    consumer-facing confirm dialog — see src/components/ui/ConfirmSheet.jsx;
 *    NOT admin/ConfirmModal.jsx, which is CMS-only) instead of removing
 *    immediately on tap. toggleCondition is called from the sheet's
 *    onConfirm, which is also where the snackbar now fires.
 *
 * Phase 2K — the 2J star was rendered as a sibling before ConditionCard's
 *  outer div, which placed it before the specialty icon bubble too (wrong —
 *  it should sit right before the chevron) and top-aligned it instead of
 *  centering it on the row. Fixed by moving the star into ConditionCard's
 *  `trailing` slot (see ConditionCard Phase 16), which renders it
 *  immediately before the chevron and centers both together on the row's
 *  full height between the two divider lines.
 *
 * Phase 2L — header redesign to match ConditionsScreen's hero + sticky
 *  header pattern:
 *  - Plain "Favourites" <h1> replaced with a hero block (logo + heading),
 *    matching ConditionsScreen's BrandRow spacing/logo sizing. No tagline,
 *    no dark-mode toggle — this screen has neither in its existing in-page
 *    content, unlike Conditions.
 *  - Tab row now sits just below the hero and is tracked via a ref.
 *  - New StickyFavouritesHeader: a fixed, slide-down panel (logo row +
 *    the same two tabs) that appears once the hero scrolls out of view.
 *    Visual shell (position/zIndex/shadow/border-radius/transition) copied
 *    from ConditionsScreen's StickyLogoHeader; specialty-pill/search-icon/
 *    color-token logic from that component is NOT included — Favourites has
 *    no equivalent controls. Tab content is rendered via a shared renderTabs
 *    helper so the in-page and sticky tab rows never diverge.
 *  - This is a local, duplicated shell — not extracted into a shared
 *    component with ConditionsScreen (explicit decision: two occurrences
 *    don't yet justify the abstraction; avoids touching a working screen).
 *  - IntersectionObserver watches the hero ref (heroRef) the same way
 *    ConditionsScreen watches brandRowRef.
 *
 * Phase 2M — spec compliance pass (favourites-as-personal-library):
 *  - Logo removed from both the hero and the sticky header — this screen is
 *    title-first, not brand-first (logo stays reserved for Home). Hero is
 *    now: large "Favourites" title → small "Your saved references"
 *    subtitle → search → tabs. Sticky header is a compact text-only title
 *    bar ("Favourites", no logo, no back arrow — Favourites is a bottom-nav
 *    tab, there's no "back" destination that makes sense here).
 *  - Search added: reuses SearchBar as-is, placeholder "Search favourites…".
 *    Wired via useConditionSearch(savedConditions) — the hook's own pool is
 *    the FAVOURITED conditions array, not the full ConditionContext catalog,
 *    so results are scoped to the user's saved items automatically (the
 *    hook needs no new filtering logic for this). savedConditions/savedDrugs
 *    are now wrapped in useMemo — without it, .map().filter() built a new
 *    array reference every render, which would re-trigger
 *    useConditionSearch's internal "rebuild index" effect (keyed on that
 *    array reference) on every render.
 *  - Search is functionally scoped to the Conditions tab only this session —
 *    the Drugs tab has no star/remove control yet (explicit decision,
 *    deferred), and real filtering was deferred with it. The hero's
 *    SearchBar itself IS shown on both tabs (placeholder swaps between
 *    "Search favourite conditions…" / "Search favourite drugs…"); the Drugs
 *    variant is intentionally inert — its own local state (drugQuery) makes
 *    the input controlled/typeable but is not wired to any filtering.
 *    Placeholder box only, on purpose, until Drugs-tab search is picked up.
 *
 * Phase 2N — SearchBar now always visible regardless of active tab (was
 *  Conditions-only). Drugs tab gets its own local, unwired query state
 *  (drugQuery/setDrugQuery) purely so the input is controlled — no
 *  filtering, no highlight, no hook. Placeholder text is now per-tab:
 *  "Search favourite conditions…" on Conditions, "Search favourite drugs…"
 *  on Drugs (was a single generic "Search favourites…" for both).
 *  - Segmented control count badges de-emphasized (opacity ~0.7, weight 500)
 *    so tab labels stay the primary read.
 *  - RowStarButton icon 16px → 13px (already-44px tap target via padding is
 *    unaffected — only the icon shrinks).
 *  - Empty state redesigned: accent-tinted circular icon background + Star
 *    icon, "Nothing saved yet" headline, one-line body, verb-first CTA
 *    ("Browse conditions" / "Browse drugs") navigating to /conditions or
 *    /drugs. Separate, simpler empty state added for the Conditions tab
 *    when a search query matches none of the user's saved conditions:
 *    "No results for "{query}"" + "Clear search" — no browse CTA, since the
 *    user already has favourites.
 *  - Spacing tightened: hero top padding space-5 → space-4, hero-to-tabs gap
 *    reduced, sticky header internal padding reduced.
 *
 * Phase 2O — refinement pass on top of 2M/2N, per updated design brief
 *  (preserve design system, refine hierarchy/proportions, no reinvention):
 *  - Segmented control rebuilt from two independent pill buttons into a
 *    single unified capsule: one track (var(--color-border-subtle)), one
 *    sliding "elevated" indicator (var(--color-surface) + var(--shadow-card))
 *    that animates via CSS transform between the two segments. Selected
 *    segment's icon/label/count use var(--color-accent) (the app's primary
 *    blue); unselected uses var(--color-text-secondary). Reads as
 *    lightweight "switch views" navigation, not two primary actions.
 *  - Count badges further softened: neutral/tinted backgrounds
 *    (var(--color-border-subtle) unselected, var(--color-accent-light)
 *    selected) instead of the previous opacity-based dimming.
 *  - SearchBar rendered with the new `compact` prop (see SearchBar.jsx
 *    Phase 7) — 46px → 44px, corner radius/border/icon styling unchanged.
 *  - Header vertical rhythm tightened further: title→subtitle, subtitle→
 *    search, search→tabs, and tabs→first-list-item gaps each trimmed
 *    ~4–8dp. Title, subtitle copy, sticky-header trigger behavior, list row
 *    component, and star placement are unchanged — refinement only, per
 *    the "do not redesign" instruction in the brief.
 *
 * Phase 3 — tab bar upgraded from a lightweight underline filter to a
 *  first-class navigation component, matching ConditionDetailScreen's
 *  Treatment/Clinical tabs structurally and interactionally:
 *  - Tabs are full-width 50/50 cells again (flex: 1, width: 100% buttons)
 *    instead of content-sized columns — mirrors ConditionDetailScreen's TABS
 *    exactly. Tap target padding increased beyond ConditionDetailScreen's own
 *    (10px vs 7px) since this is Favourites' primary navigation.
 *  - Item counts removed entirely — label text only.
 *  - Underline thickened (3px) and unchanged in behavior: full width of the
 *    active cell, transparent when inactive, animates via CSS transition.
 *  - Active label: semibold + accent blue. Inactive: medium weight (500) +
 *    text-secondary gray.
 *  - Horizontal swipe added on the tab-content area, porting
 *    ConditionDetailScreen's exact touch-threshold + direction-aware CSS
 *    keyframe slide mechanism (touchStartX/Y refs, tabDirection ref,
 *    hasSwitchedRef so mount never animates, switchTab() computing direction
 *    from tab order). Deliberately NOT ported: ConditionDetailScreen's
 *    internal fixed-height scroll box + per-tab scrollTop memory — that's
 *    tied to that screen's whole-page layout architecture, and adopting it
 *    here would mean redesigning Favourites' overall scroll structure, which
 *    this task explicitly rules out. Favourites keeps ordinary page scroll;
 *    only the gesture + tab-switch + slide-transition parts are reused.
 *  - Tab content array hoisted to a module-level constant (FAVOURITES_TABS)
 *    since it no longer carries per-render count data — renderTabs and
 *    StickyFavouritesHeader no longer take a `tabs` prop.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import Layout from '../components/layout'
import ConditionCard from '../components/ConditionCard'
import DrugCard from '../components/DrugCard'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import SearchBar from '../components/ui/SearchBar'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useStock } from '../hooks/useStock'
import { useConditionSearch } from '../hooks/useConditionSearch'

// Static tab order/labels — no longer carries per-render count data, so this
// can live outside the component. Order matters: switchTab() below uses this
// array's index to figure out swipe/tap direction (forward vs backward).
const FAVOURITES_TABS = [
  { key: 'conditions', label: 'Conditions' },
  { key: 'drugs',      label: 'Drugs'      },
]

// ─── Snackbar ─────────────────────────────────────────────────────────────────

function Snackbar({ visible, message }) {
  return (
    <div
      aria-live="polite"
      style={{
        position:        'fixed',
        bottom:          80,           // above bottom nav
        left:            '50%',
        transform:       `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:         visible ? 1 : 0,
        transition:      'opacity 0.2s ease, transform 0.2s ease',
        backgroundColor: 'var(--color-text-primary)',
        color:           'var(--color-bg)',
        fontSize:        13,
        fontWeight:      500,
        padding:         '8px 18px',
        borderRadius:    'var(--radius-full)',
        boxShadow:       'var(--shadow-elevated)',
        whiteSpace:      'nowrap',
        pointerEvents:   'none',
        zIndex:          9999,
      }}
    >
      {message}
    </div>
  )
}

// ─── Empty state: nothing saved yet ─────────────────────────────────────────
// Replaces the old generic "No saved X yet" text block. Accent-tinted
// circular icon background, short body copy, verb-first CTA to go save
// something. Shared between both tabs — only the label/destination differ.

function NothingSavedEmptyState({ label }) {
  const navigate = useNavigate()
  const isConditions = label === 'conditions'

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-3)',
    }}>
      <div style={{
        width:           64,
        height:          64,
        borderRadius:    '50%',
        backgroundColor: 'var(--color-accent-light)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Star size={28} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Nothing saved yet
      </div>

      <div style={{
        fontSize:   13,
        color:      'var(--color-text-tertiary)',
        lineHeight: 1.5,
        maxWidth:   240,
      }}>
        {isConditions
          ? 'Save conditions you want to find quickly later.'
          : 'Save drugs you want to find quickly later.'}
      </div>

      <button
        onClick={() => navigate(isConditions ? '/conditions' : '/drugs')}
        style={{
          marginTop:       4,
          padding:         '10px 20px',
          borderRadius:    'var(--radius-full)',
          border:          'none',
          backgroundColor: 'var(--color-accent)',
          color:           '#fff',
          fontSize:        13,
          fontWeight:      600,
          fontFamily:      'var(--font-body)',
          cursor:          'pointer',
        }}
      >
        {isConditions ? 'Browse conditions' : 'Browse drugs'}
      </button>
    </div>
  )
}

// ─── Empty state: search matched nothing ────────────────────────────────────
// Distinct from NothingSavedEmptyState — the user DOES have favourites,
// their search just didn't match any of them. Simpler, no browse CTA.

function NoSearchResultsState({ query, onClear }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-2)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No results for "{query}"
      </div>
      <button
        onClick={onClear}
        style={{
          fontSize:       13,
          color:          'var(--color-accent)',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          textDecoration: 'underline',
          fontFamily:     'var(--font-body)',
          padding:        '4px 0',
        }}
      >
        Clear search
      </button>
    </div>
  )
}

// ─── Row star button ────────────────────────────────────────────────────────
// Local (not InlineStarButton) so it can open a confirm step instead of
// toggling immediately on tap. Rendered into ConditionCard's trailing slot,
// so it sits right before the chevron and shares its vertical centering.
// Icon shrunk 16→13px (Phase 2M) — integrated row action, not a floating
// decoration. Tap target stays 44px via the button's own padding.

function RowStarButton({ onPress }) {
  function handleTap(e) {
    e.stopPropagation()
    onPress()
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Remove from favourites"
      style={{
        background:              'none',
        border:                  'none',
        cursor:                  'pointer',
        padding:                 '14px 8px',   // 44px tap height
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        flexShrink:              0,
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
        color:                   '#F59E0B',
      }}
    >
      <Star size={13} fill="#F59E0B" strokeWidth={1.8} />
    </button>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
// Shared between the in-page tab row and the sticky header's copy, so the two
// never visually diverge. Pure render function of (activeTab, onSelect).
// Phase 3 — rebuilt to structurally match ConditionDetailScreen's
// Treatment/Clinical tabs: full-width 50/50 cells (flex: 1, width: 100%
// button) instead of content-sized columns, no count badge, taller tap
// target than ConditionDetailScreen's own (10px vs 7px vertical padding —
// this is Favourites' primary navigation, not a secondary in-header switch),
// thicker underline (3px vs 1.5px). Active: semibold + accent blue.
// Inactive: medium weight (500) + text-secondary gray.

function renderTabs(activeTab, onSelect) {
  return (
    <div style={{ display: 'flex' }}>
      {FAVOURITES_TABS.map(tab => {
        const isActive = activeTab === tab.key
        const fg = isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'

        return (
          <div
            key={tab.key}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <button
              onClick={() => onSelect(tab.key)}
              style={{
                display:        'flex',
                flexDirection:  'row',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            6,
                paddingTop:     10,
                paddingBottom:  10,
                paddingLeft:    'var(--space-2)',
                paddingRight:   'var(--space-2)',
                width:          '100%',
                border:         'none',
                background:     'none',
                cursor:         'pointer',
                fontFamily:     'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
                outline:        'none',
                transition:     'color 0.15s ease',
              }}
            >
              <Star
                size={13}
                fill={isActive ? fg : 'none'}
                strokeWidth={isActive ? 0 : 1.5}
                color={fg}
              />
              <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: fg }}>
                {tab.label}
              </span>
            </button>
            {/* Underline — full width of this 50% cell, exactly matching the
                active tab's rendered width; visible only beneath the active tab */}
            <span style={{
              display:         'block',
              height:          3,
              width:           '100%',
              borderRadius:    '1.5px 1.5px 0 0',
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              transition:      'background-color 0.15s ease',
            }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Hero: title + subtitle ─────────────────────────────────────────────────
// Phase 2M — logo removed (title-first hierarchy, per spec: Favourites
// prioritizes content/page identity over branding — logo stays reserved
// for Home).
// Phase 3 — SearchBar moved out of the hero and now renders below the tabs
// (see FavouritesScreen's return): tabs choose the collection, search filters
// within it. Hero is title + subtitle only.

function FavouritesHero({ heroRef }) {
  return (
    <div ref={heroRef} style={{
      paddingTop:    'var(--space-4)',
      paddingBottom: 8,
    }}>
      <h1 style={{
        fontSize:      22,
        fontWeight:    700,
        color:         'var(--color-text-primary)',
        margin:        0,
        letterSpacing: '-0.3px',
      }}>
        Favourites
      </h1>

      <div style={{
        fontSize:     13,
        color:        'var(--color-text-tertiary)',
        marginTop:    2,
        marginBottom: 6,
      }}>
        Your saved references
      </div>
    </div>
  )
}

// ─── Sliding sticky header ──────────────────────────────────────────────────
// Appears once FavouritesHero scrolls out of view. Visual shell
// (position/zIndex/shadow/border-radius/transition) matches ConditionsScreen's
// StickyLogoHeader; Phase 2M replaces the logo row with a plain "Favourites"
// text label (no logo, no back arrow — Favourites is a bottom-nav tab, there's
// no "back" destination that makes sense here). Internal padding tightened.

function StickyFavouritesHeader({ visible, activeTab, onSelectTab }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:                'fixed',
        top:                     0,
        left:                    0,
        right:                   0,
        zIndex:                  50,
        backgroundColor:         'var(--color-surface)',
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* Title row — text only, no logo, no back arrow */}
        <div style={{
          padding: '14px var(--space-6) 0',
        }}>
          <div style={{
            fontSize:      15,
            fontWeight:    700,
            color:         'var(--color-text-primary)',
            letterSpacing: '-0.2px',
          }}>
            Favourites
          </div>
        </div>

        {/* Tabs — same content as the in-page row, kept in sync via renderTabs */}
        <div style={{
          marginTop: 6,
          padding:   '0 var(--space-6) 10px',
        }}>
          {renderTabs(activeTab, onSelectTab)}
        </div>

      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conditions')

  // Snackbar state
  const [snackVisible, setSnackVisible] = useState(false)
  const snackTimer = useRef(null)

  function showSnack() {
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackVisible(true)
    snackTimer.current = setTimeout(() => setSnackVisible(false), 2000)
  }

  const { favourites, toggleDrug, toggleCondition } = useFavouritesContext()
  const { conditions } = useConditionContext()
  const { drugs }      = useDrugContext()
  const { stockMap }   = useStock(drugs)

  // Look up full objects from context. Memoized — without this, a new array
  // reference was created every render, which re-triggered
  // useConditionSearch's "rebuild index" effect (keyed on this array's
  // identity) on every render instead of only when favourites/catalog change.
  const savedConditions = useMemo(
    () => favourites.conditions.map(id => conditions.find(c => c.id === id)).filter(Boolean),
    [favourites.conditions, conditions]
  )

  const savedDrugs = useMemo(
    () => favourites.drugs.map(id => drugs.find(d => d.id === id)).filter(Boolean),
    [favourites.drugs, drugs]
  )

  // Conditions-tab search — scoped to the user's saved conditions only (not
  // the full catalog). Own query state, independent of any other search on
  // the app. Drugs-tab search is deferred this session (see file header).
  const {
    query:   conditionQuery,
    setQuery: setConditionQuery,
    results: conditionResults,
  } = useConditionSearch(savedConditions)

  const isSearchingConditions = conditionQuery.trim().length > 0
  const conditionSearchEmpty  = isSearchingConditions && conditionResults.length === 0

  // Drugs-tab search box — placeholder only (Phase 2N). Local, unwired state
  // just so the input is controlled/typeable. Do NOT connect this to
  // filtering, a search hook, or ConditionCard/DrugCard's highlight prop —
  // that wiring is deferred to a future session (see file header, decision
  // #19 follow-up).
  const [drugQuery, setDrugQuery] = useState('')

  // Hero search box swaps value/handler/placeholder based on the active tab.
  const heroSearchValue = activeTab === 'conditions' ? conditionQuery : drugQuery
  const heroSearchOnChange = activeTab === 'conditions' ? setConditionQuery : setDrugQuery
  const heroSearchPlaceholder = activeTab === 'conditions'
    ? 'Search favourite conditions…'
    : 'Search favourite drugs…'

  // Wrapper that also triggers the snackbar (called on remove = already favourited)
  const handleRemoveDrug = useCallback((id) => {
    toggleDrug(id)
    showSnack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDrug])

  // Condition removal confirms first — see ConfirmSheet below.
  const [confirmingCondition, setConfirmingCondition] = useState(null)

  function handleConfirmRemoveCondition() {
    if (!confirmingCondition) return
    toggleCondition(confirmingCondition.id)
    showSnack()
  }

  // ── Tab switching + swipe (Phase 3) ─────────────────────────────────────────
  // Ports ConditionDetailScreen's exact swipe mechanism: touch-threshold
  // detection (not continuous finger-tracked dragging), a direction ref so
  // the incoming tab's CSS keyframe slides in from the correct side, and a
  // "has switched yet" guard so the animation never plays on mount/refresh.
  // Deliberately NOT ported: ConditionDetailScreen's internal fixed-height
  // scroll box + per-tab scrollTop memory — see file header Phase 3 note.
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const tabDirection = useRef(1) // +1 = forward (slide from right), -1 = backward (slide from left)
  const hasSwitchedRef = useRef(false)

  function switchTab(key) {
    if (key === activeTab) return
    const fromIndex = FAVOURITES_TABS.findIndex(t => t.key === activeTab)
    const toIndex   = FAVOURITES_TABS.findIndex(t => t.key === key)
    tabDirection.current = toIndex > fromIndex ? 1 : -1
    hasSwitchedRef.current = true
    setActiveTab(key)
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab === 'conditions') switchTab('drugs')
      if (dx > 0 && activeTab === 'drugs')      switchTab('conditions')
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // ── Sliding sticky header: visible once the hero leaves viewport ───────────
  // Same IntersectionObserver approach as ConditionsScreen's brandRowRef watch.
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const heroRef = useRef(null)

  useEffect(() => {
    const el = heroRef.current
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

  return (
    <Layout>

      {/* Sliding sticky header — appears once FavouritesHero scrolls out of view */}
      <StickyFavouritesHeader
        visible={showStickyHeader}
        activeTab={activeTab}
        onSelectTab={switchTab}
      />

      {/* Local keyframes for the tab-switch transition — same technique as
          ConditionDetailScreen, distinct names to avoid any collision.
          Direction-aware slide+fade, only ever plays after a real switch
          (see hasSwitchedRef), never on mount/refresh. */}
      <style>{`
        @keyframes favTabSlideFromRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes favTabSlideFromLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div>

        <FavouritesHero heroRef={heroRef} />

        {/* Tab bar — chooses which collection (Conditions/Drugs) is being browsed */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {renderTabs(activeTab, switchTab)}
        </div>

        {/* Search — filters only the currently selected collection */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <SearchBar
            value={heroSearchValue}
            onChange={heroSearchOnChange}
            placeholder={heroSearchPlaceholder}
            compact
          />
        </div>

        {/* Swipeable content area — tap OR swipe switches tabs, mirroring
            ConditionDetailScreen's Treatment/Clinical interaction. Keyed by
            activeTab so the slide animation replays on every real switch. */}
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div
            key={activeTab}
            style={{
              animation: hasSwitchedRef.current
                ? `${tabDirection.current === 1 ? 'favTabSlideFromRight' : 'favTabSlideFromLeft'} 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)`
                : 'none',
            }}
          >
            {/* ── Conditions tab ── */}
            {activeTab === 'conditions' && (
              savedConditions.length === 0
                ? <NothingSavedEmptyState label="conditions" />
                : conditionSearchEmpty
                  ? <NoSearchResultsState query={conditionQuery} onClear={() => setConditionQuery('')} />
                  : conditionResults.map((condition, i) => (
                      <ConditionCard
                        key={condition.id}
                        condition={condition}
                        isLast={i === conditionResults.length - 1}
                        highlight={conditionQuery}
                        onTap={() => navigate(`/conditions/${condition.slug}`)}
                        trailing={
                          <RowStarButton
                            onPress={() => setConfirmingCondition(condition)}
                          />
                        }
                      />
                    ))
            )}

            {/* ── Drugs tab ── */}
            {activeTab === 'drugs' && (
              savedDrugs.length === 0
                ? <NothingSavedEmptyState label="drugs" />
                : savedDrugs.map(drug => (
                    <DrugCard
                      key={drug.id}
                      drug={drug}
                      isInStock={stockMap[drug.id] ?? drug.inStock}
                      onTap={() => navigate(`/drugs/${drug.slug}`)}
                    />
                  ))
            )}
          </div>
        </div>

      </div>

      <ConfirmSheet
        isOpen={!!confirmingCondition}
        onClose={() => setConfirmingCondition(null)}
        onConfirm={handleConfirmRemoveCondition}
        title="Remove from favourites?"
        message={confirmingCondition ? `"${confirmingCondition.name}" will be removed from your favourites.` : ''}
        confirmLabel="Remove"
        destructive
      />

      <Snackbar visible={snackVisible} message="Removed from favourites" />
    </Layout>
  )
}