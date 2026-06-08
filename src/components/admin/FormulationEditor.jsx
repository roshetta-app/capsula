import { DRUG_FORMS, DRUG_ROUTES } from '../../config/forms'
import DoseRowList from './DoseRowList'

/**
 * FormulationEditor — edit fields on a formulation row.
 * Phase 3F — added is_published toggle + default_dose_override field.
 *
 * Props:
 *   formulation  { concentration, form, route, doses, default_dose_override, is_published }
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

      {/* Default dose override note */}
      <Field label="Dose override note" hint="Optional note shown below the dose table (italic, muted)">
        <input
          type="text"
          value={formulation.default_dose_override ?? ''}
          onChange={e => set('default_dose_override', e.target.value || null)}
          placeholder="e.g. Reduce dose in renal impairment"
          disabled={disabled}
          style={inputStyle}
        />
      </Field>

      {/* Published toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <label style={{ ...labelStyle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Published
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={formulation.is_published ?? true}
          onClick={() => !disabled && set('is_published', !(formulation.is_published ?? true))}
          disabled={disabled}
          style={{
            width: 42, height: 24,
            borderRadius: 12,
            border: 'none',
            backgroundColor: (formulation.is_published ?? true) ? 'var(--color-accent)' : 'var(--color-border)',
            position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3, left: (formulation.is_published ?? true) ? 21 : 3,
            width: 18, height: 18,
            borderRadius: '50%',
            backgroundColor: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {(formulation.is_published ?? true) ? 'Visible in app' : 'Hidden (draft)'}
        </span>
      </div>

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
