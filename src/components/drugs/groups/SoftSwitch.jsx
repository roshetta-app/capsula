/**
 * src/components/drugs/groups/SoftSwitch.jsx
 * 2026-10-22 (UI refresh plan, step 8.12): a small switch for a few fixed options (rule 12): one
 * track, a raised thumb on the chosen one, 44 px tall. Used on the See all groups screen for the
 * sort (Newest first / A to Z) and the view (Tiles / List). Colours come from the same variables
 * as the other switches (--color-seg-track, --color-seg-thumb, --color-seg-thumb-text).
 *
 * Props:
 *   options   [{ key, label, Icon? }]
 *   value     the chosen key
 *   onChange  (key) => void
 *   label     what the switch is for, read by screen readers
 */

export default function SoftSwitch({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'inline-flex', gap: 2, padding: 3, boxSizing: 'border-box',
        backgroundColor: 'var(--color-seg-track)', borderRadius: 14,
      }}
    >
      {options.map(({ key, label: text, Icon }) => {
        const chosen = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => { if (!chosen) onChange?.(key) }}
            style={{
              minHeight: 38, minWidth: 44, padding: '0 12px', borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: 'none', cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap',
              backgroundColor: chosen ? 'var(--color-seg-thumb)' : 'transparent',
              color: chosen ? 'var(--color-seg-thumb-text)' : 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: chosen ? 600 : 500,
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color var(--motion-fast) var(--ease-settle), color var(--motion-fast) var(--ease-settle)',
            }}
          >
            {Icon ? <Icon size={15} aria-hidden="true" /> : null}
            {text}
          </button>
        )
      })}
    </div>
  )
}
