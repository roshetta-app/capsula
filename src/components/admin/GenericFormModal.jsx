/**
 * GenericFormModal.jsx — Phase 3E
 * Full create / edit modal for a generic (molecule) record.
 *
 * Props:
 *   generic   object | null   — null = create mode, object = edit mode
 *   onClose   () => void
 *   onSaved   (savedGeneric) => void
 */

import { useState, useEffect } from 'react'
import Modal from './Modal'
import TagInput from './TagInput'
import DoseRowList from './DoseRowList'
import { useToast } from '../../context/ToastContext'
import { insertGeneric, updateGeneric, touchAppMetadata } from '../../lib/adminQueries'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const PREGNANCY_OPTIONS = ['A', 'B', 'C', 'D', 'X', 'N']
const BREASTFEEDING_OPTIONS = ['safe', 'caution', 'unsafe', 'unknown']
const YES_NO_OPTIONS = ['yes', 'no', 'unknown']
const INTERACTION_SEVERITIES = ['major', 'moderate', 'minor']
const DOSE_ADJ_CONDITIONS = ['renal', 'hepatic', 'elderly', 'pediatric']

function emptyForm() {
  return {
    name_en: '',
    name_ar: '',
    category: '',
    class: '',
    card_tagline: '',
    mechanism_of_action: '',
    uses_structured: [],          // [{ use_name, context }]
    side_effects_common: [],
    side_effects_serious: [],
    pregnancy_category: 'N',
    breastfeeding_safety: 'unknown',
    crosses_placenta: 'unknown',
    crosses_bbb: 'unknown',
    contraindications: [],
    drug_interactions: [],        // [{ drug_name, risk, severity }]
    dose_adjustments: [],         // [{ condition, adjustment }]
    pharmacokinetics: { onset: '', peak: '', duration: '', half_life: '', bioavailability: '' },
    textbook_doses: [],           // DoseRowList format: [{ group, instruction }]
    textbook_dose_notes: '',
    is_published: true,
  }
}

