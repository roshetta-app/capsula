/**
 * ConditionEditor — /admin/conditions/new  OR  /admin/conditions/:id
 *
 * Fixes applied:
 *  1. Specialties fetched directly via fetchSpecialtiesForCMS() — no longer derived
 *     from ConditionContext (which had wrong field name: .name_en vs .name).
 *  2. Inline "＋ New specialty" mini-modal so admins never leave this page.
 *  3. ConditionFormModal eliminated — ConditionsCMS "Add New" now routes here.
 *
 * Phase 3 changes (page chrome + declutter):
 *  - Identity fields and Content Blocks each wrapped in a surface card
 *    (white card on tinted --color-bg backdrop — Decision 3, Option B).
 *  - SectionTitle usage inside <main> replaced with SectionCardHeader above each card.
 *  - Helper <p> text under Tags field removed (Decision 4).
 *  - Helper <p> text inside NewSpecialtyModal removed (Decision 4).
 *  - No nested boxes within cards — flat field layout unchanged.
 *  - Tab chrome (3.3) deferred: lives in BlockListEditor / PrescriptionSheetEditor,
 *    not in this file.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, AlertTriangle, X } from 'lucide-react'
import { useConditionContext } from '../../context/ConditionContext'
import { useToast } from '../../context/ToastContext'
import TagInput from '../../components/admin/TagInput'
import BlockListEditor from '../../components/admin/BlockListEditor'
import {
  insertCondition,
  updateCondition,
  fetchConditionForEdit,
  saveConditionBlocks,
  fetchSpecialtiesForCMS,
  insertSpecialty,
  fetchAllTags,
  fetchTagsForCondition,
  syncConditionTags,
} from '../../lib/adminQueries'

// ─── Section card header ──────────────────────────────────────────────────────
// Renders the bold uppercase label that sits directly above each section card.
// Replaces SectionTitle inside <main> — label is now outside the card, not
// inside it, so the card's padding stays clean with no top-margin offset.

function SectionCardHeader({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
      marginBottom: 'var(--space-2)',
    }}>
      {children}
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
// One white card per major section, sits on the tinted --color-bg backdrop.
// No nested borders inside — content is rendered flat within this single shell.

function SectionCard({ children, style }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-card)',
      ...style,
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

// ─── Quick-create specialty mini-modal ────────────────────────────────────────
// Lets admins add a new specialty without leaving the condition editor.

function NewSpecialtyModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState(null)

  useEffect(() => {
    if (isOpen) { setName(''); setErr(null) }
  }, [isOpen])

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setErr(null)

    const slug = toSlug(trimmed)
    const { data, error } = await insertSpecialty({
      name_en:    trimmed,
      slug,
      icon_name:  'fa-stethoscope',
      color_hex:  '#DBEAFE',
      sort_order: 99,
      is_active:  true,
    })

    setBusy(false)
    if (error) { setErr(error.message ?? 'Failed to create specialty'); return }

    // data is { id, slug } from insertSpecialty's .select('id, slug')
    onCreated({ id: data.id, name_en: trimmed, slug: data.slug })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        width: '100%', maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
            New Specialty
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FieldLabel required>Name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Gastroenterology"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {/* Phase 3.4: helper text removed — placeholder carries the hint */}
        </div>

        {err && (
          <div style={{
            fontSize: 13, color: '#DC2626', marginBottom: 'var(--space-3)',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: '8px 12px',
            fontFamily: 'var(--font-body)',
          }}>
            {err}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || busy}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: !name.trim() || busy ? 'default' : 'pointer',
              opacity: !name.trim() || busy ? 0.6 : 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            {busy ? 'Creating…' : 'Create Specialty'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Slug helper ──────────────────────────────────────────────────────────────
//
// Converts a condition name to a URL-safe slug.
// For purely non-Latin names (Arabic, etc.) the standard regex strips
// everything and produces an empty slug which breaks routing.
// This helper falls back to a short random suffix so the slug is
// always non-empty and URL-safe.
//
// Examples:
//   "Fungal Infection"  -> "fungal-infection"
//   Arabic-only name   -> "cond-x4k9"
//   Mixed "Tinea"      -> "tinea"

function toSlug(name) {
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (latin.length >= 2) return latin

  const suffix = Math.random().toString(36).slice(2, 6)
  return `cond-${suffix}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_CONDITION = {
  name:         '',
  specialty_id: '',
  age_group:    'adult',
  is_published: false,
  card_tagline: '',
  icd10_code:   '',
}

const AGE_GROUP_OPTIONS = [
  { value: 'adult',     label: 'Adult' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'both',      label: 'Both (all ages)' },
]

export default function ConditionEditor() {
  const { id }    = useParams()
  const isEdit    = Boolean(id)
  const navigate  = useNavigate()

  // ── FIX: fetch specialties directly — context only used for public cache refresh
  const { refresh } = useConditionContext()
  const { toast }   = useToast()
  const [specialties,          setSpecialties]          = useState([])
  const [specialtiesLoading,   setSpecialtiesLoading]   = useState(true)
  const [newSpecialtyOpen,     setNewSpecialtyOpen]     = useState(false)

  useEffect(() => {
    fetchSpecialtiesForCMS().then(({ data }) => {
      setSpecialties(data ?? [])
      setSpecialtiesLoading(false)
    })
    fetchAllTags().then(({ data }) => setAllTags(data ?? []))
  }, [])

  // Called when a new specialty is created from the mini-modal
  function handleSpecialtyCreated(newSpecialty) {
    setSpecialties(prev => [...prev, newSpecialty])
    patch('specialty_id', newSpecialty.id)
  }

  const [form,    setForm]    = useState(EMPTY_CONDITION)
  const [blocks,  setBlocks]  = useState([])
  const [tags,    setTags]    = useState([])
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

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
        name:         data.name         ?? '',
        specialty_id: data.specialty_id ?? '',
        age_group:    data.age_group    ?? 'adult',
        is_published: data.is_published ?? false,
        card_tagline: data.card_tagline ?? '',
        icd10_code:   data.icd10_code   ?? '',
      })

      setBlocks(
        (data.condition_blocks ?? [])
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      )

      // Load existing condition tags
      const { data: tagNames } = await fetchTagsForCondition(id)
      setTags(tagNames ?? [])

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

    const slug = toSlug(form.name.trim())

    const payload = {
      name:         form.name.trim(),
      slug,
      specialty_id: form.specialty_id,
      age_group:    form.age_group,
      is_published: form.is_published,
      card_tagline: form.card_tagline.trim() || null,
      icd10_code:   form.icd10_code.trim()   || null,
    }

    let conditionId = id   // undefined for new conditions

    if (isEdit) {
      const { error } = await updateCondition(id, payload)
      if (error) {
        setError(error.message ?? 'Save failed')
        setSaving(false)
        return
      }
    } else {
      const { data: newRow, error } = await insertCondition(payload)
      if (error || !newRow) {
        setError(error?.message ?? 'Save failed')
        setSaving(false)
        return
      }
      conditionId = newRow.id
    }

    // Save blocks (delete + insert) — always runs, even if blocks is empty
    const { error: blocksErr } = await saveConditionBlocks(conditionId, blocks)
    if (blocksErr) {
      setError(blocksErr.message ?? 'Condition saved but blocks failed to save')
      setSaving(false)
      return
    }

    // Sync tags — always runs (clears existing, inserts selected)
    const { error: tagsErr } = await syncConditionTags(conditionId, tags)
    if (tagsErr) {
      setError(tagsErr.message ?? 'Condition saved but tags failed to save')
      setSaving(false)
      return
    }

    await refresh()
    setSaving(false)
    toast.success('Condition saved')

    // For new conditions, redirect to edit URL so subsequent saves work correctly
    if (!isEdit && conditionId) {
      navigate(`/admin/conditions/${conditionId}`, { replace: true })
    }
  }

  // ─── Specialty options ─────────────────────────────────────────────────────
  // FIX: use name_en (correct field from fetchSpecialtiesForCMS) not name

  const specialtyOptions = [
    { value: '', label: specialtiesLoading ? 'Loading…' : 'Select specialty…' },
    ...specialties.map(s => ({ value: s.id, label: s.name_en })),
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

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
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
            disabled={!isValid() || saving}
            style={{
              padding: '7px 18px', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600, cursor: !isValid() || saving ? 'default' : 'pointer',
              border: 'none',
              backgroundColor: 'var(--color-accent)',
              color: '#fff', fontFamily: 'var(--font-body)',
              opacity: !isValid() || saving ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
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

        {/* ── Identity card ──────────────────────────────────────────────── */}
        {/* Phase 3.1: white card on tinted backdrop. Label above card, not inside. */}
        <SectionCardHeader>Identity</SectionCardHeader>
        <SectionCard style={{ marginBottom: 'var(--space-5)' }}>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FieldLabel required>Condition name</FieldLabel>
            <TextInput
              value={form.name}
              onChange={v => patch('name', v)}
              placeholder="e.g. Peptic Ulcer Disease"
              disabled={saving}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FieldLabel>Card tagline</FieldLabel>
            <TextInput
              value={form.card_tagline}
              onChange={v => patch('card_tagline', v)}
              placeholder="Short italic subtitle on the card (optional)"
              disabled={saving}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FieldLabel>Tags</FieldLabel>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Type tag, press Enter — or pick from list"
              disabled={saving}
              suggestions={allTags}
            />
            {/* Phase 3.4: helper text removed — placeholder carries the hint */}
          </div>

          {/* Specialty row: dropdown + inline "New" button */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                <FieldLabel required>Specialty</FieldLabel>
                <button
                  onClick={() => setNewSpecialtyOpen(true)}
                  disabled={saving}
                  title="Create a new specialty"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 12, fontWeight: 500, color: 'var(--color-accent)',
                    background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer',
                    fontFamily: 'var(--font-body)', padding: '2px 0',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  <Plus size={13} />
                  New
                </button>
              </div>
              <Select
                value={form.specialty_id}
                onChange={v => patch('specialty_id', v)}
                options={specialtyOptions}
                disabled={saving || specialtiesLoading}
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

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>ICD-10 code</FieldLabel>
              <TextInput
                value={form.icd10_code}
                onChange={v => patch('icd10_code', v)}
                placeholder="e.g. K25"
                disabled={saving}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <FieldLabel>Published</FieldLabel>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: saving ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={e => patch('is_published', e.target.checked)}
                  disabled={saving}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {form.is_published ? 'Visible in app' : 'Draft'}
                </span>
              </label>
            </div>
          </div>

        </SectionCard>

        {/* ── Content Blocks card ────────────────────────────────────────── */}
        {/* Phase 3.1: same card treatment. BlockListEditor renders flat inside. */}
        <SectionCardHeader>Content Blocks</SectionCardHeader>
        <SectionCard>
          <BlockListEditor
            blocks={blocks}
            onChange={setBlocks}
            disabled={saving}
          />
        </SectionCard>

      </main>

      {/* ── Inline specialty creator ──────────────────────────────────────── */}
      <NewSpecialtyModal
        isOpen={newSpecialtyOpen}
        onClose={() => setNewSpecialtyOpen(false)}
        onCreated={handleSpecialtyCreated}
      />

    </div>
  )
}
