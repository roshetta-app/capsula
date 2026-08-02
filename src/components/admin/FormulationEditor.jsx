import { AlertTriangle } from 'lucide-react'
import { DRUG_FORMS, DRUG_ROUTES, INJECTION_ROUTE_DETAILS } from '../../config/forms'
import DoseRowList from './DoseRowList'
import TagInput from './TagInput'

/**
 * FormulationEditor — edit fields on a formulation row.
 * Phase 3F — added is_published toggle + default_dose_override field.
 * 2A.2 — added strength value/unit/basis, form modifier tags, device type,
 *   injection route-details tick-list, and the Formulation Note field
 *   (renamed from restricted_dispensing).
 * DrugCMS fix — strength is now always shown as one Value/Unit/Basis row
 *   PER INGREDIENT (strength_structured.ingredients), for single-ingredient
 *   and combo formulations alike — replacing the old split where singles got
 *   3 boxes and combos got one free-text Concentration blob. Concentration
 *   is derived automatically from the ingredient rows and shown read-only.
 *   The flat strength_value/strength_unit/strength_basis columns are kept in
 *   sync FROM the structured ingredients (not the other way around) — exactly
 *   for single-ingredient formulations (one ingredient, one value == no
 *   ambiguity), and cleared to null for combos, since three single-value
 *   columns can't honestly hold two or more ingredients' numbers.
 *
 * Props:
 *   formulation  {
 *     concentration, form, route, doses, default_dose_override, is_published,
 *     strength_value, strength_unit, strength_basis, strength_structured,
 *     form_modifier, device_type, route_details, formulation_note
 *   }
 *   ingredients  string[]  — the parent generic's real ingredient names
 *     (generics.ingredients). Used to build blank ingredient rows for a
 *     brand-new formulation that doesn't have strength_structured yet, and
 *     to flag (not block) any existing strength_structured.ingredients row
 *     whose name no longer matches this list — e.g. after a later edit to
 *     the parent generic.
 *   onChange     (patch) => void
 *   disabled     boolean
 */
export default function FormulationEditor({ formulation, ingredients = [], onChange, disabled = false }) {

  const rows = getIngredientRows(formulation, ingredients)

  function set(field, value) {
    onChange({ [field]: value })
  }

  function setIngredient(idx, field, value) {
    const nextRows = rows.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row
    )
    const patch = {
      strength_structured: { ingredients: nextRows },
      concentration: buildConcentration(nextRows),
    }
    if (nextRows.length === 1) {
      patch.strength_value = nextRows[0].value || null
      patch.strength_unit  = nextRows[0].unit  || null
      patch.strength_basis = nextRows[0].basis || null
    } else {
      patch.strength_value = null
      patch.strength_unit  = null
      patch.strength_basis = null
    }
    onChange(patch)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Strength — one Value/Unit/Basis row per ingredient */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map((row, idx) => {
          const matched = isMatchedIngredient(row.ingredient, ingredients)
          return (
            <div key={idx}>
              {(rows.length > 1 || !matched) && (
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
                  marginBottom: 4, textTransform: 'capitalize',
                }}>
                  {row.ingredient || `Ingredient ${idx + 1}`}
                </div>
              )}
              {!matched && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: '#DC2626', marginBottom: 4,
                }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                  Doesn't match this generic's ingredient list
                </div>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Field label="Strength Value" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={row.value ?? ''}
                    onChange={e => setIngredient(idx, 'value', e.target.value || null)}
                    placeholder="e.g. 250"
                    disabled={disabled}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Strength Unit" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={row.unit ?? ''}
                    onChange={e => setIngredient(idx, 'unit', e.target.value || null)}
                    placeholder="e.g. mg"
                    disabled={disabled}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Strength Basis" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={row.basis ?? ''}
                    onChange={e => setIngredient(idx, 'basis', e.target.value || null)}
                    placeholder="e.g. per_5ml"
                    disabled={disabled}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>
          )
        })}
      </div>

      {/* Concentration — built automatically from the ingredient rows above */}
      <Field label="Concentration" hint="Built automatically from the strength fields above — not editable directly">
        <input
          type="text"
          value={formulation.concentration ?? ''}
          disabled
          style={{ ...inputStyle, backgroundColor: 'var(--color-bg)', color: 'var(--color-text-tertiary)', cursor: 'not-allowed' }}
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

// Real ingredient rows to render: the existing strength_structured.ingredients
// if present, otherwise one blank row per name in the generic's real
// ingredients array — for a brand-new formulation that hasn't had its
// strength filled in yet.
function getIngredientRows(formulation, genericIngredients) {
  const existing = formulation.strength_structured?.ingredients
  if (Array.isArray(existing) && existing.length > 0) return existing
  return blankRowsFromIngredients(genericIngredients)
}

function blankRowsFromIngredients(genericIngredients) {
  if (!genericIngredients || genericIngredients.length === 0) {
    return [{ ingredient: '', value: null, unit: null, basis: null }]
  }
  return genericIngredients.map(name => ({ ingredient: name, value: null, unit: null, basis: null }))
}

// A formulation ingredient row is "matched" when its name lines up exactly
// (case/whitespace-insensitive) with one of the parent generic's real
// ingredient names. An empty/not-yet-typed row is treated as matched so a
// brand-new blank row doesn't show a warning before anything is entered.
// Unmatched rows are surfaced for manual review, not silently dropped or
// silently kept as-is — see plan §4 decision 3's 2026-08-02 addendum.
function isMatchedIngredient(name, genericIngredients) {
  const norm = s => (s || '').trim().toLowerCase()
  const target = norm(name)
  if (!target) return true
  return (genericIngredients ?? []).some(gi => norm(gi) === target)
}

// Builds the display-string Concentration value from the ingredient rows,
// e.g. single ingredient ('250', 'mg', 'per_5ml') -> '250mg / 5ml';
// combo [{10,mg},{20,mg}] -> '10mg/20mg' (matches the existing data format).
// Basis is rare on combos, but if any ingredient has one, it's appended once.
function buildConcentration(ingredients) {
  if (!ingredients || ingredients.length === 0) return ''
  const parts = ingredients.map(ing => {
    const v = (ing.value ?? '').toString().trim()
    const u = (ing.unit ?? '').trim()
    return `${v}${u}`.trim()
  })
  const joined = parts.join('/')
  const basis = ingredients.map(i => i.basis).find(b => b && b.trim())
  if (!basis) return joined
  const readable = basis.replace(/^per_/, '').replace(/_/g, ' ')
  return joined ? `${joined} / ${readable}` : `/ ${readable}`
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
