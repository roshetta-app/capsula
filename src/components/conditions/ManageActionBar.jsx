/**
 * src/components/conditions/ManageActionBar.jsx
 *
 * Extracted verbatim from src/pages/FavouritesScreen.jsx (Favourites Screen
 * Refactor plan, Phase 2) — no behavior change. Already generic/tab-agnostic
 * before this move; FavouritesScreen makes its call site tab-aware (count,
 * allSelected, onToggleSelectAll all computed by the caller).
 *
 * Rendered for the full duration of manage mode (not just once something is
 * selected) so there's always an inline way out. Cancel is an icon-button
 * (matches the sheet's own close-X pattern); count + Select all are grouped
 * together, Remove stays anchored on its own as the one destructive action.
 *
 * Props:
 *   count             number
 *   allSelected       boolean
 *   onToggleSelectAll () => void
 *   onRemove          () => void
 *   onCancel          () => void
 */

import { X } from 'lucide-react'

export default function ManageActionBar({ count, allSelected, onToggleSelectAll, onRemove, onCancel }) {
  return (
    <div style={{
      position:        'fixed',
      left:            0,
      right:           0,
      bottom:          80,
      zIndex:          60,
      display:         'flex',
      justifyContent:  'center',
      pointerEvents:   'none',
    }}>
      <div style={{
        pointerEvents:   'auto',
        width:           'calc(100% - var(--space-6) * 2)',
        maxWidth:        680 - 48,
        backgroundColor: 'var(--color-surface)',
        borderRadius:    'var(--radius-lg)',
        boxShadow:       '0 8px 24px rgba(0, 0, 0, 0.14)',
        padding:         '10px 14px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={onCancel}
            aria-label="Cancel selection"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              flexShrink:              0,
              width:                   28,
              height:                  28,
              borderRadius:            '50%',
              border:                  'none',
              backgroundColor:         'var(--color-border-subtle)',
              cursor:                  'pointer',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={15} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize:   13,
              fontWeight: 600,
              color:      'var(--color-text-primary)',
              whiteSpace: 'nowrap',
            }}>
              {count} selected
            </span>
            <span aria-hidden="true" style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>·</span>
            <button
              onClick={onToggleSelectAll}
              style={{
                background:     'none',
                border:         'none',
                cursor:         'pointer',
                fontSize:       13,
                fontWeight:     600,
                color:          '#F59E0B',
                fontFamily:     'var(--font-body)',
                padding:        0,
                whiteSpace:     'nowrap',
                textDecoration: 'underline',
              }}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>
        {count > 0 && (
          <button
            onClick={onRemove}
            style={{
              padding:         '8px 16px',
              borderRadius:    'var(--radius-full)',
              border:          'none',
              backgroundColor: 'var(--color-danger)',
              color:           '#fff',
              fontSize:        13,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
              flexShrink:      0,
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
