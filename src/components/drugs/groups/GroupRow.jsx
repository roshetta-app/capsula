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
 *   animate      true -> soft fade-in (a group just added or renamed)
 *   onOpen       tap handler
 *
 * 2026-10-20 (Drug groups plan, step 11.5): flat look to match the tiles. No box: a thin
 * line between rows. A rounded square in the group's colour carries the big drug count;
 * the New group row has a dashed square with a plus.
 *
 * 2026-10-22 (UI refresh plan, step 8.12): soft wash row, the same colours as the group card: no line
 * between rows, no number square. Name (15 bold), the first three different drug names (13), and the
 * count as plain text in the group's colour on the right (the waiting mark beside it). New group is
 * the grey wash with 'Start a list' and a plus, or the PRO pill at the limit.
 */

import { useState } from 'react'
import { Folder, FolderPlus, Plus } from 'lucide-react'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import { drugCountLabel, ProPill, WaitingMark } from './GroupTile'
import { FOLDER_GREY_WASH, folderWash, folderCountColor } from './folderStyles'

export default function GroupRow({ group, drugNames = [], isNew = false, showProBadge = false, waiting = false, animate = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const count = group?.brandIds?.length ?? 0
  const shownNames = [...new Set(drugNames.filter(Boolean))].slice(0, 3)
  const preview = shownNames.join(', ')
  const moreCount = Math.max(0, count - shownNames.length)   // step 8.13: '+N' for the drugs not named
  const second = isNew ? 'Start a list' : preview   // the count is on the right, so an empty group has no second line
  const soft = 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)'

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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '12px 14px', minHeight: 64, borderRadius: 16,
        backgroundColor: isNew ? FOLDER_GREY_WASH : folderWash(colors.fg),
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transition: 'opacity var(--motion-fast) var(--ease-settle)',
        boxSizing: 'border-box',
      }}
    >
      {/* Step 8.13: a folder icon in a round wash of the group's colour, at the left. */}
      <div
        aria-hidden="true"
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          backgroundColor: isNew ? 'color-mix(in srgb, var(--color-text-primary) 8%, var(--color-bg))' : `color-mix(in srgb, ${colors.fg} 20%, var(--color-surface))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isNew
          ? <FolderPlus size={20} color={soft} />
          : <Folder size={20} color={folderCountColor(colors.fg)} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          dir="ltr"
          style={{
            textAlign: 'start',
            fontSize: 15, fontWeight: 700, lineHeight: 1.3,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        {second ? (
          <div style={{ marginTop: 2, display: 'flex', gap: 4, fontSize: 12, color: soft, fontFamily: 'var(--font-body)' }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{second}</span>
            {!isNew && moreCount > 0 && preview ? <span style={{ flexShrink: 0 }}>+{moreCount}</span> : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {!isNew && waiting && <WaitingMark />}
        {isNew
          ? (showProBadge ? <ProPill /> : <Plus size={18} strokeWidth={2} color={soft} aria-hidden="true" />)
          : (
            <span style={{
              minWidth: 28, height: 26, padding: '0 9px', boxSizing: 'border-box', borderRadius: 13,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: `color-mix(in srgb, ${colors.fg} 20%, var(--color-surface))`,
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)', color: folderCountColor(colors.fg),
            }}>
              {count}
            </span>
          )}
      </div>
    </div>
  )
}
