/**
 * src/components/conditions/FavouritesTabBar.jsx
 * 2026-10-22 (UI refresh plan, step 8.6b): the tab row is now one segmented control (rule 12) in
 * the same track and raised-thumb colours as the Drugs Brand / Generic / Class switch
 * (--color-seg-track, --color-seg-thumb, --color-seg-thumb-text). 'FavouritesSegmented' replaces
 * 'renderTabs'; the count stays next to each name ('10/10' on a free account). 'compact' is the
 * shorter version for the slim bar on scroll (no icons).
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
 *
 * 2026-10-03 (count tags): the number next to each tab name is now the same
 * small rounded-square tag (CountTag from ui/CountTag.jsx) as on the brands
 * sheet's two tabs: accent tint on the active tab, neutral on the other. This
 * replaces the plain muted number of Phase 11. Because the sticky header
 * shares renderTabs, it gets the same tags.
 */

import { BookOpen, Pill } from 'lucide-react'

// The screen's swipe logic needs this order too, so it stays exported from here.
// eslint-disable-next-line react-refresh/only-export-components
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

export function FavouritesSegmented({ activeTab, onSelect, counts, compact = false }) {
  return (
    <div
      role="radiogroup"
      aria-label="Favourites"
      style={{
        display:         'flex',
        gap:             2,
        padding:         3,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-seg-track)',
      }}
    >
      {FAVOURITES_TABS.map(tab => {
        const chosen = activeTab === tab.key
        const count  = counts ? counts[tab.key] : undefined
        return (
          <button
            key={tab.key}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => { if (!chosen) onSelect(tab.key) }}
            style={{
              flex:                    1,
              minWidth:                0,
              height:                  compact ? 34 : 44,
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     6,
              padding:                 '0 8px',
              border:                  'none',
              borderRadius:            'var(--radius-full)',
              backgroundColor:         chosen ? 'var(--color-seg-thumb)' : 'transparent',
              color:                   chosen ? 'var(--color-seg-thumb-text)' : 'var(--color-text-primary)',
              boxShadow:               chosen ? '0 1px 3px rgba(0, 0, 0, 0.14)' : 'none',
              fontFamily:              'var(--font-body)',
              fontSize:                14,
              fontWeight:              chosen ? 700 : 500,
              cursor:                  'pointer',
              transition:              'background-color var(--motion-fast) var(--ease-settle), color var(--motion-fast) var(--ease-settle)',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            {!compact && tab.renderIcon('currentColor')}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
            {count !== undefined && count !== null && count !== '' && (
              <span style={{
                fontSize:   12,
                fontWeight: 600,
                color:      chosen ? 'inherit' : 'var(--color-text-secondary)',
                flexShrink: 0,
              }}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
