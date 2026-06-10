/**
 * src/components/conditions/RecentlyViewedChips.jsx
 * Phase 2C — Conditions Screen
 *
 * Horizontal scrollable row of recently viewed conditions.
 * Styled as plain text links (no pill border/background) so they read as
 * history, not filters — visually distinct from SpecialtyFilterPills.
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
      gap:        0,
      overflowX:  'auto',
      paddingBottom: 'var(--space-1)',
      marginBottom:  'var(--space-3)',
      scrollbarWidth:          'none',
      msOverflowStyle:         'none',
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
        marginRight:   'var(--space-2)',
        whiteSpace:    'nowrap',
      }}>
        Recent
      </span>

      {/* Plain text links separated by · */}
      {recentlyViewed.map((condition, i) => (
        <span key={condition.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {i > 0 && (
            <span style={{
              color:      'var(--color-border)',
              fontSize:   12,
              margin:     '0 6px',
              userSelect: 'none',
              flexShrink: 0,
            }}>
              ·
            </span>
          )}
          <button
            onClick={() => navigate(ROUTES.CONDITION_DETAIL(condition.slug))}
            style={{
              flexShrink:      0,
              padding:         '2px 0',
              border:          'none',
              background:      'none',
              fontSize:        12,
              fontWeight:      400,
              fontFamily:      'var(--font-body)',
              color:           'var(--color-text-secondary)',
              cursor:          'pointer',
              whiteSpace:      'nowrap',
              outline:         'none',
              WebkitTapHighlightColor: 'transparent',
              textDecoration:  'none',
              transition:      'color 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            {condition.name}
          </button>
        </span>
      ))}
    </div>
  )
}
