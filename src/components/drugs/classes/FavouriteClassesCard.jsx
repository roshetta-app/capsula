/**
 * src/components/drugs/classes/FavouriteClassesCard.jsx
 *
 * 2026-10-08 (pill): no longer a full-width card. It is a small left-aligned
 * pill (layers icon, name, count, arrow) in the soft class tint, so it does not
 * compete with the upgrade banner above it.
 *
 * 2026-10-08 (refactor, phase 2b): the 'Classes & families' card at the top of
 * the Drugs tab of the Favourites screen, moved here from
 * FavouriteClassesSheet.jsx. It shows how many are saved ('3/5' for a free
 * account) and opens the sheet. Same look; its icon tile is the shared
 * ClassIconTile. No behaviour change.
 *
 * Props: count, countLabel, onClick
 */
import { useState } from 'react'
import { ChevronRight, Layers } from 'lucide-react'

export default function FavouriteClassesCard({ count, countLabel, onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      {/* A small pill, not a full-width block: it sits left, takes only the
          room it needs, and leaves the upgrade banner as the one big shape. */}
      <button
        onClick={onClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 38, padding: '0 12px 0 12px', boxSizing: 'border-box',
          border: 'none', borderRadius: 999,
          backgroundColor: 'var(--color-class-light)',
          opacity: pressed ? 0.8 : 1,
          transform: pressed ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
          fontFamily: 'var(--font-body)', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', outline: 'none',
        }}
      >
        <Layers aria-hidden="true" size={16} strokeWidth={1.9} color="var(--color-class)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1, color: 'var(--color-text-primary)' }}>
          Classes &amp; families
        </span>
        <span style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          color: count > 0 ? 'var(--color-class)' : 'var(--color-text-tertiary)',
        }}>
          {countLabel ?? count}
        </span>
        <ChevronRight aria-hidden="true" size={15} strokeWidth={2} color="var(--color-class)" style={{ flexShrink: 0, opacity: 0.7, marginLeft: -2 }} />
      </button>
    </div>
  )
}
