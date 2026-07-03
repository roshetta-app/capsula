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

// ─── Segmented control ───────────────────────────────────────────────────────
// Shared between the in-page tab row and the sticky header's copy, so the two
// never visually diverge. Pure render function of (tabs, activeTab, onSelect).
// Phase 2O — rebuilt from two independent pill buttons into a single unified
// capsule: one track, one sliding "elevated" indicator (white + shadow-card)
// that animates between the two segments via CSS transform. Reads as
// secondary "switch views" navigation rather than two primary buttons.
// Assumes exactly two equal-width segments — the 50% math below is only
// correct for that fixed 2-segment case.

function renderTabs(tabs, activeTab, onSelect) {
  const activeIndex = tabs.findIndex(t => t.key === activeTab)

  return (
    <div style={{
      position:        'relative',
      display:         'flex',
      backgroundColor: 'var(--color-border-subtle)',
      borderRadius:    'var(--radius-full)',
      padding:         3,
      height:          48,
    }}>
      {/* Sliding indicator — sits behind the segment buttons, animates via transform */}
      <div style={{
        position:     'absolute',
        top:          3,
        bottom:       3,
        left:         3,
        width:        'calc(50% - 3px)',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--color-surface)',
        boxShadow:    'var(--shadow-card)',
        transform:    `translateX(${activeIndex * 100}%)`,
        transition:   'transform 0.2s ease',
      }} />

      {tabs.map(tab => {
        const isActive = activeTab === tab.key
        const fg = isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'

        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              position:       'relative',
              zIndex:         1,
              flex:           1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            6,
              padding:        '0 var(--space-2)',
              border:         'none',
              background:     'transparent',
              fontSize:       13,
              fontWeight:     isActive ? 600 : 400,
              fontFamily:     'var(--font-body)',
              cursor:         'pointer',
              color:          fg,
              transition:     'color 0.2s ease',
            }}
          >
            <Star
              size={13}
              fill={isActive ? fg : 'none'}
              strokeWidth={isActive ? 0 : 1.5}
              color={fg}
            />
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize:        11,
                fontWeight:      500,
                backgroundColor: isActive
                  ? 'var(--color-accent-light)'
                  : 'var(--color-border-subtle)',
                color:           fg,
                borderRadius:    'var(--radius-full)',
                padding:         '1px 6px',
                lineHeight:      1.5,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Hero: title + subtitle + search ───────────────────────────────────────
// Phase 2M — logo removed (title-first hierarchy, per spec: Favourites
// prioritizes content/page identity over branding — logo stays reserved
// for Home).
// Phase 2N — SearchBar is now always visible on both tabs. On Conditions it's
// live-wired; on Drugs it's a placeholder-only, unwired input (see file
// header) — the caller passes the right value/onChange/placeholder for
// whichever tab is active.

function FavouritesHero({ heroRef, searchValue, onSearchChange, searchPlaceholder }) {
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
        marginBottom: 10,
      }}>
        Your saved references
      </div>

      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        compact
      />
    </div>
  )
}

// ─── Sliding sticky header ──────────────────────────────────────────────────
// Appears once FavouritesHero scrolls out of view. Visual shell
// (position/zIndex/shadow/border-radius/transition) matches ConditionsScreen's
// StickyLogoHeader; Phase 2M replaces the logo row with a plain "Favourites"
// text label (no logo, no back arrow — Favourites is a bottom-nav tab, there's
// no "back" destination that makes sense here). Internal padding tightened.

function StickyFavouritesHeader({ visible, tabs, activeTab, onSelectTab }) {
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
          {renderTabs(tabs, activeTab, onSelectTab)}
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

  const tabs = [
    { key: 'conditions', label: 'Conditions', count: savedConditions.length },
    { key: 'drugs',      label: 'Drugs',      count: savedDrugs.length      },
  ]

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
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <div>

        <FavouritesHero
          heroRef={heroRef}
          searchValue={heroSearchValue}
          onSearchChange={heroSearchOnChange}
          searchPlaceholder={heroSearchPlaceholder}
        />

        {/* Unified segmented control — equal width, sliding indicator */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          {renderTabs(tabs, activeTab, setActiveTab)}
        </div>

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
