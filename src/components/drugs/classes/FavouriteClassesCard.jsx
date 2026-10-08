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
        border: 'none', borderRadius: 16,
        backgroundColor: 'var(--color-class-light)',
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily: 'var(--font-body)', textAlign: 'left', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <ClassIconTile Icon={Layers} tone="class" transparent />
      <span style={{
        flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, lineHeight: 1.3,
        color: 'var(--color-text-primary)',
      }}>
        Classes &amp; families
      </span>
      <CountTag
        tone={count > 0 ? 'accent' : 'neutral'}
        style={count > 0 ? { backgroundColor: 'transparent', color: 'var(--color-class)' } : { backgroundColor: 'transparent' }}
      >{countLabel ?? count}</CountTag>
      <ChevronRight aria-hidden="true" size={16} strokeWidth={2} color="var(--color-class)" style={{ flexShrink: 0, opacity: 0.7 }} />
    </button>
  )
}
