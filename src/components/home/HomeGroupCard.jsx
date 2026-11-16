// One card in the My drug groups row on Home (Phase H step 9.5, redrawn as a folder in Phase I
// step 10.1). The same width as the roshetta cards but its own look: a real folder, with a tab at
// the top (on the start side, so it flips in Arabic), a strip of paper peeking out of the top, the
// body tinted in the group's own colour, the name (16 / 500, up to two lines) and a count chip such
// as "12 drugs". The round icon chip is gone; the folder shape is the icon. "Waiting" in the warning
// colour sits at the bottom while changes are not saved. Also exports the grey dashed New card that
// starts the row. The colour comes from the same tokens as the Drugs screen, so dark mode needs nothing
// extra. The height is a minimum so large text never cuts the name (step 9.8).

import { useState } from 'react'
import { CloudUpload, Plus } from 'lucide-react'
import { ProPill } from '../drugs/groups/GroupTile'
import { resolveToken } from '../../utils/specialtyTokens'
import { useIsDark } from '../../utils/specialtyIcon'
import { groupCardLabel, groupCountText } from '../../utils/homeGroups'
import { CARD_W_CSS, NEW_W_CSS, CARD_H } from './HomeRoshettaCard'

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
        fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, minHeight: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        position: 'relative', display: 'flex', flexDirection: 'column', paddingTop: 14,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1, transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: 58, height: 18, borderRadius: '10px 10px 0 0', backgroundColor: colors.bg }}
      />
      <div
        style={{
          position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '16px 12px 12px',
          backgroundColor: colors.bg, borderRadius: 16, borderStartStartRadius: 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: 5, insetInline: 12, height: 7, backgroundColor: 'var(--color-surface)', borderRadius: '3px 3px 0 0', opacity: 0.9 }}
        />
        <div
          dir="auto"
          style={{
            marginTop: 4, fontSize: 16, fontWeight: 500, lineHeight: 1.25, textAlign: 'start', color: colors.fg, fontFamily: font,
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
        fontSize: 16, flex: `0 0 ${NEW_W_CSS}`, width: NEW_W_CSS, minHeight: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
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
