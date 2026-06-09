/**
 * src/pages/admin/ConditionFormModal.jsx
 * Phase 3B — Create / edit a condition via a proper modal (no window.prompt).
 *
 * Props:
 *   isOpen       boolean
 *   onClose      () => void
 *   onSaved      (condition) => void   — called after successful save
 *   condition    object | null         — null = create mode, object = edit mode
 *   specialties  { id, name }[]
 */

import { useState, useEffect } from 'react'
import Modal from '../../components/admin/Modal'
import { useToast } from '../../context/ToastContext'
import { useDirtyState } from '../../hooks/useDirtyState'
import { insertCondition, updateCondition, touchAppMetadata } from '../../lib/adminQueries'

const EMPTY = {
  name_en:     '',
  name_ar:     '',
  specialty_id: '',
  card_tagline: '',
  definition:  '',
  icd10_code:  '',
  is_published: true,
}

function toForm(condition) {
  if (!condition) return EMPTY
  return {
    name_en:      condition.name      ?? '',
    name_ar:      condition.nameAr    ?? '',
    specialty_id: condition.specialtyId ?? '',
    card_tagline: condition.cardTagline ?? '',
    definition:   condition.definition  ?? '',
    icd10_code:   condition.icd10Code   ?? '',
    is_published: condition.isPublished ?? true,
  }
}

export default function ConditionFormModal({ isOpen, onClose, onSaved, condition, specialties = [] }) {
  const { toast } = useToast()
  const isEdit = Boolean(condition?.id)

  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  // Initialise / reset form when modal opens or condition changes
  useEffect(() => {
    if (isOpen) {
      setForm(toForm(condition))
      setErrors({})
    }
  }, [isOpen, condition])

  const savedSnapshot = isEdit ? toForm(condition) : EMPTY
  const isDirty = useDirtyState(savedSnapshot, form)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name_en.trim()) e.name_en = 'Name is required'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)

    const payload = {
      name:         form.name_en.trim(),
      name_ar:      form.name_ar.trim() || null,
      specialty_id: form.specialty_id || null,
      card_tagline: form.card_tagline.trim() || null,
      definition:   form.definition.trim()   || null,
      icd10_code:   form.icd10_code.trim()   || null,
      is_published: form.is_published,
    }

    let result
    if (isEdit) {
      result = await updateCondition(condition.id, payload)
    } else {
      result = await insertCondition(payload)
    }

    if (result.error) {
      toast.error(result.error.message ?? 'Save failed')
      setSaving(false)
      return
    }

    // Invalidate cache so app picks up the change
    await touchAppMetadata('conditions_updated_at')

    toast.success(isEdit ? 'Condition updated' : 'Condition created')
    setSaving(false)
    onSaved(result.data ?? { id: condition?.id, ...payload })
    onClose()
  }

  function handleClose() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Condition' : 'New Condition'}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* Name EN */}
        <Field label="Name (English)" required error={errors.name_en}>
          <input
            type="text"
            value={form.name_en}
            onChange={e => set('name_en', e.target.value)}
            placeholder="e.g. Hypertension"
            style={inputStyle(errors.name_en)}
          />
        </Field>

        {/* Name AR */}
        <Field label="Name (Arabic)">
          <input
            type="text"
            dir="rtl"
            value={form.name_ar}
            onChange={e => set('name_ar', e.target.value)}
            placeholder="الاسم بالعربية"
            style={inputStyle()}
          />
        </Field>

        {/* Specialty */}
        <Field label="Specialty">
          <select
            value={form.specialty_id}
            onChange={e => set('specialty_id', e.target.value)}
            style={inputStyle()}
          >
            <option value="">— Uncategorized —</option>
            {specialties.map(s => (
              <option key={s.id} value={s.id}>{s.name_en}</option>
            ))}
          </select>
        </Field>

        {/* Card tagline */}
        <Field label="Card Tagline" hint="Short one-line summary shown on condition cards">
          <input
            type="text"
            value={form.card_tagline}
            onChange={e => set('card_tagline', e.target.value)}
            placeholder="e.g. Persistently elevated blood pressure ≥ 140/90 mmHg"
            style={inputStyle()}
          />
        </Field>

        {/* ICD-10 */}
        <Field label="ICD-10 Code">
          <input
            type="text"
            value={form.icd10_code}
            onChange={e => set('icd10_code', e.target.value.toUpperCase())}
            placeholder="e.g. I10"
            style={{ ...inputStyle(), maxWidth: 140 }}
          />
        </Field>

        {/* Definition */}
        <Field label="Definition">
          <textarea
            value={form.definition}
            onChange={e => set('definition', e.target.value)}
            placeholder="Brief clinical definition…"
            rows={3}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }}
          />
        </Field>

        {/* Published toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label style={{
            position: 'relative', display: 'inline-block',
            width: 40, height: 22, flexShrink: 0,
          }}>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={e => set('is_published', e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', inset: 0,
              backgroundColor: form.is_published ? 'var(--color-success)' : 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}>
              <span style={{
                position: 'absolute',
                top: 3, left: form.is_published ? 21 : 3,
                width: 16, height: 16,
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {form.is_published ? 'Published — visible in app' : 'Draft — hidden from app'}
          </span>
        </div>

        {/* Footer buttons */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          gap: 'var(--space-2)', paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border)',
          marginTop: 'var(--space-2)',
        }}>
          <button onClick={handleClose} disabled={saving} style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={saveBtnStyle(isDirty, saving)}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Condition'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 13, fontWeight: 600,
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
        marginBottom: 'var(--space-1)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>}
      </label>
      {hint && (
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)', marginBottom: 'var(--space-1)',
        }}>
          {hint}
        </div>
      )}
      {children}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4, fontFamily: 'var(--font-body)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function inputStyle(error) {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    outline: 'none',
  }
}

const cancelBtnStyle = {
  padding: '9px 18px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 14, fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

function saveBtnStyle(isDirty, saving) {
  return {
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: 14, fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: saving ? 'default' : 'pointer',
    opacity: saving ? 0.7 : 1,
    boxShadow: isDirty ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none',
    transition: 'box-shadow 0.2s',
  }
}



================================================