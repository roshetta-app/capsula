/**
 * src/components/drugs/home/ModeSegmentedControl.jsx
 * 2026-10-22 (UI refresh plan, step 8.1): the search mode switch on the Drugs home header.
 * Brand / Generic / Class as one full-width control: one track, a raised thumb under the
 * chosen mode (rule 12 of the rulebook). It replaces the small mode button on the home;
 * the mode pop-up stays for the slim bar and for the search focus mode.
 *
 * The colours come from variables, so the dark-mode blue step (8.7) and the colour
 * refine (Phase 10) change them without touching this file:
 *   --color-seg-track, --color-seg-thumb, --color-seg-thumb-text
 *
 * Props:
 *   options   [{ value, label, icon }] the modes to show (the screen drops Class when it must)
 *   mode      the chosen value
 *   onChange  called with the picked value
 */

export default function ModeSegmentedControl({ options, mode, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Search mode"
      style={{
        display:         'flex',
        gap:             2,
        padding:         3,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-seg-track)',
      }}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const chosen = value === mode
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => { if (!chosen) onChange(value) }}
            style={{
              flex:                    1,
              minWidth:                0,
              height:                  44,
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     6,
              padding:                 '0 8px',
              border:                  'none',
              borderRadius:            'var(--radius-full)',
              backgroundColor:         chosen ? 'var(--color-seg-thumb)' : 'transparent',
              color:                   chosen ? 'var(--color-seg-thumb-text)' : 'var(--color-text-primary)',
              boxShadow:               chosen ? '0 1px 3px rgba(0, 0, 0, 0.14)' : 'none',
              fontFamily:              'var(--font-body)',
              fontSize:                14,
              fontWeight:              chosen ? 700 : 500,
              cursor:                  'pointer',
              transition:              'background-color var(--motion-fast) var(--ease-settle), color var(--motion-fast) var(--ease-settle)',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            <Icon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
