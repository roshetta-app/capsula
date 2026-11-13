/**
 * src/components/roshettas/editor/EditorIconButton.jsx
 * 2026-11-14 (Roshetta plan, step 5.1c): the 44 px icon button in the header of an editor card
 * (move up, move down, delete). Moved out of TextBlockCard so the drug group card uses the same one.
 *
 * Props: label (spoken name), name (icon name), onClick, disabled (greyed, no tap), danger (red).
 */

import Icon from '../../ui/Icon'

export default function EditorIconButton({ label, name, onClick, disabled = false, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, padding: 0, background: 'none', border: 'none',
        color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
        opacity: disabled ? 0.35 : 1, cursor: disabled ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon name={name} size={20} />
    </button>
  )
}
