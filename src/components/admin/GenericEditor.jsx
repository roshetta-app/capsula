import { DRUG_CATEGORIES } from '../../config/categories'
import TagInput from './TagInput'
import DoseRowList from './DoseRowList'

/**
 * GenericEditor — edit fields on a generic row.
 *
 * Props:
 *   generic   { name_en, name_ar, category, class, uses, warnings, doses }
 *   onChange  (patch: Partial<generic>) => void
 *   disabled  boolean
 */
export default function GenericEditor({ generic, onChange, disabled = false }) {

  function set(field, value) {
    onChange({ [field]: value })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Name EN */}
      <Field label="Generic name (English)" required>
        <input
          type="text"
          value={generic.name_en ?? ''}
          onChange={e => set('name_en', e.target.value)}
          placeholder="e.g. Amoxicillin 500mg"
          disabled={disabled}
          required
          style={inputStyle}
        />
      </Field>

      {/* Name AR */}
      <Field label="Generic name (Arabic)">
        <input
          type="text"
          value={generic.name_ar ?? ''}
          onChange={e => set('name_ar', e.target.value)}
          placeholder="الاسم العلمي"
          disabled={disabled}
          dir="rtl"
          style={{ ...inputStyle, textAlign: 'right' }}
        />
      </Field>

      {/* Category */}
      <Field label="Category" required>
        <select
          value={generic.category ?? ''}
          onChange={e => set('category', e.target.value)}
          disabled={disabled}
          required
          style={inputStyle}
        >
          <option value="" disabled>Select category…</option>
          {DRUG_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>

      {/* Drug class */}
      <Field label="Drug class / pharmacological group">
        <input
          type="text"
          value={generic.class ?? ''}
          onChange={e => set('class', e.target.value)}
          placeholder="e.g. Beta-lactam antibiotic"
          disabled={disabled}
          style={inputStyle}
        />
      </Field>

      {/* Uses */}
      <Field label="Uses" hint="Press Enter to add each use">
        <TagInput
          tags={generic.uses ?? []}
          onChange={tags => set('uses', tags)}
          placeholder="Add use and press Enter…"
          disabled={disabled}
        />
      </Field>

      {/* Warnings */}
      <Field label="Warnings" hint="Press Enter to add each warning">
        <TagInput
          tags={generic.warnings ?? []}
          onChange={tags => set('warnings', tags)}
          placeholder="Add warning and press Enter…"
          disabled={disabled}
        />
      </Field>

      {/* Textbook doses */}
      <Field label="Textbook doses" hint="Reference doses shown in drug detail (by age group)">
        <DoseRowList
          doses={generic.doses ?? []}
          onChange={doses => set('doses', doses)}
          disabled={disabled}
        />
      </Field>

    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
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
