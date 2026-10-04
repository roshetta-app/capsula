/**
 * src/components/drugs/home/ModeButton.jsx
 * 2026-10-04 (Drugs home split into small files): moved unchanged out of
 * DrugsScreen.jsx.
 *
 * 2026-10-04: optional 'width' prop. 2026-10-05: the default is now 116 for all
 * mode buttons (see MODE_BUTTON_WIDTH below), so none needs to pass its own.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// 2026-10-05: one width for every mode button (116px): the Search mode button,
// the Browse Category / Class button and the small one in the sticky bar are all
// the same size, wide enough for the word 'Category'. Before, Search was 104 and
// Browse 116.
export const MODE_BUTTON_WIDTH = 116

// 2026-10-04: made a little smaller (104px wide, was 128; 12px text, was 13)
// and the name no longer stretches, so the arrow sits right after it; the
// content is centred in the fixed width.
// Search Mode button: a fixed width so it never changes size between Brand,
// Generic and Class. Same soft tinted pill for all three, each in its own mode
// accent (Brand blue, Generic green, Class violet), the same accent the pop-up
// and the info sheet use.

export default function ModeButton({ icon: Icon, label, color, tint, onPress, width = MODE_BUTTON_WIDTH }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onPress}
      aria-haspopup="dialog"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        width,
        flexShrink:              0,
        boxSizing:               'border-box',
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        gap:                     6,
        padding:                 '6px 10px',
        borderRadius:            'var(--radius-full)',
        border:                  'none',
        backgroundColor:         tint,
        color:                   color,
        fontFamily:              'var(--font-body)',
        fontSize:                12,
        fontWeight:              600,
        cursor:                  'pointer',
        opacity:                 pressed ? 0.9 : 1,
        transform:               pressed ? 'scale(0.97)' : 'scale(1)',
        transition:              'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <Icon size={13} color={color} style={{ flexShrink: 0 }} />
      <span style={{ flex: '0 1 auto', minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <ChevronDown size={13} color={color} style={{ flexShrink: 0 }} />
    </button>
  )
}
