/**
 * src/components/admin/EditorToolbarButtons.jsx
 *
 * The small top-bar buttons of the CMS editors: the square icon button used
 * for Undo / Redo, and the icon-plus-label button used for Collapse all.
 * Looks the same as the ones in ConditionEditor (which keeps its own copies).
 * First used by the drug editor, 2026-11-10.
 */

export function UndoRedoButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 32,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function ToolButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 32, padding: '0 10px', whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
        cursor: 'pointer',
      }}
    >
      {children}
      <span className="cms-tool-label">{label}</span>
    </button>
  )
}
