/**
 * src/components/conditions/FavouritesTabBar.jsx
 *
 * Extracted verbatim from src/pages/FavouritesScreen.jsx (Favourites Screen
 * Refactor plan, Phase 1) — no behavior change.
 *
 * Two named exports, kept together since renderTabs is driven entirely by
 * FAVOURITES_TABS:
 *   - FAVOURITES_TABS  — static tab order/labels/icons. Order matters:
 *     FavouritesScreen's switchTab() uses this array's index to figure out
 *     swipe/tap direction (forward vs backward), so it stays imported (not
 *     duplicated) wherever that logic lives.
 *   - renderTabs        — shared between the in-page tab row and the sticky
 *     header's copy, so the two never visually diverge. Pure render
 *     function of (activeTab, onSelect, counts).
 *
 * Icons represent content type (open book = reference material, pill =
 * medication) rather than favourited-status.
 */

import { BookOpen, Pill } from 'lucide-react'

export const FAVOURITES_TABS = [
  {
    key: 'conditions',
    label: 'Conditions',
    renderIcon: (color) => <BookOpen size={15} strokeWidth={1.8} color={color} />,
  },
  {
    key: 'drugs',
    label: 'Drugs',
    renderIcon: (color) => <Pill size={15} strokeWidth={1.8} color={color} />,
  },
]

export function renderTabs(activeTab, onSelect, counts) {
  return (
    <div style={{ display: 'flex' }}>
      {FAVOURITES_TABS.map(tab => {
        const isActive = activeTab === tab.key
        const fg = isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'
        const count = counts ? counts[tab.key] : undefined

        return (
          <div
            key={tab.key}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <button
              onClick={() => onSelect(tab.key)}
              style={{
                display:        'flex',
                flexDirection:  'row',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            10,
                height:         50,
                paddingLeft:    'var(--space-2)',
                paddingRight:   'var(--space-2)',
                width:          '100%',
                border:         'none',
                background:     'none',
                cursor:         'pointer',
                fontFamily:     'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
                outline:        'none',
                transition:     'color 0.15s ease',
              }}
            >
              {tab.renderIcon(fg)}
              <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: fg }}>
                {tab.label}
              </span>
              {count !== undefined && count !== null && count !== '' && (
                <span style={{
                  fontSize:   11,
                  fontWeight: 600,
                  color:      'var(--color-text-secondary)',
                  lineHeight: 1.4,
                }}>
                  {count}
                </span>
              )}
            </button>
            {/* Underline — full width of this 50% cell, exactly matching the
                active tab's rendered width; rounded ends; visible only
                beneath the active tab. NOTE: this spec was previously kept
                pixel-identical to ConditionDetailScreen's DetailHeader
                underline by explicit prior decision — that file wasn't part
                of this task's context, so it's now out of sync with this
                2px value until/unless it's updated to match. */}
            <span style={{
              display:         'block',
              height:          2,
              width:           '100%',
              marginTop:       2,
              borderRadius:    'var(--radius-full)',
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              transition:      'background-color 0.15s ease',
            }} />
          </div>
        )
      })}
    </div>
  )
}
