/**
 * src/pages/DrugsScreen.jsx
 * Phase 2I — adds fuzzy search + autocomplete dropdown.
 *
 * Changes from 2F:
 *  - useSearch (simple includes) → useDrugSearch (Fuse.js fuzzy, gap logging)
 *  - Inline SearchBar → shared src/components/ui/SearchBar
 *  - AutocompleteDropdown added below search bar in results view
 *  - Autocomplete: tap suggestion → navigate directly to /drugs/:slug
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout'
import DrugFilterPanel from '../components/drugs/DrugFilterPanel'
import SearchBar from '../components/ui/SearchBar'
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown'
import { useDrugContext } from '../context/DrugContext'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useStock } from '../hooks/useStock'
import { DRUG_CATEGORIES } from '../config/categories'
import { getCategoryMeta } from '../constants/drugCategories'
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

  // Form
  if (!filters.forms.includes('all')) {
    result = result.filter(d =>
      d.formulations?.some(f => filters.forms.includes(f.form?.toLowerCase()))
    )
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
  const { drugs, loading } = useDrugContext()
  const {
    query,
    setQuery,
    results:         searchResults,
    suggestions,
    showSuggestions,
    clearSuggestions,
  } = useDrugSearch(drugs)
  const { stockMap, toggleStock } = useStock(drugs)

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
        {/* Search bar + autocomplete */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
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
              {activeCategory === '__all'
                ? 'All Drugs'
                : (DRUG_CATEGORIES.find(c => c.value === activeCategory)?.label ?? activeCategory)
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
            displayed.map(drug => (
              <DrugListRow
                key={drug.id}
                drug={drug}
                isInStock={stockMap[drug.id] ?? true}
                onTap={handleDrugTap}
              />
            ))
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
  const categoriesWithCounts = DRUG_CATEGORIES
    .map(cat => ({
      ...cat,
      count: drugs.filter(d => d.category === cat.value).length,
    }))
    .filter(c => c.count > 0)

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>
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

        {/* Loading skeleton */}
        {loading && drugs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 64,
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* "All Drugs" row */}
        {!loading && (
          <>
            <CategoryRow
              label="All Drugs"
              count={drugs.length}
              icon="fa-pills"
              color="#F3F4F6"
              textColor="#374151"
              onTap={() => setActiveCategory('__all')}
            />

            {/* Category rows */}
            {categoriesWithCounts.map(cat => {
              const meta = getCategoryMeta(cat.value)
              return (
                <CategoryRow
                  key={cat.value}
                  label={cat.label}
                  count={cat.count}
                  icon={meta.icon}
                  color={meta.color}
                  textColor={meta.textColor}
                  onTap={() => setActiveCategory(cat.value)}
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

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ label, count, icon, color, textColor, onTap }) {
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
        <i className={`fa-solid ${icon}`} style={{ color: textColor, fontSize: 16 }} />
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

function DrugListRow({ drug, isInStock, onTap }) {
  const brandNames = drug.brands?.map(b => b.name) ?? []
  const meta = getCategoryMeta(drug.category)

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
        opacity: isInStock ? 1 : 0.55,
        boxShadow: 'var(--shadow-card)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Stock dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        backgroundColor: isInStock ? 'var(--color-instock, #10B981)' : 'var(--color-outstock, #9CA3AF)',
      }} />

      {/* Name + brands */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {drug.genericName}
        </div>
        {brandNames.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 500, marginTop: 1, lineHeight: 1.3 }}>
            {brandNames.slice(0, 4).join(' · ')}{brandNames.length > 4 ? ' …' : ''}
          </div>
        )}
      </div>

      {/* Category pill */}
      <span style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0,
        backgroundColor: meta.color, color: meta.textColor,
        borderRadius: 'var(--radius-full)', padding: '2px 8px',
        letterSpacing: '0.03em',
      }}>
        {DRUG_CATEGORIES.find(c => c.value === drug.category)?.label ?? drug.category}
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



================================================
