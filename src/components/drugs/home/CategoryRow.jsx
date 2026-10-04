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

export default function CategoryRow({ label, iconType, iconValue, color, textColor, onTap }) {
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
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        backgroundColor: 'var(--color-surface-muted)',
        border: 'none',
        borderRadius: 16,
        padding: 'var(--space-3)',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      {/* Icon in tinted circle */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        backgroundColor: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={15} color={textColor} />
      </div>

      {/* Name */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
        {label}
      </div>
    </div>
  )
}
