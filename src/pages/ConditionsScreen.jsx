/**
 * src/pages/ConditionsScreen.jsx
 * Phase 4 — Conditions Screen Redesign
 *
 * Layout (top to bottom):
 *   1. Brand row
 *   2. Search bar + autocomplete dropdown
 *   3. Recently viewed chips (hidden when search is active)
 *   4. Specialty filter pills (with overflow → bottom sheet)
 *   5. ConditionListHeader (count + sort toggle)
 *   6. Condition list:
 *      — Empty state
 *      — Searching: flat results with highlight
 *      — Browse A–Z: alphabetGroup(results) with AlphabetSectionDividers
 *      — Browse Recent: flat list in recency order, no dividers
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout                  from '../components/layout'
import SearchBar               from '../components/ui/SearchBar'
import AutocompleteDropdown    from '../components/ui/AutocompleteDropdown'
import ConditionCard           from '../components/ConditionCard'
import SpecialtyFilterPills    from '../components/conditions/SpecialtyFilterPills'
import RecentlyViewedChips     from '../components/conditions/RecentlyViewedChips'
import ConditionListHeader     from '../components/conditions/ConditionListHeader'
import AlphabetSectionDivider  from '../components/conditions/AlphabetSectionDivider'
import ConditionsEmptyState    from '../components/conditions/ConditionsEmptyState'
import SpecialtiesBottomSheet  from '../components/conditions/SpecialtiesBottomSheet'
import { useConditionContext }  from '../context/ConditionContext'
import { useConditionSearch }  from '../hooks/useConditionSearch'
import { useRecentlyViewed }   from '../hooks/useRecentlyViewed'
import { useSortToggle }       from '../hooks/useSortToggle'
import { alphabetGroup }       from '../utils/alphabetGroup'
import { ROUTES }              from '../router'

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
      padding:      '11px 0',
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

// ─── Brand row ────────────────────────────────────────────────────────────────

function BrandRow() {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           'var(--space-2)',
      paddingTop:    'var(--space-4)',
      paddingBottom: 'var(--space-4)',
    }}>
      <div style={{
        width:          26,
        height:         26,
        borderRadius:   'var(--radius-full)',
        background:     'var(--color-accent)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        <div style={{
          width:           9,
          height:          9,
          borderRadius:    'var(--radius-full)',
          backgroundColor: 'white',
          opacity:         0.9,
        }} />
      </div>
      <span style={{
        fontSize:      17,
        fontWeight:    600,
        color:         'var(--color-text-primary)',
        letterSpacing: '-0.3px',
      }}>
        Capsula
      </span>
    </div>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const { conditions, specialties, loading } = useConditionContext()
  const { recentlyViewed }                   = useRecentlyViewed()
  const { sortMode, cycleSortMode, SORT_LABELS } = useSortToggle()

  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)

  const {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    resultCount,
    suggestions,
    showSuggestions,
    clearSuggestions,
  } = useConditionSearch(conditions, sortMode, recentlyViewed.map(r => r.id))

  const isSearching   = query.length >= 2
  const specialtyName = specialties.find(s => s.id === activeSpecialty)?.name ?? ''
  const totalCount    = conditions.length

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSuggestionSelect(suggestion) {
    clearSuggestions()
    setQuery('')
    navigate(ROUTES.CONDITION_DETAIL(suggestion.slug))
  }

  function handleCardTap(condition) {
    navigate(ROUTES.CONDITION_DETAIL(condition.slug))
  }

  function handleClearSearch() {
    setQuery('')
    clearSuggestions()
  }

  function handleClearFilter() {
    setActiveSpecialty('all')
  }

  // ── Cold start skeleton ──────────────────────────────────────────────────────

  if (loading && conditions.length === 0) {
    return (
      <Layout>
        <BrandRow />
        <div style={shimmer({ width: '100%', height: 44, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-full)' })} />
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', overflow: 'hidden' }}>
          {[60, 80, 60, 70, 90].map((w, i) => (
            <div key={i} style={shimmer({ width: w, height: 32, borderRadius: 'var(--radius-full)', flexShrink: 0 })} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
      </Layout>
    )
  }

  // ── List rendering ───────────────────────────────────────────────────────────
  //
  // Three modes:
  //   1. isSearching       → flat list with highlight, no dividers
  //   2. sortMode==='recent' → flat list in recency order, no dividers
  //   3. sortMode==='az'   → grouped by letter with AlphabetSectionDividers

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
      // Flat list — no alphabet dividers
      return results.map(condition => (
        <ConditionCard
          key={condition.id}
          condition={condition}
          onTap={handleCardTap}
          highlight={isSearching ? query : ''}
        />
      ))
    }

    // A–Z browse — grouped with section dividers
    return alphabetGroup(results).map(({ letter, items }) => (
      <div key={letter}>
        <AlphabetSectionDivider letter={letter} />
        {items.map(condition => (
          <ConditionCard
            key={condition.id}
            condition={condition}
            onTap={handleCardTap}
            highlight=""
          />
        ))}
      </div>
    ))
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <Layout>

      <BrandRow />

      {/* 1. Search bar + autocomplete */}
      <div style={{ position: 'relative' }}>
        <SearchBar
          value={query}
          onChange={val => {
            setQuery(val)
            if (!val) clearSuggestions()
          }}
        />
        {showSuggestions && (
          <AutocompleteDropdown
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            onDismiss={clearSuggestions}
          />
        )}
      </div>

      {/* 2. Recently viewed chips — hidden when searching */}
      <RecentlyViewedChips
        recentlyViewed={recentlyViewed}
        hidden={isSearching}
      />

      {/* 3. Specialty filter pills */}
      <SpecialtyFilterPills
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={setActiveSpecialty}
        onMoreTap={() => setBottomSheetOpen(true)}
      />

      {/* 4. Count + sort toggle row */}
      <ConditionListHeader
        totalCount={totalCount}
        resultCount={resultCount}
        activeSpecialty={activeSpecialty}
        specialtyName={specialtyName}
        isSearching={isSearching}
        sortMode={sortMode}
        onSortToggle={cycleSortMode}
        SORT_LABELS={SORT_LABELS}
      />

      {/* 5. Condition list */}
      {renderList()}

      {/* Specialties bottom sheet */}
      <SpecialtiesBottomSheet
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={id => {
          setActiveSpecialty(id)
          setBottomSheetOpen(false)
        }}
        onClose={() => setBottomSheetOpen(false)}
        isOpen={bottomSheetOpen}
      />

    </Layout>
  )
}
