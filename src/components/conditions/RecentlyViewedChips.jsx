/**
 * src/components/conditions/RecentlyViewedChips.jsx
 * Phase 5 — Conditions Screen Redesign
 *
 * Compact inline row: clock icon + "Recent" label + condition names as
 * tappable text links separated by · dots. Scrolls horizontally when
 * names overflow. Hidden when search is active.
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
    <div style={{
      position:     'relative',
      marginBottom: 'var(--space-3)',
    }}>
      {/* Single scrollable line */}
      <div style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     'var(--space-2)',
        overflowX:               'auto',
        scrollbarWidth:          'none',
        msOverflowStyle:         'none',
        WebkitOverflowScrolling: 'touch',
        whiteSpace:              'nowrap',
      }}>
        {/* Clock + label — fixed, never scrolls away */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        5,
          flexShrink: 0,
          color:      'var(--color-text-tertiary)',
        }}>
          <Clock size={12} strokeWidth={1.8} />
          <span style={{
            fontSize:   11,
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.02em',
          }}>
            Recent
          </span>
        </div>

        {/* Separator line */}
        <div style={{
          width:           1,
          height:          12,
          backgroundColor: 'var(--color-border)',
          flexShrink:      0,
        }} />

        {/* Condition names as inline text links with · separators */}
        {recentlyViewed.map((condition, index) => (
          <div key={condition.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            {index > 0 && (
              <span style={{
                color:      'var(--color-border)',
                fontSize:   12,
                userSelect: 'none',
              }}>·</span>
            )}
            <button
              onClick={() => navigate(ROUTES.CONDITION_DETAIL(condition.slug))}
              style={{
                background:              'none',
                border:                  'none',
                padding:                 0,
                cursor:                  'pointer',
                fontSize:                13,
                fontFamily:              'var(--font-body)',
                color:                   'var(--color-text-secondary)',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
                whiteSpace:              'nowrap',
              }}
            >
              {condition.name}
            </button>
          </div>
        ))}
      </div>

      {/* Right-edge fade — hints more items are off-screen */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          top:           0,
          right:         0,
          bottom:        0,
          width:         32,
          background:    'linear-gradient(to right, transparent, var(--color-bg))',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
