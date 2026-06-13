/**
 * src/components/admin/blocks/rows/DrugFreetextRowEditor.jsx
 *
 * Row editor for { row_type: "drug_freetext" } rows inside a prescription_sheet block.
 *
 * Props:
 *   row      — { row_type, drug_name, dose_text }
 *   onChange — (nextRow) => void
 *
 * Pure controlled component — zero DB calls.
 */

function textInput(extraStyle = {}) {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13, fontFamily: 'var(--font-body)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    ...extraStyle,
  }
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {children}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{hint}</span>
      )}
    </div>
  )
}

export default function DrugFreetextRowEditor({ row, onChange }) {
  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Drug name ── */}
      <div>
        <FieldLabel>Drug name</FieldLabel>
        <input
          type="text"
          value={row.drug_name ?? ''}
          onChange={e => patch({ drug_name: e.target.value })}
          placeholder="e.g. Hibiotic 600 susp"
          dir="auto"
          style={textInput()}
        />
      </div>

      {/* ── Dose text ── */}
      <div>
        <FieldLabel>Dose / instructions</FieldLabel>
        <input
          type="text"
          value={row.dose_text ?? ''}
          onChange={e => patch({ dose_text: e.target.value })}
          placeholder="e.g. based on weight, every 8h for 5 days"
          dir="auto"
          style={textInput()}
        />
      </div>

    </div>
  )
}
