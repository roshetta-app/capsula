/**
 * src/pages/DrugsScreen.jsx
 * Phase 2I — adds fuzzy search + autocomplete dropdown.
 * 1A.5 — swapped the static DRUG_CATEGORIES/getCategoryMeta pair for the
 *        live useCategories() hook. Category matching keys off the
 *        category's slug (the plan's decided design: generics.category is
 *        plain text but stores the stable slug, not the editable name_en
 *        label). Icon/color rendering now goes through the same
 *        SpecialtyIcon + color-token system the specialties feature already
 *        uses, since drug_categories was built as a twin of it.
 *        Note: today's live data still holds old-taxonomy values until
 *        Phase 1B's rebuild lands, so most categories show 0 drugs for now
 *        — see GFB_STEPS.md 1A.5.
 *
 * 2026-10-04 (search mode and sort on the screen): Search Mode and Sort By
 * moved out of the filter sheet onto this screen, using the brand list's
 * pop-up and button style (BrandsList.jsx). Search Mode is one button above
 * the search bar showing the current mode (Brand, Generic or Class); tapping it
 * opens a pop-up with the three modes, and a pick switches at once and closes
 * it. It sits in the same place in the category view and the results view, so
 * the search box is not rebuilt (and the keyboard not closed) when typing
 * starts. Sort By (Relevance, Cheapest first) is a quiet text button on its own
 * line under the count and Clear filter line, shown only while something is
 * typed (so not on the one-character 'Keep typing' state, and not in Class
 * search, which shows cards). While class cards are showing, the filter button
 * in the search bar stays but is greyed out and not tappable, because the
 * filter sheet now holds Form / Route only and that does not apply to cards. The 'Searching in X mode'
 * message is gone; the button shows the mode. Mode and sort still live in
 * DrugContext, so they survive opening a drug and coming back.
 *
 * 2026-10-04 (Search mode row layout): the row above the search bar now has the
 * text 'Search mode' on the left and the mode button on the right. The button
 * is a fixed width, so it keeps the same size for Brand, Generic and Class.
 * The Sort By button sits on the left of its line (it was on the right).
 *
 * 2026-10-04 (Search mode and Sort styling): 'Search mode' text is bold, black
 * and bigger. The mode button has two looks: default is a white button with a
 * thin outline; active (Generic or Class) is the soft blue-tinted pill that
 * 'Related drugs' uses. Sort By is black and a little bigger. The 'Keep typing
 * to narrow these results' line now sits above the Sort By button. Both
 * buttons are now drawn in this file (ModeButton, SortByButton), so the brand
 * list's own buttons in BrandsList.jsx are untouched.
 *
 * 2026-10-04 (mode button one look, Clear filter space): the mode button now
 * uses the blue pill look in all three modes (Brand included). The three rows
 * that can show the Clear filter button keep the button's height (28px) even
 * while it is hidden, so nothing jumps when it appears.
 *
 * 2026-10-04 (Search mode info): a small info icon sits right after the
 * 'Search mode' title and opens SearchModeInfoSheet.jsx, a pop-up that explains
 * Brand, Generic and Class search with Controloc as the example.
 *
 * 2026-10-04 (Search Mode pop-up items): the three pop-up items now read
 * 'Brand mode', 'Generic mode' and 'Class mode' and are drawn bigger (the
 * 'large' option of FilterModal in BrandsList.jsx). The button above the search
 * bar still shows the short name. The info icon by the 'Search mode' title is
 * smaller (14px); its tap area is unchanged.
 *
 * 2026-10-04 (mode accents): the Search mode button and the pop-up items use the
 * same accent per mode as the info sheet: Brand blue, Generic green, Class
 * violet (theme variables). Generic uses its own soft green, --color-generic.
 *
 * 2026-10-04 (mode switch loading): switching Search Mode while a search is on
 * screen now shows placeholder rows (SearchSwitchingState) instead of a blank
 * gap while the new mode's results load.
 *
 * 2026-10-04 (Browse by class): the Drugs home has a Category / Class switch
 * under the 'Browse by' title. Class lists every class (A to Z) as the same
 * cards Class search uses; tapping one opens the class sheet like Class search.
 *
 * 2026-10-04 (Families wording): the Class-mode texts the person reads say
 * 'drug family' instead of 'subclass' (no-match message, its hint, the search
 * placeholder). Names in the code are unchanged.
 *
 * Changes from 2F:
 *  - useSearch (simple includes) → useDrugSearch (Fuse.js fuzzy, gap logging)
 *  - Inline SearchBar → shared src/components/ui/SearchBar
 *  - AutocompleteDropdown added below search bar in results view
 *  - Autocomplete: tap suggestion → navigate directly to /drugs/:slug
 *
 * GFB step 3.5.6 (2026-07-16): added a Brand/Generic segmented toggle next
 * to the search bar, shown only while a query is active — category
 * browsing is untouched. `mode` is lifted here and passed into
 * useDrugSearch, which already builds both split indexes per step 3.5.5.
 *
 * 2026-07-16: the drug/search results list now renders through
 * react-virtual's window virtualizer instead of a plain .map() — with the
 * full catalog live (19,771 items) rendering every row as a real DOM node
 * made "All Drugs" heavy. Layout renders <main> in normal page flow (no
 * boxed scroll container) for this route, so the page's own window scroll
 * is virtualized — scroll look and feel is unchanged. The category-picker
 * list further down (~14 tiles) is short enough that it's left as a plain
 * list.
 *
 * 2026-07-18 (drug_library_ui_ux, plan §7 step 1a.1): added DrugsHero — the
 * new title-first main header (icon badge + "Drugs" + subtitle), replacing
 * the previous bare shared-layout bar with no header of its own on this
 * screen. Mounted at the top of both view states (search/category-results
 * and the category-list view) since it's the same top-of-page header
 * regardless of which one is showing. Action-button slot is intentionally
 * left empty for now — decision 4.4, what goes there is area 2's call
 * (steps 1a.2/1a.3), not this one. heroRef is threaded through now (unused
 * so far) so step 1a.2's sticky-header scroll detection can measure this
 * same element without another pass over this file.
 *
 * 2026-07-18 (drug_library_ui_ux, plan §7 step 1b.1, decision 4.7): removed the
 * AutocompleteDropdown overlay. Typing already drove searchResults/the on-screen
 * list independently of the suggestions dropdown, so nothing about filtering
 * changed — only the extra overlay and its wiring (suggestions, showSuggestions,
 * clearSuggestions, handleSuggestionSelect) came out. Brings Drugs in line with
 * how Conditions already works.
 *
 * 2026-07-18 (drug_library_ui_ux, plan §7 step 1b.2, decision 4.8): restyled the
 * recently-viewed row to match RecentlyViewedChips.jsx exactly — clock icon +
 * "Recent" label, thin separator, plain-text drug-name links with · dots,
 * single scrollable line, right-edge fade hint. Replaces the old pill-button
 * chip row. Same recentDrugs data/localStorage source, navigation behavior
 * unchanged — visual only.
 *
 * 2026-07-18 (drug_library_ui_ux, plan §7 step 1c.1, decision 4.9): fixed a real
 * bug — typing a query while browsing inside a category searched the whole
 * catalog instead of staying scoped to that category. The `hasQuery`/
 * `activeCategory` branches were treated as mutually exclusive when they
 * aren't; `base` now filters `searchResults` down to `activeCategory` too
 * when both are active. Search index itself is unchanged (still built once
 * against the full catalog for performance) — this only narrows its results.
 *
 * 2026-07-18 (decision 4.10): category was made pickable from inside
 * DrugFilterPanel too, kept in sync with the tiles — reverted 2026-07-19
 * (user decision). Category is tile-only again; the sheet no longer takes
 * `categories`/`activeCategory` props or returns a category from Apply.
 * `categoriesWithCounts` stays hoisted here regardless, since the category
 * tile list below still needs it.
 *
 * 2026-07-19: added a "Search all drugs instead" link, shown above results
 * whenever searching inside a specific category. 1c.1 scopes in-category
 * search on purpose, but a true match inside the category can still hide a
 * same-name drug filed under a different one — this gives an explicit way
 * out without changing default scoped behavior. Tapping it keeps the typed
 * query and sets `activeCategory` to `'__all'`, the existing unscoped
 * sentinel, rather than introducing a new state combination.
 *
 * 2026-07-18 (drug_library_ui_ux, plan §7 step 1c.3, decision 4.21): softened
 * `CategoryRow`'s tile style — dropped the "N drugs" count line (and the
 * `count` prop, now unused, from both call sites), lightened the border to
 * `--color-border-subtle`, and moved the shadow to
 * `--shadow-ambient-selector`. Radius unchanged. `categoriesWithCounts`'
 * `count` field is still used to filter out empty categories — only the
 * on-screen display of it is gone.
 *
 * 2026-07-19 (Drugs search-bar polish) — fixed a real bug: typing the first
 * character closed the on-screen keyboard, forcing a second tap into the
 * search bar to keep typing. Root cause: the search-results view and the
 * category-list view below are two separate early 'return's with genuinely
 * different trees, and the search-results one used to wrap SearchBar in an
 * extra flex row (to sit next to the Brand/Generic toggle) that the
 * category-list view didn't have. The moment 'hasQuery' flipped true on the
 * first keystroke, React saw a different element at that position and threw
 * away the old input — including its focus — rather than reusing it. Fix:
 * the Brand/Generic toggle moved out of this row entirely (now inside
 * DrugFilterPanel — see that file), and both views now wrap SearchBar in
 * the exact same single <div> at the exact same position, so React keeps
 * the same input across the transition instead of remounting it. Also
 * moved the filter trigger inside the search pill itself (see
 * SearchBar.jsx) — the row no longer has anything squeezing the input.
 *
 * 2026-08-09 (drug category back-gesture navigation): `activeCategory` is no
 * longer local component state — it's now derived from the URL's
 * `categorySlug` route param (`/drugs`, `/drugs/category/all`,
 * `/drugs/category/:slug`), read via `useParams()`. This makes the phone's
 * back gesture return to the category grid the same standard way it already
 * returns from a drug detail page, instead of leaving the Drugs tab
 * entirely. The in-memory `'__all'` sentinel is preserved internally (every
 * comparison below is unchanged) and mapped to/from the URL word `all` at
 * the two edges: the derivation below, and the `ROUTES.DRUGS_CATEGORY('all')`
 * navigate calls that replace the old `setActiveCategory('__all')` calls.
 * Because DrugsScreen sits at the same position in the route tree for all
 * three URLs, React Router re-renders rather than remounts it — query text,
 * active filters, and recent-drugs state all survive tapping into and out
 * of a category.
 *
 * drug-filter-instant-apply (results-line clear filters) — added a
 * "Clear filters" link inline with the results-count line in the search
 * results view, matching the two spots ClearFiltersButton already appeared
 * (category back-row, "Browse by category" row). All three now go through
 * a shared confirm step (ConfirmSheet) rather than clearing immediately —
 * requestClearFilters() opens the sheet; handleClearFilters() (the actual
 * clear) only runs on confirm. ClearFiltersButton also gained the same
 * pointer-driven press feedback already used elsewhere in this file
 * (CategoryRow, RecentlyViewedButton) rather than a new pattern.
 *
 * 2026-10-04 (Class search mode, CLASS_SEARCH_MODE_PLAN.md): 'mode' can now be
 * 'class'. With a query typed in that mode the results area shows class and
 * subclass cards (ClassSearchResults) instead of drug rows, and it ignores the
 * category scope and the Form/Route filter (they apply to drug rows, not to
 * cards). Tapping a class card opens the class sheet (ClassBottomSheet) on its
 * subclass list, or straight on its drugs when the class has no subclasses;
 * tapping a subclass card opens the sheet straight on that subclass's drugs,
 * and Back closes the sheet. A tapped drug opens like any drug row. The empty
 * states are reused with Class wording: 'Did you mean' names, a hint when the
 * typed text is really a drug name (switches to Generic or Brand), and a plain
 * 'no class or subclass matches' state. With nothing typed, Class mode shows
 * the usual category list and category browsing, unchanged. While the results
 * of the other kind are still on their way (the search waits 150ms after
 * typing or after a mode change), nothing is drawn in the results area, so a
 * wrong empty state never flashes. Class searches are not logged.
 *
 * 2026-10-04 (Search and Browse as two equal areas, full refactor of the top
 * of the screen): the Drugs screen is now the hero, then two matching cards of
 * equal weight, 'Search' and (on the home view) 'Browse', drawn by
 * DrugsSearchSection.jsx, DrugsBrowseSection.jsx and the shared
 * DrugsSectionCard.jsx in components/drugs/home/. The Search area holds its
 * title with the info icon, the Search Mode button, the search bar, the Clear
 * filter button (moved here from three other spots, next to the filter button
 * it belongs to) and the Recently viewed shortcut (home view only, moved
 * under the search bar). It is written once and drawn in every view; before,
 * the search bar and the Search mode row were written out twice, once per
 * view, which is what the 2026-07-19 keyboard bug above came from. The
 * Browse area's Category / Class switch is now inside its title ('Browse by
 * Category · Class', one tap) instead of a separate switch under it, and the
 * choice is remembered in DrugContext (browseMode) like Search mode, so it
 * survives opening a drug or switching tabs. The Search Mode pop-up and its
 * info sheet moved into the Search area; the Sort By pop-up stays here and
 * both use the shared pop-up in ui/FilterModal.jsx (it used to be borrowed
 * from BrandsList.jsx). The small pieces that were written in this file
 * (ModeButton, CategoryRow, RecentlyViewedButton, FilledHintButton,
 * ClearFiltersButton, the loading placeholder and the failed-download
 * message) moved unchanged to components/drugs/home/. Filtering, sorting, the
 * class sheet and the result states are as they were. Older notes above that
 * say 'Browse by' or describe the Search mode row or the buttons now in
 * components/drugs/home/ describe the same code, now in those files.
 */

