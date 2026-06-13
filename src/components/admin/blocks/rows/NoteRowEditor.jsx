/**
 * src/components/admin/blocks/rows/NoteRowEditor.jsx
 *
 * Row editor for { row_type: "note" } rows inside a prescription_sheet block.
 * These are inline notes within a prescription sheet, distinct from top-level
 * note_callout blocks.
 *
 * Props:
 *   row      — { row_type, text, flavor? }
 *   onChange — (nextRow) => void
 *
 * Pure controlled component — zero DB calls.
 */

const FLAVOR_OPTIONS = [
  { value: 'info',    label: 'Info',    color: '#3b82f6' },
  { value: 'warning', label: 'Warning', color: '#f59e0b' },
  { value: 'tip',     label: 'Tip',     color: '#10b981' },
]

function FieldLabel({ children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {children}
      </span>
    </div>
  )
}

export default function NoteRowEditor({ row, onChange }) {
  const flavor = row.flavor ?? 'info'

  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Flavor selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          minWidth: 40,
        }}>
          Type
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {FLAVOR_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => patch({ flavor: opt.value })}
              style={{
                padding: '3px 12px',
                borderRadius: 99,
                border: flavor === opt.value
                  ? `2px solid ${opt.color}`
                  : '2px solid var(--color-border)',
                background: flavor === opt.value ? opt.color + '18' : 'transparent',
                color: flavor === opt.value ? opt.color : 'var(--color-text-tertiary)',
                fontWeight: flavor === opt.value ? 700 : 400,
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Note text ── */}
      <div>
        <FieldLabel>Note text</FieldLabel>
        <input
          type="text"
          value={row.text ?? ''}
          onChange={e => patch({ text: e.target.value })}
          placeholder="e.g. Take with food"
          dir="auto"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 10px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
      </div>

    </div>
  )
}
