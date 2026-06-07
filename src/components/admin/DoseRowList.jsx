import { Plus, Trash2 } from 'lucide-react'

/**
 * DoseRowList — editable list of { group, instruction } dose rows.
 *
 * Used by GenericEditor (textbook doses) and FormulationEditor (practical doses).
 *
 * Props:
 *   doses     { group: string, instruction: string }[]
 *   onChange  (doses) => void
 *   disabled  boolean
 */
export default function DoseRowList({ doses = [], onChange, disabled = false }) {

  function updateRow(idx, field, value) {
    const next = doses.map((d, i) => i === idx ? { ...d, [field]: value } : d)
    onChange(next)
  }

  function addRow() {
    onChange([...doses, { group: '', instruction: '' }])
  }

  function removeRow(idx) {
    onChange(doses.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {doses.map((dose, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'flex-start',
          }}
        >
          {/* Group label */}
          <input
            type="text"
            value={dose.group}
            onChange={e => updateRow(idx, 'group', e.target.value)}
            placeholder="Group (e.g. Adult)"
            disabled={disabled}
            style={{
              ...inputBase,
              width: 120,
              flexShrink: 0,
            }}
          />

          {/* Instruction */}
          <textarea
            value={dose.instruction}
            onChange={e => updateRow(idx, 'instruction', e.target.value)}
            placeholder="Dose instruction…"
            disabled={disabled}
            dir="auto"
            rows={2}
            style={{
              ...inputBase,
              flex: 1,
              resize: 'vertical',
              fontFamily: 'var(--font-body)',
            }}
          />

          {/* Remove */}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeRow(idx)}
              aria-label="Remove dose row"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-tertiary)', padding: 4,
                display: 'flex', alignItems: 'center', flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          <Plus size={14} />
          Add dose row
        </button>
      )}
    </div>
  )
}

const inputBase = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
}
