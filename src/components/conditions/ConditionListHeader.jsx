/**
 * src/components/conditions/ConditionListHeader.jsx
 *
 * Count + sort toggle row.
 * Hairline top border anchors the transition from controls to list.
 *
 * - While searching: shows a result count ("N results"), left-aligned.
 *   No sort toggle during search (results are always relevance-ordered).
 * - Otherwise: shows the sort toggle right-aligned. When 'firstLetter' is
 *   provided (A–Z mode only), the letter is shown left-aligned on the same
 *   row — so the alphabet divider and the sort toggle share one line instead
 *   of stacking as two separate rows.
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
 *   firstLetter      string | undefined  — when provided, rendered left-aligned beside the sort toggle
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
  firstLetter,
}) {
  const nextMode = sortMode === 'az' ? 'recent' : 'az'

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      borderTop:      '0.5px solid var(--color-border-subtle)',
      padding:        '14px 0 4px',  /* was '6px 0 4px' — increased top padding for hero/list separation */
      marginBottom:   0,
    }}>
      {/* Left side */}
      {isSearching ? (
        <span style={{
          fontSize:   12,
          color:      'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      ) : firstLetter ? (
        <span
          aria-label={`Section ${firstLetter}`}
          style={{
            fontSize:      11,
            fontWeight:    500,
            color:         'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {firstLetter}
        </span>
      ) : (
        <span /> /* spacer so sort toggle stays right-aligned */
      )}

      {/* Right side — sort toggle (hidden while searching) */}
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
