/**
 * src/components/drugs/home/ModeSegmentedControl.jsx
 * 2026-10-22 (UI refresh plan, step 8.1; reworked after the phone check): the search mode
 * switch on the Drugs home header. Brand / Generic / Class as one full-width control with
 * one thumb under the chosen mode.
 *
 * Reworked so it no longer weighs the same as the search field above it:
 *   - shorter (40 px track, 34 px thumb; the search field is 50 px),
 *   - the thumb is not white: it takes the chosen mode's own light tint, with the mode's
 *     colour on the icon and label and a thin outline (Brand blue, Generic green, Class violet),
 *   - one thumb slides between the modes (280 ms, no overshoot) and its tint and outline fade
 *     to the next mode's colour as it moves. The motion tokens collapse under reduced motion.
 *
 * The shared --color-seg-* variables are left alone: the Favourites tabs still use them.
 *
 * Props:
 *   options   [{ value, label, icon }] the modes to show (the screen drops Class when it must)
 *   mode      the chosen value
 *   onChange  called with the picked value
 */

const PAD = 3
const GAP = 2

const MODE_STYLE = {
  brand:   { fg: 'var(--color-accent-text)',  bg: 'var(--color-accent-light)',  line: 'var(--color-accent)' },
  generic: { fg: 'var(--color-generic-text)', bg: 'var(--color-generic-light)', line: 'var(--color-generic)' },
  class:   { fg: 'var(--color-class)',        bg: 'var(--color-class-light)',   line: 'var(--color-class)' },
}
const FALLBACK = MODE_STYLE.brand

export default function ModeSegmentedControl({ options, mode, onChange }) {
  const count = options.length
  const index = Math.max(0, options.findIndex(o => o.value === mode))
  const cell  = `((100% - ${PAD * 2 + GAP * (count - 1)}px) / ${count})`
  const tone  = MODE_STYLE[options[index]?.value] ?? FALLBACK

  return (
    <div
      role="radiogroup"
      aria-label="Search mode"
      style={{
        position:        'relative',
        display:         'flex',
        gap:             GAP,
        padding:         PAD,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-seg-track)',
      }}
    >
      {/* The one thumb. It sits under the buttons and slides to the chosen cell. */}
      <span
        aria-hidden="true"
        style={{
          position:           'absolute',
          top:                PAD,
          bottom:             PAD,
          width:              `calc${cell}`,
          insetInlineStart:   `calc(${PAD}px + ${index} * (${cell} + ${GAP}px))`,
          borderRadius:       'var(--radius-full)',
          backgroundColor:    tone.bg,
          boxShadow:          `inset 0 0 0 1px color-mix(in srgb, ${tone.line} 38%, transparent)`,
          transition:         'inset-inline-start var(--motion-screen) var(--ease-settle), background-color var(--motion-screen) var(--ease-reveal), box-shadow var(--motion-screen) var(--ease-reveal)',
          pointerEvents:      'none',
        }}
      />
      {options.map(({ value, label, icon: Icon }) => {
        const chosen = value === mode
        const own    = MODE_STYLE[value] ?? FALLBACK
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => { if (!chosen) onChange(value) }}
            style={{
              position:                'relative',
              flex:                    1,
              minWidth:                0,
              height:                  34,
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     6,
              padding:                 '0 8px',
              border:                  'none',
              borderRadius:            'var(--radius-full)',
              backgroundColor:         'transparent',
              color:                   chosen ? own.fg : 'var(--color-text-secondary)',
              fontFamily:              'var(--font-body)',
              fontSize:                13,
              fontWeight:              chosen ? 700 : 500,
              cursor:                  'pointer',
              transition:              'color var(--motion-screen) var(--ease-reveal)',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            <Icon size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
