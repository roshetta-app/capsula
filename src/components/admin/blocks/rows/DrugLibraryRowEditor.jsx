/**
 * src/components/admin/blocks/rows/DrugLibraryRowEditor.jsx
 *
 * Row editor for { row_type: "drug_library" } rows inside a prescription_sheet block.
 *
 * Props:
 *   row       — { row_type, formulation_id, _formulationMeta, dose_override, note_en, note_ar, drug_link_enabled }
 *   onChange  — (nextRow) => void
 *
 * _formulationMeta is a transient UI-only object stored alongside the row so the
 * admin can see what they picked. It is stripped before save (PrescriptionSheetEditor
 * is responsible for the strip). Shape: { name_en, concentration, form, route }
 *
 * Pure controlled component — zero DB calls. Uses DrugPickerModal for selection.
 */

import { useState } from 'react'
import { Link, Unlink } from 'lucide-react'
import DrugPickerModal from '../../DrugPickerModal'

// ─── Small helpers ────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugLibraryRowEditor({ row, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const meta        = row._formulationMeta ?? null
  const showLink    = row.drug_link_enabled ?? true

  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  function handleFormulationSelect(formulation) {
    patch({
      formulation_id: formulation.id,
      _formulationMeta: {
        name_en:       formulation.generics?.name_en ?? '',
        concentration: formulation.concentration ?? '',
        form:          formulation.form ?? '',
        route:         formulation.route ?? '',
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Formulation picker ── */}
      <div>
        <FieldLabel>Formulation</FieldLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {meta ? (
            <div style={{
              flex: 1, padding: '7px 10px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              fontSize: 13,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {meta.name_en}
              </span>
              <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                {meta.concentration} · {meta.form}
                {meta.route ? ` · ${meta.route}` : ''}
              </span>
            </div>
          ) : (
            <div style={{
              flex: 1, padding: '7px 10px',
              border: '1.5px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--color-text-tertiary)',
              fontStyle: 'italic',
            }}>
              No formulation selected
            </div>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{
              padding: '7px 12px', flexShrink: 0,
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {meta ? 'Change' : 'Pick drug…'}
          </button>
        </div>
      </div>

      {/* ── Dose override ── */}
      <div>
        <FieldLabel hint="Leave blank to use formulation default">Dose override</FieldLabel>
        <input
          type="text"
          value={row.dose_override ?? ''}
          onChange={e => patch({ dose_override: e.target.value || null })}
          placeholder="e.g. 1 tablet twice daily for 5 days"
          dir="auto"
          style={textInput()}
        />
      </div>

      {/* ── Note EN ── */}
      <div>
        <FieldLabel hint="English">Drug note</FieldLabel>
        <input
          type="text"
          value={row.note_en ?? ''}
          onChange={e => patch({ note_en: e.target.value || null })}
          placeholder="e.g. Only if cramping present"
          style={textInput()}
        />
      </div>

      {/* ── Note AR ── */}
      <div>
        <FieldLabel hint="Arabic (RTL)">Drug note — Arabic</FieldLabel>
        <input
          type="text"
          value={row.note_ar ?? ''}
          onChange={e => patch({ note_ar: e.target.value || null })}
          placeholder="ملاحظة بالعربي (اختياري)"
          dir="rtl"
          style={textInput({ textAlign: 'right' })}
        />
      </div>

      {/* ── Drug link toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => patch({ drug_link_enabled: !showLink })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${showLink ? 'var(--color-accent)' : 'var(--color-border)'}`,
            backgroundColor: showLink ? '#EFF6FF' : 'transparent',
            color: showLink ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          {showLink ? <Link size={12} /> : <Unlink size={12} />}
          {showLink ? 'Drug link: ON' : 'Drug link: OFF'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {showLink
            ? 'Name taps navigate to Drug Detail screen'
            : 'Name shown as plain text'}
        </span>
      </div>

      {/* ── Picker modal ── */}
      <DrugPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFormulationSelect}
      />

    </div>
  )
}
