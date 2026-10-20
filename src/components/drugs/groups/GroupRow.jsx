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
 *   onOpen       tap handler
 */

import { useState } from 'react'
import { Folder, Plus, ChevronRight } from 'lucide-react'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import { drugCountLabel, ProPill, WaitingMark } from './GroupTile'

export default function GroupRow({ group, drugNames = [], isNew = false, showProBadge = false, waiting = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const dir = 'ltr'
  const count = group?.brandIds?.length ?? 0
  const preview = drugNames.filter(Boolean).slice(0, 3).join(', ')

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
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        // 11.1: no card behind the groups area any more, so a group needs its own fill and line.
        backgroundColor: 'var(--color-surface)',
        border: isNew ? '1.5px dashed var(--color-border)' : '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 'var(--space-3)',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        backgroundColor: colors.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isNew
          ? <Plus size={17} color="var(--color-text-secondary)" aria-hidden="true" />
          : <Folder size={16} color={colors.fg} aria-hidden="true" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <div
            dir={dir}
            style={{
              minWidth: 0, flex: '0 1 auto', textAlign: 'start',
              fontSize: 14, fontWeight: 600, lineHeight: 1.3,
              color: isNew ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          {!isNew && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
              {drugCountLabel(count)}
            </div>
          )}
        </div>
        {!isNew && preview && (
          <div style={{
            marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {preview}
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
