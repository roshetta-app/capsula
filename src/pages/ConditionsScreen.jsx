import { useNavigate } from 'react-router-dom'
import { useConditionContext } from '../context/ConditionContext'
import { useConditionSearch } from '../hooks/useConditionSearch'
import Layout from '../components/layout'
import SearchBar from '../components/SearchBar'
import ConditionCard from '../components/ConditionCard'

// ─── Skeleton helpers (same shimmer used in App.jsx) ─────────────────────────

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    animation: 'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      marginBottom: 'var(--space-2)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div style={shimmer({ width: 80, height: 18, borderRadius: 'var(--radius-full)' })} />
        <div style={shimmer({ width: 50, height: 18, borderRadius: 'var(--radius-full)' })} />
      </div>
      <div style={shimmer({ width: '60%', height: 18, marginBottom: 'var(--space-1)' })} />
      <div style={shimmer({ width: '80%', height: 14 })} />
    </div>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

/**
 * ConditionsScreen — primary screen at /.
 *
 * Consumes ConditionContext and useConditionSearch.
 * Renders SearchBar + specialty filter pills + ConditionCard list.
 * Tapping a card navigates to /conditions/:slug (ConditionDetailScreen, Session 4.2).
 */
export default function ConditionsScreen() {
  const { conditions, specialties, loading } = useConditionContext()
  const { query, setQuery, activeSpecialty, setActiveSpecialty, results } = useConditionSearch(conditions)
  const navigate = useNavigate()

  // ─── Cold start skeleton ───────────────────────────────────────────────────

  if (loading && conditions.length === 0) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <div style={shimmer({ width: '100%', height: 44, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-lg)' })} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
            {[80, 100, 70, 90].map((w, i) => (
              <div key={i} style={shimmer({ width: w, height: 32, borderRadius: 'var(--radius-full)', flexShrink: 0 })} />
            ))}
          </div>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </Layout>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {/* Search */}
        <SearchBar value={query} onChange={setQuery} placeholder="Search conditions…" />

        {/* Specialty filter pills */}
        {specialties.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 'var(--space-2)',
            overflowX: 'auto',
            paddingBottom: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {['all', ...specialties.map(s => s.id)].map(id => {
              const isActive = activeSpecialty === id
              const label = id === 'all' ? 'All' : specialties.find(s => s.id === id)?.name
              return (
                <button
                  key={id}
                  onClick={() => setActiveSpecialty(id)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                    backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Count */}
        <div style={{
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
          marginBottom: 'var(--space-3)',
        }}>
          {results.length} condition{results.length !== 1 ? 's' : ''}
          {query && ' for "' + query + '"'}
        </div>

        {/* List */}
        {results.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)',
          }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
              No conditions found
              {query && ` for "${query}"`}
            </div>
          </div>
        ) : (
          results.map(condition => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              onTap={(c) => navigate(`/conditions/${c.slug}`)}
            />
          ))
        )}
      </div>
    </Layout>
  )
}
