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
 *
 * Phase 4 — header/tab polish pass (premium, cohesive, own identity),
 *  interaction model from Phase 3 untouched:
 *  - Hero and StickyFavouritesHeader both gain a small filled Star icon
 *    beside the title, in accent color — a visual anchor distinguishing this
 *    screen from ConditionsScreen at a glance.
 *  - Vertical rhythm tightened ~15–20%: hero paddingBottom, subtitle
 *    marginBottom, tabs/search wrapper margins all trimmed.
 *  - Tab icons replaced: Star → BookOpen (Conditions) / Pill (Drugs) — the
 *    icons now represent content type rather than "favourited" status, which
 *    the Star icon never actually conveyed per-tab anyway. Icon size, gap,
 *    and label size all bumped up; button height fixed at 50px (within the
 *    48–52dp target) instead of padding-derived.
 *  - Underline: 3px → 3.5px, corners fully rounded (var(--radius-full)) for
 *    true rounded ends, still exactly matches the active cell's width.
 *  - No sort control added (none existed before — already compliant).
 *  - switchTab/touch handlers/slide-keyframe mechanism unchanged.
 *
 * Phase 5 — header composition/spacing/tab polish pass (refine, don't
 *  redesign), per updated design brief:
 *  - FavouritesHero rebuilt into one unified lockup: icon is now centered
 *    against the combined title+subtitle stack (previously centered against
 *    the title alone, with the subtitle sitting outside that row). Icon
 *    bumped 20→28px to read as the screen's visual identifier; hero
 *    paddingBottom trimmed 6→4.
 *  - Tabs-wrapper marginBottom trimmed 10→6 so the tab row sits closer to
 *    the hero. Search-wrapper spacing/order unchanged (search-bar sizing
 *    itself is explicitly out of scope this pass — lives in the shared
 *    SearchBar.jsx component).
 *  - renderTabs: active label weight 600→700 (labels stay the dominant
 *    element), icon-label gap 8→10.
 *  - renderTabs underline: height 3.5→2, added marginTop:4 for clearer
 *    separation below the label. This spec is now intentionally identical
 *    to ConditionDetailScreen's DetailHeader tab underline (also updated
 *    this pass, from 1.5px/square corners to the same 2px/rounded-full/
 *    marginTop:4 spec) — the brief required the two to match exactly, which
 *    the two screens' pre-existing specs did not.
 *  - StickyFavouritesHeader: icon 14→16, title fontSize 15→16, so page
 *    identity stays strong once scrolled. Tabs continue to render via the
 *    shared renderTabs, so they inherit the same underline change above
 *    automatically — no separate edit needed there.
 *
 * Phase 6 — amber identity + manage/bulk-remove, per updated design brief
 *  (Favourites needed its own visual identity distinct from Home/
 *  ConditionDetail's blue, plus a functional reason for a header utility
 *  icon):
 *  - New module-level FAV_ACCENT ('#F59E0B') and FAV_ACCENT_BG (its 8%
 *    tint) replace var(--color-accent) throughout this screen's icon,
 *    active tab, underline, and badge. Not an arbitrary new color —
 *    it's the exact hex RowStarButton already used for a favourited
 *    star, promoted to this screen's identity color. ConditionDetailScreen
 *    is untouched by this — it keeps var(--color-accent) blue; only the
 *    underline *geometry* (height/radius) stays shared between the two
 *    screens, per Phase 5's decision, not the color.
 *  - FavouritesHero and StickyFavouritesHeader both wrapped in a
 *    FAV_ACCENT_BG panel (rounded 16px / 18px respectively), so the
 *    screen reads as a distinct "shelf" from first paint instead of a
 *    continuation of Home's plain white scroll. Star icon moved from a
 *    bare icon into a solid FAV_ACCENT circular badge (white icon on
 *    top) — mirrors the tinted specialty-icon-bubble pattern already
 *    used in ConditionCard, rather than introducing a new visual motif.
 *  - renderTabs takes a new `counts` param and shows each tab's live
 *    favourited count (e.g. "Conditions 8") next to its label.
 *  - New manage mode, Conditions-tab only (explicit scope decision —
 *    Drugs is being reworked in a separate upcoming session, see below):
 *    a ListChecks/X toggle button sits top-right of both header variants
 *    (same visual slot Home's dark-mode toggle occupies). While active,
 *    each ConditionCard's onTap toggles selection instead of navigating,
 *    and its trailing slot swaps RowStarButton for a Circle/CheckCircle2
 *    selection indicator. A fixed ManageActionBar (same bottom:80 "above
 *    bottom nav" offset Snackbar already used) appears once ≥1 item is
 *    selected, with a live count, "Select all"/"Deselect all", and
 *    "Remove". Remove reuses ConfirmSheet with a count-aware message;
 *    confirming loops toggleCondition (confirmed safe — useFavourites'
 *    setter uses a functional update, so N calls in one tick don't
 *    clobber each other) over the selected ids, fires the existing
 *    snackbar (now with a dynamic message — see below), clears
 *    selection, and exits manage mode.
 *  - Snackbar's message is no longer hardcoded — showSnack(message) now
 *    takes the string to display, so the existing single-item remove
 *    flow ("Removed from favourites") and the new bulk flow ("Removed 3
 *    favourites") can share one component.
 *  - Manage button only renders when savedConditions.length > 0 — no
 *    reason to offer a manage action over an empty list.
 *  - Drugs tab is completely unchanged by this phase: DrugCard isn't
 *    touched, gets no selection UI, and isManaging has no effect on its
 *    rendering — rows behave exactly as before regardless of manage
 *    state. This was an explicit decision, not an oversight: the Drugs
 *    screen/card is getting its own dedicated rework soon, and adding
 *    throwaway selection wiring here now would just be rebuilt then.
 *  - Known trade-off, not fixed this pass: ConditionCard always renders
 *    its own chevron after the trailing slot, so the chevron is still
 *    visible in manage mode even though tapping now selects instead of
 *    navigating. Removing it would mean editing ConditionCard.jsx's
 *    fixed markup, which was kept out of scope for this pass.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, BookOpen, Pill, ListChecks, X, Circle, CheckCircle2, Search } from 'lucide-react'
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

// Favourites' own identity color — not var(--color-accent) (that's the app's
// blue, used throughout Home/ConditionDetail). This is the exact hex
// RowStarButton already uses for a favourited star, so promoting it to this
// screen's accent reuses a meaning the app already teaches ("amber = saved"),
// rather than introducing an arbitrary new color.
const FAV_ACCENT    = '#F59E0B'
const FAV_ACCENT_BG = 'rgba(245, 158, 11, 0.08)'

// Static tab order/labels/icons — no longer carries per-render count data, so
// this can live outside the component. Order matters: switchTab() below uses
// this array's index to figure out swipe/tap direction (forward vs backward).
// Icons represent content type (open book = reference material, pill =
// medication) rather than favourited-status, which a per-tab Star never
// actually conveyed since both tabs used the identical icon shape.
const FAVOURITES_TABS = [
  {
    key: 'conditions',
    label: 'Conditions',
    renderIcon: (color) => <BookOpen size={15} strokeWidth={1.8} color={color} />,
  },
  {
    key: 'drugs',
    label: 'Drugs',
    renderIcon: (color) => <Pill size={15} strokeWidth={1.8} color={color} />,
  },
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

// ─── Manage-mode bulk action bar ─────────────────────────────────────────────
// Fixed above the bottom nav (same 80px offset Snackbar already uses for the
// same purpose). Only ever shown while managing AND at least one condition is
// selected — the Drugs tab has no selection mechanism yet (deferred, see file
// header), so this bar only ever reflects Conditions-tab selections.

function ManageActionBar({ count, allSelected, onToggleSelectAll, onRemove }) {
  return (
    <div style={{
      position:        'fixed',
      left:            0,
      right:           0,
      bottom:          80,
      zIndex:          60,
      display:         'flex',
      justifyContent:  'center',
      pointerEvents:   'none',
    }}>
      <div style={{
        pointerEvents:   'auto',
        width:           'calc(100% - var(--space-6) * 2)',
        maxWidth:        680 - 48,
        backgroundColor: 'var(--color-surface)',
        borderRadius:    'var(--radius-lg)',
        boxShadow:       '0 8px 24px rgba(0, 0, 0, 0.14)',
        padding:         '10px 14px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {count} selected
          </span>
          <button
            onClick={onToggleSelectAll}
            style={{
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              fontSize:       13,
              color:          FAV_ACCENT,
              fontFamily:     'var(--font-body)',
              padding:        0,
              textDecoration: 'underline',
            }}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <button
          onClick={onRemove}
          style={{
            padding:         '8px 16px',
            borderRadius:    'var(--radius-full)',
            border:          'none',
            backgroundColor: 'var(--color-danger)',
            color:           '#fff',
            fontSize:        13,
            fontWeight:      600,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
            flexShrink:      0,
          }}
        >
          Remove
        </button>
      </div>
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
// button) instead of content-sized columns, no count badge.
// Phase 4 — content-type icons (BookOpen/Pill, via FAVOURITES_TABS.renderIcon)
// replace the Star fill-toggle — fixed 50px tap height (within 48–52dp target,
// vs the previous 10px-padding-derived height), larger icon/label, wider
// icon-label gap, fully-rounded thicker underline for true "rounded ends."
// Active: semibold + accent blue. Inactive: medium weight (500) + secondary gray.

function renderTabs(activeTab, onSelect, counts) {
  return (
    <div style={{ display: 'flex' }}>
      {FAVOURITES_TABS.map(tab => {
        const isActive = activeTab === tab.key
        const fg = isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'
        const count = counts ? counts[tab.key] : undefined

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
                gap:            10,
                height:         50,
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
              {tab.renderIcon(fg)}
              <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: fg }}>
                {tab.label}
              </span>
              {typeof count === 'number' && (
                <span style={{ fontSize: 12, fontWeight: 500, color: fg, opacity: 0.75 }}>
                  {count}
                </span>
              )}
            </button>
            {/* Underline — full width of this 50% cell, exactly matching the
                active tab's rendered width; rounded ends; visible only
                beneath the active tab. Spec kept in lockstep with
                ConditionDetailScreen's DetailHeader underline — required to
                be pixel-identical, so any change here must be mirrored there. */}
            <span style={{
              display:         'block',
              height:          2,
              width:           '100%',
              marginTop:       3,
              borderRadius:    'var(--radius-full)',
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
// Phase 4 — small filled Star icon added beside the title as a visual
// anchor/identity marker (distinguishes this screen from ConditionsScreen at
// a glance, per the "header identity" requirement) — same treatment mirrored
// in StickyFavouritesHeader below. Vertical rhythm tightened: paddingBottom
// 8→6, subtitle marginBottom 6→5.

function FavouritesHero({ heroRef, isManaging, onToggleManage, showManageButton, isSearching, onToggleSearch }) {
  return (
    <div ref={heroRef} style={{
      backgroundColor: FAV_ACCENT_BG,
      borderRadius:    16,
      padding:         '14px 14px 14px',
      marginTop:       'var(--space-4)',
    }}>
      {/* Single lockup: badge icon on the left, centered against the combined
          title+subtitle stack (not against the title alone) — one cohesive
          unit rather than icon+title as one row and subtitle as a separate
          block underneath. Manage toggle sits on the right, filling the
          same visual slot Home's dark-mode toggle occupies. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width:           38,
            height:          38,
            borderRadius:    '50%',
            backgroundColor: FAV_ACCENT,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}>
            <Star size={18} fill="#fff" color="#fff" strokeWidth={0} />
          </div>
          <div style={{ minWidth: 0 }}>
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
              fontSize:  13,
              color:     'var(--color-text-tertiary)',
              marginTop: 2,
            }}>
              Your saved references
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onToggleSearch}
            aria-label={isSearching ? 'Close search' : 'Search favourites'}
            style={{
              width:                   36,
              height:                  36,
              borderRadius:            '50%',
              border:                  'none',
              backgroundColor:         isSearching ? FAV_ACCENT : 'var(--color-surface)',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              flexShrink:              0,
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            {isSearching
              ? <X size={17} color="#fff" strokeWidth={2} />
              : <Search size={17} color="#412402" strokeWidth={1.8} />}
          </button>

          {showManageButton && (
            <button
              onClick={onToggleManage}
              aria-label={isManaging ? 'Exit manage mode' : 'Manage favourites'}
              style={{
                width:                   36,
                height:                  36,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         isManaging ? FAV_ACCENT : 'var(--color-surface)',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline:                 'none',
              }}
            >
              {isManaging
                ? <X size={17} color="#fff" strokeWidth={2} />
                : <ListChecks size={17} color="#412402" strokeWidth={1.8} />}
            </button>
          )}
        </div>
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
// Phase 4 — carries the same leading Star icon as the expanded hero (scaled
// down) so the collapsed state reads as an intentionally-designed compact
// header, not a cropped one. Still icon + title + tabs only — no subtitle,
// no search, per spec.

function StickyFavouritesHeader({ visible, activeTab, onSelectTab, isManaging, onToggleManage, showManageButton, counts, isSearching, onToggleSearch, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <div
      aria-hidden="true"
      className="fav-sticky-header"
      style={{
        position:                'fixed',
        top:                     0,
        left:                    0,
        right:                   0,
        zIndex:                  50,
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* Title row — badge icon + text on the left, manage toggle on the
            right, same lockup as the expanded hero at a smaller scale */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
          padding:        '14px var(--space-6) 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width:           26,
              height:          26,
              borderRadius:    '50%',
              backgroundColor: FAV_ACCENT,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <Star size={13} fill="#fff" color="#fff" strokeWidth={0} />
            </div>
            <div style={{
              fontSize:      16,
              fontWeight:    700,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.2px',
            }}>
              Favourites
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onToggleSearch}
              aria-label={isSearching ? 'Close search' : 'Search favourites'}
              style={{
                width:                   28,
                height:                  28,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         isSearching ? FAV_ACCENT : 'var(--color-surface)',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline:                 'none',
              }}
            >
              {isSearching
                ? <X size={13} color="#fff" strokeWidth={2} />
                : <Search size={13} color="#412402" strokeWidth={1.8} />}
            </button>

            {showManageButton && (
              <button
                onClick={onToggleManage}
                aria-label={isManaging ? 'Exit manage mode' : 'Manage favourites'}
                style={{
                  width:                   28,
                  height:                  28,
                  borderRadius:            '50%',
                  border:                  'none',
                  backgroundColor:         isManaging ? FAV_ACCENT : 'var(--color-surface)',
                  display:                 'flex',
                  alignItems:              'center',
                  justifyContent:          'center',
                  flexShrink:              0,
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  outline:                 'none',
                }}
              >
                {isManaging
                  ? <X size={13} color="#fff" strokeWidth={2} />
                  : <ListChecks size={13} color="#412402" strokeWidth={1.8} />}
              </button>
            )}
          </div>
        </div>

        {/* Tabs — same content as the in-page row, kept in sync via renderTabs.
            position: relative so the overlay search row (rendered from the
            main FavouritesScreen body) can anchor flush beneath this tab
            row when opened while the sticky header is active. */}
        <div style={{
          position:  'relative',
          marginTop: 6,
          padding:   '0 var(--space-6) 10px',
        }}>
          {renderTabs(activeTab, onSelectTab, counts)}

          {isSearching && (
            <div style={{
              position:        'absolute',
              top:             '100%',
              left:            'var(--space-6)',
              right:           'var(--space-6)',
              paddingTop:      8,
              paddingBottom:   10,
              backgroundColor: 'var(--color-surface)',
              boxShadow:       '0 4px 12px rgba(0, 0, 0, 0.08)',
              borderBottomLeftRadius:  12,
              borderBottomRightRadius: 12,
              zIndex:          1,
            }}>
              <SearchBar
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                compact
              />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conditions')

  // Snackbar state — message is now dynamic (bulk-remove needs a count-aware
  // string; single-item remove keeps its original fixed message).
  const [snackVisible, setSnackVisible] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const snackTimer = useRef(null)

  function showSnack(message) {
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackMessage(message)
    setSnackVisible(true)
    snackTimer.current = setTimeout(() => setSnackVisible(false), 2000)
  }

  // ── Search overlay (icon-triggered, replaces the old always-visible bar) ──
  // Opening scrolls to top ONCE so the overlay never hides cards it covers —
  // it does not push content down, so anything already scrolled past the
  // header would otherwise sit hidden underneath it.
  const [isSearching, setIsSearching] = useState(false)

  function toggleSearch() {
    setIsSearching(prev => {
      if (!prev) window.scrollTo({ top: 0, behavior: 'auto' })
      return !prev
    })
  }

  // ── Manage mode (Conditions tab only — Drugs is deferred, see file header
  // Phase 6 note below) ───────────────────────────────────────────────────
  const [isManaging, setIsManaging] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  function toggleManage() {
    setIsManaging(prev => !prev)
    setSelectedIds(new Set())
  }

  function toggleSelectCondition(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  function handleConfirmBulkRemove() {
    const ids = Array.from(selectedIds)
    ids.forEach(id => toggleCondition(id))
    showSnack(`Removed ${ids.length} favourite${ids.length === 1 ? '' : 's'}`)
    setSelectedIds(new Set())
    setIsManaging(false)
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
    showSnack('Removed from favourites')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDrug])

  // Condition removal confirms first — see ConfirmSheet below.
  const [confirmingCondition, setConfirmingCondition] = useState(null)

  function handleConfirmRemoveCondition() {
    if (!confirmingCondition) return
    toggleCondition(confirmingCondition.id)
    showSnack('Removed from favourites')
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
        isManaging={isManaging}
        onToggleManage={toggleManage}
        showManageButton={savedConditions.length > 0}
        counts={{ conditions: savedConditions.length, drugs: savedDrugs.length }}
        isSearching={isSearching}
        onToggleSearch={toggleSearch}
        searchValue={heroSearchValue}
        onSearchChange={heroSearchOnChange}
        searchPlaceholder={heroSearchPlaceholder}
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

        <FavouritesHero
          heroRef={heroRef}
          isManaging={isManaging}
          onToggleManage={toggleManage}
          showManageButton={savedConditions.length > 0}
          isSearching={isSearching}
          onToggleSearch={toggleSearch}
        />

        {/* Tab bar — chooses which collection (Conditions/Drugs) is being
            browsed. position: relative so the overlay search row below can
            anchor flush beneath it. The old always-visible SearchBar block
            that used to sit here has been removed — search is now
            icon-triggered from the header (see FavouritesHero/
            StickyFavouritesHeader) and renders as this overlay instead. */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          {renderTabs(activeTab, switchTab, { conditions: savedConditions.length, drugs: savedDrugs.length })}

          {isSearching && (
            <div style={{
              position:        'absolute',
              top:             '100%',
              left:            0,
              right:           0,
              paddingTop:      8,
              paddingBottom:   10,
              backgroundColor: 'var(--color-surface)',
              boxShadow:       '0 4px 12px rgba(0, 0, 0, 0.08)',
              borderBottomLeftRadius:  12,
              borderBottomRightRadius: 12,
              zIndex:          1,
            }}>
              <SearchBar
                value={heroSearchValue}
                onChange={heroSearchOnChange}
                placeholder={heroSearchPlaceholder}
                compact
              />
            </div>
          )}
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
                        onTap={
                          isManaging
                            ? () => toggleSelectCondition(condition.id)
                            : () => navigate(`/conditions/${condition.slug}`)
                        }
                        trailing={
                          isManaging
                            ? (
                                <span style={{
                                  padding:        '14px 8px',   // matches RowStarButton's footprint
                                  display:        'flex',       // so row height stays constant across modes
                                  alignItems:     'center',
                                  justifyContent: 'center',
                                }}>
                                  {selectedIds.has(condition.id)
                                    ? <CheckCircle2 size={20} color="#fff" fill={FAV_ACCENT} strokeWidth={2} />
                                    : <Circle size={20} color="var(--color-border)" strokeWidth={1.8} />}
                                </span>
                              )
                            : (
                                <RowStarButton
                                  onPress={() => setConfirmingCondition(condition)}
                                />
                              )
                        }
                      />
                    ))
            )}

            {/* ── Drugs tab ── */}
            {/* Phase 6 — manage mode is Conditions-only this session (explicit
                decision, deferred): DrugCard has no trailing/selection slot,
                and this screen's Drugs tab has no per-row remove control at
                all yet (see Phase 2M note above). Rows here render exactly
                as before regardless of isManaging — no checkboxes, no
                selection, nothing wired. Revisit once the Drugs screen/card
                rework lands. */}
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

      {isManaging && selectedIds.size > 0 && (
        <ManageActionBar
          count={selectedIds.size}
          allSelected={selectedIds.size === conditionResults.length}
          onToggleSelectAll={() => {
            setSelectedIds(prev =>
              prev.size === conditionResults.length
                ? new Set()
                : new Set(conditionResults.map(c => c.id))
            )
          }}
          onRemove={() => setShowBulkConfirm(true)}
        />
      )}

      <ConfirmSheet
        isOpen={!!confirmingCondition}
        onClose={() => setConfirmingCondition(null)}
        onConfirm={handleConfirmRemoveCondition}
        title="Remove from favourites?"
        message={confirmingCondition ? `"${confirmingCondition.name}" will be removed from your favourites.` : ''}
        confirmLabel="Remove"
        destructive
      />

      <ConfirmSheet
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleConfirmBulkRemove}
        title="Remove favourites?"
        message={`${selectedIds.size} favourite${selectedIds.size === 1 ? '' : 's'} will be removed from your saved conditions.`}
        confirmLabel="Remove"
        destructive
      />

      <Snackbar visible={snackVisible} message={snackMessage} />
    </Layout>
  )
}
