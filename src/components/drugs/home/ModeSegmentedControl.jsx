/**
 * src/components/drugs/home/ModeSegmentedControl.jsx
 * 2026-10-22 (UI refresh plan, step 8.1; reworked twice after phone checks): the search mode
 * switch on the Drugs home header. Brand / Generic / Class as three separate chips in one row.
 *
 * Option B, chosen by Lmar: each chip is outlined; the chosen chip fills with its own mode
 * colour (Brand blue, Generic green, Class violet) behind white text. Nothing slides: the
 * fill and outline fade in place. Shorter than the search field (36 px against 50 px) and a
 * different shape, so the two do not weigh the same.
 *
 * Variables used: --color-accent-solid, --color-generic-solid, --color-class-solid (fills),
 * --color-chip-line (outline of an unchosen chip). The shared --color-seg-* variables are left
 * alone: the Favourites tabs still use them.
 *
 * Props:
 *   options   [{ value, label, icon }] the modes to show (the screen drops Class when it must)
 *   mode      the chosen value
 *   onChange  called with the picked value
 */

import { useState } from 'react'

// 2026-10-22 (step 8.13): the chosen chip is a soft wash of its mode colour with the mode colour
// as words and outline (the same look as the category tiles), not the full solid fill behind
// white text. Brand blue, Generic green, Class violet; the text variables keep 4.5 to 1.
const INK = {
  brand:   'var(--color-accent-text)',
  generic: 'var(--color-generic-text)',
  class:   'var(--color-class)',
}

function Chip({ value, label, icon: Icon, chosen, onPick }) {
  const [pressed, setPressed] = useState(false)
  const ink = INK[value] ?? INK.brand
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      onClick={() => { if (!chosen) onPick(value) }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        flex:                    1,
        minWidth:                0,
        height:                  36,
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        gap:                     6,
        padding:                 '0 8px',
        borderRadius:            'var(--radius-full)',
        border:                  `1px solid ${chosen ? `color-mix(in srgb, ${ink} 55%, transparent)` : 'var(--color-chip-line)'}`,
        backgroundColor:         chosen ? `color-mix(in srgb, ${ink} 16%, var(--color-surface))` : 'var(--color-surface)',
        boxShadow:               chosen ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.06)',
        color:                   chosen ? ink : 'var(--color-text-secondary)',
        fontFamily:              'var(--font-body)',
        fontSize:                14,
        fontWeight:              chosen ? 600 : 500,
        cursor:                  'pointer',
        transform:               pressed ? 'scale(0.97)' : 'scale(1)',
        transition:              'background-color var(--motion-base) var(--ease-reveal), border-color var(--motion-base) var(--ease-reveal), box-shadow var(--motion-base) var(--ease-reveal), color var(--motion-base) var(--ease-reveal), transform var(--motion-fast) var(--ease-settle)',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <Icon size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

export default function ModeSegmentedControl({ options, mode, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Search mode"
      style={{ display: 'flex', gap: 8 }}
    >
      {options.map(o => (
        <Chip key={o.value} value={o.value} label={o.label} icon={o.icon} chosen={o.value === mode} onPick={onChange} />
      ))}
    </div>
  )
}
