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
 *
 * 2026-10-22 (UI refresh plan, step 8.2a): the tile is now a card in the sideways row on the
 * Drugs home. Surface fill with a thin border, a small tile in the group's colour with a
 * folder, then the name, the drug count and the first drug names, each on one line. The New
 * group card is the same size with a dashed line. 'drugNames' is the preview line.
 */

import { useState } from 'react'
import { Plus, Folder, CloudUpload } from 'lucide-react'
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

export const CARD_WIDTH = 156

export default function GroupTile({ group, isNew = false, showProBadge = false, waiting = false, animate = false, drugNames = '', onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const count = group?.brandIds?.length ?? 0
  const line = { fontSize: 12, lineHeight: 1.3, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

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
        flex: `0 0 ${CARD_WIDTH}px`, width: CARD_WIDTH, scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', gap: 10,
        backgroundColor: isNew ? 'transparent' : 'var(--color-surface)',
        border: isNew ? '1.5px dashed var(--color-border)' : '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 12,
        minHeight: 128,
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
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: isNew ? 'var(--color-surface-muted)' : colors.bg,
        }}>
          {isNew
            ? <Plus size={18} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
            : <Folder size={18} strokeWidth={1.8} color={colors.fg} aria-hidden="true" />}
        </div>
        {isNew && showProBadge && <ProPill />}
        {!isNew && waiting && <WaitingMark />}
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div dir="ltr" style={{ ...line, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {name}
        </div>
        {isNew ? (
          <div style={{ ...line, color: 'var(--color-text-secondary)' }}>Start a list</div>
        ) : (
          <>
            <div style={{ ...line, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{count === 0 ? 'No drugs yet' : drugCountLabel(count)}</div>
            {drugNames ? <div style={{ ...line, color: 'var(--color-text-muted)' }}>{drugNames}</div> : null}
          </>
        )}
      </div>
    </div>
  )
}
