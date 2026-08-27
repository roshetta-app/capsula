

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
import { Plus, AlertTriangle, X } from 'lucide-react'
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

import { SectionCard, SectionCardHeader, FieldLabel } from './adminSectionPrimitives'
import AdminPageHeader from './AdminPageHeader'

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

// BUG FIX (2026-08-09): the slug is regenerated from the name on every
// save, but nothing checked whether another condition already used that
// slug before hitting the database — so a rename that happened to collide
// with an existing condition's slug failed with Postgres's raw
// "duplicate key value violates unique constraint 'conditions_slug_key'"
// message, shown to the admin verbatim (they don't code and have no way
// to know what a "unique constraint" is). This translates that one known
// error into a plain message; every other error still passes through
// unchanged.
function friendlySaveError(err) {
  const isSlugCollision =
    err?.code === '23505' &&
    (err?.message?.includes('conditions_slug_key') || err?.details?.includes('slug'))
  if (isSlugCollision) {
    return 'Another condition already uses this name. Please choose a different name.'
  }
  return err?.message ?? 'Save failed'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_CONDITION = {
  name:         '',
  specialty_id: '',
  is_published: false,
  needs_review: false, // F10 Batch B / D32 — flags a published condition as incomplete without unpublishing it
  card_tagline: '',
}

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
        is_published: data.is_published ?? false,
        needs_review: data.needs_review ?? false,
        card_tagline: data.card_tagline ?? '',
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
    return form.name.trim() && form.specialty_id
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
      is_published: form.is_published,
      needs_review: form.needs_review,
      card_tagline: form.card_tagline.trim() || null,
    }

    let conditionId = id   // undefined for new conditions

    if (isEdit) {
      const { error } = await updateCondition(id, payload)
      if (error) {
        setError(friendlySaveError(error))
        setSaving(false)
        return
      }
    } else {
      const { data: newRow, error } = await insertCondition(payload)
      if (error || !newRow) {
        setError(friendlySaveError(error))
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
      <AdminPageHeader title="Loading…">
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
      </AdminPageHeader>
    )
  }

  return (
    <AdminPageHeader
      title={isEdit ? 'Edit condition' : 'New condition'}
      actions={
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
      }
    >
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

          {/* Specialty: dropdown + inline "New" button */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
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

          {/* Published toggle — matches the switch style used in Formulation Editor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <FieldLabel>Published</FieldLabel>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_published}
              onClick={() => !saving && patch('is_published', !form.is_published)}
              disabled={saving}
              style={{
                width: 42, height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: form.is_published ? 'var(--color-accent)' : 'var(--color-border)',
                position: 'relative', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3, left: form.is_published ? 21 : 3,
                width: 18, height: 18,
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {form.is_published ? 'Visible in app' : 'Draft'}
            </span>
          </div>

          {/* Needs Review toggle — F10 Batch B / D32. Same switch style as
              Published above; flags a condition as incomplete/in-progress
              without unpublishing it, mirroring the brands table's
              needs_review column. Feeds the Content Health score in the
              Analytics dashboard. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <FieldLabel>Needs Review</FieldLabel>
            <button
              type="button"
              role="switch"
              aria-checked={form.needs_review}
              onClick={() => !saving && patch('needs_review', !form.needs_review)}
              disabled={saving}
              style={{
                width: 42, height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: form.needs_review ? 'var(--color-warning)' : 'var(--color-border)',
                position: 'relative', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3, left: form.needs_review ? 21 : 3,
                width: 18, height: 18,
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {form.needs_review ? 'Flagged — counts as incomplete' : 'Complete'}
            </span>
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

      {/* ── Inline specialty creator ──────────────────────────────────────── */}
      <NewSpecialtyModal
        isOpen={newSpecialtyOpen}
        onClose={() => setNewSpecialtyOpen(false)}
        onCreated={handleSpecialtyCreated}
      />

    </AdminPageHeader>
  )
}


