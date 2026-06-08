/**
 * src/components/ui/SearchBar.jsx
 * Phase 2I — shared search bar used on ConditionsScreen and DrugsScreen.
 *
 * Props:
 *   value            string
 *   onChange         (val: string) => void
 *   placeholder      string
 *   onFilter         () => void | undefined  — if provided, shows filter icon
 *   hasActiveFilters boolean                 — highlights filter icon when true
 */

import { Search, X, SlidersHorizontal } from 'lucide-react'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  onFilter,
  hasActiveFilters = false,
}) {
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
