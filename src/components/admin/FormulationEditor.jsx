import { DRUG_FORMS, DRUG_ROUTES } from '../../config/forms'
import DoseRowList from './DoseRowList'

/**
 * FormulationEditor — edit fields on a formulation row.
 *
 * Props:
 *   formulation  { concentration, form, route, doses }
 *   onChange     (patch) => void
 *   disabled     boolean
 */
export default function FormulationEditor({ formulation, onChange, disabled = false }) {

  function set(field, value) {
    onChange({ [field]: value })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Concentration */}
      <Field label="Concentration" required>
        <input
          type="text"
          value={formulation.concentration ?? ''}
          onChange={e => set('concentration', e.target.value)}
          placeholder="e.g. 500mg, 250mg/5ml, standard"
          disabled={disabled}
          required
          style={inputStyle}
        />
      </Field>

      {/* Form + Route row */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Field label="Form" required style={{ flex: 1 }}>
          <select
            value={formulation.form ?? ''}
            onChange={e => set('form', e.target.value)}
            disabled={disabled}
            required
            style={inputStyle}
          >
            <option value="" disabled>Select form…</option>
            {DRUG_FORMS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Route" required style={{ flex: 1 }}>
          <select
            value={formulation.route ?? ''}
            onChange={e => set('route', e.target.value)}
            disabled={disabled}
            required
            style={inputStyle}
          >
            <option value="" disabled>Select route…</option>
            {DRUG_ROUTES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Practical doses */}
      <Field label="Practical doses" hint="Patient-friendly doses shown for this formulation">
        <DoseRowList
          doses={formulation.doses ?? []}
          onChange={doses => set('doses', doses)}
          disabled={disabled}
        />
      </Field>

    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, required, children, style: extraStyle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...extraStyle }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
          {hint}
        </span>
      )}
      {children}
    </div>
  )
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily: 'var(--font-body)',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
}
