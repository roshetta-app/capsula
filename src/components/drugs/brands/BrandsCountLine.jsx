/**
 * src/components/drugs/brands/BrandsCountLine.jsx
 *
 * 2026-10-08 (refactor, phase 3): the count line of BrandsList, moved here from
 * BrandsList.jsx. On the left how many drugs show (with a filter on:
 * 'shown/all', plus a red 'Clear filters' button), on the right the Sort
 * control. Same look and behaviour.
 *
 * Props: hasPills (adds the space above), filtersActive, shown, total,
 *        onClear, sortLabel, onSortPress
 */
import { SortButton } from './BrandsListParts.jsx'

export default function BrandsCountLine({ hasPills, filtersActive, shown, total, onClear, sortLabel, onSortPress }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            'var(--space-2)',
      marginTop:      hasPills ? 'var(--space-3)' : 0,
      fontSize:       13,
      color:          'var(--color-text-secondary)',
    }}>
      <div style={{ minWidth: 0 }}>
        {/* With a filter on: 'shown/all' (5/20 drugs), so the full size of the
            list stays visible while it is narrowed. */}
        {filtersActive ? `${shown}/${total}` : shown}
        {' '}{(filtersActive ? total : shown) === 1 ? 'drug' : 'drugs'}
        {filtersActive && (
          <>
            {' · '}
            <button
              onClick={onClear}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                color: '#DC2626', WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              Clear filters
            </button>
          </>
        )}
      </div>
      <SortButton label={sortLabel} onPress={onSortPress} />
    </div>
  )
}