import { FilterX, SearchX, Lightbulb, ArrowLeftRight, Search, Target, ArrowDown01, ArrowUpDown, ChevronDown } from 'lucide-react'
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import SharedDrugCard from '../components/SharedDrugCard'
import RowStarButton from '../components/ui/RowStarButton'
import DrugFilterPanel, { FORM_OPTIONS } from '../components/drugs/DrugFilterPanel'
import { FilterModal } from '../components/ui/FilterModal'
import ClassSearchResults from '../components/drugs/ClassSearchResults'
import ClassBottomSheet, { ALL_KEY as ALL_CLASS_DRUGS_KEY } from '../components/drugs/sections/ClassBottomSheet'
import RecentlyViewedSheet from '../components/drugs/RecentlyViewedSheet'
import DrugsInfoSheet from '../components/drugs/DrugsInfoSheet'
import DrugsSearchSection, { MODE_OPTIONS } from '../components/drugs/home/DrugsSearchSection'
import ModeButton from '../components/drugs/home/ModeButton'
import DrugsBrowseSection from '../components/drugs/home/DrugsBrowseSection'
import FilledHintButton from '../components/drugs/home/FilledHintButton'
import { shimmer } from '../components/drugs/home/shimmer'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import BackToTopButton from '../components/ui/BackToTopButton'
import SearchBar from '../components/ui/SearchBar'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { logUsageEvent } from '../analytics/usageEvents'
import { normalizeSearchText } from '../utils/searchUtils'
import { titleCaseWords, buildClassIndex } from '../utils/classSearch'
import { useCategories } from '../hooks/useCategories'
import { useBackToTop } from '../hooks/useBackToTop'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { SpecialtyIcon, useIsDark } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'
import { ROUTES } from '../router'

