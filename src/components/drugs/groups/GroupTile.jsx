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
 * group card is the same size with a dashed line. 'drugNames' is the preview line. 'fill' (step
 * 8.2b, the See all screen) makes the card fill its grid column instead of the fixed width.
 *
 * 2026-10-22 (UI refresh, card refinement, approved by Lmar): softer card. No border; a soft wash
 * of the group's own colour; round icon at the top left, drug-count pill at the top right, name
 * (15) and the first two different drug names with '+ more' at the bottom. 'drugNames' is the
 * list of names; the card joins them itself (they used to run together with no separator).
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

const SOFT_TEXT = 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)'

export default function GroupTile({ group, isNew = false, showProBadge = false, waiting = false, animate = false, drugNames = '', fill = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const count = group?.brandIds?.length ?? 0
  const line = { fontSize: 13, lineHeight: 1.3, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

  // Preview line: the first two different names, then how many drugs are left.
  const names = Array.isArray(drugNames) ? drugNames : (drugNames ? [drugNames] : [])
  const shown = [...new Set(names)].slice(0, 2)
  const covered = names.filter(n => shown.includes(n)).length
  const preview = shown.length ? shown.join(', ') + (count > covered ? ` +${count - covered}` : '') : ''

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
        flex: fill ? '1 1 auto' : `0 0 ${CARD_WIDTH}px`, width: fill ? '100%' : CARD_WIDTH, minWidth: 0, scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10,
        backgroundColor: isNew
          ? 'color-mix(in srgb, var(--color-text-primary) 5%, var(--color-bg))'
          : `color-mix(in srgb, ${colors.fg} 12%, var(--color-surface))`,
        border: 'none',
        borderRadius: 20,
        padding: 14,
        minHeight: 116,
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
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'var(--color-tint-chip)',
        }}>
          {isNew
            ? <Plus size={18} strokeWidth={2} color={SOFT_TEXT} aria-hidden="true" />
            : <Folder size={18} strokeWidth={1.8} color={colors.fg} aria-hidden="true" />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {!isNew && waiting && <WaitingMark />}
          {isNew && showProBadge && <ProPill />}
          {!isNew && (
            <span style={{
              fontSize: 12, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap',
              fontFamily: 'var(--font-body)', color: SOFT_TEXT,
              backgroundColor: 'var(--color-tint-chip)', borderRadius: 12, padding: '4px 10px',
            }}>
              {count === 0 ? 'Empty' : drugCountLabel(count)}
            </span>
          )}
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div dir="ltr" style={{ ...line, fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: 'var(--color-text-primary)' }}>
          {name}
        </div>
        {isNew ? (
          <div style={{ ...line, marginTop: 2, color: SOFT_TEXT }}>Start a list</div>
        ) : preview ? (
          <div style={{ ...line, marginTop: 2, color: SOFT_TEXT }}>{preview}</div>
        ) : null}
      </div>
    </div>
  )
}
