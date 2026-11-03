/**
 * src/components/drugs/groups/NameSwitch.jsx
 * 2026-11-03 (optional owner name): the on/off switch for "Show my name". 52 x 32 track inside a
 * 44 px tall tap area. Used by the share sheet (one group) and the Account screen (all groups).
 * Props: checked, onChange (next value), disabled, label (read out by a screen reader).
 */

export default function NameSwitch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0, width: 56, height: 44, padding: 0, border: 'none', background: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <span aria-hidden="true" style={{
        position: 'relative', width: 52, height: 32, borderRadius: 16, boxSizing: 'border-box',
        backgroundColor: checked ? 'var(--color-accent-solid)' : 'var(--color-border)',
        transition: 'background-color var(--motion-base) var(--ease-reveal)',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3, width: 26, height: 26, borderRadius: '50%',
          backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left var(--motion-base) var(--ease-settle)',
        }} />
      </span>
    </button>
  )
}
