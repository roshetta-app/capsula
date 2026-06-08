/**
 * Phase 2I — Search shared components: swap to ui/SearchBar + ui/AutocompleteDropdown.
 *
 * Layout (top to bottom):
 *   1. Search bar (with autocomplete dropdown)
 *   2. Recently viewed chips row (hidden if empty)
 *   3. Specialty filter pills
 *   4. Condition cards list
 *
 * Uses:
 *   useConditionSearch  — fuzzy search + autocomplete + gap logging
 *   useRecentlyViewed   — last 5 viewed conditions from localStorage
 *   SpecialtyFilterPills — extracted specialty filter component
 *   RecentlyViewedChips  — recently viewed row
 *   ConditionCard        — rebuilt card (no bookmark, no age, has tagline + chevron)
 */

import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout'
import SearchBar from '../components/ui/SearchBar'
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown'
import ConditionCard from '../components/ConditionCard'
import SpecialtyFilterPills from '../components/conditions/SpecialtyFilterPills'
import RecentlyViewedChips  from '../components/conditions/RecentlyViewedChips'
import { useConditionContext }  from '../context/ConditionContext'
import { useConditionSearch }  from '../hooks/useConditionSearch'
import { useRecentlyViewed }   from '../hooks/useRecentlyViewed'
import { ROUTES } from '../router'

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
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      padding:         '12px var(--space-4)',
      marginBottom:    'var(--space-2)',
      display:         'flex',
      alignItems:      'center',
      gap:             'var(--space-3)',
    }}>
      <div style={shimmer({ width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0 })} />
      <div style={{ flex: 1 }}>
        <div style={shimmer({ width: 60, height: 10, marginBottom: 6 })} />
        <div style={shimmer({ width: '60%', height: 15 })} />
      </div>
    </div>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const { conditions, specialties, loading } = useConditionContext()
  const { recentlyViewed } = useRecentlyViewed()

  const {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    suggestions,
    showSuggestions,
    clearSuggestions,
  } = useConditionSearch(conditions)

  // ── Autocomplete: navigate to selected suggestion ─────────────────────────
  function handleSuggestionSelect(suggestion) {
    clearSuggestions()
    setQuery('')
    navigate(ROUTES.CONDITION_DETAIL(suggestion.slug))
  }

  // ── Card tap ──────────────────────────────────────────────────────────────
  function handleCardTap(condition) {
    navigate(ROUTES.CONDITION_DETAIL(condition.slug))
  }

  // ── Cold start skeleton ───────────────────────────────────────────────────
  if (loading && conditions.length === 0) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <div style={shimmer({ width: '100%', height: 44, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-lg)' })} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', overflow: 'hidden' }}>
            {[80, 100, 70, 90, 110].map((w, i) => (
              <div key={i} style={shimmer({ width: w, height: 32, borderRadius: 'var(--radius-full)', flexShrink: 0 })} />
            ))}
          </div>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </Layout>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {/* 1. Search bar + autocomplete dropdown */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
          <SearchBar
            value={query}
            onChange={(val) => {
              setQuery(val)
              if (!val) clearSuggestions()
            }}
            placeholder="Search conditions…"
          />
          {showSuggestions && (
            <AutocompleteDropdown
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              onDismiss={clearSuggestions}
            />
          )}
        </div>

        {/* 2. Recently viewed chips (hidden if empty) */}
        <RecentlyViewedChips recentlyViewed={recentlyViewed} />

        {/* 3. Specialty filter pills */}
        <SpecialtyFilterPills
          specialties={specialties}
          activeSpecialty={activeSpecialty}
          onSelect={setActiveSpecialty}
        />

        {/* Result count */}
        <div style={{
          fontSize:     12,
          color:        'var(--color-text-tertiary)',
          fontFamily:   'var(--font-mono)',
          marginBottom: 'var(--space-3)',
        }}>
          {results.length} condition{results.length !== 1 ? 's' : ''}
          {query && ` for "${query}"`}
        </div>

        {/* 4. Condition cards list */}
        {results.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding:   'var(--space-12) var(--space-4)',
            color:     'var(--color-text-tertiary)',
          }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
              No conditions found{query && ` for "${query}"`}
            </div>
          </div>
        ) : (
          results.map(condition => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              onTap={handleCardTap}
            />
          ))
        )}

      </div>
    </Layout>
  )
}



================================================
