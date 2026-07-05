/**
 * src/components/ui/SearchBar.jsx
 * Phase 2I — shared search bar used on ConditionsScreen and DrugsScreen.
 * Phase 3  — updated default placeholder to "Search conditions or symptoms…"
 * Phase 5  — flat border-only style; accent ring on focus; no shadow
 * Phase 6  — forwardRef added so parent can scroll-to and focus the input
 * Phase 7  — optional `compact` prop added (used by FavouritesScreen): reduces
 *             height 46px → 44px. Default false, so every existing call site
 *             (ConditionsScreen, DrugsScreen) renders unchanged. Filter button
 *             sizing follows the same height for visual consistency if it's
 *             ever paired with compact elsewhere.
 * Phase 8  — optional `icon` prop added (used by FavouritesScreen to show a
 *             Star instead of the generic magnifying glass, reading as
 *             "search favourites" rather than a generic search). Defaults to
 *             the existing Search glyph, so every other call site is
 *             unaffected. The built-in clear-text button (X, shown only when
 *             value is non-empty) is unrelated to this and unchanged.
 * conditions-screen-polish-master-plan Phase 1 — added className="search-input"
 *             to the <input>. React's inline `style` prop can't target the
 *             ::placeholder pseudo-element, so the placeholder font-weight
 *             bump lives in a new `.search-input::placeholder` rule in
 *             globals.css instead; this class is the only hook it needs.
 *             Global change — every SearchBar call site (Conditions, Drugs,
 *             Favourites) picks up the heavier placeholder.
 *
 * Props:
 *   value            string
 *   onChange         (val: string) => void
 *   placeholder      string
 *   onFilter         () => void | undefined  — if provided, shows filter icon
 *   hasActiveFilters boolean                 — highlights filter icon when true
 *   compact          boolean                 — slightly shorter variant (44px vs 46px)
 *   icon             Component               — icon rendered at the input's left edge, defaults to Search
 */

import { forwardRef }                    from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'

const SearchBar = forwardRef(function SearchBar({
  value,
  onChange,
  placeholder = 'Search conditions or symptoms…',
  onFilter,
  hasActiveFilters = false,
  compact = false,
  icon: Icon = Search,
}, ref) {
  const height = compact ? 44 : 46

  return (
    <div style={{
      display:    'flex',
      gap:        'var(--space-2)',
      alignItems: 'center',
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Icon
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
          ref={ref}
          type="text"
          className="search-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:           '100%',
            boxSizing:       'border-box',
            paddingLeft:     40,
            paddingRight:    value ? 40 : 16,
            height:          height,
            borderRadius:    'var(--radius-full)',
            border:          '1px solid var(--color-search-border)',
            backgroundColor: 'var(--color-surface)',
            fontSize:        14,
            color:           'var(--color-text-primary)',
            fontFamily:      'var(--font-body)',
            outline:         'none',
            boxShadow:       'var(--shadow-ambient-search)',
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

      {onFilter && (
        <button
          onClick={onFilter}
          aria-label="Filter"
          style={{
            width:           height,
            height:          height,
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
})

export default SearchBar
