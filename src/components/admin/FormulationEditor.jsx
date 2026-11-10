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
 * Visual cleanup — Dose Override Note and Formulation Note fields removed
 *   from this editor entirely (underlying formulation.default_dose_override
 *   / formulation.formulation_note columns are untouched, just no longer
 *   editable here). Strength/Concentration/Form/Route/Route Details/Form
 *   Modifier/Device Type now live inside a "Formulation Details" section,
 *   collapsed by default — Practical Doses and Published stay outside it,
 *   always visible.
 * 2026-11-10 — the details are now an always-open "Identity" card (no pop-up), with the
 *   concentration shown in its header; Practical Doses sits in its own card with no hint
 *   text; Published is a slim row. Fields and saved data are unchanged.
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
export default function FormulationEditor({ formulation, ingredients = [], onChange, disabled = false, showPublished = true }) {

  const rows = getIngredientRows(formulation, ingredients)

  function set(field, value) {
    onChange({ [field]: value })
  }

  function setIngredient(idx, field, value) {
    const nextRows = rows.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row
    )
    // All strength boxes empty (cleared by hand) means "no strength yet": store nothing, not
    // a blank row per ingredient, and not a "/" concentration.
    const allBlank = nextRows.every(r => !(r.value ?? '').toString().trim() && !(r.unit ?? '').trim() && !(r.basis ?? '').trim())
    const patch = {
      strength_structured: allBlank ? null : { ingredients: nextRows },
      concentration: allBlank ? '' : buildConcentration(nextRows),
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

  const published = formulation.is_published ?? true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Identity — always open: strength, form, route, modifier, device. The derived
          concentration sits in the header (it is built from the strength rows). */}
      <Card title="Identity" aside={formulation.concentration}>

        {/* Strength — one Value/Unit/Basis row per ingredient */}
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
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Field label="Strength" style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={row.value ?? ''}
                    onChange={e => setIngredient(idx, 'value', e.target.value || null)}
                    placeholder="250"
                    disabled={disabled}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Unit" style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={row.unit ?? ''}
                    onChange={e => setIngredient(idx, 'unit', e.target.value || null)}
                    placeholder="mg"
                    disabled={disabled}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Basis" style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={row.basis ?? ''}
                    onChange={e => setIngredient(idx, 'basis', e.target.value || null)}
                    placeholder="per_5ml"
                    disabled={disabled}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>
          )
        })}

        {/* Form + Route */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Field label="Form" required style={{ flex: 1, minWidth: 0 }}>
            <select
              value={formulation.form ?? ''}
              onChange={e => set('form', e.target.value)}
              disabled={disabled}
              required
              style={inputStyle}
            >
              <option value="" disabled>Select…</option>
              {DRUG_FORMS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Route" required style={{ flex: 1, minWidth: 0 }}>
            <select
              value={formulation.route ?? ''}
              onChange={e => set('route', e.target.value)}
              disabled={disabled}
              required
              style={inputStyle}
            >
              <option value="" disabled>Select…</option>
              {DRUG_ROUTES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Route Details — only when Route = Injection */}
        {formulation.route === 'injection' && (
          <Field label="Route details">
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

        {/* Form modifier + Device type */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Field label="Modifier" style={{ flex: 1, minWidth: 0 }}>
            <TagInput
              tags={formulation.form_modifier ?? []}
              onChange={tags => set('form_modifier', tags)}
              placeholder="e.g. chewable"
              disabled={disabled}
            />
          </Field>

          <Field label="Device" style={{ flex: 1, minWidth: 0 }}>
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
      </Card>

      {/* Practical doses */}
      <Card title="Practical doses">
        <DoseRowList
          doses={formulation.doses ?? []}
          onChange={doses => set('doses', doses)}
          disabled={disabled}
        />
      </Card>

      {/* Published — only where there is no ⋮ menu to do it (the Add Drug flow) */}
      {showPublished && <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg)',
      }}>
        <span style={labelStyle}>Published</span>
        <button
          type="button"
          role="switch"
          aria-checked={published}
          aria-label="Published"
          onClick={() => !disabled && set('is_published', !published)}
          disabled={disabled}
          style={{
            width: 42, height: 24, borderRadius: 12, border: 'none',
            backgroundColor: published ? 'var(--color-accent)' : 'var(--color-border)',
            position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: published ? 21 : 3,
            width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>}

    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────────────────
// One look for every block in the formulation editor: a title row and the content.

function Card({ title, aside, children }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-bg)', padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <span style={labelStyle}>{title}</span>
        {aside && (
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}>
            {aside}
          </span>
        )}
      </div>
      {children}
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

// Normalizes a basis string like "per_5ml" or "per 5 ml" into one clean
// form ("per_5ml") — one shared rule instead of a lookup table, confirmed
// against every distinct live basis value in use (decision 15).
function normalizeBasis(raw) {
  const trimmed = (raw ?? '').trim()
  const stripped = trimmed.replace(/^per[_\s]+/i, '')
  const collapsed = stripped.replace(/\s+/g, '')
  return `per_${collapsed}`
}

// Bases with no useful suffix to show: `per_unit` is too generic to mean
// anything on its own, and `percentage` rows already show their `%` in the
// unit itself, so appending it again would be redundant. Checked against
// the raw value first since `percentage` isn't a per_-prefixed value at
// all — normalizing it would incorrectly turn it into "per_percentage"
// (decision 15).
const SUPPRESSED_BASES = ['percentage', 'per_unit']

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
  if (parts.every(p => !p)) return ''   // nothing typed in any box: no strength, not "/"
  const joined = parts.join('/')
  const rawBasis = ingredients.map(i => i.basis).find(b => b && b.trim())
  if (!rawBasis) return joined
  if (SUPPRESSED_BASES.includes(rawBasis.trim())) return joined
  const normalized = normalizeBasis(rawBasis)
  if (SUPPRESSED_BASES.includes(normalized)) return joined
  const readable = normalized.replace(/^per_/, '')
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
