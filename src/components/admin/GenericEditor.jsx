/**
 * src/components/admin/GenericEditor.jsx
 * Phase 3E — Drugs / Generics Editor
 *
 * Full field set for a generic (molecule) record.
 * All Phase-1A fields are covered.
 *
 * Props:
 *   generic   object  — the current generic state
 *   onChange  (patch: Partial<generic>) => void
 *   disabled  boolean
 */

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { fetchCategoriesForCMS } from '../../lib/adminQueries'
import TagInput   from './TagInput'
import DoseRowList from './DoseRowList'

// ─── Constants ────────────────────────────────────────────────────────────────

const PREGNANCY_CATEGORIES = ['A', 'B', 'C', 'D', 'X', 'N']
const YES_NO_UNKNOWN = ['yes', 'no', 'unknown']
const BREASTFEEDING_OPTIONS = ['safe', 'caution', 'unsafe', 'unknown']
const INTERACTION_SEVERITIES = ['major', 'moderate', 'minor']
const DOSE_ADJ_CONDITIONS = ['renal', 'hepatic', 'elderly', 'pediatric']

// ─── Main component ───────────────────────────────────────────────────────────

export default function GenericEditor({ generic = {}, onChange, disabled = false }) {
  const [pkOpen, setPkOpen] = useState(false)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchCategoriesForCMS().then(({ data }) => {
      if (!cancelled) setCategories(data ?? [])
    })
    return () => { cancelled = true }
  }, [])

  function set(field, value) {
    onChange({ [field]: value })
  }

  // ── uses_structured helpers ──
  function setUse(idx, field, value) {
    const next = (generic.uses_structured ?? []).map((u, i) =>
      i === idx ? { ...u, [field]: value } : u
    )
    set('uses_structured', next)
  }
  function addUse() {
    set('uses_structured', [...(generic.uses_structured ?? []), { use_name: '', context: '' }])
  }
  function removeUse(idx) {
    set('uses_structured', (generic.uses_structured ?? []).filter((_, i) => i !== idx))
  }

  // ── drug_interactions helpers ──
  function setInteraction(idx, field, value) {
    const next = (generic.drug_interactions ?? []).map((x, i) =>
      i === idx ? { ...x, [field]: value } : x
    )
    set('drug_interactions', next)
  }
  function addInteraction() {
    set('drug_interactions', [...(generic.drug_interactions ?? []), { drug_name: '', risk: '', severity: 'moderate' }])
  }
  function removeInteraction(idx) {
    set('drug_interactions', (generic.drug_interactions ?? []).filter((_, i) => i !== idx))
  }

  // ── dose_adjustments helpers ──
  function setAdjustment(idx, field, value) {
    const next = (generic.dose_adjustments ?? []).map((x, i) =>
      i === idx ? { ...x, [field]: value } : x
    )
    set('dose_adjustments', next)
  }
  function addAdjustment() {
    set('dose_adjustments', [...(generic.dose_adjustments ?? []), { condition: 'renal', adjustment: '' }])
  }
  function removeAdjustment(idx) {
    set('dose_adjustments', (generic.dose_adjustments ?? []).filter((_, i) => i !== idx))
  }

  // ── pharmacokinetics helper ──
  function setPk(field, value) {
    set('pharmacokinetics', { ...(generic.pharmacokinetics ?? {}), [field]: value })
  }

  const pk = generic.pharmacokinetics ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* ── IDENTITY ── */}
      <Section label="Identity">

        <Field label="Generic name (English)" required>
          <input
            type="text"
            value={generic.name_en ?? ''}
            onChange={e => set('name_en', e.target.value)}
            placeholder="Molecule name only — e.g. Amoxicillin"
            disabled={disabled}
            required
            style={inputStyle}
          />
        </Field>

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

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Field label="Category" required style={{ flex: 1 }}>
            <select
              value={generic.category ?? ''}
              onChange={e => set('category', e.target.value)}
              disabled={disabled}
              required
              style={inputStyle}
            >
              <option value="" disabled>Select category…</option>
              {categories.map(c => (
                <option key={c.id} value={c.slug}>{c.name_en}</option>
              ))}
            </select>
          </Field>

          <Field label="Drug class / group" style={{ flex: 1 }}>
            <input
              type="text"
              value={generic.class ?? ''}
              onChange={e => set('class', e.target.value)}
              placeholder="e.g. Beta-lactam antibiotic"
              disabled={disabled}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Card tagline" hint="One line shown on condition cards. Leave blank to hide.">
          <input
            type="text"
            value={generic.card_tagline ?? ''}
            onChange={e => set('card_tagline', e.target.value)}
            placeholder="Short descriptor shown on cards"
            disabled={disabled}
            style={inputStyle}
          />
        </Field>

        <Field label="Published">
          <ToggleSwitch
            value={generic.is_published ?? true}
            onChange={v => set('is_published', v)}
            disabled={disabled}
            labelOn="Published"
            labelOff="Draft"
          />
        </Field>

      </Section>

      {/* ── MECHANISM & USES ── */}
      <Section label="Mechanism & Uses">

        <Field label="Mechanism of action" hint="Short paragraph, plain clinical English, ~200 words max">
          <textarea
            value={generic.mechanism_of_action ?? ''}
            onChange={e => set('mechanism_of_action', e.target.value)}
            placeholder="Describe how this drug works…"
            rows={4}
            disabled={disabled}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
          />
        </Field>

        <Field label="Uses (structured)" hint="Add use_name + context per indication">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {(generic.uses_structured ?? []).map((u, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={u.use_name}
                  onChange={e => setUse(idx, 'use_name', e.target.value)}
                  placeholder="Use name"
                  disabled={disabled}
                  style={{ ...inputStyle, width: 180, flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={u.context ?? ''}
                  onChange={e => setUse(idx, 'context', e.target.value)}
                  placeholder="Context / notes (optional)"
                  disabled={disabled}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {!disabled && (
                  <button type="button" onClick={() => removeUse(idx)} style={iconTrashStyle}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!disabled && (
              <button type="button" onClick={addUse} style={addRowBtnStyle}>
                <Plus size={13} /> Add use
              </button>
            )}
          </div>
        </Field>

      </Section>

      {/* ── SIDE EFFECTS ── */}
      <Section label="Side Effects">

        <Field label="Common side effects" hint="Press Enter to add each item">
          <TagInput
            tags={generic.side_effects_common ?? []}
            onChange={tags => set('side_effects_common', tags)}
            placeholder="Add common side effect…"
            disabled={disabled}
          />
        </Field>

        <Field label="Serious / black-box side effects" hint="Shown in red in the app">
          <TagInput
            tags={generic.side_effects_serious ?? []}
            onChange={tags => set('side_effects_serious', tags)}
            placeholder="Add serious side effect…"
            disabled={disabled}
            tagColor="#DC2626"
            tagBg="#FEF2F2"
            tagBorder="#FECACA"
          />
        </Field>

        <Field label="Contraindications" hint="Press Enter to add each item">
          <TagInput
            tags={generic.contraindications ?? []}
            onChange={tags => set('contraindications', tags)}
            placeholder="Add contraindication…"
            disabled={disabled}
          />
        </Field>

      </Section>

      {/* ── SAFETY ── */}
      <Section label="Safety & Pregnancy">

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>

          <Field label="Pregnancy category" style={{ flex: 1, minWidth: 140 }}>
            <select
              value={generic.pregnancy_category ?? ''}
              onChange={e => set('pregnancy_category', e.target.value || null)}
              disabled={disabled}
              style={inputStyle}
            >
              <option value="">— not set —</option>
              {PREGNANCY_CATEGORIES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Breastfeeding safety" style={{ flex: 1, minWidth: 140 }}>
            <select
              value={generic.breastfeeding_safety ?? ''}
              onChange={e => set('breastfeeding_safety', e.target.value || null)}
              disabled={disabled}
              style={inputStyle}
            >
              <option value="">— not set —</option>
              {BREASTFEEDING_OPTIONS.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </Field>

          <Field label="Crosses placenta" style={{ flex: 1, minWidth: 130 }}>
            <select
              value={generic.crosses_placenta ?? ''}
              onChange={e => set('crosses_placenta', e.target.value || null)}
              disabled={disabled}
              style={inputStyle}
            >
              <option value="">— not set —</option>
              {YES_NO_UNKNOWN.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </Field>

          <Field label="Crosses BBB" style={{ flex: 1, minWidth: 130 }}>
            <select
              value={generic.crosses_bbb ?? ''}
              onChange={e => set('crosses_bbb', e.target.value || null)}
              disabled={disabled}
              style={inputStyle}
            >
              <option value="">— not set —</option>
              {YES_NO_UNKNOWN.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </Field>

        </div>
      </Section>

      {/* ── DRUG INTERACTIONS ── */}
      <Section label="Drug Interactions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {(generic.drug_interactions ?? []).map((x, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={x.drug_name}
                onChange={e => setInteraction(idx, 'drug_name', e.target.value)}
                placeholder="Drug name"
                disabled={disabled}
                style={{ ...inputStyle, width: 160, flexShrink: 0 }}
              />
              <input
                type="text"
                value={x.risk ?? ''}
                onChange={e => setInteraction(idx, 'risk', e.target.value)}
                placeholder="Risk / interaction note"
                disabled={disabled}
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={x.severity ?? 'moderate'}
                onChange={e => setInteraction(idx, 'severity', e.target.value)}
                disabled={disabled}
                style={{ ...inputStyle, width: 110, flexShrink: 0 }}
              >
                {INTERACTION_SEVERITIES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {!disabled && (
                <button type="button" onClick={() => removeInteraction(idx)} style={iconTrashStyle}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {!disabled && (
            <button type="button" onClick={addInteraction} style={addRowBtnStyle}>
              <Plus size={13} /> Add interaction
            </button>
          )}
        </div>
      </Section>

      {/* ── DOSE ADJUSTMENTS ── */}
      <Section label="Dose Adjustments">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {(generic.dose_adjustments ?? []).map((x, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <select
                value={x.condition ?? 'renal'}
                onChange={e => setAdjustment(idx, 'condition', e.target.value)}
                disabled={disabled}
                style={{ ...inputStyle, width: 130, flexShrink: 0 }}
              >
                {DOSE_ADJ_CONDITIONS.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <textarea
                value={x.adjustment ?? ''}
                onChange={e => setAdjustment(idx, 'adjustment', e.target.value)}
                placeholder="Adjustment instruction…"
                rows={2}
                disabled={disabled}
                style={{ ...inputStyle, flex: 1, resize: 'vertical', fontFamily: 'var(--font-body)' }}
              />
              {!disabled && (
                <button type="button" onClick={() => removeAdjustment(idx)} style={iconTrashStyle}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {!disabled && (
            <button type="button" onClick={addAdjustment} style={addRowBtnStyle}>
              <Plus size={13} /> Add adjustment
            </button>
          )}
        </div>
      </Section>

      {/* ── PHARMACOKINETICS ── */}
      <Section label="Pharmacokinetics">
        <button
          type="button"
          onClick={() => setPkOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary)', fontSize: 13,
            fontFamily: 'var(--font-body)', padding: 0, marginBottom: pkOpen ? 'var(--space-3)' : 0,
          }}
        >
          {pkOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {pkOpen ? 'Hide PK fields' : 'Show PK fields'}
        </button>
        {pkOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {['onset', 'peak', 'duration', 'half_life', 'bioavailability'].map(field => (
              <Field key={field} label={field.replace('_', ' ')} style={{ flex: '1 1 160px' }}>
                <input
                  type="text"
                  value={pk[field] ?? ''}
                  onChange={e => setPk(field, e.target.value)}
                  placeholder={`e.g. ${field === 'half_life' ? '6-8 hours' : field === 'onset' ? '30 min' : '—'}`}
                  disabled={disabled}
                  style={inputStyle}
                />
              </Field>
            ))}
          </div>
        )}
      </Section>

      {/* ── TEXTBOOK DOSES ── */}
      <Section label="Textbook (Reference) Doses">
        <Field hint="Shown collapsed as 'Reference Dose' in Drug Detail screen">
          <DoseRowList
            doses={generic.textbook_doses ?? []}
            onChange={doses => set('textbook_doses', doses)}
            disabled={disabled}
          />
        </Field>
        <Field label="Textbook dose notes">
          <textarea
            value={generic.textbook_dose_notes ?? ''}
            onChange={e => set('textbook_dose_notes', e.target.value)}
            placeholder="e.g. Higher doses used for severe infections"
            rows={2}
            disabled={disabled}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </Field>
      </Section>

    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-md)',
      overflow:        'hidden',
    }}>
      {label && (
        <div style={{
          padding:         'var(--space-2) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          borderBottom:    '1px solid var(--color-border)',
          fontSize:        11,
          fontWeight:      700,
          letterSpacing:   '0.08em',
          textTransform:   'uppercase',
          color:           'var(--color-text-tertiary)',
          fontFamily:      'var(--font-body)',
        }}>
          {label}
        </div>
      )}
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, required, children, style: extraStyle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...extraStyle }}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
          {hint}
        </span>
      )}
      {children}
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onChange, disabled, labelOn = 'On', labelOff = 'Off' }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             'var(--space-2)',
        background:      'none',
        border:          'none',
        cursor:          disabled ? 'default' : 'pointer',
        padding:         0,
        fontFamily:      'var(--font-body)',
      }}
    >
      <div style={{
        width:           40,
        height:          22,
        borderRadius:    11,
        backgroundColor: value ? 'var(--color-accent)' : 'var(--color-border)',
        position:        'relative',
        transition:      'background-color 0.2s',
        flexShrink:      0,
      }}>
        <div style={{
          position:        'absolute',
          top:             3,
          left:            value ? 20 : 3,
          width:           16,
          height:          16,
          borderRadius:    8,
          backgroundColor: '#fff',
          transition:      'left 0.2s',
          boxShadow:       '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{
        fontSize:   13,
        fontWeight: 500,
        color:      value ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
      }}>
        {value ? labelOn : labelOff}
      </span>
    </button>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize:      12,
  fontWeight:    600,
  color:         'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily:    'var(--font-body)',
}

const inputStyle = {
  width:              '100%',
  boxSizing:          'border-box',
  padding:            'var(--space-2) var(--space-3)',
  borderRadius:       'var(--radius-sm)',
  border:             '1px solid var(--color-border)',
  backgroundColor:    'var(--color-surface)',
  color:              'var(--color-text-primary)',
  fontSize:           14,
  fontFamily:         'var(--font-body)',
  outline:            'none',
  appearance:         'none',
  WebkitAppearance:   'none',
}

const iconTrashStyle = {
  background:  'none',
  border:      'none',
  cursor:      'pointer',
  color:       'var(--color-text-tertiary)',
  padding:     4,
  display:     'flex',
  alignItems:  'center',
  flexShrink:  0,
  marginTop:   2,
}

const addRowBtnStyle = {
  display:         'flex',
  alignItems:      'center',
  gap:             'var(--space-1)',
  padding:         'var(--space-2) var(--space-3)',
  borderRadius:    'var(--radius-sm)',
  border:          '1px dashed var(--color-border)',
  backgroundColor: 'transparent',
  color:           'var(--color-text-secondary)',
  fontSize:        13,
  fontWeight:      500,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
  alignSelf:       'flex-start',
}
