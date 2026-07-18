/**
 * src/components/SharedDrugCard.jsx
 * drug_library_ui_ux — step 1d.1 (decision 4.11)
 *
 * Shell only. Temporary top-level filename/location — the old, boxed
 * src/components/DrugCard.jsx is still in active use by FavouritesScreen
 * until step 1d.8 swaps every caller over and retires it, so this can't
 * take that file's name or path yet.
 *
 * No card box — flat row, icon-left, hairline divider between rows (same
 * isLast-suppresses-last-divider pattern as ConditionCard.jsx), one shared
 * component for both the Drugs screen and the Favourites screen. Unlike
 * ConditionCard.jsx, this row is a FIXED height rather than flexing per
 * content — decision 4.11 calls for that specifically, since inconsistent
 * row heights are the root cause of the sticky-header scroll flicker
 * (plan §0, 4.28's correction note). ROW_HEIGHT is a tentative value; it
 * may need revisiting once the real title/generic-line content lands.
 *
 * This step only builds the outer shell and its slot layout. Each slot's
 * real content lands in a later step:
 *   - icon-left badge   → 1d.4 (category icon, live drug_categories data)
 *   - title line        → 1d.2 (tradename_clean + strength + form)
 *   - generic line       → 1d.3 (first 2 ingredients + "+N")
 *   - trailing control  → 1d.5 / 1d.6 (bookmark, screen-owned per 4.16)
 *
 * Props (final shape — trailing is unused until 1d.5/1d.6 wire it up):
 *   drug       FlatDrug
 *   onTap      (drug) => void   — required, matches old DrugCard.jsx's
 *                                 convention (no navigate fallback guessed)
 *   isLast     boolean          — suppresses the bottom divider on the last row
 *   trailing   ReactNode (optional) — rendered in the right-hand slot
 */

import { useState } from 'react'

const ROW_HEIGHT = 64 // tentative — revisit once 1d.2-1d.4 content is in place

export default function SharedDrugCard({ drug, onTap, isLast = false, trailing = null }) {
  const [pressed, setPressed] = useState(false)

  function handleTap() {
    onTap(drug)
  }

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleTap()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:                 'flex',
        alignItems:              'center',
        height:                  ROW_HEIGHT,
        gap:                     'var(--space-3)',
        borderBottom:            isLast ? 'none' : '1px solid var(--color-border-subtle)',
        cursor:                  'pointer',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor:         pressed ? 'var(--color-surface-muted)' : 'transparent',
        transform:               pressed ? 'scale(0.99)' : 'scale(1)',
        transition:              'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      {/* Left: category icon slot — filled by 1d.4 (icon-only, tinted square) */}
      <div style={{
        width:           36,
        height:          36,
        flexShrink:      0,
        borderRadius:    'var(--radius-md)',
        backgroundColor: 'var(--color-surface-muted)',
      }} />

      {/* Middle: text content — title line lands in 1d.2, generic line in 1d.3 */}
      <div style={{ flex: 1, minWidth: 0 }} />

      {/* Right: trailing slot — bookmark control wired in 1d.5/1d.6, screen-owned per decision 4.16 */}
      <div style={{ flexShrink: 0 }}>
        {trailing}
      </div>
    </div>
  )
}
