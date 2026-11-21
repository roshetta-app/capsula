// src/components/roshettas/RoshettaPadHeader.jsx
// 2026-11-21 (Phase L, step 13.5): the shared page passes credit = { ownerName, createdAt } and the last row
// reads "Created by Dr Sara · 12 Nov" (the name in bold), or "Created 12 Nov" when the owner is anonymous,
// with the same words as creditText in shareCredit.js (always the day, never "Today"). The owner's own page
// does not pass it and keeps its dates.
// 2026-11-21 (step 8.6a): the description's showing and editing moved to the shared component
// ui/InlineDescription.jsx, which the drug group page uses too; nothing about how it looks or works changed.
// 2026-11-21 (step 8.5): the shared page uses this header too (no dates and no status line there, so the
// foot row is not drawn at all when it has nothing to show).
// 2026-11-21 (Roshetta plan, steps 8.3b to 8.3e): the header of the owner's roshetta page. A white block with a rounded bottom, like the topic sheet's header, and the Home roshetta card's faint
// italic Rx in the bottom corner. Kept short on purpose (about 155 px with a one-line name).
// Top to bottom:
//   - the top bar: Back on the start side, Share and the options menu on the end side;
//   - the name, 22, as many lines as it needs, with the specialty icon before it in its colour
//     (the prescription icon in the app's blue when there is none); the specialty's name is not
//     shown, it is spoken to screen readers only;
//   - the description, as plain text with no box or line (added and edited HERE, in
//     place, never in a sheet): a small "+ Add description" text link when there is none; the text, two
//     lines then "more", with a pencil at its end when there is one (tapping the text only opens
//     or closes it; only the pencil edits); while editing a box that grows as you type, a clear
//     button, and one slim row with the count, Cancel and Save (Save is grey until the text
//     changes; a refusal shows in words and the text stays; Back closes the editing first and,
//     if the text changed, asks before discarding);
//   - the last row: the dates, "Created 12 Nov" and, when it is a different day, "Edited Today",
//     each with a small icon. While a status message shows (the one the Home roshetta section uses:
//     Waiting to save, Saving, Offline, changes not saved with See, All saved) it takes the dates'
//     place on that same row, so there is no empty reserved line and nothing is cut or moves;
//     the dates return when the message is gone.
//
// Props:
//   name, description, specialty (the picker shape, or null), createdAt, updatedAt (ISO text)
//   credit              the shared page only: { ownerName, createdAt }; shows who made it and the day
//   topLeft / topRight  nodes: the Back button, and the Share button with the options menu
//   editable            the owner may change the description (false when read only)
//   onSaveDescription   (text) => Promise<{ ok, reason? }>
//   onEditingChange     (boolean) => void   the page hides its bottom bar while typing
//   isPro               boolean (for the limit wording of a refusal)
//   syncKind, syncText, syncActionLabel, onSyncAction   the status line (see HomeSyncLine)

import { useState } from 'react'
import { CalendarDays, Clock, FileText, User } from 'lucide-react'
import InlineDescription from '../ui/InlineDescription'
import HomeSyncLine, { LINE_H } from '../home/HomeSyncLine'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'
import { shortDateText } from '../../utils/roshettaShelfText'
import { dayText } from '../../utils/shareCredit'
import { ROSHETTA_DESCRIPTION_MAX } from '../../utils/roshettaRows'
import { saveFailureMessage } from '../../utils/roshettaDetailsText'

const font = 'var(--font-body)'

