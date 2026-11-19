// One card in the My roshettas row on Home. Phase H step 9.4; "letterhead" in Phase I step 10.6;
// redrawn as the quiet "pad" in Phase J step 11.3 (2026-11-19): a plain sheet with a small
// specialty label in normal letters, light grey (icon and name; "Roshetta" with a prescription icon when there is
// none) over a hairline, like the top of a prescription pad; a faint italic Rx
// watermark in the bottom corner (in dark mode a neutral, barely-there grey, not the specialty tint); the name (up to two lines); and at the foot the day on the start
// side and "Waiting" on the end side while changes are not saved. No drug count on the card (the
// spoken label still says it). Width and minimum height as before (148 x 132, growing with large
// text). The name is the person's own text and is drawn as plain text (dir="auto" for Arabic).
// Also exports the dashed New card that starts the row.
//
// Props: roshetta, specialty (the picker shape from the specialty list, or null), waiting, now, onOpen.

import { useState } from 'react'
import { Clock, CloudUpload, FileText, Plus } from 'lucide-react'
import { ProPill } from '../drugs/groups/GroupTile'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { rowSummary } from '../../utils/roshettaRowText'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'
import { shortDateText } from '../../utils/roshettaShelfText'
import { cardLabel } from '../../utils/homeRoshettas'

export const CARD_W = 148
export const NEW_W = 112
export const CARD_H = 132
// Large text: the card width follows the text size (9.25em is 148px at the normal size) and the
// height is a minimum, so names and dates are never cut off (step 9.8).
export const CARD_W_CSS = `max(${CARD_W}px, 9.25em)`
export const NEW_W_CSS = `max(${NEW_W}px, 7em)`

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

export function HomeRoshettaCard({ roshetta, specialty = null, waiting = false, now, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const look = specialtyColors(specialty, isDark)
  const header = specialtyHeaderText(specialty, 'Roshetta')
  const name = roshetta?.name ?? ''
  const date = shortDateText(roshetta?.updatedAt, now)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      aria-label={cardLabel(roshetta, waiting, rowSummary(roshetta, now), specialtyHeaderText(specialty))}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      {...pressProps(setPressed)}
      style={{
        fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, minHeight: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        position: 'relative', display: 'flex', flexDirection: 'column', padding: '12px 14px', overflow: 'hidden',
        backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1, transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', insetInlineEnd: -6, bottom: -14, pointerEvents: 'none', userSelect: 'none',
          fontSize: 78, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
          color: isDark ? 'var(--color-text-primary)' : look.bg, opacity: isDark ? 0.035 : 0.7,
          fontFamily: 'Georgia, \'Times New Roman\', serif',
        }}
      >
        Rx
      </span>
      <div
        aria-hidden="true"
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 7, borderBottom: `1px solid ${isDark ? 'var(--color-border)' : look.bg}`, color: look.fg }}
      >
        {specialty
          ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={12} color={look.fg} />
          : <FileText size={12} strokeWidth={2} style={{ flexShrink: 0 }} />}
        <span
          dir="auto"
          style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.4, color: 'var(--color-text-tertiary)', fontFamily: font, minWidth: 0, ...oneLine }}
        >
          {header}
        </span>
      </div>
      <div
        dir="auto"
        style={{
          position: 'relative', marginTop: 9, fontSize: 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', textAlign: 'start',
          color: 'var(--color-text-primary)', fontFamily: font,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere',
        }}
      >
        {name}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 8px' }}>
        {date && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
            <Clock size={12} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span dir="auto" style={{ fontSize: 12, lineHeight: 1.4, fontFamily: font }}>{date}</span>
          </span>
        )}
        {waiting && (
          <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--color-warning)', fontFamily: font }}>
            <CloudUpload size={14} aria-hidden="true" />
            Waiting
          </span>
        )}
      </div>
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
        fontSize: 16, flex: `0 0 ${NEW_W_CSS}`, width: NEW_W_CSS, minHeight: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
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
