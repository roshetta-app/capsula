// One card in the My drug groups row on Home (Phase H step 9.5). The same size as the roshetta
// cards (148 x 132, radius 16) but its own personality, as drawn in step 9.0: tinted in the
// group's own colour, a round white icon chip, the name (16 / 500, up to two lines) and a count
// chip such as "12 drugs". "Waiting" in the warning colour sits at the bottom while changes are
// not saved. Also exports the grey dashed New card that starts the row.
// The colour comes from the same tokens as the Drugs screen, so dark mode needs nothing extra.

import { useState } from 'react'
import { CloudUpload, Folder, Plus } from 'lucide-react'
import { ProPill } from '../drugs/groups/GroupTile'
import { resolveToken } from '../../utils/specialtyTokens'
import { useIsDark } from '../../utils/specialtyIcon'
import { groupCardLabel, groupCountText } from '../../utils/homeGroups'
import { CARD_W, NEW_W, CARD_H } from './HomeRoshettaCard'

const font = 'var(--font-body)'
const GREY = 'color-mix(in srgb, var(--color-text-primary) 5%, var(--color-bg))'

function pressProps(setPressed) {
  return {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  }
}

export function HomeGroupCard({ group, waiting = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(group?.color, isDark)
  const count = group?.brandIds?.length ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      aria-label={groupCardLabel(group, waiting)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      {...pressProps(setPressed)}
      style={{
        flex: `0 0 ${CARD_W}px`, width: CARD_W, height: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', padding: 12,
        backgroundColor: colors.bg, borderRadius: 16, border: 'none',
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1, transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32, height: 32, flexShrink: 0, borderRadius: 9999,
          backgroundColor: 'var(--color-surface)', color: colors.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Folder size={16} strokeWidth={2} />
      </div>
      <div
        dir="auto"
        style={{
          marginTop: 10, fontSize: 16, fontWeight: 500, lineHeight: 1.25, textAlign: 'start', color: colors.fg, fontFamily: font,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', overflowWrap: 'anywhere',
        }}
      >
        {group?.name ?? ''}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
        <span style={{
          fontSize: 12, fontWeight: 500, lineHeight: 1.3, fontFamily: font, color: colors.fg,
          backgroundColor: `color-mix(in srgb, ${colors.fg} 12%, transparent)`,
          borderRadius: 9999, padding: '2px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>
          {groupCountText(count)}
        </span>
        {waiting && (
          <span role="img" aria-label="Waiting to save" title="Waiting to save" style={{ display: 'flex', flexShrink: 0, color: 'var(--color-warning)' }}>
            <CloudUpload size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}

export function HomeNewGroupCard({ onTap, showPro = false }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="New group"
      {...pressProps(setPressed)}
      style={{
        flex: `0 0 ${NEW_W}px`, width: NEW_W, height: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
        backgroundColor: GREY, border: '1.5px dashed var(--color-chip-line)', borderRadius: 16,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        color: 'var(--color-text-secondary)', fontFamily: font,
        opacity: pressed ? 0.7 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Plus size={18} strokeWidth={2.4} />
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        New
        {showPro ? <ProPill /> : null}
      </span>
    </button>
  )
}
