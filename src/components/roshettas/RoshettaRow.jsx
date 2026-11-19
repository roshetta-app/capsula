// One roshetta in a list (the shelf on Topics and the See all screen). Phase G step 8.1.
// Same anatomy as a topic row: icon tile, name, small line, date and chevron on the right.
// The small line is a preview of the drug names; "Waiting" shows when changes are not saved yet.
// 2026-11-16 (step 10.7): the tile takes the roshetta's specialty (icon and colours), or the app's
// blue prescription tile when there is none (prop specialty: the picker shape, or null).
// 2026-11-16 (step 10.9): the name may take two lines (it was one line cut with '...'), so a short
// name is never cut at the biggest phone font; a very long one still ends with '...'.

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'
import { WaitingMark } from '../drugs/groups/GroupTile'
import { rowSummary } from '../../utils/roshettaRowText'
import { drugPreviewText, shortDateText } from '../../utils/roshettaShelfText'
import { useRowEntrance } from '../../hooks/useRowEntrance'

export default function RoshettaRow({ roshetta, specialty = null, waiting = false, showDivider = false, now, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const rowIn = useRowEntrance()   // step 11.19: the first cards of a screen fade in one after another
  const isDark = useIsDark()
  const look = specialtyColors(specialty, isDark)
  const specName = specialtyHeaderText(specialty)
  const name = roshetta?.name ?? ''
  const preview = drugPreviewText(roshetta?.rows)
  const date = shortDateText(roshetta?.updatedAt, now)

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className={rowIn.className}
      aria-label={`${name}${specName ? `, ${specName}` : ''}, ${rowSummary(roshetta, now)}${waiting ? ', waiting to save' : ''}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        ...rowIn.style,
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: '12px 16px', minHeight: 56, boxSizing: 'border-box',
        borderBottom: showDivider ? '1px solid var(--color-border-subtle)' : 'none',
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        backgroundColor: pressed ? 'var(--color-surface-muted)' : 'transparent',
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
        transition: 'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32, height: 32, flexShrink: 0, borderRadius: 10,
          backgroundColor: look.bg, color: look.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {specialty
          ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={16} color={look.fg} />
          : <FileText size={16} strokeWidth={2} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          dir="auto"
          style={{
            textAlign: 'start', fontSize: 16, fontWeight: 600, lineHeight: 1.3,
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
            overflow: 'hidden', overflowWrap: 'anywhere',
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 2, fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {preview}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {date && (
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>{date}</span>
          )}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ color: 'var(--color-text-tertiary)', opacity: 0.5, flexShrink: 0 }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        {waiting && <WaitingMark />}
      </div>
    </div>
  )
}
