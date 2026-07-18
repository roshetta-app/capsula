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
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import Layout from '../components/layout'
import DrugFilterPanel, { FORM_OPTIONS } from '../components/drugs/DrugFilterPanel'
import SearchBar from '../components/ui/SearchBar'
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown'
import { useDrugContext } from '../context/DrugContext'
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
    suggestions,
    showSuggestions,
    clearSuggestions,
  } = useDrugSearch(drugs, mode)
  const { categories } = useCategories()
  const isDark = useIsDark()
  const heroRef = useRef(null)

  const [activeCategory, setActiveCategory] = useState(null) // null = category list
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [activeFilters,  setActiveFilters]  = useState(null)
  const [recentDrugs,    setRecentDrugs]    = useState(() => readRecentDrugs())

  // Refresh recent list when navigating back
  useEffect(() => {
    setRecentDrugs(readRecentDrugs())
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

  function handleSuggestionSelect(suggestion) {
    clearSuggestions()
    setQuery('')
    navigate(ROUTES.DRUG_DETAIL(suggestion.slug || suggestion.id))
  }

  const hasQuery = query.trim().length > 0
  const hasFilters = !!activeFilters

  // ── Search results view ───────────────────────────────────────────────────
  if (hasQuery || (activeCategory !== null)) {
    const base = hasQuery
      ? searchResults
      : drugs.filter(d => activeCategory === '__all' || d.category === activeCategory)

    const displayed = applyFilters(base, activeFilters)
      .slice()
      .sort((a, b) => a.genericName.localeCompare(b.genericName))

    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
        <DrugsHero heroRef={heroRef} isDark={isDark} />
        {/* Search bar + mode toggle + autocomplete */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchBar
                value={query}
                onChange={(val) => {
                  setQuery(val)
                  if (!val) clearSuggestions()
                }}
                placeholder="Search drugs…"
                onFilter={() => setFilterOpen(true)}
                hasActiveFilters={hasFilters}
              />
            </div>
            {hasQuery && (
              <ModeToggle mode={mode} onChange={setMode} />
            )}
          </div>
          {showSuggestions && (
            <AutocompleteDropdown
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              onDismiss={clearSuggestions}
            />
          )}
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
              {/* activeCategory holds the category's stable slug once set
                  (see plan's decided design — generics.category stores a
                  drug_categories.slug, not the display name), so the
                  display label needs a lookup back to name_en. */}
              {activeCategory === '__all'
                ? 'All Drugs'
                : (categories.find(c => c.slug === activeCategory)?.name_en ?? activeCategory)
              }
            </button>
          )}

          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
            {displayed.length} drug{displayed.length !== 1 ? 's' : ''}
            {query && ` for "${query}"`}
          </div>

          {displayed.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <VirtualDrugList
              drugs={displayed}
              onTap={handleDrugTap}
              categories={categories}
              isDark={isDark}
            />
          )}
        </div>

        <DrugFilterPanel
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={handleApplyFilters}
        />
      </Layout>
    )
  }

  // ── Category list view ────────────────────────────────────────────────────
  // Matched by slug, the category's stable internal code — not name_en,
  // which is just the editable display label. This is the plan's decided
  // design (a generic's category is stored as a drug_categories.slug, kept
  // as plain text rather than a foreign key, but still the stable code, not
  // the human-facing name that can be renamed later).
  const categoriesWithCounts = categories
    .map(cat => ({
      ...cat,
      count: drugs.filter(d => d.category === cat.slug).length,
    }))
    .filter(c => c.count > 0)

  const allDrugsColors = resolveToken(FALLBACK_TOKEN, isDark)

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>
        <DrugsHero heroRef={heroRef} isDark={isDark} />
        <SearchBar
          value={query}
          onChange={(val) => {
            setQuery(val)
            if (!val) clearSuggestions()
          }}
          placeholder="Search drugs…"
          onFilter={() => setFilterOpen(true)}
          hasActiveFilters={hasFilters}
        />

        {/* Recently viewed chips */}
        {recentDrugs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            overflowX: 'auto', paddingBottom: 'var(--space-1)',
            marginBottom: 'var(--space-3)',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
              flexShrink: 0, paddingRight: 'var(--space-1)',
            }}>
              Recent
            </span>
            {recentDrugs.map(d => (
              <button
                key={d.id}
                onClick={() => navigate(ROUTES.DRUG_DETAIL(d.slug || d.id))}
                style={{
                  flexShrink: 0, padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {d.name}
              </button>
            ))}
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
              count={drugs.length}
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
                  count={cat.count}
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

      <DrugFilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
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

// ─── ModeToggle ───────────────────────────────────────────────────────────────
// Segmented Brand/Generic control. Only rendered by the caller while a
// query is active — category browsing never shows this (GFB step 3.5.6).

function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: 'flex', flexShrink: 0,
      border: '1.5px solid var(--color-border)',
      borderRadius: 'var(--radius-full)',
      padding: 2,
      backgroundColor: 'var(--color-surface)',
    }}>
      {['brand', 'generic'].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-body)',
            backgroundColor: mode === m ? 'var(--color-accent)' : 'transparent',
            color: mode === m ? '#fff' : 'var(--color-text-secondary)',
            WebkitTapHighlightColor: 'transparent', outline: 'none',
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          {m === 'brand' ? 'Brand' : 'Generic'}
        </button>
      ))}
    </div>
  )
}

// ─── VirtualDrugList ────────────────────────────────────────────────────────
// Renders a long drug list against the page's own window scroll instead of
// a plain .map() — only the rows actually on screen (plus a small overscan
// buffer) exist as real DOM nodes at any moment. Row heights vary slightly
// (the concentration/form line is optional), so real heights are measured
// after each row renders rather than assumed.

function VirtualDrugList({ drugs, onTap, categories, isDark }) {
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
            <DrugListRow drug={drug} onTap={onTap} categories={categories} isDark={isDark} />
          </div>
        )
      })}
    </div>
  )
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ label, count, iconType, iconValue, color, textColor, onTap }) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
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

      {/* Name + count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
          {count} drug{count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

// ─── DrugListRow ──────────────────────────────────────────────────────────────

function DrugListRow({ drug, onTap, categories, isDark }) {
  // Item's own concentration/form, e.g. "500mg · Tablet" — either piece can
  // be blank (not every item has strength data), so build it defensively
  // and only show what's actually there.
  const itemDetails = [drug.concentration, drug.form].filter(Boolean).join(' · ')
  // drug.category holds the category's stable slug, not its display name —
  // look up the matching category record for both the label and its color.
  // Falls back to the raw stored value if it doesn't match any category
  // that exists today (e.g. old-taxonomy data pre-Phase-1B).
  const matchedCategory = categories.find(c => c.slug === drug.category)
  const colors = resolveToken(matchedCategory?.color_token || FALLBACK_TOKEN, isDark)

  return (
    <div
      onClick={() => onTap(drug)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Item name (+ concentration/form), generic name secondary — per ADR-029 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {drug.name}
          {itemDetails && (
            <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              {' '}{itemDetails}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 500, marginTop: 1, lineHeight: 1.3 }}>
          {drug.genericName}
        </div>
      </div>

      {/* Category pill */}
      <span style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0,
        backgroundColor: colors.bg, color: colors.fg,
        borderRadius: 'var(--radius-full)', padding: '2px 8px',
        letterSpacing: '0.03em',
      }}>
        {matchedCategory?.name_en ?? drug.category}
      </span>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ query }) {
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
      <div style={{ fontSize: 13 }}>Try searching by generic name or brand name</div>
    </div>
  )
}
