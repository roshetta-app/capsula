/**
 * ConditionEditor — /admin/conditions/new  OR  /admin/conditions/:id
 *
 * Create or edit a condition's metadata (no prescriptions yet — Session 5.5).
 * Uses ConditionContext for specialties list.
 * Calls insertCondition / updateCondition + image management from adminQueries.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, AlertTriangle, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react'
import { useConditionContext } from '../../context/ConditionContext'
import TagInput from '../../components/admin/TagInput'
import {
  insertCondition,
  updateCondition,
  fetchConditionForEdit,
  insertConditionImage,
  deleteConditionImage,
  uploadConditionImage,
} from '../../lib/adminQueries'

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
      marginBottom: 'var(--space-3)', marginTop: 'var(--space-5)',
      borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)',
    }}>
      {children}
    </div>
  )
}

// ─── Field label ─────────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: 'block', fontSize: 13, fontWeight: 600,
      color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)',
    }}>
      {children}{required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
    </label>
  )
}

// ─── Text input ───────────────────────────────────────────────────────────────

function TextInput({ value, onChange, placeholder, disabled, dir }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      dir={dir}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 14, fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        outline: 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

function Textarea({ value, onChange, placeholder, disabled, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      dir="auto"
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 14, fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        resize: 'vertical', outline: 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────

function Select({ value, onChange, options, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 14, fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        outline: 'none', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        appearance: 'auto',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Investigations list ─────────────────────────────────────────────────────

function InvestigationList({ items, onChange, disabled }) {
  function addRow() {
    onChange([...items, { test: '', note: '' }])
  }
  function removeRow(i) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  function patchRow(i, field, val) {
    const next = items.map((row, idx) => idx === i ? { ...row, [field]: val } : row)
    onChange(next)
  }

  return (
    <div>
      {items.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'flex-start' }}>
          <div style={{ flex: 2 }}>
            <input
              type="text"
              value={row.test}
              onChange={e => patchRow(i, 'test', e.target.value)}
              placeholder="Test name"
              disabled={disabled}
              dir="auto"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                fontSize: 13, fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 3 }}>
            <input
              type="text"
              value={row.note}
              onChange={e => patchRow(i, 'note', e.target.value)}
              placeholder="Note (optional)"
              disabled={disabled}
              dir="auto"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                fontSize: 13, fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={() => removeRow(i)}
            disabled={disabled}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--radius-md)',
              border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
              color: '#DC2626', cursor: disabled ? 'default' : 'pointer',
              marginTop: 1,
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          padding: '6px 14px', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
          border: '1.5px dashed var(--color-border)',
          backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <Plus size={14} />
        Add investigation
      </button>
    </div>
  )
}

// ─── Image manager ────────────────────────────────────────────────────────────

function ImageManager({ images, conditionId, onChange, disabled }) {
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [urlInput, setUrlInput]     = useState('')

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !conditionId) return
    setUploading(true)
    setUploadError(null)

    const { url, error } = await uploadConditionImage(file)
    if (error) {
      setUploadError(error.message ?? 'Upload failed')
      setUploading(false)
      return
    }

    const { data: imgRow, error: insertErr } = await insertConditionImage({
      condition_id: conditionId,
      url,
      caption: '',
      sort_order: images.length,
    })

    if (insertErr) {
      setUploadError(insertErr.message ?? 'Failed to save image record')
    } else {
      onChange([...images, { id: imgRow.id, url, caption: '', sort_order: images.length }])
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleUrlAdd() {
    const url = urlInput.trim()
    if (!url || !conditionId) return
    setUploadError(null)

    const { data: imgRow, error } = await insertConditionImage({
      condition_id: conditionId,
      url,
      caption: '',
      sort_order: images.length,
    })

    if (error) {
      setUploadError(error.message ?? 'Failed to save image')
    } else {
      onChange([...images, { id: imgRow.id, url, caption: '', sort_order: images.length }])
      setUrlInput('')
    }
  }

  async function handleDelete(imgId) {
    const { error } = await deleteConditionImage(imgId)
    if (!error) {
      onChange(images.filter(i => i.id !== imgId))
    }
  }

  function updateCaption(imgId, caption) {
    onChange(images.map(i => i.id === imgId ? { ...i, caption } : i))
  }

  const canManage = !!conditionId

  return (
    <div>
      {!canManage && (
        <div style={{
          fontSize: 13, color: 'var(--color-text-tertiary)',
          backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}>
          Save the condition first to enable image management.
        </div>
      )}

      {/* Existing images */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {images.map(img => (
            <div key={img.id} style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            }}>
              <img
                src={img.url} alt={img.caption || 'Condition image'}
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                onError={e => { e.target.style.display = 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  value={img.caption || ''}
                  onChange={e => updateCaption(img.id, e.target.value)}
                  placeholder="Caption (optional)"
                  dir="auto"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                    border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={() => handleDelete(img.id)}
                disabled={disabled}
                aria-label="Remove image"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, flexShrink: 0, borderRadius: 'var(--radius-md)',
                  border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                  color: '#DC2626', cursor: disabled ? 'default' : 'pointer',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload controls */}
      {canManage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* File upload */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: '8px 14px', borderRadius: 'var(--radius-md)', width: 'fit-content',
            fontSize: 13, fontWeight: 500, cursor: uploading || disabled ? 'default' : 'pointer',
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
          }}>
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload image'}
            <input
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={handleFileUpload} disabled={uploading || disabled}
            />
          </label>

          {/* URL input */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Or paste image URL…"
              disabled={disabled}
              style={{
                flex: 1, padding: '8px 12px',
                border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                fontSize: 13, fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleUrlAdd}
              disabled={!urlInput.trim() || disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                fontSize: 13, fontWeight: 500,
                cursor: !urlInput.trim() || disabled ? 'default' : 'pointer',
                border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
                fontFamily: 'var(--font-body)',
                opacity: !urlInput.trim() || disabled ? 0.5 : 1,
              }}
            >
              <ImageIcon size={14} />
              Add
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
          marginTop: 'var(--space-2)', fontSize: 13, color: '#DC2626',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {uploadError}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_CONDITION = {
  name:                '',
  specialty_id:        '',
  age_group:           'adult',
  clinical_picture:    '',
  history_questions:   [],
  examination:         [],
  investigations:      [],
  patient_instructions: '',
}

const AGE_GROUP_OPTIONS = [
  { value: 'adult',     label: 'Adult' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'both',      label: 'Both (all ages)' },
]

export default function ConditionEditor() {
  const { id }           = useParams()
  const isEdit           = Boolean(id)
  const navigate         = useNavigate()
  const { specialties, refresh } = useConditionContext()

  const [form,     setForm]     = useState(EMPTY_CONDITION)
  const [images,   setImages]   = useState([])
  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(false)

  // ─── Load existing condition (edit mode) ──────────────────────────────────

  useEffect(() => {
    if (!isEdit) return

    async function load() {
      const { data, error: fetchErr } = await fetchConditionForEdit(id)
      if (fetchErr || !data) {
        setError(fetchErr?.message ?? 'Condition not found')
        setLoading(false)
        return
      }

      setForm({
        name:                 data.name              ?? '',
        specialty_id:         data.specialty_id      ?? '',
        age_group:            data.age_group         ?? 'adult',
        clinical_picture:     data.clinical_picture  ?? '',
        history_questions:    data.history_questions ?? [],
        examination:          data.examination       ?? [],
        investigations:       data.investigations    ?? [],
        patient_instructions: data.patient_instructions ?? '',
      })

      setImages(
        (data.condition_images ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
      )

      setLoading(false)
    }

    load()
  }, [id, isEdit])

  // ─── Patch helper ─────────────────────────────────────────────────────────

  function patch(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  function isValid() {
    return form.name.trim() && form.specialty_id && form.age_group
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError(null)
    setSaving(true)

    const slug = form.name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const payload = {
      name:                 form.name.trim(),
      slug,
      specialty_id:         form.specialty_id,
      age_group:            form.age_group,
      clinical_picture:     form.clinical_picture.trim() || null,
      history_questions:    form.history_questions,
      examination:          form.examination,
      investigations:       form.investigations,
      patient_instructions: form.patient_instructions.trim() || null,
    }

    let saveErr
    if (isEdit) {
      const { error } = await updateCondition(id, payload)
      saveErr = error
    } else {
      const { error } = await insertCondition(payload)
      saveErr = error
    }

    if (saveErr) {
      setError(saveErr.message ?? 'Save failed')
      setSaving(false)
      return
    }

    await refresh()
    setSuccess(true)
    setSaving(false)

    setTimeout(() => {
      navigate('/admin/conditions')
    }, 800)
  }

  // ─── Specialty options ─────────────────────────────────────────────────────

  const specialtyOptions = [
    { value: '', label: 'Select specialty…' },
    ...specialties.map(s => ({ value: s.id, label: s.name })),
  ]

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)',
        color: 'var(--color-text-tertiary)', fontSize: 14,
      }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
    }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              onClick={() => navigate('/admin/conditions')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <ChevronLeft size={16} />
              Conditions
            </button>
            <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {isEdit ? 'Edit condition' : 'New condition'}
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid() || saving || success}
            style={{
              padding: '7px 18px', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600, cursor: !isValid() || saving || success ? 'default' : 'pointer',
              border: 'none',
              backgroundColor: success ? 'var(--color-instock)' : 'var(--color-accent)',
              color: '#fff', fontFamily: 'var(--font-body)',
              opacity: !isValid() || saving ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              transition: 'background-color 0.2s ease',
            }}
          >
            {success ? <><CheckCircle size={14} /> Saved</> : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-4) var(--space-4) var(--space-12)' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* ── Identity ───────────────────────────────────────────────────── */}

        <SectionTitle>Identity</SectionTitle>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel required>Condition name</FieldLabel>
          <TextInput
            value={form.name}
            onChange={v => patch('name', v)}
            placeholder="e.g. Peptic Ulcer Disease"
            disabled={saving}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <FieldLabel required>Specialty</FieldLabel>
            <Select
              value={form.specialty_id}
              onChange={v => patch('specialty_id', v)}
              options={specialtyOptions}
              disabled={saving}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel required>Age group</FieldLabel>
            <Select
              value={form.age_group}
              onChange={v => patch('age_group', v)}
              options={AGE_GROUP_OPTIONS}
              disabled={saving}
            />
          </div>
        </div>

        {/* ── Clinical data ──────────────────────────────────────────────── */}

        <SectionTitle>Clinical Data</SectionTitle>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel>Clinical picture</FieldLabel>
          <Textarea
            value={form.clinical_picture}
            onChange={v => patch('clinical_picture', v)}
            placeholder="Describe the typical clinical presentation…"
            disabled={saving}
            rows={4}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel>History questions</FieldLabel>
          <TagInput
            tags={form.history_questions}
            onChange={v => patch('history_questions', v)}
            placeholder="Type question, press Enter"
            disabled={saving}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel>Examination findings</FieldLabel>
          <TagInput
            tags={form.examination}
            onChange={v => patch('examination', v)}
            placeholder="Type finding, press Enter"
            disabled={saving}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel>Investigations</FieldLabel>
          <InvestigationList
            items={form.investigations}
            onChange={v => patch('investigations', v)}
            disabled={saving}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel>Patient instructions</FieldLabel>
          <Textarea
            value={form.patient_instructions}
            onChange={v => patch('patient_instructions', v)}
            placeholder="Instructions for the patient…"
            disabled={saving}
            rows={3}
          />
        </div>

        {/* ── Images ─────────────────────────────────────────────────────── */}

        <SectionTitle>Images</SectionTitle>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ImageManager
            images={images}
            conditionId={isEdit ? id : null}
            onChange={setImages}
            disabled={saving}
          />
        </div>

        {/* ── Prescriptions stub ─────────────────────────────────────────── */}

        <SectionTitle>Prescriptions</SectionTitle>
        <div style={{
          backgroundColor: 'var(--color-bg)',
          border: '1.5px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 13,
        }}>
          Prescription builder — Session 5.5
        </div>

      </main>
    </div>
  )
}
