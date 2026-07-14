import { DRUG_FORMS, DRUG_ROUTES, INJECTION_ROUTE_DETAILS } from '../../config/forms'
import DoseRowList from './DoseRowList'
import TagInput from './TagInput'

/**
 * FormulationEditor — edit fields on a formulation row.
 * Phase 3F — added is_published toggle + default_dose_override field.
 * 2A.2 — added strength value/unit/basis (single-ingredient formulations only),
 *   form modifier tags, device type, injection route-details tick-list, and the
 *   Formulation Note field (renamed from restricted_dispensing).
 *
 * Props:
 *   formulation  {
 *     concentration, form, route, doses, default_dose_override, is_published,
 *     strength_value, strength_unit, strength_basis, strength_structured,
 *     form_modifier, device_type, route_details, formulation_note
 *   }
 *   onChange     (patch) => void
 *   disabled     boolean
 *
 * strength_structured is read-only here — when it's present, the formulation is
 * a combo (more than one active ingredient) and keeps the plain-text Concentration
 * box. When it's absent, the formulation is single-ingredient and gets the three
 * structured strength boxes instead; Concentration is then generated from them.
 */
export default function FormulationEditor({ formulation, onChange, disabled = false }) {

  const isCombo = Boolean(formulation.strength_structured)

  function set(field, value) {
    onChange({ [field]: value })
  }

  function setStrength(field, value) {
    const next = {
      strength_value: formulation.strength_value,
      strength_unit:  formulation.strength_unit,
      strength_basis: formulation.strength_basis,
      [field]: value,
    }
    onChange({
      [field]: value,
      concentration: buildConcentration(next.strength_value, next.strength_unit, next.strength_basis),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Strength */}
      {isCombo ? (
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
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Field label="Strength Value" style={{ flex: 1 }}>
            <input
              type="text"
              value={formulation.strength_value ?? ''}
              onChange={e => setStrength('strength_value', e.target.value || null)}
              placeholder="e.g. 250"
              disabled={disabled}
              style={inputStyle}
            />
          </Field>
          <Field label="Strength Unit" style={{ flex: 1 }}>
            <input
              type="text"
              value={formulation.strength_unit ?? ''}
              onChange={e => setStrength('strength_unit', e.target.value || null)}
              placeholder="e.g. mg"
              disabled={disabled}
              style={inputStyle}
            />
          </Field>
          <Field label="Strength Basis" style={{ flex: 1 }}>
            <input
              type="text"
              value={formulation.strength_basis ?? ''}
              onChange={e => setStrength('strength_basis', e.target.value || null)}
              placeholder="e.g. per_5ml"
              disabled={disabled}
              style={inputStyle}
            />
          </Field>
        </div>
      )}

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

      {/* Route Details — only when Route = Injection */}
      {formulation.route === 'injection' && (
        <Field label="Route Details" hint="Select all that apply">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {INJECTION_ROUTE_DETAILS.map(opt => {
              const checked = (formulation.route_details ?? []).includes(opt.value)
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    color: 'var(--color-text-primary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      const current = formulation.route_details ?? []
                      const next = checked
                        ? current.filter(v => v !== opt.value)
                        : [...current, opt.value]
                      set('route_details', next)
                    }}
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </Field>
      )}

      {/* Form Modifier + Device Type row */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Field label="Form Modifier" hint="e.g. chewable, extended-release" style={{ flex: 1 }}>
          <TagInput
            tags={formulation.form_modifier ?? []}
            onChange={tags => set('form_modifier', tags)}
            placeholder="Type and press Enter…"
            disabled={disabled}
          />
        </Field>

        <Field label="Device Type" hint="e.g. inhaler, pen, patch" style={{ flex: 1 }}>
          <input
            type="text"
            value={formulation.device_type ?? ''}
            onChange={e => set('device_type', e.target.value || null)}
            placeholder="e.g. inhaler"
            disabled={disabled}
            style={inputStyle}
          />
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

      {/* Formulation Note */}
      <Field label="Formulation Note" hint="Optional free-text note about this formulation">
        <input
          type="text"
          value={formulation.formulation_note ?? ''}
          onChange={e => set('formulation_note', e.target.value || null)}
          placeholder="e.g. Hospital only"
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

// ─── Helpers ────────────────────────────────────────────────────────────────

// Builds the display-string Concentration value from the three structured
// strength fields, e.g. ('250', 'mg', 'per_5ml') -> '250mg / 5ml'.
// Used only for single-ingredient formulations (isCombo === false); combo
// formulations keep Concentration as direct free text.
function buildConcentration(value, unit, basis) {
  const v = value?.trim() ?? ''
  const u = unit?.trim() ?? ''
  const base = `${v}${u}`.trim()
  const b = basis?.trim()
  if (!b) return base
  const readable = b.replace(/^per_/, '').replace(/_/g, ' ')
  return base ? `${base} / ${readable}` : `/ ${readable}`
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
