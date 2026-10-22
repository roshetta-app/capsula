/**
 * src/components/drugs/groups/SoftSwitch.jsx
 * 2026-10-22 (UI refresh plan, step 8.12; restyled in step 8.13): a small switch for a few fixed
 * options (rule 12): one quiet grey track and a raised white thumb on the chosen one. Used on the
 * See all groups screen for the sort (Newest first / A to Z, words) and the view (Tiles / List,
 * icons only). Smaller and calmer than the blue Drugs header switch, so the controls do not
 * compete with the group cards below them.
 *
 * Props:
 *   options   [{ key, label, Icon? }]
 *   value     the chosen key
 *   onChange  (key) => void
 *   label     what the switch is for, read by screen readers
 *   iconOnly  show only the icons (the label stays for screen readers)
 */

export default function SoftSwitch({ options, value, onChange, label, iconOnly = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'inline-flex', gap: 2, padding: 3, boxSizing: 'border-box',
        backgroundColor: 'color-mix(in srgb, var(--color-text-primary) 7%, var(--color-bg))', borderRadius: 12,
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
            aria-label={iconOnly ? text : undefined}
            onClick={() => { if (!chosen) onChange?.(key) }}
            style={{
              minHeight: 36, minWidth: iconOnly ? 44 : 48, padding: iconOnly ? 0 : '0 12px', borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: 'none', cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap',
              backgroundColor: chosen ? 'var(--color-surface)' : 'transparent',
              color: chosen ? 'var(--color-text-primary)' : 'color-mix(in srgb, var(--color-text-primary) 62%, transparent)',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: chosen ? 600 : 500,
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color var(--motion-fast) var(--ease-settle), color var(--motion-fast) var(--ease-settle)',
            }}
          >
            {Icon ? <Icon size={iconOnly ? 18 : 15} aria-hidden="true" color={chosen ? 'var(--color-accent-text)' : undefined} /> : null}
            {iconOnly ? null : text}
          </button>
        )
      })}
    </div>
  )
}
