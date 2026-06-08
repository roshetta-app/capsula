/**
 * src/components/conditions/RecentlyViewedChips.jsx
 * Phase 2C — Conditions Screen
 *
 * Horizontal scrollable row of recently viewed condition chips.
 * Hidden entirely when the list is empty.
 *
 * Shows a "RECENT" label prefix, then one pill per condition.
 * Tapping a chip navigates to /conditions/:slug.
 *
 * Props:
 *   recentlyViewed  — [{ id, name, slug }]  from useRecentlyViewed()
 */

import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../router'

export default function RecentlyViewedChips({ recentlyViewed }) {
  const navigate = useNavigate()

  if (!recentlyViewed || recentlyViewed.length === 0) return null

  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        'var(--space-2)',
      overflowX:  'auto',
      paddingBottom: 'var(--space-1)',
      marginBottom:  'var(--space-3)',
      scrollbarWidth:    'none',
      msOverflowStyle:   'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* "RECENT" prefix label */}
      <span style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         'var(--color-text-tertiary)',
        flexShrink:    0,
        paddingRight:  'var(--space-1)',
      }}>
        Recent
      </span>

      {/* Chips */}
      {recentlyViewed.map(condition => (
        <button
          key={condition.id}
          onClick={() => navigate(ROUTES.CONDITION_DETAIL(condition.slug))}
          style={{
            flexShrink:      0,
            padding:         '5px 12px',
            borderRadius:    'var(--radius-full)',
            fontSize:        12,
            fontWeight:      500,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
            whiteSpace:      'nowrap',
            border:          '1.5px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color:           'var(--color-text-secondary)',
            transition:      'border-color 0.15s ease, color 0.15s ease',
            outline:         'none',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
            e.currentTarget.style.color       = 'var(--color-accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.color       = 'var(--color-text-secondary)'
          }}
        >
          {condition.name}
        </button>
      ))}
    </div>
  )
}
