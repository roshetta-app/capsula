// The one "New" card that starts both Home rows (My roshettas and My drug groups), 2026-11-20.
//
// Same size, shape, paint and wording in both rows (see-through, dashed, blue plus; 2026-11-20).
//   mode 'new'      the dashed card with a plus and the single word "New" (the heading gives the context)
//   mode 'locked'   a free account at its limit: the plus with a small lock badge, the title "Limit
//                   reached" and the line "Get Pro"; a tap opens the limit sheet
//   mode 'readonly' a lapsed account: the same card dimmed, a lock and "Read only"; a tap opens the
//                   read only sheet
// The card is always a real button (44 px tap area at any text size). Colours come from the app's own
// variables, so dark mode follows the app.

import { useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import { NEW_W_CSS, CARD_H } from './HomeRoshettaCard'

const font = 'var(--font-body)'

const WORDS = {
  roshetta: {
    new: 'New roshetta',
    locked: 'Limit reached. Get Pro to add more roshettas',
    readonly: 'Your roshettas are read only',
  },
  group: {
    new: 'New group',
    locked: 'Limit reached. Get Pro to add more groups',
    readonly: 'Your groups are read only',
  },
}

function newCardLabel(mode) {
  if (mode === 'locked') return 'Limit reached'
  if (mode === 'readonly') return 'Read only'
  return 'New'
}

export default function HomeNewCard({ kind = 'roshetta', mode = 'new', onTap }) {
  const [pressed, setPressed] = useState(false)
  const locked = mode === 'locked'
  const readOnly = mode === 'readonly'

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={(WORDS[kind === 'group' ? 'group' : 'roshetta'][mode]) ?? WORDS.roshetta.new}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        fontSize: 16, flex: `0 0 ${NEW_W_CSS}`, width: NEW_W_CSS, minHeight: CARD_H, boxSizing: 'border-box', scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 12,
        backgroundColor: 'transparent', border: '1.5px dashed var(--color-chip-line)', borderRadius: 16,
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        fontFamily: font, textAlign: 'center',
        opacity: pressed ? 0.7 : readOnly ? 0.55 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative', width: 32, height: 32, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: locked || readOnly ? 'var(--color-surface-muted)' : 'var(--color-accent-light)',
          color: locked || readOnly ? 'var(--color-text-secondary)' : 'var(--color-accent)',
        }}
      >
        <Plus size={18} strokeWidth={2.4} />
        {(locked || readOnly) && (
          <span
            style={{
              position: 'absolute', insetInlineEnd: -4, bottom: -4, width: 16, height: 16, borderRadius: 9999, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)',
            }}
          >
            <Lock size={9} strokeWidth={2.6} />
          </span>
        )}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, color: locked || readOnly ? 'var(--color-text-primary)' : 'var(--color-accent-text)' }}>
        {newCardLabel(mode)}
      </span>
      {locked && (
        <span style={{ marginTop: -3, fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: 'var(--color-accent-text)' }}>Get Pro</span>
      )}
    </button>
  )
}
