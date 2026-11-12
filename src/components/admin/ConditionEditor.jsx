

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

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, AlertTriangle, X, Undo2, Redo2, ChevronsDownUp, Smartphone } from 'lucide-react'
import { useConditionContext } from '../../context/ConditionContext'
import { useToast } from '../../context/ToastContext'
import TagInput from '../../components/admin/TagInput'
import BlockListEditor from '../../components/admin/BlockListEditor'
import { usePageUndoRedo } from '../../hooks/usePageUndoRedo'
import { clearRememberedState } from '../../hooks/useRememberedState'
import { useDirtyState } from '../../hooks/useDirtyState'
import { useLeaveWarning } from '../../hooks/useLeaveWarning'
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
import PhonePreviewModal from './PhonePreviewModal'
import ConfirmModal from './ConfirmModal'
import SpecialtySelector from '../conditions/SpecialtySelector'
import SpecialtiesBottomSheet from '../conditions/SpecialtiesBottomSheet'
import { CollapseAllContext } from './CollapseAllContext'
import { setPageTitle } from '../../utils/pageTitle'
import { foldLegacyBlocks } from '../../utils/foldLegacyBlocks'

// ─── Undo / Redo button ───────────────────────────────────────────────────────

function UndoRedoButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 32,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ─── Top-bar tool button (icon + short label) ─────────────────────────────────

function ToolButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 32, padding: '0 10px', whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
        cursor: 'pointer',
      }}
    >
      {children}
      <span className="cms-tool-label">{label}</span>
    </button>
  )
}

// ─── Text input ───────────────────────────────────────────────────────────────

function TextInput({ value, onChange, placeholder, disabled, dir, autoFocus }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      dir={dir}
      autoFocus={autoFocus}
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
    <div className="cms-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div className="cms-modal-sheet cms-sheet-scroll" style={{
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
              border: 'none', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
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

// ─── SaveFreeze ───────────────────────────────────────────────────────────────
// 2026-11-10: while a save runs, the whole page is frozen: no taps, no typing,
// no scrolling, no keyboard focus. A clear layer covers the screen and the
// page underneath is switched off ("inert"). Both go away the moment the save
// ends, whether it worked or failed.
function SaveFreeze() {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.inert = true
    document.activeElement?.blur?.()
    return () => { if (root) root.inert = false }
  }, [])

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        touchAction: 'none', cursor: 'progress',
        background: 'rgba(255,255,255,0.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 96,
      }}
      onTouchMove={e => e.preventDefault()}
      onWheel={e => e.preventDefault()}
    >
      <div style={{
        padding: '8px 18px', borderRadius: 99,
        background: 'var(--color-text-primary, #111)', color: '#fff',
        fontSize: 13, fontWeight: 600,
      }}>
        Saving…
      </div>
    </div>,
    document.body
  )
}

// ─── Switch tile (Published / Needs review) ──────────────────────────────────

