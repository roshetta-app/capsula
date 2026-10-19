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
 *   onOpen       tap handler
 *
 * The group's colour is one of five fixed names (blue, teal, violet, amber,
 * rose), read through the app's colour tokens so light and dark both work.
 * An Arabic name is left-aligned like an English one (decision 2026-10-19).
 */

import { useState } from 'react'
import { Folder, Plus } from 'lucide-react'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'

export function drugCountLabel(n) {
  return n === 1 ? '1 drug' : `${n} drugs`
}

export function ProPill() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
      padding: '2px 7px', borderRadius: 'var(--radius-pill)',
      backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
      fontFamily: 'var(--font-body)', flexShrink: 0,
    }}>
      PRO
    </span>
  )
}

export default function GroupTile({ group, isNew = false, showProBadge = false, onOpen }) {
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
      aria-label={isNew ? 'New group' : `${name}, ${drugCountLabel(count)}`}
      onKeyDown={e => e.key === 'Enter' && onOpen?.()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        backgroundColor: 'var(--color-surface-muted)',
        border: isNew ? '1.5px dashed var(--color-border)' : 'none',
        borderRadius: 16,
        padding: 'var(--space-3)',
        minHeight: 84,
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: colors.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isNew
            ? <Plus size={16} color="var(--color-text-secondary)" aria-hidden="true" />
            : <Folder size={15} color={colors.fg} aria-hidden="true" />}
        </div>
        {isNew && showProBadge && <ProPill />}
      </div>

      <div
        dir={dir}
        style={{
          width: '100%', textAlign: 'start',
          fontSize: 13, fontWeight: 600, lineHeight: 1.3,
          color: isNew ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', overflowWrap: 'anywhere',
        }}
      >
        {name}
      </div>

      {!isNew && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
          {drugCountLabel(count)}
        </div>
      )}
    </div>
  )
}
