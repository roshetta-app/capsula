/**
 * src/components/ui/Snackbar.jsx
 *
 * Extracted verbatim from src/pages/FavouritesScreen.jsx (Favourites Screen
 * Refactor plan, Phase 1) — no behavior change. Generic transient toast with
 * an optional Undo action; used by FavouritesScreen for both tabs' remove
 * flows.
 *
 * Props:
 *   visible      boolean
 *   message      string
 *   actionLabel  string  (optional)
 *   onAction     () => void  (optional)
 */

import { Undo2 } from 'lucide-react'

export default function Snackbar({ visible, message, actionLabel, onAction }) {
  return (
    <div
      aria-live="polite"
      style={{
        position:        'fixed',
        bottom:          80,           // above bottom nav
        left:            '50%',
        transform:       `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:         visible ? 1 : 0,
        transition:      'opacity 0.2s ease, transform 0.2s ease',
        backgroundColor: 'var(--color-text-primary)',
        color:           'var(--color-bg)',
        fontSize:        13,
        fontWeight:      500,
        padding:         '8px 18px',
        borderRadius:    'var(--radius-full)',
        boxShadow:       'var(--shadow-elevated)',
        whiteSpace:      'nowrap',
        display:         'flex',
        alignItems:      'center',
        gap:             14,
        // Only interactive (and hit-testable) while visible, and only when
        // there's actually an action to tap — a plain message toast stays
        // fully inert so it never blocks touches to whatever's behind it.
        pointerEvents:   visible && onAction ? 'auto' : 'none',
        zIndex:          9999,
      }}
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background:              'none',
            border:                  'none',
            padding:                 0,
            margin:                  0,
            display:                 'flex',
            alignItems:              'center',
            gap:                     4,
            color:                   'var(--color-favourite)',
            fontSize:                13,
            fontWeight:              700,
            fontFamily:              'var(--font-body)',
            cursor:                  'pointer',
            whiteSpace:              'nowrap',
            outline:                 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Undo2 size={14} strokeWidth={2.2} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
