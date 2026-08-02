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
 *
 * Style pass (decision 4.18, step 3.3): switched from local Section/Field
 * primitives to the shared SectionCard/SectionCardHeader/FieldLabel from
 * adminSectionPrimitives.jsx. Section order reflows to match the app's
 * locked order (§11.3): Generic Overview -> Uses -> Dose -> Side Effects ->
 * Pregnancy & Breastfeeding -> Contraindications -> Drug Interactions ->
 * Pharmacology -> Sources.
 *
 * Resolved 2026-07-26 (§11.13, Option A): today's groupings don't map
 * 1-for-1 onto the app's 9 sections ("Mechanism & Uses" bundles Generic
 * Overview + Uses; "Side Effects" bundles Side Effects + Contraindications;
 * Dose is split across "Dose Adjustments" and "Textbook (Reference) Doses").
 * Restyle only, no field or content changes: groupings stay as they are,
 * reordered as closely as they map to the app order. Bundled sections are
 * placed at their earliest-covered app position; the two Dose sections move
 * up together, adjacent, keeping their existing relative order.
 */

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fetchCategoriesForCMS, fetchDistinctSources } from '../../lib/adminQueries'
import TagInput   from './TagInput'
import DoseRowList from './DoseRowList'
import { SectionCard, SectionCardHeader, FieldLabel } from './adminSectionPrimitives'

// ─── Constants ────────────────────────────────────────────────────────────────

const PREGNANCY_CATEGORIES = ['A', 'B', 'C', 'D', 'X', 'N']
const YES_NO_UNKNOWN = ['yes', 'no', 'unknown']
const BREASTFEEDING_OPTIONS = ['safe', 'caution', 'unsafe', 'unknown']
const INTERACTION_SEVERITIES = ['major', 'moderate', 'minor']

// ─── Main component ───────────────────────────────────────────────────────────