// ─── applyFilters ─────────────────────────────────────────────────────────────

function applyFilters(drugs, filters) {
  if (!filters) return drugs
  let result = drugs

  // Form — each selected chip covers a set of real raw form values (see
  // DrugFilterPanel's FORM_OPTIONS), not a single value, so match against
  // the combined set of raw values for every chip that's currently active.
  // A chip can also define `routes` (currently only Inhaled) for real
  // items whose `form` is a generic label (piece/powder/solution) but
  // whose `route` is the actual signal — a drug matches if its form is in
  // the active matches set OR its route is in the active routes set.
  if (!filters.forms.includes('all')) {
    const activeOptions = FORM_OPTIONS.filter(opt => filters.forms.includes(opt.value))
    const activeFormMatches  = new Set(activeOptions.flatMap(opt => opt.matches))
    const activeRouteMatches = new Set(activeOptions.flatMap(opt => opt.routes ?? []))
    result = result.filter(d =>
      activeFormMatches.has(d.form?.toLowerCase()) ||
      (d.route && activeRouteMatches.has(d.route.toLowerCase()))
    )
  }

  return result
}

// drug-search-sort-cheapest — ascending by price; drugs with no price (5 of
// ~19,774 brands, per DB check) sort to the end rather than the front, since
// a missing price isn't "free" and treating it as 0 would be misleading.
function sortByPrice(drugs) {
  return drugs.slice().sort((a, b) => {
    const priceA = a.price ?? Infinity
    const priceB = b.price ?? Infinity
    return priceA - priceB
  })
}

// Sort By pop-up options. The pop-up is the shared one (ui/FilterModal.jsx). The
// Search Mode options live with the Search area (DrugsSearchSection.jsx).
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance',      icon: Target },
  { value: 'cheapest',  label: 'Cheapest first', icon: ArrowDown01 },
]

