// The one "New" card that starts both Home rows (My roshettas and My drug groups), 2026-11-20.
//
// Same size, shape and wording in both rows; only the paint differs, so each row keeps its own
// personality (roshettas: see-through with a blue plus; groups: the folder grey with a grey plus).
//   mode 'new'      the dashed card with a plus and the single word "New" (the heading gives the context)
//   mode 'locked'   a free account at its limit: a lock and "Upgrade to Pro"; a tap opens the limit sheet
//   mode 'readonly' a lapsed account: the same card dimmed, a lock and "Read only"; a tap opens the
//                   read only sheet
// The card is always a real button (44 px tap area at any text size). Colours come from the app's own
// variables, so dark mode follows the app.

import { useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import { FOLDER_GREY_WASH } from '../drugs/groups/folderStyles'
import { NEW_W_CSS, CARD_H } from './HomeRoshettaCard'

const font = 'var(--font-body)'

const WORDS = {
  roshetta: {
    new: 'New roshetta',
    locked: 'Upgrade to Pro to add more roshettas',
    readonly: 'Your roshettas are read only',
  },
  group: {
    new: 'New group',
    locked: 'Upgrade to Pro to add more groups',
    readonly: 'Your groups are read only',
  },
}

function newCardLabel(mode) {
  if (mode === 'locked') return 'Upgrade to Pro'
  if (mode === 'readonly') return 'Read only'
  return 'New'
}

export default function HomeNewCard({ kind = 'roshetta', mode = 'new', onTap }) {
  const [pressed, setPressed] = useState(false)
  const isGroup = kind === 'group'
  const locked = mode === 'locked'
  const readOnly = mode === 'readonly'
  const Icon = locked || readOnly ? Lock : Plus

  const circleBg = isGroup ? 'var(--color-surface)' : 'var(--color-accent-light)'
  const circleFg = locked || !isGroup ? 'var(--color-accent)' : 'var(--color-text-secondary)'
  const labelColor = locked ? 'var(--color-accent-text)' : isGroup ? 'var(--color-text-primary)' : 'var(--color-accent-text)'

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={(WORDS[isGroup ? 'group' : 'roshetta'][mode]) ?? WORDS.roshetta.new}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        fontSize: 16, flex: `0 0 ${NEW_W_CSS}`, width: NEW_W_CSS, minHeight: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
        backgroundColor: isGroup ? FOLDER_GREY_WASH : 'transparent',
        border: '1.5px dashed var(--color-chip-line)', borderRadius: 16,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        fontFamily: font, textAlign: 'center',
        opacity: pressed ? 0.7 : readOnly ? 0.55 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: circleBg, color: readOnly ? 'var(--color-text-secondary)' : circleFg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={locked || readOnly ? 16 : 18} strokeWidth={2.4} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, color: readOnly ? 'var(--color-text-secondary)' : labelColor }}>
        {newCardLabel(mode)}
      </span>
    </button>
  )
}
