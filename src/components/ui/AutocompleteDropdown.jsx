/**
 * src/components/ui/AutocompleteDropdown.jsx
 * Phase 2I — shared autocomplete dropdown.
 *
 * Appears below a SearchBar when input has 2+ characters.
 * Shows top 5 matches as tappable rows.
 * Closes on outside tap or on result selection.
 *
 * Props:
 *   suggestions  [{ id, name, slug }]
 *   onSelect     (suggestion) => void
 *   onDismiss    () => void
 */

import { useEffect, useRef } from 'react'

export default function AutocompleteDropdown({ suggestions, onSelect, onDismiss }) {
  const ref = useRef(null)

  // Close on outside tap / click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown',  handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown',  handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [onDismiss])

  if (!suggestions || suggestions.length === 0) return null

  return (
    <div
      ref={ref}
      role="listbox"
      style={{
        position:        'absolute',
        top:             '100%',
        left:            0,
        right:           0,
        zIndex:          200,
        backgroundColor: 'var(--color-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-lg)',
        boxShadow:       'var(--shadow-elevated)',
        overflow:        'hidden',
        marginTop:       4,
      }}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          role="option"
          onClick={() => onSelect(s)}
          style={{
            width:       '100%',
            display:     'flex',
            alignItems:  'center',
            padding:     '10px var(--space-4)',
            background:  'none',
            border:      'none',
            borderTop:   i > 0 ? '1px solid var(--color-border)' : 'none',
            cursor:      'pointer',
            fontFamily:  'var(--font-body)',
            fontSize:    14,
            color:       'var(--color-text-primary)',
            textAlign:   'left',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
