import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

/**
 * DoseRowList (DoseTableEditor) — editable table of structured dose rows.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.3c, decision 4.6,
 * plan §10 Section 6): reworked from the old fixed "Who" dropdown +
 * { who, instruction, max_dose } shape to free-text population/bracket
 * fields + an explicit source field + manual reorder controls, backed by an
 * explicit `position` value per row (mirroring the existing
 * condition_blocks.order_index pattern) — since real population/bracket
 * labels ("<10kg", "2–6 years", "Elderly") have no clean, sortable rule and
 * need entering in whatever order the source actually lists them (4.6).
 * Rows sharing the same `population` render as one tab with multiple
 * brackets on the app side (DoseSection.jsx).
 *
 * `position` is always recomputed from the row's actual array order after
 * every add/remove/reorder, so it can never drift out of sync with what's
 * displayed here.
 *
 * Props:
 *   doses     { population: string, bracket?: string, instruction: string,
 *               max_dose?: string, source?: string, position: number }[]
 *   onChange  (doses) => void
 *   disabled  boolean
 */

export default function DoseRowList({ doses = [], onChange, disabled = false }) {

  function withRecomputedPositions(next) {
    return next.map((d, i) => ({ ...d, position: i }))
  }

  function updateRow(idx, field, value) {
    onChange(doses.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  function addRow() {
    onChange(withRecomputedPositions([
      ...doses,
      { population: '', bracket: '', instruction: '', max_dose: '', source: '', position: doses.length },
    ]))
  }

  function removeRow(idx) {
    onChange(withRecomputedPositions(doses.filter((_, i) => i !== idx)))
  }

  function moveRow(idx, direction) {
    const target = idx + direction
    if (target < 0 || target >= doses.length) return
    const next = [...doses]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(withRecomputedPositions(next))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

      {/* Header row */}
      {doses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '110px 110px 1fr 100px 140px 56px', gap: 'var(--space-2)', paddingBottom: 2 }}>
          <ColHeader>Population</ColHeader>
          <ColHeader>Bracket</ColHeader>
          <ColHeader>Instruction</ColHeader>
          <ColHeader>Max dose</ColHeader>
          <ColHeader>Source</ColHeader>
          <span />
        </div>
      )}

      {doses.map((dose, idx) => (
        <div
          key={idx}
          style={{ display: 'grid', gridTemplateColumns: '110px 110px 1fr 100px 140px 56px', gap: 'var(--space-2)', alignItems: 'flex-start' }}
        >
          {/* Population */}
          <input
            type="text"
            value={dose.population ?? ''}
            onChange={e => updateRow(idx, 'population', e.target.value)}
            placeholder="e.g. Adult"
            disabled={disabled}
            style={inputBase}
          />

          {/* Bracket */}
          <input
            type="text"
            value={dose.bracket ?? ''}
            onChange={e => updateRow(idx, 'bracket', e.target.value)}
            placeholder="e.g. 2–6y"
            disabled={disabled}
            style={inputBase}
          />

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

          {/* Source */}
          <input
            type="text"
            value={dose.source ?? ''}
            onChange={e => updateRow(idx, 'source', e.target.value)}
            placeholder="e.g. BNF 2024"
            disabled={disabled}
            style={inputBase}
          />

          {/* Reorder + remove */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!disabled && (
              <>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => moveRow(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move dose row up"
                    style={reorderBtnStyle(idx === 0)}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(idx, 1)}
                    disabled={idx === doses.length - 1}
                    aria-label="Move dose row down"
                    style={reorderBtnStyle(idx === doses.length - 1)}
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  aria-label="Remove dose row"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-tertiary)', padding: 4,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
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

function reorderBtnStyle(isDisabled) {
  return {
    background: 'none',
    border: 'none',
    cursor: isDisabled ? 'default' : 'pointer',
    color: isDisabled ? 'var(--color-border)' : 'var(--color-text-tertiary)',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  }
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
