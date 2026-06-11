/**
 * src/components/conditions/ConditionListHeader.jsx
 *
 * Count + sort toggle row.
 *
 * Props:
 *   totalCount       number  — total conditions in the database (from context)
 *   resultCount      number  — currently visible conditions (after filter + search)
 *   activeSpecialty  string  — 'all' | specialty id
 *   specialtyName    string  — display name of the active specialty (for label)
 *   isSearching      boolean — true when query.length >= 2
 *   sortMode         string  — 'az' | 'recent'
 *   onSortToggle     function — called on sort button tap
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
  // Build the count string
  let countLabel
  if (isSearching) {
    countLabel = `${resultCount} result${resultCount !== 1 ? 's' : ''}`
  } else if (activeSpecialty !== 'all') {
    countLabel = `Showing ${resultCount} of ${totalCount} — ${specialtyName}`
  } else {
    countLabel = `${totalCount} condition${totalCount !== 1 ? 's' : ''}`
  }

  // The toggle button shows what mode you will switch TO (not the current mode)
  const nextMode = sortMode === 'az' ? 'recent' : 'az'

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '8px 0 4px',
      marginBottom:   0,
    }}>
      <span style={{
        fontSize:   12,
        color:      'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)',
      }}>
        {countLabel}
      </span>

      {/* Sort toggle — hidden during active search (no value in sorting search results) */}
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
            padding:                 '6px 0 6px 8px',
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