// Sort By button: plain text with a small icon and chevron, no outline or
// fill. Black and a little bigger than the brand list's own Sort button.
function SortByButton({ label, onPress }) {
  return (
    <button
      onClick={onPress}
      aria-haspopup="dialog"
      style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     5,
        flexShrink:              0,
        background:              'none',
        border:                  'none',
        padding:                 '6px 0',
        fontSize:                14,
        fontWeight:              600,
        color:                   'var(--color-text-primary)',
        fontFamily:              'var(--font-body)',
        cursor:                  'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <ArrowUpDown size={16} color="var(--color-text-primary)" style={{ flexShrink: 0 }} />
      <span>{label}</span>
      <ChevronDown size={15} color="var(--color-text-primary)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// ─── DrugsScreen ──────────────────────────────────────────────────────────────

// Set when a category card is tapped, cleared once the page has jumped to the
// top (see the layout effect in DrugsScreen).
let scrollTopOnCategoryOpen = false

export default function DrugsScreen() {
  const navigate           = useNavigate()
  const { categorySlug }   = useParams()
  const {
    drugs, loading, error, retry,
    mode, setMode,
    activeFilters, setActiveFilters,
    sortMode, setSortMode,
    browseMode, setBrowseMode,
    query, setQuery,
    results:         searchResults,
    queryTooShort,
    suggestions,
    crossModeMatch,
    classResults,
    crossModeTarget,
  } = useDrugContext()
  const { categories } = useCategories()
  const { toggleDrug, isDrugFavourited } = useFavouritesContext()
  const { visible: showBackToTop, scrollToTop: handleBackToTop } = useBackToTop()
  const isDark = useIsDark()
  const heroRef = useRef(null)

  // Bookmark tap behavior (step 1d.6, decision 4.16 first half, CORRECTED
  // drug-fav-toggle-scope): on Drugs, tapping the bookmark used to toggle
  // favourite status both ways (add and remove) right on this screen. That
  // let a stray tap on an already-saved drug silently un-favourite it while
  // just browsing, with no confirm step — unlike Favourites' own remove
  // flow, which is deliberately gated behind ConfirmSheet. Now add-only
  // here: tapping an unfavourited drug still favourites it instantly (no
  // change there), but tapping an already-favourited one is a no-op.
  // Removing a favourite is only possible from the Favourites screen's own
  // confirm-then-remove flow. Screen-owned, not card-owned, mirroring
  // ConditionCard's precedent. Wired to each row's trailing slot below
  // (step 1d.8).
  function handleToggleDrugFavourite(id) {
    if (isDrugFavourited(id)) return
    toggleDrug(id)
  }

  // 2026-08-09: activeCategory is now derived from the URL's :categorySlug
  // param instead of local state — see file header. null = category list
  // (bare /drugs), '__all' = the existing unscoped sentinel (URL word
  // "all"), anything else = that category's slug, taken as-is from the URL.
  const activeCategory = categorySlug === 'all' ? '__all' : (categorySlug ?? null)

  // A tapped category card (or the All Drugs tile) starts the page at the top.
  // handleOpenCategory leaves a note (a module-level flag, so it survives the
  // screen being rebuilt when the address changes) and this runs as soon as
  // the category is on screen, before it is drawn. Coming back from a drug
  // page or leaving a category sets no note, so those keep their place.
  useLayoutEffect(() => {
    if (scrollTopOnCategoryOpen && activeCategory !== null) {
      scrollTopOnCategoryOpen = false
      window.scrollTo(0, 0)
      // Once more on the next frame, in case the list's first measuring
      // nudged the page.
      requestAnimationFrame(() => window.scrollTo(0, 0))
    }
  }, [activeCategory])

  const { history: recentDrugs, addRecentlyViewed: addRecentDrug } = useRecentlyViewed('drug')
  const [filterOpen,       setFilterOpen]       = useState(false)
  // The Sort By pop-up. (The Search Mode pop-up and its info sheet belong to
  // the Search area now, see DrugsSearchSection.jsx.)
  const [showSortMenu,     setShowSortMenu]     = useState(false)
  // Search Mode pop-up: opened from the Search card's mode button or the
  // sticky header's, so its open state lives here.
  const [modeMenuOpen,      setModeMenuOpen]     = useState(false)
  const [showRecentSheet,  setShowRecentSheet]  = useState(false)
  const [showInfoSheet,    setShowInfoSheet]    = useState(false)
  // Class search mode: the class sheet opened from a class or subclass card.
  // 'classTarget' stays after the sheet closes so it can slide out showing the
  // same content; 'classSheetKey' changes on every open so each opening starts
  // fresh (on the subclass list, or straight on the asked-for drugs).
  const [classSheetOpen, setClassSheetOpen] = useState(false)
  const [classTarget,    setClassTarget]    = useState(null)   // { className, direct }
  const [classSheetKey,  setClassSheetKey]  = useState(0)
  // drug-filter-instant-apply — gates the actual clear behind a confirm
  // step; requestClearFilters() (below) opens this, handleClearFilters()
  // only runs from ConfirmSheet's onConfirm.
  const [showClearFiltersConfirm, setShowClearFiltersConfirm] = useState(false)

  // Phase 5 (§4.3/§4.7) — dedup key is "mode:normalizedTerm", same shape as
  // useDrugSearch.js's near-miss/gap refs, so a repeated search for the same
  // term in the same mode only logs once per session.
  const loggedFilterMaskedTermsRef = useRef(new Set())

  // Recently-viewed sheet needs full drug records (SharedDrugCard's props),
  // not just the {id, name, slug} shape stored in localStorage — resolved
  // here against the already-loaded catalog, in stored (most-recent-first)
  // order. Entries no longer present in the live catalog are dropped
  // rather than shown as broken rows.
  const recentDrugObjects = recentDrugs
    .map(d => drugs.find(x => x.id === d.id))
    .filter(Boolean)

  // ── Sliding sticky header: visible once DrugsHero leaves viewport ────────
  // Same IntersectionObserver approach as FavouritesScreen's heroRef watch
  // (step 1a.2, decision 4.6). heroRef is the one already threaded through
  // both view branches by step 1a.1.
  const [showStickyHeader, setShowStickyHeader] = useState(false)

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

  function handleDrugTap(drug) {
    addRecentDrug({ id: drug.id, name: drug.genericName, slug: drug.slug || drug.id })
    navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))
  }

  function handleApplyFilters(filters) {
    // Check if anything is actually active
    const hasActive = !filters.forms.includes('all')
    setActiveFilters(hasActive ? filters : null)
  }

  function handleClearFilters() {
    setActiveFilters(null)
  }

  // drug-filter-instant-apply — opens the confirm step instead of clearing
  // directly. Every Clear filter button on this screen calls this now, not
  // handleClearFilters itself.
  function requestClearFilters() {
    setShowClearFiltersConfirm(true)
  }

  function handleQueryChange(val) {
    setQuery(val)
  }

  // Sort By pop-up: a pick applies at once and closes the pop-up.
  function handlePickSort(value) {
    setSortMode(value)
    setShowSortMenu(false)
  }

  // A tapped category tile (or the All Drugs tile, slug 'all').
  function handleOpenCategory(slug) {
    scrollTopOnCategoryOpen = true
    navigate(ROUTES.DRUGS_CATEGORY(slug))
  }

  // Class search mode: open the class sheet for a tapped card. 'direct' is the
  // sheet's 'open straight on this' value: a subclass name, or the 'all drugs'
  // row for a class that has no subclasses to choose from; null means the
  // subclass list.
  function openClassSheet(className, direct) {
    setClassTarget({ className, direct })
    setClassSheetKey(k => k + 1)
    setClassSheetOpen(true)
  }

  function handleOpenClass(className) {
    const card = classResults?.classes?.find(c => c.name === className) ?? allClasses.find(c => c.name === className)
    openClassSheet(className, card && card.subclassCount === 0 ? ALL_CLASS_DRUGS_KEY : null)
  }

  function handleOpenSubclass(className, subclassName) {
    openClassSheet(className, subclassName)
  }

  // Every class in the library, A to Z, for the Browse area's Class list.
  // (Which list the Browse area shows, browseMode, lives in DrugContext.)
  const allClasses = useMemo(
    () => buildClassIndex(drugs).classes.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [drugs]
  )

  // Every brand in the tapped class, the same list the drug page gives the sheet.
  const classSheetDrugs = useMemo(
    () => (classTarget ? drugs.filter(d => d.class === classTarget.className) : []),
    [drugs, classTarget]
  )

  const hasQuery = query.trim().length > 0
  const hasFilters = !!activeFilters

  // Mode switch loading state: when the mode changes while a search is on
  // screen, show placeholder rows for a moment instead of a blank gap. The
  // search hook waits 150ms after a mode change before it re-runs, so this
  // holds a little longer (220ms) and the new results are ready when it lifts.
  // Brand to Generic would otherwise flash the old mode's results first.
  const [modeSwitching, setModeSwitching] = useState(false)
  const queryRef     = useRef(query)
  const firstModeRef = useRef(true)
  queryRef.current   = query
  useEffect(() => {
    if (firstModeRef.current) { firstModeRef.current = false; return }
    if (queryRef.current.trim().length === 0) return
    setModeSwitching(true)
    const timer = setTimeout(() => setModeSwitching(false), 220)
    return () => clearTimeout(timer)
  }, [mode])

  // Class search mode: a query typed in Class mode shows class cards. Class
  // results and drug results come from different searches, so right after a
  // mode change (or while the search is still waiting out its 150ms) the
  // hook may still hold the other kind; that moment draws nothing instead of
  // a wrong empty state.
  const isClassSearch = mode === 'class' && hasQuery
  const resultsNotReady = hasQuery && !queryTooShort && ((mode === 'class') !== (classResults != null))
  const searchPlaceholder = mode === 'class' ? 'Search classes or families…' : 'Search drugs…'
  // The Form/Route filter does not apply to class cards, so the filter button
  // in the search bar is greyed out and not tappable then (the sheet would be
  // empty).
  const filtersApply = !isClassSearch

  // Same list the category tiles render from (the Browse area).
  const categoriesWithCounts = categories
    .map(cat => ({
      ...cat,
      count: drugs.filter(d => d.category === cat.slug).length,
    }))
    .filter(c => c.count > 0)

  // activeCategory holds the category's stable slug (see plan's decided
  // design — generics.category stores a drug_categories.slug, not the
  // display name), so both the back-button label and the sticky search
  // bar's placeholder (1a.3, decision 4.6's correction) need this lookup.
  const categoryLabel = activeCategory === null
    ? ''
    : activeCategory === '__all'
      ? 'All Drugs'
      : (categories.find(c => c.slug === activeCategory)?.name_en ?? activeCategory)

  // Two views share one screen frame (sticky header, hero, Search area, all
  // drawn once below): the results view (a query typed, or a category open)
  // and the home view (the Browse area). 'body' holds whichever applies, drawn
  // under the Search area.
  const inResultsView = hasQuery || (activeCategory !== null)
  let body
  // Phase 5 (§4.3) — true when the search itself found real results but the
  // active Form/Route filter hid all of them (before/after count compare,
  // set inside the results branch below where `base`/`filtered` exist).
  // Hoisted so the useEffect further down can read it.
  let isFilterMasked = false

  // ── Results view ──────────────────────────────────────────────────────────
  if (inResultsView) {
    // 1c.1 (decision 4.9): a query and an active category can both be true
    // at once (typing while browsing inside a category) — search results
    // need to stay scoped to that category too, the same way the no-query
    // branch below already scopes the plain drug list.
    // Class search mode: class cards ignore the category scope, so no drug
    // rows are listed here at all.
    const base = isClassSearch
      ? []
      : hasQuery
        ? (activeCategory && activeCategory !== '__all'
            ? searchResults.filter(d => d.category === activeCategory)
            : searchResults)
        : drugs.filter(d => activeCategory === '__all' || d.category === activeCategory)

    // Search results now come back pre-ranked from searchDrugsTiered (closeness
    // of match for Brand mode; name-match-before-ingredient-match, then
    // closeness, for Generic mode) — applyFilters only ever narrows the list
    // with .filter(), never reorders it, so the ranked order survives filtering
    // untouched. Browsing (no query) has no such ranking to preserve, so it
    // sorts alphabetically by brand name instead of the old genericName sort.
    const filtered = applyFilters(base, activeFilters)

    // Phase 5 (§4.3, step 5a) — standard before/after comparison: if the
    // search/category scope actually had results and the Form/Route filter
    // zeroed them out, that's the filter's doing, not a missing drug. Only
    // meaningful for a real search (hasQuery) — see file header note above
    // the useEffect below for why category-only browsing isn't included.
    isFilterMasked = hasQuery && hasFilters && base.length > 0 && filtered.length === 0

    // drug-search-sort-cheapest — Cheapest First re-orders the already-
    // filtered results by price; Relevance (default) leaves searchDrugsTiered's
    // ranked order untouched, same as before this feature existed.
    const displayed = hasQuery
      ? (sortMode === 'cheapest' ? sortByPrice(filtered) : filtered)
      : filtered.slice().sort((a, b) => a.tradenameClean.localeCompare(b.tradenameClean))

    body = (
      <>
        {/* Back to categories button (only when in a category, not searching) */}
        {!hasQuery && activeCategory !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}>
            <button
              onClick={() => navigate(ROUTES.DRUGS, { replace: true })}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {/* categoryLabel computed above, shared with the sticky
                  search bar's placeholder (1a.3). */}
              {categoryLabel}
            </button>
            {/* The drug count for the open category, at the right end of the
                back-button row (it used to be its own line below). */}
            {!resultsNotReady && (
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                {displayed.length} drug{displayed.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {hasQuery && queryTooShort ? (
          <TooShortState />
        ) : (resultsNotReady || (modeSwitching && hasQuery)) ? (
          // The new mode's results are still on their way (a mode switch,
          // see resultsNotReady and modeSwitching above): show placeholder
          // rows instead of a blank gap.
          <SearchSwitchingState />
        ) : isClassSearch ? (
          // Class search mode: class and subclass cards, or one of the
          // empty states. The key makes a new search start with the groups
          // collapsed.
          (classResults.classes.length + classResults.subclasses.length) > 0 ? (
            <ClassSearchResults
              key={query.trim()}
              results={classResults}
              query={query}
              onOpenClass={handleOpenClass}
              onOpenSubclass={handleOpenSubclass}
            />
          ) : crossModeMatch ? (
            <CrossModeHintState
              query={query}
              mode={mode}
              targetMode={crossModeTarget}
              onSwitchMode={() => setMode(crossModeTarget ?? 'generic')}
            />
          ) : suggestions.length > 0 ? (
            <DidYouMeanState
              query={query}
              suggestions={suggestions}
              onSelect={(name) => handleQueryChange(name)}
            />
          ) : (
            <EmptyState query={query} mode={mode} onClear={() => handleQueryChange('')} />
          )
        ) : (
          <>
            {/* Results count line, shown while searching only. When browsing a
                category with no query, the count sits in the back-button row
                above. The Clear filter button is not here any more: it lives
                in the Search area. */}
            {hasQuery && (
            <div style={{
              fontSize: 12, color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}>
              {displayed.length} drug{displayed.length !== 1 ? 's' : ''}
              {query && ` for "${query}"`}
              {/* search-category-notice (corrected) — only added while a
                  query is active. Browsing a category with no query
                  already names it in the back-to-categories row right
                  above, so repeating it here was redundant; it only
                  earns its place once a query is typed and that back
                  row disappears (see the !hasQuery condition on it
                  above), leaving the category name with nowhere else
                  to show. */}
              {hasQuery && activeCategory && activeCategory !== '__all' && ` in ${categoryLabel}`}
            </div>
            )}

            {/* Sort By — on its own line under the count line, only while
                something is typed. This branch is never reached for a
                one-character query or a class search, so Sort is not
                offered there. Stays offered when a search finds nothing,
                so the choice carries to the next search. */}
            {/* 'Keep typing to narrow these results' sits right above the
                Sort By button, and only shows for a list past 100. */}
            {hasQuery && displayed.length > 100 && <NarrowResultsHint />}
            {hasQuery && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <SortByButton
                  label={SORT_OPTIONS.find(o => o.value === sortMode)?.label}
                  onPress={() => setShowSortMenu(true)}
                />
              </div>
            )}

            {/* search-all-drugs-placement (redesigned) — full-width,
                directly under the count line rather than above it, so it
                never sits on top of a result the person already found.
                Shown any time a query is scoped to a specific category,
                regardless of whether that category had a match — the
                count line right above it already gives the context
                (what was found and where), so the button reads as "go
                further" rather than "something's wrong." */}
            {hasQuery && activeCategory && activeCategory !== '__all' && (
              <FilledHintButton
                onClick={() => navigate(ROUTES.DRUGS_CATEGORY('all'), { replace: true })}
                style={{ display: 'block', width: '100%', marginBottom: 'var(--space-3)' }}
              >
                Search all drugs instead
              </FilledHintButton>
            )}

            {displayed.length === 0 ? (
              isFilterMasked ? (
                <FilterMaskedState count={base.length} query={query} onClearFilter={requestClearFilters} />
              ) : crossModeMatch ? (
                // cross-mode-search-hint — ranked above DidYouMeanState: an
                // exact hit in the other mode is a more certain answer than
                // a same-mode fuzzy typo guess.
                <CrossModeHintState
                  query={query}
                  mode={mode}
                  onSwitchMode={() => setMode(mode === 'brand' ? 'generic' : 'brand')}
                />
              ) : suggestions.length > 0 ? (
                <DidYouMeanState
                  query={query}
                  suggestions={suggestions}
                  onSelect={(name) => handleQueryChange(name)}
                />
              ) : (
                <EmptyState query={query} onClear={() => handleQueryChange('')} />
              )
            ) : (
              <VirtualDrugList
                drugs={displayed}
                onTap={handleDrugTap}
                categories={categories}
                isDark={isDark}
                isDrugFavourited={isDrugFavourited}
                onToggleFavourite={handleToggleDrugFavourite}
                highlight={query}
                searchMode={mode === 'class' ? 'brand' : mode}
              />
            )}
          </>
        )}
      </>
    )
  } else {
    // ── Home view: the Browse area ────────────────────────────────────────
    // Category tiles are matched by slug, the category's stable internal code
    // — not name_en, which is just the editable display label. This is the
    // plan's decided design (a generic's category is stored as a
    // drug_categories.slug, kept as plain text rather than a foreign key, but
    // still the stable code, not the human-facing name that can be renamed
    // later). categoriesWithCounts is computed once above (1c.2) so the tile
    // list and the results view share the exact same list.
    body = (
      <DrugsBrowseSection
        browseMode={browseMode}
        onBrowseModeChange={setBrowseMode}
        loading={loading}
        hasDrugs={drugs.length > 0}
        error={error}
        onRetry={retry}
        categories={categoriesWithCounts}
        allClasses={allClasses}
        isDark={isDark}
        onOpenCategory={handleOpenCategory}
        onOpenClass={handleOpenClass}
        onOpenSubclass={handleOpenSubclass}
      />
    )
  }

  // Phase 5 (§4.3, step 5c) — wires the filter-masked usageEvent (added in
  // Phase 4 step 4a) from the detection point above. Plain unconditional
  // hook call like every other hook in this component; isFilterMasked/
  // query/mode are just closed-over values from whichever branch ran this
  // render. Only ever true when hasQuery was also true (set above), so this
  // never fires for plain category browsing.
  useEffect(() => {
    if (!isFilterMasked) return
    const normalized = normalizeSearchText(query)
    if (normalized.length < 2) return
    const key = `${mode}:${normalized}`
    if (loggedFilterMaskedTermsRef.current.has(key)) return
    loggedFilterMaskedTermsRef.current.add(key)
    logUsageEvent('drug_search_filter_masked', null, normalized, mode)
  }, [isFilterMasked, query, mode])

  // Sticky search bar hint: in a category with nothing typed it names the
  // category (1a.3); otherwise it is the same text as the main search bar.
  const stickyPlaceholder = (inResultsView && mode !== 'class')
    ? (hasQuery ? 'Search drugs…' : `Search in ${categoryLabel}…`)
    : searchPlaceholder

  return (
    <>
      <StickyDrugsHeader
        visible={showStickyHeader}
        isDark={isDark}
        query={query}
        onQueryChange={handleQueryChange}
        placeholder={stickyPlaceholder}
        onFilter={() => setFilterOpen(true)}
        filterDisabled={!filtersApply}
        hasActiveFilters={hasFilters && filtersApply}
        mode={mode}
        onOpenModeMenu={() => setModeMenuOpen(true)}
      />

      <div>
        <DrugsHero heroRef={heroRef} isDark={isDark} onInfoTap={() => setShowInfoSheet(true)} />

        {/* The Search area: written once, drawn in every view, so the search
            bar is never rebuilt and the keyboard stays open when typing
            starts (see DrugsSearchSection.jsx). Recently viewed is a shortcut
            shown on the home view and inside a category; it hides while a
            search is typed, where it would push the results down. The
            Clear filter button hides while the filter-hidden-results message
            is showing, which has its own. */}
        <DrugsSearchSection
          mode={mode}
          onModeChange={setMode}
          modeMenuOpen={modeMenuOpen}
          onModeMenuChange={setModeMenuOpen}
          query={query}
          onQueryChange={handleQueryChange}
          placeholder={searchPlaceholder}
          onFilter={() => setFilterOpen(true)}
          filterDisabled={!filtersApply}
          hasActiveFilters={hasFilters && filtersApply}
          showClear={hasFilters && filtersApply && !isFilterMasked}
          onClearFilters={requestClearFilters}
          showRecent={!hasQuery}
          recentDrugs={recentDrugObjects}
          onOpenRecent={() => setShowRecentSheet(true)}
          categories={categories}
          isDark={isDark}
        />

        {body}
      </div>

      <DrugFilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        activeFilters={activeFilters}
      />

      {/* Sort By pop-up: the shared pop-up (ui/FilterModal.jsx), drawn over
          the whole page. A pick applies at once and closes it. */}
      {showSortMenu && (
        <FilterModal
          onPage
          title="Sort By"
          titleIcon={ArrowUpDown}
          columns={1}
          single
          options={SORT_OPTIONS}
          selected={[sortMode]}
          onPick={handlePickSort}
          onClose={() => setShowSortMenu(false)}
        />
      )}

      <RecentlyViewedSheet
        isOpen={showRecentSheet}
        onClose={() => setShowRecentSheet(false)}
        drugs={recentDrugObjects}
        categories={categories}
        isDark={isDark}
        onSelectDrug={handleDrugTap}
      />

      <DrugsInfoSheet
        isOpen={showInfoSheet}
        onClose={() => setShowInfoSheet(false)}
      />

      {/* Class search mode: the class sheet opened from a class or subclass
          card (in typed results or in the Browse area's Class list). A tapped
          drug closes the sheet and opens like any drug row. */}
      <ClassBottomSheet
        key={classSheetKey}
        isOpen={classSheetOpen}
        onClose={() => setClassSheetOpen(false)}
        classLabel={titleCaseWords(classTarget?.className ?? '')}
        classDrugs={classSheetDrugs}
        currentDrug={null}
        onSelectBrand={handleDrugTap}
        directSubclass={classTarget?.direct ?? null}
      />

      {/* Back to top */}
      <BackToTopButton visible={showBackToTop} onClick={handleBackToTop} />

      {/* drug-filter-instant-apply — one shared confirm dialog for the Clear
          filter buttons (the Search area's, and the filter-hidden-results
          message's). Only handleClearFilters (the actual clear) runs, and
          only on confirm. */}
      <ConfirmSheet
        isOpen={showClearFiltersConfirm}
        onClose={() => setShowClearFiltersConfirm(false)}
        onConfirm={handleClearFilters}
        title="Clear filter?"
        message="This removes your current Form/Route filter."
        confirmLabel="Clear filter"
      />
    </>
  )
}

// ─── DrugsHero: title + subtitle ─────────────────────────────────────────────
// New, 2026-07-18 (plan §7 step 1a.1, decision 4.4). Title-first header —
// icon badge + "Drugs" + subtitle — no logo/wordmark, matching the rule
// already established by FavouritesScreen (logo stays reserved for Home).
// Shape (card padding/shadow, 38px badge, 44px title row, font sizes) is
// copied directly from FavouritesScreen's FavouritesHero rather than
// reinvented, so the two peer-tab headers stay visually identical apart
// from icon/copy. Badge reuses the same Pill icon + color token already
// used by this screen's own "All Drugs" row, per 4.4's instruction to reuse
// what's already on the Drugs screen rather than introduce a new icon.
// Action-button slot (right side) is intentionally left empty — decision
// 4.4 defers that to area 2 (steps 1a.2/1a.3), not this step. heroRef is
// accepted now, unused, so step 1a.2 can measure this element for its
// sticky-header scroll trigger without another edit to this file.

// 2026-08-09: icon badge switched from a light-tinted circle (category
// fallback token + colored icon) to a solid circle + white icon — same
// structural treatment as FavouritesHero's badge. Uses var(--color-accent)
// (the app's blue accent token) rather than var(--color-favourite), which
// turned out to render red/pink, not blue.

function DrugsHero({ heroRef, isDark, onInfoTap }) {
  return (
    <div ref={heroRef} style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius:    16,
      padding:         '14px 14px 14px',
      marginTop:       'var(--space-4)',
      marginBottom:    'var(--space-4)',
      boxShadow:       '0 4px 16px rgba(0, 0, 0, 0.045)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width:           38,
            height:          38,
            borderRadius:    '50%',
            backgroundColor: 'var(--color-accent)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}>
            <SpecialtyIcon iconType="lucide" iconValue="Pill" size={18} color="#fff" />
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize:      19,
              lineHeight:    1.15,
              fontWeight:    700,
              color:         'var(--color-text-primary)',
              margin:        0,
              letterSpacing: '-0.2px',
            }}>
              Drug Library
            </h1>
            <div style={{
              fontSize:   12,
              lineHeight: 1.2,
              color:      'var(--color-text-tertiary)',
              marginTop:  1,
            }}>
              Know your meds
            </div>
          </div>
        </div>

        {/* Action-button slot — 2026-08-09: now holds the info button that
            opens DrugsInfoSheet (sources + disclaimer). Supersedes the
            earlier "intentionally empty, deferred to area 2" note. */}
        <button
          onClick={onInfoTap}
          aria-label="About this drug library"
          style={{
            display:                 'flex',
            alignItems:              'center',
            justifyContent:          'center',
            width:                   34,
            height:                  34,
            borderRadius:            '50%',
            background:              'none',
            border:                  'none',
            cursor:                  'pointer',
            color:                   'var(--color-text-tertiary)',
            flexShrink:              0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── StickyDrugsHeader: row 1 (icon badge + title) + row 2 (search) ─────────
// New, 2026-07-18 (plan §7 steps 1a.2/1a.3, decision 4.6). Collapsed
// scroll-state of DrugsHero. Row 1's shell (position/zIndex/shadow/radius/
// transition) and height math (44px border-box, 8px top padding, marginTop
// 5) are copied directly from FavouritesScreen's StickyFavouritesHeader
// rather than reinvented, so all three peer screens' sticky headers stay
// pixel-matched. Badge reuses DrugsHero's own Pill icon + color token,
// scaled down the same way Favourites' badge shrinks from hero to sticky
// state.
// Row 2 is the shared SearchBar itself (compact prop, per decision 4.6's
// correction) with its own built-in filter button (onFilter/hasActiveFilters
// — the same filter-sheet trigger the main header's search bar already
// uses), not a new pill+icon piece. Placeholder swaps to name the active
// category ("Search in {category}…") while browsing one with no typed
// query — the caller computes and passes that text down, since only it
// knows hasQuery/activeCategory.

function StickyDrugsHeader({ visible, isDark, query, onQueryChange, placeholder, onFilter, filterDisabled, hasActiveFilters, mode, onOpenModeMenu }) {
  const colors = resolveToken(FALLBACK_TOKEN, isDark)
  const currentMode = MODE_OPTIONS.find(o => o.value === mode) ?? MODE_OPTIONS[0]

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
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
          padding:        '8px var(--page-gutter, var(--space-6)) 0',
          height:         44,
          boxSizing:      'border-box',
          marginTop:      5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div style={{
              width:           28,
              height:          28,
              borderRadius:    '50%',
              backgroundColor: colors.bg,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <SpecialtyIcon iconType="lucide" iconValue="Pill" size={15} color={colors.fg} />
            </div>
            <div style={{
              fontSize:      18,
              fontWeight:    700,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.2px',
              minWidth:      0,
            }}>
              Drug Library
            </div>
          </div>

          {/* The Search Mode button, same as the Search card's; it opens the
              same Search Mode pop-up. */}
          <ModeButton
            icon={currentMode.icon}
            label={currentMode.label}
            color={currentMode.color}
            tint={currentMode.tint}
            onPress={onOpenModeMenu}
          />
        </div>

        {/* Row 2 — near-full-width compact search bar with its built-in
            filter button on the right (1a.3, decision 4.6's correction). */}
        <div style={{
          padding:      '6px var(--page-gutter, var(--space-6)) 8px',
          boxSizing:    'border-box',
        }}>
          <SearchBar
            value={query}
            onChange={onQueryChange}
            placeholder={placeholder}
            onFilter={onFilter}
            filterDisabled={filterDisabled}
            hasActiveFilters={hasActiveFilters}
            compact
          />
        </div>
      </div>
    </div>
  )
}

// ─── SearchSwitchingState ───────────────────────────────────────────────────
// Shown for a moment when the search mode changes while a search is on screen
// (Brand, Generic and Class draw different results, so the old ones cannot
// stay). Same shimmer look as DrugsSkeleton: a short title line, then a few
// rows. A fixed count, only meant to read as 'results are loading'.

const SWITCH_SKELETON_ROWS = 5

function SearchSwitchingState() {
  return (
    <div role="status" aria-label="Loading results">
      <div style={shimmer({ width: 110, height: 13, marginBottom: 'var(--space-3)' })} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {Array.from({ length: SWITCH_SKELETON_ROWS }, (_, i) => (
          <div key={i} style={shimmer({ height: 64, borderRadius: 'var(--radius-lg)' })} />
        ))}
      </div>
    </div>
  )
}

// ─── VirtualDrugList ────────────────────────────────────────────────────────
// Renders a long drug list against the page's own window scroll instead of
// a plain .map() — only the rows actually on screen (plus a small overscan
// buffer) exist as real DOM nodes at any moment. Row heights vary slightly
// (the concentration/form line is optional), so real heights are measured
// after each row renders rather than assumed.

function VirtualDrugList({ drugs, onTap, categories, isDark, isDrugFavourited, onToggleFavourite, highlight = '', searchMode = 'brand' }) {
  const listRef = useRef(null)

  const virtualizer = useWindowVirtualizer({
    count: drugs.length,
    estimateSize: () => 76,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })

  return (
    <div ref={listRef} style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map(virtualRow => {
        const drug = drugs[virtualRow.index]
        return (
          <div
            key={drug.id}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            <SharedDrugCard
              drug={drug}
              onTap={onTap}
              categories={categories}
              isDark={isDark}
              isLast={virtualRow.index === drugs.length - 1}
              highlight={highlight}
              searchMode={searchMode}
              trailing={
                <RowStarButton
                  isFavourited={isDrugFavourited(drug.id)}
                  onPress={() => onToggleFavourite(drug.id)}
                />
              }
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

// 2026-10-04 (Class search mode): 'mode' is only passed in Class mode, where
// the wording is about class and subclass names instead of drug names.
function EmptyState({ query, mode, onClear }) {
  const inClassMode = mode === 'class'
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <SearchX size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        {inClassMode
          ? `No class or drug family matches${query ? ` "${query}"` : ''}`
          : `No matches${query ? ` for "${query}"` : ''}`}
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        {inClassMode
          ? 'Try part of a class or drug family name'
          : 'Try the generic name or brand name instead'}
      </div>
      <FilledHintButton onClick={onClear}>
        Clear search
      </FilledHintButton>
    </div>
  )
}

// ─── CrossModeHintState ─────────────────────────────────────────────────────
// cross-mode-search-hint (2026-08-29): shown instead of DidYouMeanState/
// EmptyState when the strict search finds nothing in the current mode, but
// crossModeMatch (useDrugSearch.js) confirms the same query matches
// something under the OTHER mode — e.g. typing a generic name while in
// Brand mode. Ranked above DidYouMeanState (see the call site) since an
// exact hit in the other mode is a more certain answer than a same-mode
// fuzzy typo guess. Same icon → headline → supporting-line → button shape
// as the other empty states on this screen, reusing FilledHintButton, so it
// reads as a native member of this family rather than a bolted-on addition.
// Copy differs only by current mode; onSwitchMode flips mode and the
// existing query re-searches automatically (mode is already a dependency
// of useDrugSearch's debounce effect).

// 2026-10-04 (Class search mode): also used in Class mode, where 'targetMode'
// says which mode the typed drug name belongs to (the Class search finds out
// and passes it); in Brand and Generic mode it is left out and the other one
// is offered, as before.
// 2026-10-04 (hint wording): in Class mode the supporting line now says the
// typed text is a drug name and not a class or drug family, instead of the
// plain 'It's a generic name'. Brand and Generic mode wording is unchanged.
function CrossModeHintState({ query, mode, targetMode, onSwitchMode }) {
  const otherModeLabel = targetMode ?? (mode === 'brand' ? 'generic' : 'brand')
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <ArrowLeftRight size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        {mode === 'class'
          ? `No class or drug family matches${query ? ` "${query}"` : ''}`
          : `No matches${query ? ` for "${query}"` : ''}`}
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        {mode === 'class'
          ? `That's a ${otherModeLabel} name, not a class or drug family`
          : `It's a ${otherModeLabel} name`}
      </div>
      <FilledHintButton onClick={onSwitchMode}>
        See {otherModeLabel} results
      </FilledHintButton>
    </div>
  )
}

// ─── FilterMaskedState ──────────────────────────────────────────────────────
// Phase 5 (§4.3, step 5b; copy/visuals CORRECTED 2026-08-29 after on-device
// testing): shown instead of EmptyState/DidYouMeanState when the search
// itself found real results but the active Form/Route filter hid all of
// them (see isFilterMasked, computed above where base/filtered exist) — the
// most actionable cause, so it takes priority over both other empty states.
// Icon is filter-off, not a magnifying glass — a magnifying glass reads as
// "nothing found," which contradicts the message here (results exist, the
// filter hid them). Headline states the cause first; the count/query is a
// secondary supporting line. onClearFilter is requestClearFilters, so this
// goes through the exact same confirm step every other Clear Filters button
// in this file already uses — no new confirmation pattern introduced.

function FilterMaskedState({ count, query, onClearFilter }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <FilterX size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        Your filter is hiding these results
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        {count} drug{count !== 1 ? 's' : ''} match{query ? ` "${query}"` : ''}
      </div>
      <FilledHintButton onClick={onClearFilter}>
        Clear filter
      </FilledHintButton>
    </div>
  )
}

// ─── DidYouMeanState ────────────────────────────────────────────────────────
// Shown instead of EmptyState when the strict prefix check finds nothing but
// getDrugSearchSuggestion (searchUtils.js) found one or more close-enough
// guesses. Tapping any suggestion just re-runs the search with it, which then
// matches normally through the prefix check — no separate navigation or
// lookup needed here.
//
// Phase 6 (§4.8, 2026-08-29): getDrugSearchSuggestion now returns up to 3
// ranked candidates instead of one. Single-candidate case is unchanged from
// the Phase 5 follow-up design (bold accent headline naming the guess, one
// button). 2-3 candidates: headline becomes the generic "Did you mean one of
// these?" (no single guess to commit to), and every candidate renders as an
// equal-weight FilledHintButton chip in a wrapping row — user-confirmed
// design, so there's no "primary vs secondary" distinction to maintain.

// Lets a chip's own drug-name text wrap onto multiple lines and shrink to
// fit the screen, overriding FilledHintButton's normal one-line/no-shrink
// default — see the note where this is used below for why.
const CHIP_WRAP_STYLE = {
  maxWidth: '100%',
  flexShrink: 1,
  minWidth: 0,
  whiteSpace: 'normal',
  textAlign: 'center',
}

function DidYouMeanState({ query, suggestions, onSelect }) {
  const single = suggestions.length === 1
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <Lightbulb size={28} color={single ? 'var(--color-accent)' : 'var(--color-text-tertiary)'} />
      </div>
      {single ? (
        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: 'var(--color-accent)' }}>
          Did you mean <span style={{ fontWeight: 700 }}>{suggestions[0]}</span>?
        </div>
      ) : (
        <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
          Did you mean one of these?
        </div>
      )}
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        No exact match{query ? ` for "${query}"` : ''}
      </div>
      {single ? (
        // 2026-08-29 (live report — a long combo generic name, e.g. "caffeine
        // + chlorpheniramine + ibuprofen + phenylpropanolamine", pushed this
        // button wider than the screen and forced the whole page to scroll
        // sideways): FilledHintButton defaults to never shrinking or wrapping
        // its text, which is right for its other short-label call sites
        // (ClearFiltersButton, "Search all drugs instead") but wrong once the
        // label is a full drug name of unpredictable length. Overridden only
        // here, not in the shared component, so those other buttons keep
        // their original one-line behavior.
        <FilledHintButton
          onClick={() => onSelect(suggestions[0])}
          style={CHIP_WRAP_STYLE}
        >
          Search {suggestions[0]}
        </FilledHintButton>
      ) : (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {suggestions.map(name => (
            <FilledHintButton key={name} onClick={() => onSelect(name)} style={CHIP_WRAP_STYLE}>
              {name}
            </FilledHintButton>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TooShortState ────────────────────────────────────────────────────────────
// Shown for a 1-character query instead of a results list (drug_search_plan
// §5 point 1) — a single letter matches thousands of drug names, so search
// simply asks for one more character rather than showing an unusably long
// or misleading list.

function TooShortState() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <Search size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        Keep typing
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        Type at least 2 characters to search
      </div>
    </div>
  )
}

// ─── NarrowResultsHint ─────────────────────────────────────────────────────────
// Shown above the list only once a result list passes 100 items (drug_search_plan
// §5 point 4) — the vast majority of searches never get anywhere near this
// size, so this stays out of the way for typical queries.

function NarrowResultsHint() {
  return (
    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
      Keep typing to narrow these results
    </div>
  )
}