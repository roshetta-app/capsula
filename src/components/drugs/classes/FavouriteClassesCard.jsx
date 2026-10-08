/**
 * src/components/drugs/classes/FavouriteClassesCard.jsx
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
import CountTag from '../../ui/CountTag'
import { ClassIconTile } from './ClassCard.jsx'

export default function FavouriteClassesCard({ count, countLabel, onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', boxSizing: 'border-box',
        minHeight: 64, padding: '14px 16px',
        marginBottom: 'var(--space-3)',
        border: '0.5px solid var(--color-border)', borderRadius: 16,
        backgroundColor: 'var(--color-surface)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily: 'var(--font-body)', textAlign: 'left', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <ClassIconTile Icon={Layers} tone="class" />
      <span style={{
        flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.3,
        color: 'var(--color-text-primary)',
      }}>
        Classes &amp; families
      </span>
      <CountTag tone={count > 0 ? 'accent' : 'neutral'}>{countLabel ?? count}</CountTag>
      <ChevronRight aria-hidden="true" size={16} strokeWidth={2} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
    </button>
  )
}
