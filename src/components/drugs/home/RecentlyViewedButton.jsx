/**
 * src/components/drugs/home/RecentlyViewedButton.jsx
 * 2026-10-04 (Drugs home split into small files): moved unchanged out of
 * DrugsScreen.jsx. It now sits inside the Search area, under the search bar,
 * since it is a shortcut to drugs.
 */

import { useState } from 'react'
import { resolveToken, FALLBACK_TOKEN } from '../../../utils/specialtyTokens'

// 2026-08-09: extracted from an inline <button> in the category-list view
// (see call site above) so it can carry its own `pressed` state — same
// SharedDrugCard-style tap feedback as CategoryRow above, for the same
// reason (it sits under the search bar, so it needs to feel like part of the
// same tappable surface, not a plain form button).
// 2026-10-04: its bottom margin was dropped; the Search area spaces it itself.

// 2026-08-09 (redesign): swapped the clock-icon + label row for an avatar
// stack of the 3 most recent drugs' initials, colored by each drug's own
// category token (same resolveToken lookup CategoryRow uses). Gives a
// visual preview of *what's* recent instead of just naming the feature.
// Falls back gracefully if fewer than 3 recents exist — `preview` is just
// however many are actually in `drugs` (already capped at MAX_RECENT
// upstream, but this row itself only ever shows the first 3).

export default function RecentlyViewedButton({ onTap, drugs, categories, isDark }) {
  const [pressed, setPressed] = useState(false)
  const preview = drugs.slice(0, 3)

  function getInitials(drug) {
    const name = drug.tradenameClean || drug.genericName || ''
    if (!name) return '?'
    return name.slice(0, 1).toUpperCase() + name.slice(1, 2).toLowerCase()
  }

  function getColors(drug) {
    const cat = categories.find(c => c.slug === drug.category)
    return resolveToken(cat?.color_token || FALLBACK_TOKEN, isDark)
  }

  return (
    <button
      onClick={onTap}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     'var(--space-2)',
        width:                   '100%',
        backgroundColor:         pressed ? 'var(--color-surface-muted)' : 'transparent',
        border:                  'none',
        borderRadius:            'var(--radius-lg)',
        padding:                 'var(--space-1) 0',
        cursor:                  'pointer',
        fontFamily:              'var(--font-body)',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        transform:               pressed ? 'scale(0.99)' : 'scale(1)',
        transition:              'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div style={{ display: 'flex', flexShrink: 0 }}>
        {preview.map((drug, i) => {
          const colors = getColors(drug)
          return (
            <div
              key={drug.id}
              style={{
                width:           28,
                height:          28,
                borderRadius:    '50%',
                backgroundColor: colors.bg,
                color:           colors.fg,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                fontSize:        11,
                fontWeight:      600,
                border:          '2px solid var(--color-surface)',
                marginLeft:      i === 0 ? 0 : -10,
              }}
            >
              {getInitials(drug)}
            </div>
          )
        })}
      </div>

      <span style={{
        fontSize:   13,
        fontWeight: 500,
        color:      'var(--color-text-primary)',
      }}>
        Recently viewed
      </span>

      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-text-primary)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ marginLeft: 'auto' }}
      >
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}