export default function RoshettaPadHeader({
  name, description = '', specialty = null, createdAt, updatedAt, credit = null,
  topLeft, topRight, editable = false, onSaveDescription, onEditingChange, isPro = false,
  syncKind = '', syncText = '', syncActionLabel, onSyncAction,
}) {
  const isDark = useIsDark()
  const look = specialtyColors(specialty, isDark)
  const label = specialtyHeaderText(specialty, 'Roshetta')
  const created = shortDateText(createdAt)
  const edited = shortDateText(updatedAt)
  // A roshetta not changed since the day it was made shows only when it was created.
  const showEdited = !!edited && edited !== created

  // The shared page's line: who made it (when the owner chose to show it) and the day.
  const creditName = credit && typeof credit.ownerName === 'string' ? credit.ownerName.trim() : ''
  const creditDay = credit ? dayText(credit.createdAt) : ''
  const showCredit = !!(creditName || creditDay)

  const [syncActive, setSyncActive] = useState(false)   // a status message is showing

  const dateText = (Icon, title, value) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{title}{' '}<span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>{value}</span></span>
    </span>
  )

  return (
    <div
      style={{
        position: 'relative',
        // Calm on purpose: a plain white surface with a rounded bottom. Colour lives only in the
        // specialty label and the faint Rx.
        backgroundColor: 'var(--color-surface)',
        borderRadius: '0 0 22px 22px',
        margin: '0 calc(-1 * var(--page-gutter, 16px))',
        padding: '4px calc(var(--page-gutter, 16px) + 2px) 12px',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
        <span
          style={{
            position: 'absolute', insetInlineEnd: -4, bottom: -12, userSelect: 'none',
            fontSize: 72, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
            color: isDark ? 'var(--color-text-primary)' : look.fg, opacity: isDark ? 0.05 : 0.09,
            fontFamily: 'Georgia, \'Times New Roman\', serif',
          }}
        >
          Rx
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 36, marginInlineEnd: -10 }}>
        {topLeft}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{topRight}</div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
        <span
          role="img"
          aria-label={label}
          style={{ flexShrink: 0, width: 22, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: look.fg }}
        >
          {specialty
            ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={20} color={look.fg} />
            : <FileText size={20} strokeWidth={2} />}
        </span>
        <h1
          dir="auto"
          style={{
            position: 'relative', flex: 1, minWidth: 0, margin: 0, textAlign: 'start', overflowWrap: 'anywhere',
            fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.4px',
            color: 'var(--color-text-primary)', fontFamily: font,
          }}
        >
          {name}
        </h1>
      </div>

      {/* The description, added and edited in place (the same component the drug group page uses). */}
      <div style={{ position: 'relative' }}>
        <InlineDescription
          text={description}
          editable={editable}
          onSave={onSaveDescription}
          failureMessage={reason => saveFailureMessage(reason, isPro)}
          onEditingChange={onEditingChange}
          max={ROSHETTA_DESCRIPTION_MAX}
          placeholder="Tell us a little about this roshetta…"
        />
      </div>

      {/* The last row: the dates. While a status message shows (waiting, saving, offline, not saved,
          all saved) it takes the dates' place on this same row, so there is no empty reserved line,
          nothing is cut and nothing moves; the dates come back when the message is gone. */}
      {(created || showEdited || syncKind || showCredit) && (
      <div style={{ position: 'relative', marginTop: 10, minHeight: LINE_H }}>
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2,
            fontSize: 12, lineHeight: 1.3, color: 'var(--color-text-tertiary)', fontFamily: font,
            opacity: syncActive ? 0 : 1, transition: 'opacity var(--motion-base) var(--ease-reveal)',
          }}
        >
          {created && dateText(CalendarDays, 'Created', created)}
          {showEdited && dateText(Clock, 'Edited', edited)}
          {showCredit && (
            <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
              {creditName
                ? <User size={12} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                : <CalendarDays size={12} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />}
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                {creditName
                  ? <>Created by{' '}<span dir="auto" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{creditName}</span>{creditDay && ` \u00b7 ${creditDay}`}</>
                  : `Created ${creditDay}`}
              </span>
            </span>
          )}
        </div>
        <HomeSyncLine inside kind={syncKind} text={syncText} actionLabel={syncActionLabel} onAction={onSyncAction} onActiveChange={setSyncActive} />
      </div>
      )}
    </div>
  )
}