function SwitchTile({ label, stateText, checked, onChange, onColor, disabled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{stateText}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => !disabled && onChange()}
        disabled={disabled}
        style={{
          width: 42, height: 24, borderRadius: 12, border: 'none',
          backgroundColor: checked ? onColor : 'var(--color-border)',
          position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )
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
  const [specialtySheetOpen,   setSpecialtySheetOpen]   = useState(false)
  const [removeSpecialtyAsk,   setRemoveSpecialtyAsk]   = useState(false)
  // 2026-11-09: top-bar tools. collapseSignal goes up by one on every "Collapse
  // all" press (see CollapseAllContext); previewOpen shows the phone preview.
  const [collapseSignal, setCollapseSignal] = useState(0)
  const [previewOpen,    setPreviewOpen]    = useState(false)
  const [taglineOpen,          setTaglineOpen]          = useState(false)

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

  // ─── Undo / Redo (this editing session only) ──────────────────────────────
  // 2026-11-09: covers what the Save button saves (details, blocks, tags).
  // Things saved instantly (library doses, adding a drug to the library, a new
  // specialty, image file uploads) are not part of it and are never undone.
  // The content area is rebuilt after an undo or a redo (restoreCount is its
  // key) because each drug row keeps its own working copy of its data and
  // would otherwise not show the restored values. 'view' remembers the open
  // tab and prescription sheet so the rebuild puts you back where you were.
  const [restoreCount, setRestoreCount] = useState(0)
  const [view, setView] = useState({ tab: 'rx', sheet: 0 })

  // 2026-11-10: undo and redo rebuild the content area, which used to jump the
  // page and close everything. The open blocks, rows and patient group tabs are
  // now remembered (see useRememberedState), and the scroll position of the
  // page (and of any scrolling panel around the content) is put back here.
  const contentRef = useRef(null)
  const savedScrollRef = useRef(null)

  function scrollersAround(el) {
    const found = []
    let node = el
    while (node && node !== document.body) {
      const oy = getComputedStyle(node).overflowY
      if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight) found.push(node)
      node = node.parentElement
    }
    return found
  }

  function restorePage(page) {
    savedScrollRef.current = {
      win: window.scrollY,
      els: scrollersAround(contentRef.current).map(el => [el, el.scrollTop]),
    }
    setForm(page.form)
    setBlocks(page.blocks)
    setTags(page.tags)
    setRestoreCount(c => c + 1)
  }

  useLayoutEffect(() => {
    const saved = savedScrollRef.current
    if (!saved) return undefined
    const apply = () => {
      window.scrollTo(0, saved.win)
      saved.els.forEach(([el, top]) => { el.scrollTop = top })
    }
    apply()
    const raf = requestAnimationFrame(apply)
    const t1 = setTimeout(apply, 80)
    const t2 = setTimeout(() => { apply(); savedScrollRef.current = null }, 300)
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2) }
  }, [restoreCount])

  // A fresh visit to the editor starts with everything closed.
  useEffect(() => {
    clearRememberedState()
    return clearRememberedState
  }, [id])

  const { canUndo, canRedo, undo, redo } = usePageUndoRedo({
    form, blocks, tags,
    ready: !loading,
    disabled: saving,
    onRestore: restorePage,
  })

  // ─── Unsaved-changes warning (2026-11-09) ─────────────────────────────────
  // 'savedPage' is the version last loaded or last saved. The page counts as
  // unsaved when it differs from that version, so undoing back to it clears
  // the warning, and a failed Save (which never updates it) keeps the warning.
  // A new empty condition starts out equal to its empty version, so it is not
  // unsaved until something is typed. While an existing condition is still
  // loading there is no saved version yet and nothing counts as unsaved.
  // Instant library saves are not part of the page, so they are not counted.
  const [savedPage, setSavedPage] = useState(
    isEdit ? null : { form: EMPTY_CONDITION, blocks: [], tags: [] }
  )
  const currentPage = useMemo(() => ({ form, blocks, tags }), [form, blocks, tags])
  const differsFromSaved = useDirtyState(savedPage, currentPage)
  const isUnsaved = !loading && savedPage !== null && differsFromSaved

  // Menu clicks, Sign out, browser Back, refresh and close (see useLeaveWarning).
  useLeaveWarning(isUnsaved)

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

      const loadedForm = {
        name:         data.name         ?? '',
        specialty_id: data.specialty_id ?? '',
        is_published: data.is_published ?? false,
        needs_review: data.needs_review ?? false,
        card_tagline: data.card_tagline ?? '',
      }
      setForm(loadedForm)

      // Older loose blocks are folded into the Rx-level and Review lists (2026-11-12).
      const loadedBlocks = foldLegacyBlocks(
        (data.condition_blocks ?? [])
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      )
      setBlocks(loadedBlocks)

      // Load existing condition tags
      const { data: tagNames } = await fetchTagsForCondition(id)
      const loadedTags = tagNames ?? []
      setTags(loadedTags)

      // The version just loaded is the starting 'saved' version.
      setSavedPage({ form: loadedForm, blocks: loadedBlocks, tags: loadedTags })

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

    // What is being saved right now. Anything typed while the save runs is
    // not in it, so it stays marked as unsaved.
    const pageBeingSaved = { form, blocks, tags }

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

    // Everything is stored now: this is the new 'saved' version.
    setSavedPage(pageBeingSaved)

    await refresh()
    setSaving(false)
    toast.success('Condition saved')

    // For new conditions, redirect to edit URL so subsequent saves work correctly
    if (!isEdit && conditionId) {
      navigate(`/admin/conditions/${conditionId}`, { replace: true })
    }
  }

  // ─── Specialty options ─────────────────────────────────────────────────────
  // The CMS specialty rows reshaped for the app's selector and bottom sheet.
  // A specialty just created in the mini-modal has no icon/colour fields yet,
  // so it gets the default stethoscope until it is edited in Specialties.

  const specialtyOptions = specialties.map(s => ({
    id:         s.id,
    name:       s.name_en,
    slug:       s.slug,
    iconType:   s.icon_type ?? 'lucide',
    iconValue:  s.icon_type === 'custom' ? s.icon_url : (s.icon_name ?? 'Stethoscope'),
    colorToken: s.color_token ?? null,
    sortOrder:  s.sort_order,
  }))
  const chosenSpecialty = form.specialty_id
    ? specialtyOptions.find(s => s.id === form.specialty_id) ?? null
    : null

  // The condition name shows in the phone top bar instead of "Conditions".
  useEffect(() => setPageTitle(form.name), [form.name])

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
      // Shows the condition's name as you type it; falls back to the old
      // wording while the name is still empty.
      title={form.name.trim() || (isEdit ? 'Edit condition' : 'New condition')}
      sticky
      actions={
        <div className="cms-editor-bar" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ToolButton label="Collapse all" onClick={() => setCollapseSignal(n => n + 1)}><ChevronsDownUp size={15} /></ToolButton>
          <ToolButton label="Phone preview" onClick={() => setPreviewOpen(true)}><Smartphone size={15} /></ToolButton>
          <UndoRedoButton label="Undo" onClick={undo} disabled={!canUndo}><Undo2 size={16} /></UndoRedoButton>
          <UndoRedoButton label="Redo" onClick={redo} disabled={!canRedo}><Redo2 size={16} /></UndoRedoButton>
        {isUnsaved && (
          <span
            role="status"
            aria-label="Unsaved changes"
            className="cms-only-phone"
            style={{
              flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
              backgroundColor: 'var(--color-warning)',
            }}
          />
        )}
        {isUnsaved && (
          <span
            role="status"
            className="cms-hide-phone"
            style={{
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              color: 'var(--color-warning)', fontFamily: 'var(--font-body)',
              padding: '0 var(--space-1)',
            }}
          >
            Unsaved changes
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!isUnsaved || !isValid() || saving}
          className="cms-push-right"
          style={{
            padding: '7px 18px', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 600, cursor: !isUnsaved || !isValid() || saving ? 'default' : 'pointer',
            border: 'none',
            backgroundColor: 'var(--color-accent-solid)',
            color: '#fff', fontFamily: 'var(--font-body)',
            opacity: !isUnsaved || !isValid() || saving ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        </div>
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

          {/* 2026-11-09 LAYOUT: two columns. Left: name, specialty, tagline (behind a
              button). Right: tags and the two switches as tidy tiles. The columns
              stack on a narrow screen. */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-5)',
            alignItems: 'start',
          }}>

            {/* ── Left column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
              <div>
                <FieldLabel required>Condition name</FieldLabel>
                <TextInput
                  value={form.name}
                  onChange={v => patch('name', v)}
                  placeholder="e.g. Peptic Ulcer Disease"
                  disabled={saving}
                />
              </div>

              {/* Specialty: the app's selector + bottom sheet. "New specialty" is
                  inside the sheet; clearing the choice asks first. */}
              <div>
                <div style={{ marginBottom: 'var(--space-1)' }}>
                  <FieldLabel required>Specialty</FieldLabel>
                </div>
                <div style={{ opacity: saving || specialtiesLoading ? 0.6 : 1, pointerEvents: saving || specialtiesLoading ? 'none' : 'auto' }}>
                  <SpecialtySelector
                    activeSpecialtyObj={chosenSpecialty}
                    idleLabel={specialtiesLoading ? 'Loading…' : 'Select specialty'}
                    onOpen={() => setSpecialtySheetOpen(true)}
                    onClear={() => setRemoveSpecialtyAsk(true)}
                    isOpen={specialtySheetOpen}
                  />
                </div>
              </div>

              {/* Tagline: hidden behind a button until it is wanted (or already filled in). */}
              {(taglineOpen || form.card_tagline) ? (
                <div onBlur={() => { if (!form.card_tagline) setTaglineOpen(false) }}>
                  <FieldLabel>Card tagline</FieldLabel>
                  <TextInput
                    value={form.card_tagline}
                    onChange={v => patch('card_tagline', v)}
                    placeholder="Short italic subtitle on the card (optional)"
                    disabled={saving}
                    autoFocus={taglineOpen && !form.card_tagline}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTaglineOpen(true)}
                  disabled={saving}
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 13, fontWeight: 500, color: 'var(--color-accent)',
                    background: 'none', border: 'none', padding: '2px 0',
                    cursor: saving ? 'default' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  <Plus size={14} />
                  Add tagline
                </button>
              )}
            </div>

            {/* ── Right column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
              <div>
                <FieldLabel>Tags</FieldLabel>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder="Type tag, press Enter — or pick from list"
                  disabled={saving}
                  suggestions={allTags}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
                <SwitchTile
                  label="Published"
                  stateText={form.is_published ? 'Visible in app' : 'Draft'}
                  checked={form.is_published}
                  onChange={() => patch('is_published', !form.is_published)}
                  onColor="var(--color-accent)"
                  disabled={saving}
                />
                {/* Needs Review — F10 Batch B / D32. Flags a condition as
                    incomplete without unpublishing it; feeds the Content Health
                    score in the Analytics dashboard. */}
                <SwitchTile
                  label="Needs review"
                  stateText={form.needs_review ? 'Flagged — incomplete' : 'Complete'}
                  checked={form.needs_review}
                  onChange={() => patch('needs_review', !form.needs_review)}
                  onColor="var(--color-warning)"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

        </SectionCard>

        {/* ── Content Blocks card ────────────────────────────────────────── */}
        {/* Phase 3.1: same card treatment. BlockListEditor renders flat inside. */}
        <SectionCardHeader>Content Blocks</SectionCardHeader>
        <SectionCard>
          <CollapseAllContext.Provider value={collapseSignal}>
          <div ref={contentRef}>
          <BlockListEditor
            key={restoreCount}
            blocks={blocks}
            onChange={setBlocks}
            disabled={saving}
            initialTab={view.tab}
            initialSheetIndex={view.sheet}
            onViewChange={(tab, sheet) => setView(prev => (prev.tab === tab && prev.sheet === sheet ? prev : { tab, sheet }))}
          />
          </div>
          </CollapseAllContext.Provider>
        </SectionCard>

      {saving && <SaveFreeze />}

      {/* ── Phone preview (what the app shows for what is on screen now) ──── */}
      <PhonePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        name={form.name}
        blocks={blocks}
      />

      <SpecialtiesBottomSheet
        specialties={specialtyOptions}
        activeSpecialty={form.specialty_id || ''}
        onSelect={id => patch('specialty_id', id)}
        onClose={() => setSpecialtySheetOpen(false)}
        isOpen={specialtySheetOpen}
        allowAll={false}
        onAdd={() => setNewSpecialtyOpen(true)}
        zIndex={600}
      />

      <ConfirmModal
        isOpen={removeSpecialtyAsk}
        onClose={() => setRemoveSpecialtyAsk(false)}
        onConfirm={() => { patch('specialty_id', ''); setRemoveSpecialtyAsk(false) }}
        title="Remove specialty?"
        message={chosenSpecialty
          ? `"${form.name.trim() || 'This condition'}" will have no specialty. It cannot be saved until you pick one.`
          : ''}
        confirmLabel="Remove"
        confirmVariant="danger"
      />

      {/* ── Inline specialty creator ──────────────────────────────────────── */}
      <NewSpecialtyModal
        isOpen={newSpecialtyOpen}
        onClose={() => setNewSpecialtyOpen(false)}
        onCreated={handleSpecialtyCreated}
      />

    </AdminPageHeader>
  )
}


