/**
 * src/components/conditions/ConditionListHeader.jsx
 *
 * Count + sort toggle row.
 * Hairline top border anchors the transition from controls to list.
 *
 * - While searching: shows a result count ("N results"), left-aligned.
 *   No sort toggle during search (results are always relevance-ordered).
 * - Otherwise: shows only the sort toggle, right-aligned. The total/filtered
 *   condition count isn't surfaced here — the active specialty pill already
 *   communicates the current filter.
 *
 * Props:
 *   totalCount       number   (currently unused — kept for caller compatibility)
 *   resultCount      number
 *   activeSpecialty  string  — 'all' | specialty id  (currently unused — kept for caller compatibility)
 *   specialtyName    string  (currently unused — kept for caller compatibility)
 *   isSearching      boolean
 *   sortMode         string  — 'az' | 'recent'
 *   onSortToggle     function
 *   SORT_LABELS      object  — { az: 'A – Z', recent: 'Recent first' }
 */
import { ArrowUpDown } from 'lucide-react'

export default function ConditionListHeader({
  totalCount,
  resultCount,
  activeSpecialty,
  specialtyName,
  isSearching,
  sortMode,
  onSortToggle,
  SORT_LABELS,
}) {
  const nextMode = sortMode === 'az' ? 'recent' : 'az'

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: isSearching ? 'flex-start' : 'flex-end',
      borderTop:      '0.5px solid var(--color-border-subtle)',
      padding:        '6px 0 4px',
      marginBottom:   0,
    }}>
      {isSearching ? (
        <span style={{
          fontSize:   12,
          color:      'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      ) : (
        <button
          onClick={onSortToggle}
          aria-label={`Sort: currently ${SORT_LABELS[sortMode]}. Tap to switch to ${SORT_LABELS[nextMode]}.`}
          style={{
            display:                 'flex',
            alignItems:              'center',
            gap:                     4,
            background:              'none',
            border:                  'none',
            cursor:                  'pointer',
            padding:                 '4px 0 4px 8px',
            fontSize:                12,
            color:                   'var(--color-text-secondary)',
            fontFamily:              'var(--font-body)',
            WebkitTapHighlightColor: 'transparent',
            outline:                 'none',
          }}
        >
          <ArrowUpDown size={13} strokeWidth={1.8} />
          {SORT_LABELS[nextMode]}
        </button>
      )}
    </div>
  )
}
