/**
 * src/pages/ConditionsScreen.jsx
 * Phase 5 — Conditions Screen Redesign
 *
 * Changes from Phase 4:
 *   - BrandRow replaced with ScreenHeader (logo + contextual headline)
 *   - Headline collapses when search is active
 *   - Tighter relational spacing between all header-area sections
 *   - SearchBar owns no bottom margin — spacing handled by section gaps
 *
 * List rendering modes:
 *   isSearching (query >= 1)  → flat list with highlight, no dividers
 *   sortMode === 'recent'     → flat list in recency order, no dividers
 *   sortMode === 'az'         → grouped by letter with AlphabetSectionDividers
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

// ─── Screen header ────────────────────────────────────────────────────────────
// Logo row + contextual headline. Headline collapses when search is active
// to give the keyboard + results more vertical room.

function ScreenHeader({ isSearching }) {
  return (
    <div style={{
      paddingTop:    'var(--space-4)',
      paddingBottom: isSearching ? 'var(--space-3)' : 'var(--space-2)',
      transition:    'padding-bottom 0.15s ease',
    }}>
      {/* Logo row */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           'var(--space-2)',
        marginBottom:  isSearching ? 0 : 'var(--space-2)',
        transition:    'margin-bottom 0.15s ease',
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

      {/* Headline — hidden while searching */}
      {!isSearching && (
        <h1 style={{
          margin:        0,
          fontSize:      26,
          fontWeight:    700,
          letterSpacing: '-0.5px',
          lineHeight:    1.15,
          color:         'var(--color-text-primary)',
        }}>
          What are you looking for?
        </h1>
      )}
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

  // Search activates on first character — matches clinical app standard
  const isSearching   = query.length >= 1
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
        {/* Skeleton header */}
        <div style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <div style={shimmer({ width: 26, height: 26, borderRadius: 'var(--radius-full)' })} />
            <div style={shimmer({ width: 70, height: 16 })} />
          </div>
          <div style={shimmer({ width: '75%', height: 28, borderRadius: 'var(--radius-md)' })} />
        </div>
        <div style={shimmer({ width: '100%', height: 48, marginBottom: 'var(--space-2)', borderRadius: 'var(--radius-full)' })} />
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

      {/* 1. Screen header — logo + headline (headline hides when searching) */}
      <ScreenHeader isSearching={isSearching} />

      {/* 2. Search bar + autocomplete */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
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

      {/* 3. Recently viewed — compact inline row, hidden when searching */}
      <RecentlyViewedChips
        recentlyViewed={recentlyViewed}
        hidden={isSearching}
      />

      {/* 4. Specialty filter pills */}
      <SpecialtyFilterPills
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={setActiveSpecialty}
        onMoreTap={() => setBottomSheetOpen(true)}
      />

      {/* 5. Count + sort toggle row */}
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

      {/* 6. Condition list */}
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
