/**
 * src/components/drugs/groups/GroupTile.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): one group as a tile, or the "New
 * group" tile. Same look as the category tiles (CategoryRow.jsx): soft muted
 * fill, no border, 16px corners, same press feedback.
 *
 * Props:
 *   group        { id, name, color, brandIds }  (not needed when isNew)
 *   isNew        true -> the "New group" tile
 *   showProBadge on the New group tile: free account at its limit
 *   waiting      true when this group has changes saved on the phone and not yet sent
 *   animate      true -> soft fade-in (a group just added or renamed)
 *   onOpen       tap handler
 *
 * The group's colour is one of five fixed names (blue, teal, violet, amber,
 * rose), read through the app's colour tokens so light and dark both work.
 * An Arabic name is left-aligned like an English one (decision 2026-10-19).
 *
 * 2026-10-20 (Drug groups plan, step 11.5): flat look. A group is a tile filled with its
 * own soft colour, a big drug count at the top and the name under it, no border. The
 * New group tile is the same size with a dashed line and a plus. 'animate' gives a tile
 * that was just added or renamed a short soft fade-in (the class is defined in
 * GroupsSection.jsx).
 */

import { useState } from 'react'
import { Plus, CloudUpload } from 'lucide-react'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'

export function drugCountLabel(n) {
  return n === 1 ? '1 drug' : `${n} drugs`
}

export function ProPill() {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      padding: '2px 7px', borderRadius: 'var(--radius-pill)',
      backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
      fontFamily: 'var(--font-body)', flexShrink: 0,
    }}>
      PRO
    </span>
  )
}

// The small mark on a group that has changes not yet sent (step 17.6a).
export function WaitingMark({ size = 14, color = 'var(--color-text-secondary)' }) {
  return (
    <span role="img" aria-label="Waiting to save" title="Waiting to save" style={{ display: 'flex', flexShrink: 0 }}>
      <CloudUpload size={size} color={color} aria-hidden="true" />
    </span>
  )
}

export default function GroupTile({ group, isNew = false, showProBadge = false, waiting = false, animate = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const dir = 'ltr'
  const count = group?.brandIds?.length ?? 0

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className={animate ? 'group-soft-in' : undefined}
      aria-label={isNew ? 'New group' : `${name}, ${drugCountLabel(count)}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)',
        backgroundColor: isNew ? 'transparent' : colors.bg,
        border: isNew ? '1.5px dashed var(--color-border)' : 'none',
        borderRadius: 18,
        padding: 14,
        minHeight: 96,
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        {isNew ? (
          <Plus size={24} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: colors.fg, fontFamily: 'var(--font-body)' }}>
              {count}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.fg, opacity: 0.8, fontFamily: 'var(--font-body)' }}>
              {count === 1 ? 'drug' : 'drugs'}
            </span>
          </div>
        )}
        {isNew && showProBadge && <ProPill />}
        {!isNew && waiting && <WaitingMark color={colors.fg} />}
      </div>

      <div
        dir={dir}
        style={{
          width: '100%', textAlign: 'start',
          fontSize: 14, fontWeight: 600, lineHeight: 1.3,
          color: isNew ? 'var(--color-text-secondary)' : colors.fg,
          fontFamily: 'var(--font-body)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', overflowWrap: 'anywhere',
        }}
      >
        {name}
      </div>
    </div>
  )
}
