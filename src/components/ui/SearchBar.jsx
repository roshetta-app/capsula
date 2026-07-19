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
 * conditions-screen-polish-master-plan Phase 11 — left-edge icon recolored
 *             from var(--color-text-tertiary) (neutral grey) to
 *             var(--color-accent) (brand blue) — the same blue used
 *             elsewhere for active/interactive accents. Applies to every
 *             call site (Conditions, Drugs, Favourites), including the
 *             Star icon FavouritesScreen swaps in via the `icon` prop above,
 *             since both icons share this one style object.
 * 2026-07-19 (Drugs search-bar polish) — the filter trigger moved from a
 *             separate bordered button beside the pill to an icon embedded
 *             inside it, on the right edge, alongside the clear (X) button.
 *             Reported bug: the row that used to hold this component plus a
 *             sibling Brand/Generic toggle visibly squeezed the input once
 *             that toggle appeared. Root cause was two things stacking: the
 *             toggle's own width, and this component's filter button taking
 *             a second full-height box next to the pill. Folding the filter
 *             trigger into the pill removes its box entirely; the toggle
 *             itself moved out of this row into DrugFilterPanel (see that
 *             file and DrugsScreen.jsx). The outer flex/gap wrapper that
 *             used to hold the pill + separate filter button is gone — the
 *             component's root is now the pill's own relative container, so
 *             every call site now gets a plain single element back instead
 *             of a two-child flex row. No call site needs a code change:
 *             the component still just fills whatever width its parent
 *             gives it.
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

  // Right-edge icon cluster, innermost first: the filter trigger always
  // sits at the very edge when present; the clear button sits just inside
  // it so the two never overlap. Input padding grows to match whichever of
  // the two are actually present.
  const filterEdge   = 6
  const clearEdge    = onFilter ? filterEdge + 34 : 8
  const paddingRight = 16 + (onFilter ? 34 : 0) + (value ? 30 : 0)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Icon
        size={16}
        style={{
          position:      'absolute',
          left:          'var(--space-4)',
          top:           '50%',
          transform:     'translateY(-50%)',
          color:         'var(--color-accent)',
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
          paddingRight,
          height:          height,
          borderRadius:    'var(--radius-full)',
          border:          '1px solid var(--color-search-border)',
          backgroundColor: 'var(--color-surface)',
          fontSize:        14,
          color:           'var(--color-text-primary)',
          fontFamily:      'var(--font-body)',
          outline:         'none',
          boxShadow:       'var(--shadow-ambient-search)',
          transition:      'border-color var(--motion-fast) var(--ease-settle), box-shadow var(--motion-fast) var(--ease-settle)',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-accent)'
          e.target.style.boxShadow   = '0 0 0 3px var(--color-accent-light), var(--shadow-ambient-search)'
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--color-border)'
          e.target.style.boxShadow   = 'var(--shadow-ambient-search)'
        }}
      />
      <button
        onClick={() => onChange('')}
        aria-label="Clear search"
        tabIndex={value ? 0 : -1}
        style={{
          position:      'absolute',
          right:         clearEdge,
          top:           '50%',
          transform:     'translateY(-50%)',
          background:    'none',
          border:        'none',
          cursor:        'pointer',
          padding:       4,
          color:         'var(--color-text-tertiary)',
          display:       'flex',
          alignItems:    'center',
          opacity:       value ? 1 : 0,
          pointerEvents: value ? 'auto' : 'none',
          transition:    'opacity var(--motion-fast) var(--ease-reveal)',
        }}
      >
        <X size={15} />
      </button>

      {onFilter && (
        <button
          onClick={onFilter}
          aria-label="Filter"
          style={{
            position:        'absolute',
            right:           filterEdge,
            top:             '50%',
            transform:       'translateY(-50%)',
            width:           30,
            height:          30,
            borderRadius:    '50%',
            border:          'none',
            backgroundColor: hasActiveFilters ? 'var(--color-accent)' : 'transparent',
            color:           hasActiveFilters ? '#fff' : 'var(--color-text-secondary)',
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            outline:         'none',
            WebkitTapHighlightColor: 'transparent',
            transition:      'all 0.15s ease',
          }}
        >
          <SlidersHorizontal size={15} />
        </button>
      )}
    </div>
  )
})

export default SearchBar
