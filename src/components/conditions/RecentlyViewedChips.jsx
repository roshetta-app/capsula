/**
 * src/components/conditions/RecentlyViewedChips.jsx
 * Phase 3 — Conditions Screen Redesign
 *
 * Styled chips with clock icon, right-edge fade gradient,
 * and hidden prop for suppression when search is active.
 *
 * Props:
 *   recentlyViewed  [{ id, name, slug }]
 *   hidden          boolean  — renders null when true (search active)
 */
import { Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../router'

export default function RecentlyViewedChips({ recentlyViewed, hidden }) {
  const navigate = useNavigate()

  if (hidden || !recentlyViewed || recentlyViewed.length === 0) return null

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      {/* Section label — own line above chip row */}
      <div style={{
        fontSize:      10,
        fontWeight:    500,
        color:         'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom:  'var(--space-2)',
      }}>
        Recent
      </div>

      {/* Scrollable chip row + right-edge fade */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display:                 'flex',
          gap:                     'var(--space-2)',
          overflowX:               'auto',
          scrollbarWidth:          'none',
          msOverflowStyle:         'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom:           2,
        }}>
          {recentlyViewed.map(condition => (
            <button
              key={condition.id}
              onClick={() => navigate(ROUTES.CONDITION_DETAIL(condition.slug))}
              style={{
                flexShrink:              0,
                display:                 'flex',
                alignItems:              'center',
                gap:                     5,
                padding:                 '5px 12px',
                borderRadius:            'var(--radius-full)',
                border:                  '1px solid var(--color-border)',
                backgroundColor:         'var(--color-surface)',
                fontSize:                12,
                fontFamily:              'var(--font-body)',
                color:                   'var(--color-text-secondary)',
                cursor:                  'pointer',
                whiteSpace:              'nowrap',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Clock size={11} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {condition.name}
            </button>
          ))}
        </div>

        {/* Right-edge fade — hints more chips are off-screen */}
        <div
          aria-hidden="true"
          style={{
            position:      'absolute',
            top:           0,
            right:         0,
            bottom:        0,
            width:         40,
            background:    'linear-gradient(to right, transparent, var(--color-bg))',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
