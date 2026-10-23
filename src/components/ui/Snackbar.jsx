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
 *
 * 2026-10-23: made bigger everywhere it is used (15 px text, 48 px tall, a 40 px Undo tap area).
 */

import { Undo2 } from 'lucide-react'

export default function Snackbar({ visible, message, actionLabel, onAction }) {
  return (
    <div
      aria-live="polite"
      style={{
        position:        'fixed',
        bottom:          84,           // above bottom nav
        left:            '50%',
        transform:       `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:         visible ? 1 : 0,
        transition:      'opacity 0.2s ease, transform 0.2s ease',
        backgroundColor: 'var(--color-text-primary)',
        color:           'var(--color-bg)',
        fontSize:        15,
        fontWeight:      500,
        minHeight:       48,
        padding:         '4px 6px 4px 20px',
        maxWidth:        'calc(100vw - 32px)',
        boxSizing:       'border-box',
        borderRadius:    'var(--radius-full)',
        boxShadow:       'var(--shadow-elevated)',
        whiteSpace:      'nowrap',
        display:         'flex',
        alignItems:      'center',
        gap:             12,
        // Only interactive (and hit-testable) while visible, and only when
        // there's actually an action to tap — a plain message toast stays
        // fully inert so it never blocks touches to whatever's behind it.
        pointerEvents:   visible && onAction ? 'auto' : 'none',
        zIndex:          9999,
      }}
    >
      <span style={{ minWidth: 0 }}>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background:              'none',
            border:                  'none',
            padding:                 '0 14px',
            margin:                  0,
            minHeight:               40,
            borderRadius:            'var(--radius-full)',
            display:                 'flex',
            alignItems:              'center',
            gap:                     6,
            color:                   'var(--color-favourite)',
            fontSize:                15,
            fontWeight:              700,
            fontFamily:              'var(--font-body)',
            cursor:                  'pointer',
            whiteSpace:              'nowrap',
            outline:                 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Undo2 size={16} strokeWidth={2.2} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
