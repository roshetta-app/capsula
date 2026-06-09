/**
 * src/components/ui/SearchBar.jsx
 * Phase 2I — shared search bar used on ConditionsScreen and DrugsScreen.
 * Phase 3J — self-contained analytics: logs search events when `context` is provided.
 *
 * Props:
 *   value            string
 *   onChange         (val: string) => void
 *   placeholder      string
 *   onFilter         () => void | undefined  — if provided, shows filter icon
 *   hasActiveFilters boolean                 — highlights filter icon when true
 *   context          'conditions' | 'drugs'  — when provided, logs usage events
 *                                              and search gaps automatically after
 *                                              800 ms debounce (≥2 chars)
 */

import { useEffect, useRef } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { logUsageEvent } from '../../analytics/usageEvents'
import { logSearchGap }  from '../../analytics/searchGaps'

// Map context → event type expected by usage_events table
const SEARCH_EVENT = {
  conditions: 'condition_search',
  drugs:      'drug_search',
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  onFilter,
  hasActiveFilters = false,
  context,
  // results count: parent passes this so we know whether to log a gap
  resultCount,
}) {
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!context) return
    clearTimeout(debounceRef.current)

    const term = value?.trim() ?? ''
    if (term.length < 2) return

    debounceRef.current = setTimeout(() => {
      const eventType = SEARCH_EVENT[context]
      if (eventType) {
        // Log the search event (entity_id null for searches)
        logUsageEvent(eventType, null, term)
      }
      // Log gap if parent reports zero results
      if (resultCount === 0) {
        logSearchGap(term, context)
      }
    }, 800)

    return () => clearTimeout(debounceRef.current)
  }, [value, resultCount]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display:       'flex',
      gap:           'var(--space-2)',
      alignItems:    'center',
      marginBottom:  'var(--space-3)',
    }}>
      {/* Input wrapper */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Search
          size={16}
          style={{
            position:      'absolute',
            left:          'var(--space-4)',
            top:           '50%',
            transform:     'translateY(-50%)',
            color:         'var(--color-text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:           '100%',
            boxSizing:       'border-box',
            paddingLeft:     40,
            paddingRight:    value ? 40 : 16,
            height:          44,
            borderRadius:    'var(--radius-full)',
            border:          '1.5px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            fontSize:        14,
            color:           'var(--color-text-primary)',
            fontFamily:      'var(--font-body)',
            outline:         'none',
            boxShadow:       'var(--shadow-card)',
            transition:      'border-color 0.15s ease',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={e  => e.target.style.borderColor  = 'var(--color-border)'}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            style={{
              position:  'absolute',
              right:     'var(--space-3)',
              top:       '50%',
              transform: 'translateY(-50%)',
              background:'none',
              border:    'none',
              cursor:    'pointer',
              padding:   4,
              color:     'var(--color-text-tertiary)',
              display:   'flex',
              alignItems:'center',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Optional filter icon */}
      {onFilter && (
        <button
          onClick={onFilter}
          aria-label="Filter"
          style={{
            width:           44,
            height:          44,
            borderRadius:    'var(--radius-full)',
            border:          hasActiveFilters
              ? '1.5px solid var(--color-accent)'
              : '1.5px solid var(--color-border)',
            backgroundColor: hasActiveFilters
              ? 'var(--color-accent)'
              : 'var(--color-surface)',
            color:           hasActiveFilters ? '#fff' : 'var(--color-text-secondary)',
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
            outline:         'none',
            WebkitTapHighlightColor: 'transparent',
            transition:      'all 0.15s ease',
          }}
        >
          <SlidersHorizontal size={16} />
        </button>
      )}
    </div>
  )
}