function genericToForm(g) {
  return {
    name_en:              g.name_en ?? '',
    name_ar:              g.name_ar ?? '',
    category:             g.category ?? '',
    class:                g.class ?? '',
    card_tagline:         g.card_tagline ?? '',
    mechanism_of_action:  g.mechanism_of_action ?? '',
    uses_structured:      g.uses_structured ?? (g.uses_legacy ?? []).map(u => ({ use_name: u, context: '' })),
    side_effects_common:  g.side_effects_common  ?? [],
    side_effects_serious: g.side_effects_serious ?? [],
    pregnancy_category:   g.pregnancy_category   ?? 'N',
    breastfeeding_safety: g.breastfeeding_safety ?? 'unknown',
    crosses_placenta:     g.crosses_placenta     ?? 'unknown',
    crosses_bbb:          g.crosses_bbb          ?? 'unknown',
    contraindications:    g.contraindications    ?? [],
    drug_interactions:    g.drug_interactions    ?? [],
    dose_adjustments:     g.dose_adjustments     ?? [],
    pharmacokinetics:     g.pharmacokinetics     ?? { onset: '', peak: '', duration: '', half_life: '', bioavailability: '' },
    textbook_doses:       g.textbook_doses       ?? [],
    textbook_dose_notes:  g.textbook_dose_notes  ?? '',
    is_published:         g.is_published         ?? true,
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GenericFormModal({ generic, onClose, onSaved }) {
  const isEdit = !!generic
  const { toast } = useToast()

  const [form,    setForm]    = useState(isEdit ? genericToForm(generic) : emptyForm())
  const [saving,  setSaving]  = useState(false)
  const [categories, setCategories] = useState([])

  // Load distinct categories from DB for dropdown
  useEffect(() => {
    supabase
      .from('generics')
      .select('category')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(r => r.category).filter(Boolean))].sort()
          setCategories(unique)
        }
      })
  }, [])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setPk(field, value) {
    setForm(prev => ({
      ...prev,
      pharmacokinetics: { ...(prev.pharmacokinetics ?? {}), [field]: value },
    }))
  }

  async function handleSave() {
    if (!form.name_en.trim()) {
      toast.error('Generic name (English) is required')
      return
    }
    setSaving(true)

    const payload = {
      name_en:              form.name_en.trim(),
      name_ar:              form.name_ar.trim() || null,
      category:             form.category || null,
      class:                form.class.trim() || null,
      card_tagline:         form.card_tagline.trim() || null,
      mechanism_of_action:  form.mechanism_of_action.trim() || null,
      uses_structured:      form.uses_structured.length ? form.uses_structured : null,
      side_effects_common:  form.side_effects_common.length  ? form.side_effects_common  : null,
      side_effects_serious: form.side_effects_serious.length ? form.side_effects_serious : null,
      pregnancy_category:   form.pregnancy_category,
      breastfeeding_safety: form.breastfeeding_safety,
      crosses_placenta:     form.crosses_placenta,
      crosses_bbb:          form.crosses_bbb,
      contraindications:    form.contraindications.length ? form.contraindications : null,
      drug_interactions:    form.drug_interactions.length  ? form.drug_interactions  : null,
      dose_adjustments:     form.dose_adjustments.length   ? form.dose_adjustments   : null,
      pharmacokinetics:     Object.values(form.pharmacokinetics).some(v => v.trim())
                              ? form.pharmacokinetics : null,
      textbook_doses:       form.textbook_doses.length ? form.textbook_doses : null,
      textbook_dose_notes:  form.textbook_dose_notes.trim() || null,
      is_published:         form.is_published,
    }

    // Slug is required (NOT NULL). Generate on create; never overwrite on edit
    // (changing the slug would break existing /drugs/:slug URLs).
    if (!isEdit) {
      const base = form.name_en.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      // Fallback if name_en is all non-ASCII (e.g. Arabic only) — base will be empty.
      payload.slug = base || `generic-${Date.now()}`
    }

    let result
    if (isEdit) {
      result = await updateGeneric(generic.id, payload)
    } else {
      result = await insertGeneric(payload)
    }

    if (result.error) {
      toast.error(`Save failed: ${result.error.message}`)
      setSaving(false)
      return
    }

    await touchAppMetadata('drugs_updated_at')
    toast.success(isEdit ? 'Generic updated' : 'Generic created')
    setSaving(false)
    onSaved({ ...generic, ...payload, id: result.data?.id ?? generic?.id })
  }

  const pk = form.pharmacokinetics ?? {}

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit — ${generic.name_en}` : 'New Generic'}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* ── Identity ─────────────────────────────────────────────────────── */}
        <Section title="Identity">
          <Row2>
            <Field label="Generic name (English)" required>
              <input
                type="text"
                value={form.name_en}
                onChange={e => set('name_en', e.target.value)}
                placeholder="Molecule name only — e.g. Amoxicillin"
                style={inputStyle}
              />
            </Field>
            <Field label="Generic name (Arabic)">
              <input
                type="text"
                value={form.name_ar}
                onChange={e => set('name_ar', e.target.value)}
                placeholder="الاسم العلمي"
                dir="rtl"
                style={{ ...inputStyle, textAlign: 'right' }}
              />
            </Field>
          </Row2>

          <Row2>
            <Field label="Category">
              <CategorySelect
                value={form.category}
                options={categories}
                onChange={val => set('category', val)}
              />
            </Field>
            <Field label="Drug class / pharmacological group">
              <input
                type="text"
                value={form.class}
                onChange={e => set('class', e.target.value)}
                placeholder="e.g. Beta-lactam antibiotic"
                style={inputStyle}
              />
            </Field>
          </Row2>

          <Field label="Card tagline" hint="One line shown on drug cards. Leave blank to hide.">
            <input
              type="text"
              value={form.card_tagline}
              onChange={e => set('card_tagline', e.target.value)}
              placeholder="e.g. First-line for community-acquired infections"
              style={inputStyle}
            />
          </Field>
        </Section>

        {/* ── Pharmacology ─────────────────────────────────────────────────── */}
        <Section title="Pharmacology">
          <Field label="Mechanism of action">
            <textarea
              value={form.mechanism_of_action}
              onChange={e => set('mechanism_of_action', e.target.value)}
              placeholder="Short paragraph in plain clinical English…"
              rows={4}
              style={textareaStyle}
            />
          </Field>

          <Field label="Uses" hint="Press Enter to add each use">
            <UsesStructuredEditor
              uses={form.uses_structured}
              onChange={val => set('uses_structured', val)}
            />
          </Field>
        </Section>

        {/* ── Safety ───────────────────────────────────────────────────────── */}
        <Section title="Safety">
          <Field label="Common side effects" hint="Press Enter after each item">
            <TagInput
              tags={form.side_effects_common}
              onChange={tags => set('side_effects_common', tags)}
              placeholder="Add side effect…"
            />
          </Field>

          <Field label="Serious side effects" hint="Shown with red highlight in the app">
            <TagInput
              tags={form.side_effects_serious}
              onChange={tags => set('side_effects_serious', tags)}
              placeholder="Add serious side effect…"
              tagStyle={{ backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' }}
            />
          </Field>

          <Field label="Contraindications" hint="Press Enter after each item">
            <TagInput
              tags={form.contraindications}
              onChange={tags => set('contraindications', tags)}
              placeholder="Add contraindication…"
            />
          </Field>
        </Section>

        {/* ── Pregnancy & Lactation ─────────────────────────────────────────── */}
        <Section title="Pregnancy &amp; Lactation">
          <Row3>
            <Field label="Pregnancy category (FDA)">
              <Select
                value={form.pregnancy_category}
                options={PREGNANCY_OPTIONS}
                onChange={v => set('pregnancy_category', v)}
              />
            </Field>
            <Field label="Breastfeeding safety">
              <Select
                value={form.breastfeeding_safety}
                options={BREASTFEEDING_OPTIONS}
                onChange={v => set('breastfeeding_safety', v)}
              />
            </Field>
            <Field label="Crosses placenta">
              <Select
                value={form.crosses_placenta}
                options={YES_NO_OPTIONS}
                onChange={v => set('crosses_placenta', v)}
              />
            </Field>
          </Row3>
          <Row3>
            <Field label="Crosses BBB">
              <Select
                value={form.crosses_bbb}
                options={YES_NO_OPTIONS}
                onChange={v => set('crosses_bbb', v)}
              />
            </Field>
          </Row3>
        </Section>

        {/* ── Drug Interactions ─────────────────────────────────────────────── */}
        <Section title="Drug Interactions">
          <DrugInteractionsEditor
            interactions={form.drug_interactions}
            onChange={val => set('drug_interactions', val)}
          />
        </Section>

        {/* ── Dose Adjustments ─────────────────────────────────────────────── */}
        <Section title="Dose Adjustments">
          <DoseAdjustmentsEditor
            adjustments={form.dose_adjustments}
            onChange={val => set('dose_adjustments', val)}
          />
        </Section>

        {/* ── Pharmacokinetics ─────────────────────────────────────────────── */}
        <Section title="Pharmacokinetics">
          <Row3>
            <Field label="Onset"><input type="text" value={pk.onset ?? ''} onChange={e => setPk('onset', e.target.value)} placeholder="e.g. 30 min" style={inputStyle} /></Field>
            <Field label="Peak"><input type="text" value={pk.peak ?? ''} onChange={e => setPk('peak', e.target.value)} placeholder="e.g. 1–2 h" style={inputStyle} /></Field>
            <Field label="Duration"><input type="text" value={pk.duration ?? ''} onChange={e => setPk('duration', e.target.value)} placeholder="e.g. 6–8 h" style={inputStyle} /></Field>
          </Row3>
          <Row3>
            <Field label="Half-life"><input type="text" value={pk.half_life ?? ''} onChange={e => setPk('half_life', e.target.value)} placeholder="e.g. 1 h" style={inputStyle} /></Field>
            <Field label="Bioavailability"><input type="text" value={pk.bioavailability ?? ''} onChange={e => setPk('bioavailability', e.target.value)} placeholder="e.g. ~90%" style={inputStyle} /></Field>
          </Row3>
        </Section>

        {/* ── Textbook Doses ───────────────────────────────────────────────── */}
        <Section title="Textbook / Reference Doses">
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-3)' }}>
            Reference dose shown collapsed in Drug Detail screen. Not the practical prescription dose.
          </p>
          <DoseRowList
            doses={form.textbook_doses}
            onChange={doses => set('textbook_doses', doses)}
          />
          <Field label="Textbook dose notes" hint="Optional. E.g. 'Higher doses used in severe infections'">
            <textarea
              value={form.textbook_dose_notes}
              onChange={e => set('textbook_dose_notes', e.target.value)}
              rows={2}
              style={textareaStyle}
            />
          </Field>
        </Section>

        {/* ── Publish ──────────────────────────────────────────────────────── */}
        <Section title="Visibility">
          <label style={toggleRowStyle}>
            <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>Published</span>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={e => set('is_published', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
          </label>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 'var(--space-1) 0 0' }}>
            Unpublished generics are hidden from the app but not deleted.
          </p>
        </Section>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
          <button onClick={onClose} disabled={saving} style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Generic'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─── Uses Structured Editor ───────────────────────────────────────────────────

function UsesStructuredEditor({ uses = [], onChange }) {
  const [newUseName, setNewUseName] = useState('')

  function addUse() {
    const name = newUseName.trim()
    if (!name) return
    onChange([...uses, { use_name: name, context: '' }])
    setNewUseName('')
  }

  function removeUse(idx) {
    onChange(uses.filter((_, i) => i !== idx))
  }

  function updateContext(idx, context) {
    onChange(uses.map((u, i) => i === idx ? { ...u, context } : u))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {uses.map((u, idx) => (
        <div key={idx} style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2) var(--space-3)',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'flex-start',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {u.use_name}
            </div>
            <input
              type="text"
              value={u.context}
              onChange={e => updateContext(idx, e.target.value)}
              placeholder="Context (optional)…"
              style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
            />
          </div>
          <button
            type="button"
            onClick={() => removeUse(idx)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4, marginTop: 2 }}
          >
            ×
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="text"
          value={newUseName}
          onChange={e => setNewUseName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUse())}
          placeholder="Add use and press Enter…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={addUse} style={addBtnStyle}>Add</button>
      </div>
    </div>
  )
}

// ─── Drug Interactions Editor ─────────────────────────────────────────────────

function DrugInteractionsEditor({ interactions = [], onChange }) {
  function updateRow(idx, field, value) {
    onChange(interactions.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function addRow() {
    onChange([...interactions, { drug_name: '', risk: '', severity: 'moderate' }])
  }

  function removeRow(idx) {
    onChange(interactions.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {interactions.map((row, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <input
            type="text"
            value={row.drug_name}
            onChange={e => updateRow(idx, 'drug_name', e.target.value)}
            placeholder="Drug name"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="text"
            value={row.risk}
            onChange={e => updateRow(idx, 'risk', e.target.value)}
            placeholder="Risk description"
            style={{ ...inputStyle, flex: 2 }}
          />
          <select
            value={row.severity}
            onChange={e => updateRow(idx, 'severity', e.target.value)}
            style={{ ...inputStyle, width: 110, flexShrink: 0 }}
          >
            {INTERACTION_SEVERITIES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button type="button" onClick={() => removeRow(idx)} style={removeBtnStyle}>×</button>
        </div>
      ))}
      <button type="button" onClick={addRow} style={addBtnStyle}>+ Add interaction</button>
    </div>
  )
}

// ─── Dose Adjustments Editor ──────────────────────────────────────────────────

function DoseAdjustmentsEditor({ adjustments = [], onChange }) {
  function updateRow(idx, field, value) {
    onChange(adjustments.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function addRow() {
    onChange([...adjustments, { condition: 'renal', adjustment: '' }])
  }

  function removeRow(idx) {
    onChange(adjustments.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {adjustments.map((row, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <select
            value={row.condition}
            onChange={e => updateRow(idx, 'condition', e.target.value)}
            style={{ ...inputStyle, width: 120, flexShrink: 0 }}
          >
            {DOSE_ADJ_CONDITIONS.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <input
            type="text"
            value={row.adjustment}
            onChange={e => updateRow(idx, 'adjustment', e.target.value)}
            placeholder="Dose adjustment instructions…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={() => removeRow(idx)} style={removeBtnStyle}>×</button>
        </div>
      ))}
      <button type="button" onClick={addRow} style={addBtnStyle}>+ Add adjustment</button>
    </div>
  )
}

// ─── CategorySelect — supports existing options + free-text new entry ─────────

function CategorySelect({ value, options, onChange }) {
  const [showNew, setShowNew] = useState(false)
  const [newVal, setNewVal]   = useState('')

  if (showNew) {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="text"
          value={newVal}
          autoFocus
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onChange(newVal.trim()); setShowNew(false) }
            if (e.key === 'Escape') setShowNew(false)
          }}
          placeholder="New category name…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={() => { onChange(newVal.trim()); setShowNew(false) }} style={addBtnStyle}>OK</button>
        <button type="button" onClick={() => setShowNew(false)} style={cancelBtnStyle}>✕</button>
      </div>
    )
  }

  return (
    <select value={value} onChange={e => {
      if (e.target.value === '__new__') { setShowNew(true); return }
      onChange(e.target.value)
    }} style={inputStyle}>
      <option value="">Select category…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      <option value="__new__">+ Add new…</option>
    </select>
  )
}

// ─── Generic sub-components ───────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
        paddingBottom: 'var(--space-2)',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-3)',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, hint, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{hint}</span>}
      {children}
    </div>
  )
}

function Row2({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
      {children}
    </div>
  )
}

function Row3({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
      {children}
    </div>
  )
}

function Select({ value, options, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
      {options.map(o => (
        <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
      ))}
    </select>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  lineHeight: 1.5,
}

const toggleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
}

const saveBtnStyle = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const cancelBtnStyle = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const addBtnStyle = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const removeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  fontSize: 18,
  padding: '0 4px',
  lineHeight: 1,
  flexShrink: 0,
  marginTop: 6,
}



