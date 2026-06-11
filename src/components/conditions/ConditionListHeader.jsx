/**
 * src/components/conditions/ConditionListHeader.jsx
 *
 * Count + sort toggle row.
 * Hairline top border anchors the transition from controls to list.
 *
 * Props:
 *   totalCount       number
 *   resultCount      number
 *   activeSpecialty  string  — 'all' | specialty id
 *   specialtyName    string
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
  let countLabel
  if (isSearching) {
    countLabel = `${resultCount} result${resultCount !== 1 ? 's' : ''}`
  } else if (activeSpecialty !== 'all') {
    countLabel = `Showing ${resultCount} of ${totalCount} — ${specialtyName}`
  } else {
    countLabel = `${totalCount} condition${totalCount !== 1 ? 's' : ''}`
  }

  const nextMode = sortMode === 'az' ? 'recent' : 'az'

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      borderTop:      '0.5px solid var(--color-border-subtle)',
      padding:        '6px 0 4px',
      marginBottom:   0,
    }}>
      <span style={{
        fontSize:   12,
        color:      'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)',
      }}>
        {countLabel}
      </span>

      {!isSearching && (
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
