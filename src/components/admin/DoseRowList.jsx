import { Plus, Trash2 } from 'lucide-react'

/**
 * DoseRowList (DoseTableEditor) — editable table of structured dose rows.
 *
 * Phase 3F — updated from plain group/instruction to:
 *   { who, instruction, max_dose }
 * with a proper "Who" dropdown per masterplan spec.
 *
 * Props:
 *   doses     { who: string, instruction: string, max_dose?: string }[]
 *   onChange  (doses) => void
 *   disabled  boolean
 */

const WHO_OPTIONS = [
  { value: 'adult',        label: 'Adult' },
  { value: 'child',        label: 'Child' },
  { value: 'child_6_12',   label: 'Child 6–12y' },
  { value: 'child_under_6', label: 'Child <6y' },
  { value: 'elderly',      label: 'Elderly' },
  { value: 'neonate',      label: 'Neonate' },
]

export default function DoseRowList({ doses = [], onChange, disabled = false }) {

  function updateRow(idx, field, value) {
    onChange(doses.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  function addRow() {
    onChange([...doses, { who: 'adult', instruction: '', max_dose: '' }])
  }

  function removeRow(idx) {
    onChange(doses.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

      {/* Header row */}
      {doses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 28px', gap: 'var(--space-2)', paddingBottom: 2 }}>
          <ColHeader>Who</ColHeader>
          <ColHeader>Instruction</ColHeader>
          <ColHeader>Max dose</ColHeader>
          <span />
        </div>
      )}

      {doses.map((dose, idx) => (
        <div
          key={idx}
          style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 28px', gap: 'var(--space-2)', alignItems: 'flex-start' }}
        >
          {/* Who */}
          <select
            value={dose.who ?? 'adult'}
            onChange={e => updateRow(idx, 'who', e.target.value)}
            disabled={disabled}
            style={inputBase}
          >
            {WHO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Instruction */}
          <textarea
            value={dose.instruction ?? ''}
            onChange={e => updateRow(idx, 'instruction', e.target.value)}
            placeholder="Dose instruction…"
            disabled={disabled}
            dir="auto"
            rows={2}
            style={{ ...inputBase, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />

          {/* Max dose */}
          <input
            type="text"
            value={dose.max_dose ?? ''}
            onChange={e => updateRow(idx, 'max_dose', e.target.value || '')}
            placeholder="e.g. 3g/day"
            disabled={disabled}
            style={inputBase}
          />

          {/* Remove */}
          {!disabled ? (
            <button
              type="button"
              onClick={() => removeRow(idx)}
              aria-label="Remove dose row"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-tertiary)', padding: 4,
                display: 'flex', alignItems: 'center', marginTop: 2,
              }}
            >
              <Trash2 size={15} />
            </button>
          ) : <span />}
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

function ColHeader({ children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </span>
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
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
}
