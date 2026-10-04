/**
 * src/components/drugs/home/ModeButton.jsx
 * 2026-10-04 (Drugs home split into small files): moved unchanged out of
 * DrugsScreen.jsx.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// 2026-10-04: made a little smaller (114px wide, was 128; 12px text, was 13).
// Search Mode button: a fixed width so it never changes size between Brand,
// Generic and Class. Same soft tinted pill for all three, each in its own mode
// accent (Brand blue, Generic green, Class violet), the same accent the pop-up
// and the info sheet use.

export default function ModeButton({ icon: Icon, label, color, tint, onPress }) {
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
        width:                   114,
        flexShrink:              0,
        boxSizing:               'border-box',
        display:                 'flex',
        alignItems:              'center',
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
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <ChevronDown size={13} color={color} style={{ flexShrink: 0 }} />
    </button>
  )
}