/**
 * src/components/drugs/home/CategoryRow.jsx
 * 2026-10-04 (Drugs home split into small files): moved unchanged out of
 * DrugsScreen.jsx. This is the category tile in the Browse area's grid.
 */

import { useState } from 'react'
import { SpecialtyIcon } from '../../../utils/specialtyIcon'

// 2026-07-18 (drug_library_ui_ux, plan §7 step 1c.3, decision 4.21): softened —
// "N drugs" count removed (and the now-unused `count` prop dropped from both
// call sites below), border lightened to --color-border-subtle, shadow moved
// to --shadow-ambient-selector. Radius (--radius-lg) unchanged. Still a card,
// unlike the flat drug row — kept deliberately distinct per 4.21.
//
// 2026-08-09 (2nd pass): added the same tap-feedback treatment
// SharedDrugCard uses — pointer handlers driving a `pressed` boolean that
// swaps backgroundColor to var(--color-surface-muted) and scales the tile
// to 0.99, both animated via var(--motion-fast)/var(--ease-settle) — so
// every tappable surface on this screen (drug rows, this grid, the
// Recently Viewed button below) responds to touch the same way.
//
// 2026-10-04: the tile now has the same look as the class cards (ResultCard in
// ClassSearchResults.jsx): soft muted fill, no border, 16px corners, and the
// same press feedback (fade to 0.8 and shrink to 0.985). The theme variables
// carry it into dark mode.

// 2026-10-23: new look (white bordered tile, icon square on top, name under it), see inside.
// 2026-10-22 (UI refresh, card refinement, approved by Lmar): same soft card as the group cards. No
// border, a soft wash of the category's own colour, a round icon at the top and the name (15) at the
// bottom. The old 'color' prop (the icon square fill) is no longer used; callers may still pass it.
export default function CategoryRow({ label, iconType, iconValue, textColor, onTap }) {
  const ink = textColor || 'var(--color-accent)'
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onTap()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10,
        minHeight: 92, boxSizing: 'border-box',
        // 2026-10-23: a quiet white tile with a thin border, icon square at the top and the name under it (the name always fits). Only the
        // small icon square carries the category colour, so it no longer looks like a group card.
        backgroundColor: pressed ? 'var(--color-surface-muted)' : 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 14,
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
        backgroundColor: `color-mix(in srgb, ${ink} 12%, var(--color-surface))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={18} color={ink} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.25, minWidth: 0 }}>
        {label}
      </div>
    </div>
  )
}
