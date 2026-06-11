/**
 * src/components/conditions/ConditionsEmptyState.jsx
 *
 * Empty state shown when:
 *   - Search query returns 0 results
 *   - Specialty filter has 0 conditions (edge case, admin data gap)
 *
 * Props:
 *   query           string  — current search term (may be empty string)
 *   activeSpecialty string  — 'all' | specialty id
 *   specialtyName   string  — display name for the active specialty
 *   onClearSearch   function — called to clear the query field
 *   onClearFilter   function — called to reset specialty to 'all'
 */
import { Search } from 'lucide-react'

export default function ConditionsEmptyState({
  query,
  activeSpecialty,
  specialtyName,
  onClearSearch,
  onClearFilter,
}) {
  const isSearchEmpty = query.trim().length >= 2
  const isFilterEmpty = activeSpecialty !== 'all' && !isSearchEmpty

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-3)',
    }}>
      {/* Icon */}
      <Search
        size={28}
        strokeWidth={1.5}
        style={{ color: 'var(--color-text-tertiary)', opacity: 0.5 }}
        aria-hidden="true"
      />

      {/* Primary message */}
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        {isSearchEmpty
          ? <>No results for <em>"{query.trim()}"</em></>
          : isFilterEmpty
            ? `No conditions in ${specialtyName}`
            : 'No conditions found'
        }
      </div>

      {/* Secondary suggestion */}
      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
        {isSearchEmpty
          ? 'Try a shorter term, a symptom, or check the spelling'
          : 'Try removing the specialty filter'
        }
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {isSearchEmpty && (
          <button
            onClick={onClearSearch}
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
        )}
        {activeSpecialty !== 'all' && (
          <button
            onClick={onClearFilter}
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
            Show all specialties
          </button>
        )}
      </div>
    </div>
  )
}
