// One card in the My roshettas row on Home (Phase H step 9.4). White "paper" card, 148 x 132,
// radius 16, thin border: the blue Rx tile and the date on top, the name (one line), the drug
// preview (one line), and "Waiting" in the warning colour at the bottom while changes are not
// saved. The name is the person's own text and is drawn as plain text (dir="auto" for Arabic).
// Also exports the dashed New card that starts the row.

import { useState } from 'react'
import { CloudUpload, FileText, Plus } from 'lucide-react'
import { ProPill } from '../drugs/groups/GroupTile'
import { rowSummary } from '../../utils/roshettaRowText'
import { drugPreviewText, shortDateText } from '../../utils/roshettaShelfText'
import { cardLabel } from '../../utils/homeRoshettas'

export const CARD_W = 148
export const NEW_W = 112
export const CARD_H = 132

const font = 'var(--font-body)'
const oneLine = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

function pressProps(setPressed) {
  return {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  }
}

export function HomeRoshettaCard({ roshetta, waiting = false, now, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const name = roshetta?.name ?? ''
  const date = shortDateText(roshetta?.updatedAt, now)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      aria-label={cardLabel(roshetta, waiting, rowSummary(roshetta, now))}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      {...pressProps(setPressed)}
      style={{
        flex: `0 0 ${CARD_W}px`, width: CARD_W, height: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', padding: 12,
        backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1, transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div
          aria-hidden="true"
          style={{
            width: 32, height: 32, flexShrink: 0, borderRadius: 10,
            backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FileText size={16} strokeWidth={2} />
        </div>
        {date && <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-tertiary)', fontFamily: font, ...oneLine }}>{date}</span>}
      </div>
      <div
        dir="auto"
        style={{ marginTop: 10, fontSize: 15, fontWeight: 500, lineHeight: 1.3, textAlign: 'start', color: 'var(--color-text-primary)', fontFamily: font, ...oneLine }}
      >
        {name}
      </div>
      <div style={{ marginTop: 2, fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)', fontFamily: font, ...oneLine }}>
        {drugPreviewText(roshetta?.rows)}
      </div>
      <div style={{ flex: 1 }} />
      {waiting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--color-warning)', fontFamily: font }}>
          <CloudUpload size={14} aria-hidden="true" />
          Waiting
        </div>
      )}
    </div>
  )
}

export function HomeNewCard({ onTap, showPro = false }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="New roshetta"
      {...pressProps(setPressed)}
      style={{
        flex: `0 0 ${NEW_W}px`, width: NEW_W, height: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
        backgroundColor: 'transparent', border: '1.5px dashed var(--color-chip-line)', borderRadius: 16,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        color: 'var(--color-accent-text)', fontFamily: font,
        opacity: pressed ? 0.7 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Plus size={18} strokeWidth={2.4} />
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
        New
        {showPro ? <ProPill /> : null}
      </span>
    </button>
  )
}