export default function GenericEditor({ generic = {}, onChange, disabled = false }) {

  const [categories, setCategories] = useState([])
  const [knownSources, setKnownSources] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchCategoriesForCMS().then(({ data }) => {
      if (!cancelled) setCategories(data ?? [])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDistinctSources().then(({ data }) => {
      if (!cancelled) setKnownSources(data ?? [])
    })
    return () => { cancelled = true }
  }, [])

  function set(field, value) {
    onChange({ [field]: value })
  }

  // Splits on whitespace and drops empty entries, so leading/trailing/
  // repeated spaces don't inflate the count. Used by Mechanism of
  // Action's live word counter (150-word warn, decision 5).
  function countWords(text) {
    return (text ?? '').trim().split(/\s+/).filter(Boolean).length
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
    set('drug_interactions', [...(generic.drug_interactions ?? []), { drug: '', description: '', severity: 'moderate' }])
  }
  function removeInteraction(idx) {
    set('drug_interactions', (generic.drug_interactions ?? []).filter((_, i) => i !== idx))
  }

  // ── sources helpers (2.4) ──
  function setSource(idx, field, value) {
    const next = (generic.sources ?? []).map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    )
    set('sources', next)
  }
  function addSource() {
    set('sources', [...(generic.sources ?? []), { source: '', title: '', note: '', url: '' }])
  }
  function removeSource(idx) {
    set('sources', (generic.sources ?? []).filter((_, i) => i !== idx))
  }
  // Autofills title/note/url from a previously-used source when the admin
  // picks a suggestion, so they only ever type "BNF" once, not four times.
  function applySourceSuggestion(idx, picked) {
    const next = (generic.sources ?? []).map((s, i) =>
      i === idx ? { source: picked.source ?? '', title: picked.title ?? '', note: picked.note ?? '', url: picked.url ?? '' } : s
    )
    set('sources', next)
  }

  // ── dose_adjustments helpers ──
  function setAdjustment(idx, field, value) {
    const next = (generic.dose_adjustments ?? []).map((x, i) =>
      i === idx ? { ...x, [field]: value } : x
    )
    set('dose_adjustments', next)
  }
  function addAdjustment() {
    set('dose_adjustments', [...(generic.dose_adjustments ?? []), { condition: '', adjustment: '' }])
  }
  function removeAdjustment(idx) {
    set('dose_adjustments', (generic.dose_adjustments ?? []).filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* ── IDENTITY (Generic Overview) ── */}
      <SectionCard>
        <SectionCardHeader>Identity</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <Field label="Generic name (English)">
          <input
            type="text"
            value={(generic.ingredients ?? []).join(' + ')}
            disabled
            readOnly
            style={{ ...inputStyle, color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)' }}
          />
        </Field>

        <Field label="Ingredients" required>
          <TagInput
            tags={generic.ingredients ?? []}
            onChange={tags => set('ingredients', tags)}
            placeholder="Add active ingredient and press Enter…"
            disabled={disabled}
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
              {generic.category && !categories.some(c => c.slug === generic.category) && (
                <option value={generic.category}>{generic.category} (not yet migrated)</option>
              )}
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

        <Field label="Published">
          <ToggleSwitch
            value={generic.is_published ?? true}
            onChange={v => set('is_published', v)}
            disabled={disabled}
            labelOn="Published"
            labelOff="Draft"
          />
        </Field>

        </div>
      </SectionCard>

      {/* ── MECHANISM & USES (Generic Overview + Uses) ── */}
      <SectionCard>
        <SectionCardHeader>Mechanism & Uses</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <Field label="Mechanism of action">
          <textarea
            value={generic.mechanism_of_action ?? ''}
            onChange={e => set('mechanism_of_action', e.target.value)}
            placeholder="Describe how this drug works — plain clinical English, ~150 words max…"
            rows={4}
            disabled={disabled}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
          />
          <span style={{
            fontSize: 12,
            alignSelf: 'flex-end',
            color: countWords(generic.mechanism_of_action) > 150
              ? '#dc2626'
              : 'var(--color-text-tertiary)',
          }}>
            {countWords(generic.mechanism_of_action)} / 150 words
          </span>
        </Field>

        <Field label="Uses (structured)">
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

        </div>
      </SectionCard>

      {/* ── DOSE ADJUSTMENTS (Dose) ── */}
      <SectionCard>
        <SectionCardHeader>Dose Adjustments</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {(generic.dose_adjustments ?? []).map((x, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={x.condition ?? ''}
                onChange={e => setAdjustment(idx, 'condition', e.target.value)}
                placeholder="Condition (e.g. Renal impairment)"
                disabled={disabled}
                style={{ ...inputStyle, width: 180, flexShrink: 0 }}
              />
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
      </SectionCard>

      {/* ── TEXTBOOK (REFERENCE) DOSES (Dose) ── */}
      <SectionCard>
        <SectionCardHeader>Textbook (Reference) Doses</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
        </div>
      </SectionCard>

      {/* ── SIDE EFFECTS (Side Effects + Contraindications) ── */}
      <SectionCard>
        <SectionCardHeader>Side Effects</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <Field label="Common side effects">
          <TagInput
            tags={generic.side_effects_common ?? []}
            onChange={tags => set('side_effects_common', tags)}
            placeholder="Add common side effect and press Enter…"
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

        <Field label="Contraindications">
          <TagInput
            tags={generic.contraindications ?? []}
            onChange={tags => set('contraindications', tags)}
            placeholder="Add contraindication and press Enter…"
            disabled={disabled}
          />
        </Field>

        </div>
      </SectionCard>

      {/* ── SAFETY & PREGNANCY (Pregnancy & Breastfeeding) ── */}
      <SectionCard>
        <SectionCardHeader>Safety & Pregnancy</SectionCardHeader>
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
      </SectionCard>

      {/* ── DRUG INTERACTIONS ── */}
      <SectionCard>
        <SectionCardHeader>Drug Interactions</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {(generic.drug_interactions ?? []).map((x, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={x.drug}
                onChange={e => setInteraction(idx, 'drug', e.target.value)}
                placeholder="Drug name"
                disabled={disabled}
                style={{ ...inputStyle, width: 160, flexShrink: 0 }}
              />
              <input
                type="text"
                value={x.description ?? ''}
                onChange={e => setInteraction(idx, 'description', e.target.value)}
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
      </SectionCard>

      {/* ── PHARMACOLOGY ── */}
      <SectionCard>
        <SectionCardHeader>Pharmacology</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Field label="Pharmacokinetics" hint="e.g. 'Onset: 30 min', 'Half-life: 6-8 hours'">
          <TagInput
            tags={generic.pharmacokinetics ?? []}
            onChange={tags => set('pharmacokinetics', tags)}
            placeholder="Type a PK point and press Enter…"
            disabled={disabled}
          />
        </Field>
        <Field label="Clinical relevance">
          <textarea
            value={generic.clinical_relevance ?? ''}
            onChange={e => set('clinical_relevance', e.target.value)}
            placeholder="Short paragraph on why this pharmacology matters clinically"
            rows={3}
            disabled={disabled}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </Field>
        </div>
      </SectionCard>

      {/* ── SOURCES ── */}
      <SectionCard>
        <SectionCardHeader>Sources</SectionCardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {(generic.sources ?? []).map((s, idx) => {
            const uniqueAbbrevs = [...new Set(knownSources.map(k => k.source).filter(Boolean))].sort()
            return (
              <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  list={`source-abbrevs-${idx}`}
                  value={s.source ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    setSource(idx, 'source', val)
                    // Only autofill the rest when this row is otherwise empty —
                    // never clobber something the admin already typed.
                    const match = knownSources.find(k => k.source === val)
                    if (match && !s.title && !s.note && !s.url) {
                      applySourceSuggestion(idx, match)
                    }
                  }}
                  placeholder="BNF"
                  disabled={disabled}
                  style={{ ...inputStyle, width: 100, flexShrink: 0 }}
                />
                <datalist id={`source-abbrevs-${idx}`}>
                  {uniqueAbbrevs.map(a => <option key={a} value={a} />)}
                </datalist>
                <input
                  type="text"
                  value={s.title ?? ''}
                  onChange={e => setSource(idx, 'title', e.target.value)}
                  placeholder="British National Formulary, 2024"
                  disabled={disabled}
                  style={{ ...inputStyle, flex: '1 1 220px' }}
                />
                <input
                  type="text"
                  value={s.note ?? ''}
                  onChange={e => setSource(idx, 'note', e.target.value)}
                  placeholder="Dosage, indications, contraindications"
                  disabled={disabled}
                  style={{ ...inputStyle, flex: '1 1 220px' }}
                />
                <input
                  type="url"
                  value={s.url ?? ''}
                  onChange={e => setSource(idx, 'url', e.target.value)}
                  placeholder="https://…"
                  disabled={disabled}
                  style={{ ...inputStyle, flex: '1 1 200px' }}
                />
                {!disabled && (
                  <button type="button" onClick={() => removeSource(idx)} style={iconTrashStyle}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
          {!disabled && (
            <button type="button" onClick={addSource} style={addRowBtnStyle}>
              <Plus size={13} /> Add source
            </button>
          )}
        </div>
      </SectionCard>

    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
// Local layout-only wrapper: uses the shared FieldLabel for the label itself,
// keeps hint-line rendering local since adminSectionPrimitives doesn't cover
// hints. Per decision 4.18, each field's hint was individually judged during
// this pass: folded into its placeholder, dropped, or kept standalone.

function Field({ label, hint, required, children, style: extraStyle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...extraStyle }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {hint && (
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
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