/**
 * src/components/drugs/groups/GroupRow.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): one group as a list row, or the
 * "New group" row. Shows the colour, name and drug count, and under them the
 * first few drug names when the screen passes them in.
 *
 * Props:
 *   group        { id, name, color, brandIds }  (not needed when isNew)
 *   drugNames    string[]  the first few brand names (optional; the screen
 *                looks them up from the drug library)
 *   isNew        true -> the "New group" row
 *   showProBadge on the New group row: free account at its limit
 *   waiting      true when this group has changes saved on the phone and not yet sent
 *   last         true on the last row of the list (no thin line under it)
 *   animate      true -> soft fade-in (a group just added or renamed)
 *   onOpen       tap handler
 *
 * 2026-10-20 (Drug groups plan, step 11.5): flat look to match the tiles. No box: a thin
 * line between rows. A rounded square in the group's colour carries the big drug count;
 * the New group row has a dashed square with a plus.
 */

import { useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import { drugCountLabel, ProPill, WaitingMark } from './GroupTile'

export default function GroupRow({ group, drugNames = [], isNew = false, showProBadge = false, waiting = false, last = false, animate = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const dir = 'ltr'
  const count = group?.brandIds?.length ?? 0
  const preview = drugNames.filter(Boolean).slice(0, 3).join(', ')
  const second = preview || (count === 0 ? 'No drugs yet' : drugCountLabel(count))

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
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: '12px 0',
        minHeight: 68,
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transition: 'opacity var(--motion-fast) var(--ease-settle)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14, boxSizing: 'border-box',
        backgroundColor: isNew ? 'transparent' : colors.bg,
        border: isNew ? '1.5px dashed var(--color-border)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isNew
          ? <Plus size={20} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
          : <span style={{ fontSize: 17, fontWeight: 800, color: colors.fg, fontFamily: 'var(--font-body)' }}>{count}</span>}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          dir={dir}
          style={{
            textAlign: 'start',
            fontSize: 15, fontWeight: 600, lineHeight: 1.3,
            color: isNew ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        {!isNew && (
          <div style={{
            marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {second}
          </div>
        )}
      </div>

      {!isNew && waiting && <WaitingMark />}
      {isNew && showProBadge ? <ProPill /> : (
        <ChevronRight size={16} color="var(--color-text-tertiary)" aria-hidden="true" style={{ flexShrink: 0 }} />
      )}
    </div>
  )
}
