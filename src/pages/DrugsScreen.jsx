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
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import Layout from '../components/layout'
import SharedDrugCard from '../components/SharedDrugCard'
import RowStarButton from '../components/ui/RowStarButton'
import DrugFilterPanel, { FORM_OPTIONS } from '../components/drugs/DrugFilterPanel'
import SearchBar from '../components/ui/SearchBar'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useCategories } from '../hooks/useCategories'
import { SpecialtyIcon, useIsDark } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'
import { ROUTES } from '../router'

const RECENT_KEY = 'capsula_recent_drugs'
const MAX_RECENT = 5

// ─── Recently viewed drugs (localStorage) ────────────────────────────────────

function readRecentDrugs() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function addRecentDrug(drug) {
  try {
    const prev    = readRecentDrugs()
    const filtered = prev.filter(d => d.id !== drug.id)
    const next    = [{ id: drug.id, name: drug.genericName, slug: drug.slug || drug.id }, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

// ─── applyFilters ─────────────────────────────────────────────────────────────

function applyFilters(drugs, filters) {
  if (!filters) return drugs
  let result = drugs

  // Form — each selected chip covers a set of real raw form values (see
  // DrugFilterPanel's FORM_OPTIONS), not a single value, so match against
  // the combined set of raw values for every chip that's currently active.
  if (!filters.forms.includes('all')) {
    const activeFormMatches = new Set(
      FORM_OPTIONS
        .filter(opt => filters.forms.includes(opt.value))
        .flatMap(opt => opt.matches)
    )
    result = result.filter(d => activeFormMatches.has(d.form?.toLowerCase()))
  }

  // Pregnancy
  if (filters.pregnancySafe && !filters.pregnancyUnsafe) {
    result = result.filter(d => ['A', 'B'].includes(d.pregnancyCategory))
  } else if (filters.pregnancyUnsafe && !filters.pregnancySafe) {
    result = result.filter(d => ['C', 'D', 'X'].includes(d.pregnancyCategory))
  }

  // Breastfeeding
  if (filters.bfSafe && !filters.bfUnsafe) {
    result = result.filter(d => d.breastfeedingSafety === 'safe')
  } else if (filters.bfUnsafe && !filters.bfSafe) {
    result = result.filter(d => ['caution', 'unsafe'].includes(d.breastfeedingSafety))
  }

  return result
}

// ─── DrugsScreen ──────────────────────────────────────────────────────────────

export default function DrugsScreen() {
  const navigate           = useNavigate()
  const { drugs, loading, progress } = useDrugContext()
  const [mode, setMode] = useState('brand')
  const {
    query,
    setQuery,
    results:         searchResults,
    queryTooShort,
    suggestion,
  } = useDrugSearch(drugs, mode)
  const { categories } = useCategories()
  const { toggleDrug, isDrugFavourited } = useFavouritesContext()
  const isDark = useIsDark()
  const heroRef = useRef(null)

  // Bookmark tap behavior (step 1d.6, decision 4.16 first half): on Drugs,
  // tapping the bookmark toggles favourite status right away — no confirm
  // step, unlike Favourites' remove flow. Screen-owned, not card-owned,
  // mirroring ConditionCard's precedent. Wired to each row's trailing slot
  // below (step 1d.8).
  function handleToggleDrugFavourite(id) {
    toggleDrug(id)
  }

  const [activeCategory, setActiveCategory] = useState(null) // null = category list
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [activeFilters,  setActiveFilters]  = useState(null)
  const [recentDrugs,    setRecentDrugs]    = useState(() => readRecentDrugs())

  // Refresh recent list when navigating back
  useEffect(() => {
    setRecentDrugs(readRecentDrugs())
  }, [])

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
    addRecentDrug(drug)
    setRecentDrugs(readRecentDrugs())
    navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))
  }

  function handleApplyFilters(filters) {
    // Check if anything is actually active
    const hasActive = !filters.forms.includes('all') || filters.pregnancySafe || filters.pregnancyUnsafe || filters.bfSafe || filters.bfUnsafe
    setActiveFilters(hasActive ? filters : null)
  }

  function handleQueryChange(val) {
    setQuery(val)
  }

  const hasQuery = query.trim().length > 0
  const hasFilters = !!activeFilters

  // Same list the category tiles render from (see the category-list view
  // below).
  const categoriesWithCounts = categories
    .map(cat => ({
      ...cat,
      count: drugs.filter(d => d.category === cat.slug).length,
    }))
    .filter(c => c.count > 0)

  // content holds whichever view's markup applies (search results/category
  // browsing vs. the category list) so DrugFilterPanel can be mounted once,
  // below, shared by both — instead of once per branch (step 1f.2).
  let content

  // ── Search results view ───────────────────────────────────────────────────
  if (hasQuery || (activeCategory !== null)) {
    // 1c.1 (decision 4.9): a query and an active category can both be true
    // at once (typing while browsing inside a category) — search results
    // need to stay scoped to that category too, the same way the no-query
    // branch below already scopes the plain drug list.
    const base = hasQuery
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
    const displayed = hasQuery
      ? filtered
      : filtered.slice().sort((a, b) => a.tradenameClean.localeCompare(b.tradenameClean))

    // activeCategory holds the category's stable slug (see plan's decided
    // design — generics.category stores a drug_categories.slug, not the
    // display name), so both the back-button label and the sticky search
    // bar's placeholder (1a.3, decision 4.6's correction) need this lookup.
    const categoryLabel = activeCategory === '__all'
      ? 'All Drugs'
      : (categories.find(c => c.slug === activeCategory)?.name_en ?? activeCategory)

    content = (
      <>
        <StickyDrugsHeader
          visible={showStickyHeader}
          isDark={isDark}
          query={query}
          onQueryChange={handleQueryChange}
          placeholder={hasQuery ? 'Search drugs…' : `Search in ${categoryLabel}…`}
          onFilter={() => setFilterOpen(true)}
          hasActiveFilters={hasFilters}
        />
        <div style={{ paddingTop: 'var(--space-5)' }}>
        <DrugsHero heroRef={heroRef} isDark={isDark} />
        {/* Search bar — same single-wrapper shape as the category-list view's
            copy below, on purpose (see 2026-07-19 note at the top of this
            file): keeping both trees identical at this position is what
            lets React preserve the input, and the keyboard with it, across
            the hasQuery transition. */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Search drugs…"
            onFilter={() => setFilterOpen(true)}
            hasActiveFilters={hasFilters}
          />
        </div>

          {/* Back to categories button (only when in a category, not searching) */}
          {!hasQuery && activeCategory !== null && (
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                marginBottom: 'var(--space-3)',
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
          )}

          {hasQuery && queryTooShort ? (
            <TooShortState />
          ) : (
            <>
              {/* Only category-scoped searches get this — a true match
                  inside the category can still be hiding the drug they
                  actually want under a different one (see file header). */}
              {hasQuery && activeCategory && activeCategory !== '__all' && (
                <button
                  onClick={() => setActiveCategory('__all')}
                  style={{
                    display: 'block', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-accent)', fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-body)', padding: '4px 0',
                    marginBottom: 'var(--space-2)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Search all drugs instead
                </button>
              )}

              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
                {displayed.length} drug{displayed.length !== 1 ? 's' : ''}
                {query && ` for "${query}"`}
              </div>

              {displayed.length === 0 ? (
                suggestion ? (
                  <DidYouMeanState
                    suggestion={suggestion}
                    onSelect={() => handleQueryChange(suggestion)}
                  />
                ) : (
                  <EmptyState query={query} onClear={() => handleQueryChange('')} />
                )
              ) : (
                <>
                  {displayed.length > 100 && <NarrowResultsHint />}
                  <VirtualDrugList
                    drugs={displayed}
                    onTap={handleDrugTap}
                    categories={categories}
                    isDark={isDark}
                    isDrugFavourited={isDrugFavourited}
                    onToggleFavourite={handleToggleDrugFavourite}
                    highlight={query}
                    searchMode={mode}
                  />
                </>
              )}
            </>
          )}
        </div>
      </>
    )
  } else {
    // ── Category list view ────────────────────────────────────────────────
    // Matched by slug, the category's stable internal code — not name_en,
    // which is just the editable display label. This is the plan's decided
    // design (a generic's category is stored as a drug_categories.slug, kept
    // as plain text rather than a foreign key, but still the stable code,
    // not the human-facing name that can be renamed later).
    // categoriesWithCounts is computed once above (1c.2) so both this tile
    // list and the search-results branch above share the exact same list.
    const allDrugsColors = resolveToken(FALLBACK_TOKEN, isDark)

    content = (
      <>
        <StickyDrugsHeader
          visible={showStickyHeader}
          isDark={isDark}
        query={query}
        onQueryChange={handleQueryChange}
        placeholder="Search drugs…"
        onFilter={() => setFilterOpen(true)}
        hasActiveFilters={hasFilters}
      />
      <div style={{ paddingTop: 'var(--space-5)' }}>
        <DrugsHero heroRef={heroRef} isDark={isDark} />
        {/* Same single-wrapper shape as the search-results view's copy
            above, on purpose — see 2026-07-19 note at the top of this file. */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Search drugs…"
            onFilter={() => setFilterOpen(true)}
            hasActiveFilters={hasFilters}
          />
        </div>

        {/* Recently viewed — matches RecentlyViewedChips.jsx exactly (plan
            §7 step 1b.2, decision 4.8): clock icon + label, thin separator,
            plain-text links with · dots, single scrollable line, right-edge
            fade hint. Inlined here rather than importing the Conditions
            component since it navigates to condition routes/props, not
            drug ones — same visual pattern, different data shape. */}
        {recentDrugs.length > 0 && (
          <div style={{
            position:     'relative',
            marginBottom: 'var(--space-3)',
          }}>
            <div style={{
              display:                 'flex',
              alignItems:              'center',
              gap:                     'var(--space-2)',
              overflowX:               'auto',
              scrollbarWidth:          'none',
              msOverflowStyle:         'none',
              WebkitOverflowScrolling: 'touch',
              whiteSpace:              'nowrap',
            }}>
              {/* Clock + label — fixed, never scrolls away */}
              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        5,
                flexShrink: 0,
                color:      'var(--color-text-tertiary)',
              }}>
                <Clock size={12} strokeWidth={1.8} />
                <span style={{
                  fontSize:      11,
                  fontWeight:    500,
                  fontFamily:    'var(--font-body)',
                  letterSpacing: '0.02em',
                }}>
                  Recent
                </span>
              </div>

              {/* Separator line */}
              <div style={{
                width:           1,
                height:          12,
                backgroundColor: 'var(--color-border)',
                flexShrink:      0,
              }} />

              {/* Drug names as inline text links with · separators */}
              {recentDrugs.map((d, index) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  {index > 0 && (
                    <span style={{
                      color:      'var(--color-border)',
                      fontSize:   12,
                      userSelect: 'none',
                    }}>·</span>
                  )}
                  <button
                    onClick={() => navigate(ROUTES.DRUG_DETAIL(d.slug || d.id))}
                    style={{
                      background:              'none',
                      border:                  'none',
                      padding:                 0,
                      cursor:                  'pointer',
                      fontSize:                13,
                      fontFamily:              'var(--font-body)',
                      color:                   'var(--color-text-secondary)',
                      outline:                 'none',
                      WebkitTapHighlightColor: 'transparent',
                      whiteSpace:              'nowrap',
                    }}
                  >
                    {d.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Right-edge fade — hints more items are off-screen */}
            <div
              aria-hidden="true"
              style={{
                position:      'absolute',
                top:           0,
                right:         0,
                bottom:        0,
                width:         32,
                background:    'linear-gradient(to right, transparent, var(--color-bg))',
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {/* Loading progress ring */}
        {loading && drugs.length === 0 && (
          <LoadingProgress progress={progress} />
        )}

        {/* "All Drugs" row */}
        {!loading && (
          <>
            <CategoryRow
              label="All Drugs"
              iconType="lucide"
              iconValue="Pill"
              color={allDrugsColors.bg}
              textColor={allDrugsColors.fg}
              onTap={() => setActiveCategory('__all')}
            />

            {/* Category rows */}
            {categoriesWithCounts.map(cat => {
              const iconType  = cat.icon_type || 'lucide'
              const iconValue = iconType === 'custom' ? (cat.icon_url || '') : (cat.icon_name || 'Pill')
              const colors    = resolveToken(cat.color_token || FALLBACK_TOKEN, isDark)
              return (
                <CategoryRow
                  key={cat.id}
                  label={cat.name_en}
                  iconType={iconType}
                  iconValue={iconValue}
                  color={colors.bg}
                  textColor={colors.fg}
                  onTap={() => setActiveCategory(cat.slug)}
                />
              )
            })}
          </>
        )}
      </div>
      </>
    )
  }

  return (
    <Layout>
      {content}

      <DrugFilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        mode={mode}
        onModeChange={setMode}
      />
    </Layout>
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

function DrugsHero({ heroRef, isDark }) {
  const colors = resolveToken(FALLBACK_TOKEN, isDark)

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
            backgroundColor: colors.bg,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}>
            <SpecialtyIcon iconType="lucide" iconValue="Pill" size={18} color={colors.fg} />
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
              Drugs
            </h1>
            <div style={{
              fontSize:   12,
              lineHeight: 1.2,
              color:      'var(--color-text-tertiary)',
              marginTop:  1,
            }}>
              Browse the drug library
            </div>
          </div>
        </div>

        {/* Action-button slot — intentionally empty, see note above. */}
        <div style={{ flexShrink: 0 }} />
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

function StickyDrugsHeader({ visible, isDark, query, onQueryChange, placeholder, onFilter, hasActiveFilters }) {
  const colors = resolveToken(FALLBACK_TOKEN, isDark)

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
          padding:        '8px var(--space-6) 0',
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
              Drugs
            </div>
          </div>
        </div>

        {/* Row 2 — near-full-width compact search bar with its built-in
            filter button on the right (1a.3, decision 4.6's correction). */}
        <div style={{
          padding:      '6px var(--space-6) 8px',
          boxSizing:    'border-box',
        }}>
          <SearchBar
            value={query}
            onChange={onQueryChange}
            placeholder={placeholder}
            onFilter={onFilter}
            hasActiveFilters={hasActiveFilters}
            compact
          />
        </div>
      </div>
    </div>
  )
}

// ─── LoadingProgress ──────────────────────────────────────────────────────────
// Circular "X of Y" ring shown during the one-time cold-start load. Real
// progress, not simulated — driven by page-by-page counts reported from
// useDrugs as the parallel fetch completes each chunk.

function LoadingProgress({ progress }) {
  const total  = progress?.total  ?? 0
  const loaded = progress?.loaded ?? 0
  const pct    = total > 0 ? Math.min(1, loaded / total) : 0

  const size          = 64
  const strokeWidth   = 6
  const radius        = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset        = circumference * (1 - pct)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
      padding: 'var(--space-6) var(--space-3)',
    }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--color-accent)" strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.25s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)',
        }}>
          {total > 0 ? `${loaded} of ${total}` : '···'}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Setting up your drug library
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          This only happens once
        </div>
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

// ─── CategoryRow ──────────────────────────────────────────────────────────────
// 2026-07-18 (drug_library_ui_ux, plan §7 step 1c.3, decision 4.21): softened —
// "N drugs" count removed (and the now-unused `count` prop dropped from both
// call sites below), border lightened to --color-border-subtle, shadow moved
// to --shadow-ambient-selector. Radius (--radius-lg) unchanged. Still a card,
// unlike the flat drug row — kept deliberately distinct per 4.21.

function CategoryRow({ label, iconType, iconValue, color, textColor, onTap }) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-ambient-selector)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon in tinted circle */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={16} color={textColor} />
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {label}
        </div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ query, onClear }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div style={{ fontSize: 15, marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
        No drugs found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)' }}>Try searching by generic name or brand name</div>
      <button
        onClick={onClear}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
          fontFamily: 'var(--font-body)', padding: '4px 0',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Clear search
      </button>
    </div>
  )
}

// ─── DidYouMeanState ────────────────────────────────────────────────────────
// Shown instead of EmptyState when the strict prefix check finds nothing but
// getDrugSearchSuggestion (searchUtils.js) found one close-enough guess
// (drug_search_plan §5 final form). Tapping the name just re-runs the search
// with it, which then matches normally through the prefix check — no
// separate navigation or lookup needed here.

function DidYouMeanState({ suggestion, onSelect }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
        Did you mean:{' '}
        <button
          onClick={onSelect}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 15, fontWeight: 600,
            fontFamily: 'var(--font-body)', padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {suggestion}
        </button>
      </div>
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
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
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