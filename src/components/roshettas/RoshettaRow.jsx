/**
 * src/components/roshettas/RoshettaRow.jsx
 * 2026-11-13 (Roshetta plan, step 4.1a): one roshetta as a row in the My roshettas
 * card. One tap opens it. At least 64 px high so it is easy to hit.
 *
 * Shows the name (one line, cut with "..." when long) and under it the drug count
 * and when it was last changed ("3 drugs, changed today", words in
 * utils/roshettaRowText.js). A small cloud mark sits on the right while changes
 * to this roshetta are saved on the phone and not yet sent, then a chevron.
 *
 * The row has no box of its own: the section draws the card around the rows.
 * Colours come from the app's own variables, light and dark.
 *
 * Props:
 *   roshetta     { id, name, rows, updatedAt }
 *   waiting      true when this roshetta has changes waiting to be sent
 *   showDivider  true -> a thin line under the row (every row but the last)
 *   now          optional Date, only so the wording can be drawn at a fixed time
 *   onOpen       tap handler
 */

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { WaitingMark } from '../drugs/groups/GroupTile'
import { rowSummary } from '../../utils/roshettaRowText'

export default function RoshettaRow({ roshetta, waiting = false, showDivider = false, now, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const name = roshetta?.name ?? ''
  const summary = rowSummary(roshetta, now)
  const soft = 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)'

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${summary}${waiting ? ', waiting to save' : ''}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '12px 14px', minHeight: 64, boxSizing: 'border-box',
        borderBottom: showDivider ? '1px solid var(--color-border)' : 'none',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transition: 'opacity var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          dir="auto"
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
        <div
          style={{
            marginTop: 2, fontSize: 12, lineHeight: 1.4, color: soft,
            fontFamily: 'var(--font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {summary}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {waiting && <WaitingMark />}
        <ChevronRight size={18} strokeWidth={2} color={soft} aria-hidden="true" />
      </div>
    </div>
  )
}
