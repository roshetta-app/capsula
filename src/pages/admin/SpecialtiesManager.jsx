/**
 * src/pages/admin/SpecialtiesManager.jsx
 *
 * Fixes applied:
 *  1. Toast API unified — was `showToast(msg, type)`, now `toast.success/error(msg)`
 *     matching the rest of the admin codebase. This was preventing save feedback
 *     and blocking modal close.
 *  2. Sort Order number input removed from modal. Ordering is drag-only + up/down arrows.
 *  3. Up / Down arrow buttons added to each row for keyboard-friendly reordering.
 *  4. Expandable conditions panel per specialty — click the condition count to
 *     toggle a list of condition names. Requires fetchAllSpecialties to also
 *     return condition names (see adminQueries.js change below).
 *  5. Uncategorized excluded from public-facing fetchSpecialtiesForCMS results
 *     (handled in adminQueries.js — see note at bottom of this file).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, GripVertical, Pencil, Trash2,
  ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ChevronRight,
} from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStethoscope, faHeartPulse, faBrain, faBone, faEye, faEarListen,
  faTooth, faLungs, faVial, faDroplet, faSyringe, faBaby,
  faPersonPregnant, faVirus, faBacteria, faPills, faFlask,
  faMicroscope, faRadiation, faScissors, faUserDoctor, faWheelchair,
  faHospital, faFileMedical, faNotesMedical, faHeart, faXRay,
  faThermometer, faBriefcaseMedical, faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons'
import { useToast } from '../../context/ToastContext'
import Modal from '../../components/admin/Modal'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  fetchAllSpecialties,
  insertSpecialty,
  updateSpecialty,
  toggleSpecialtyActive,
  deleteSpecialty,
  reorderSpecialties,
} from '../../lib/adminQueries'

// ─── Icon picker catalogue ────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { name: 'fa-stethoscope',       icon: faStethoscope },
  { name: 'fa-heart-pulse',       icon: faHeartPulse },
  { name: 'fa-brain',             icon: faBrain },
  { name: 'fa-bone',              icon: faBone },
  { name: 'fa-eye',               icon: faEye },
  { name: 'fa-ear-listen',        icon: faEarListen },
  { name: 'fa-tooth',             icon: faTooth },
  { name: 'fa-lungs',             icon: faLungs },
  { name: 'fa-vial',              icon: faVial },
  { name: 'fa-droplet',           icon: faDroplet },
  { name: 'fa-syringe',           icon: faSyringe },
  { name: 'fa-baby',              icon: faBaby },
  { name: 'fa-person-pregnant',   icon: faPersonPregnant },
  { name: 'fa-virus',             icon: faVirus },
  { name: 'fa-bacteria',          icon: faBacteria },
  { name: 'fa-pills',             icon: faPills },
  { name: 'fa-flask',             icon: faFlask },
  { name: 'fa-microscope',        icon: faMicroscope },
  { name: 'fa-radiation',         icon: faRadiation },
  { name: 'fa-scissors',          icon: faScissors },
  { name: 'fa-user-doctor',       icon: faUserDoctor },
  { name: 'fa-wheelchair',        icon: faWheelchair },
  { name: 'fa-hospital',          icon: faHospital },
  { name: 'fa-file-medical',      icon: faFileMedical },
  { name: 'fa-notes-medical',     icon: faNotesMedical },
  { name: 'fa-heart',             icon: faHeart },
  { name: 'fa-x-ray',             icon: faXRay },
  { name: 'fa-thermometer',       icon: faThermometer },
  { name: 'fa-briefcase-medical', icon: faBriefcaseMedical },
  { name: 'fa-circle-question',   icon: faCircleQuestion },
]

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map(o => [o.name, o.icon]))

const PALETTE_COLORS = [
  '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3',
  '#EDE9FE', '#FEE2E2', '#E0F2FE', '#D1FAE5',
  '#F3F4F6', '#FFF7ED',
]

const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

// ─── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ─── Empty form state — no sort_order field (managed by position only) ────────

const EMPTY_FORM = {
  name_en:   '',
  name_ar:   '',
  icon_name: 'fa-stethoscope',
  color_hex: '#DBEAFE',
}

// ─── SpecialtyModal ───────────────────────────────────────────────────────────
// FIX 1: uses `toast` (not `showToast`) to match the rest of the admin codebase.
// FIX 2: sort_order field removed — position managed by drag/arrows only.

function SpecialtyModal({ open, specialty, onClose, onSaved, nextOrder }) {
  const { toast } = useToast()   // ← FIX: was `showToast`
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(specialty
        ? {
            name_en:   specialty.name_en   ?? '',
            name_ar:   specialty.name_ar   ?? '',
            icon_name: specialty.icon_name ?? 'fa-stethoscope',
            color_hex: specialty.color_hex ?? '#DBEAFE',
          }
        : { ...EMPTY_FORM }
      )
    }
  }, [open, specialty])

  function patch(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name_en.trim()) {
      toast.error('Name (English) is required')
      return
    }
    setBusy(true)

    const payload = {
      name_en:   form.name_en.trim(),
      name_ar:   form.name_ar.trim() || null,
      icon_name: form.icon_name,
      color_hex: form.color_hex,
      // sort_order comes from position in list — set automatically on insert
      ...(specialty ? {} : { sort_order: nextOrder ?? 99 }),
    }

    let result
    if (specialty) {
      result = await updateSpecialty(specialty.id, payload)
    } else {
      payload.slug      = toSlug(form.name_en)
      payload.is_active = true
      result = await insertSpecialty(payload)
    }

    setBusy(false)

    if (result.error) {
      toast.error(result.error.message ?? 'Save failed')
      return
    }

    // FIX: toast first, then close — guaranteed to run regardless of toast impl
    toast.success(specialty ? 'Specialty updated' : 'Specialty added')
    onSaved()   // triggers load() in parent
    onClose()   // closes modal
  }

  return (
    <Modal
      isOpen={open}
      title={specialty ? 'Edit Specialty' : 'Add Specialty'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name EN */}
        <label style={labelStyle}>
          Name (English) *
          <input
            value={form.name_en}
            onChange={e => patch('name_en', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Gastroenterology"
            style={inputStyle}
          />
        </label>

        {/* Name AR */}
        <label style={labelStyle}>
          Name (Arabic)
          <input
            value={form.name_ar}
            onChange={e => patch('name_ar', e.target.value)}
            placeholder="اختياري"
            dir="rtl"
            style={inputStyle}
          />
        </label>

        {/* ── Sort Order input REMOVED — controlled by drag/arrows only ── */}

        {/* Color palette */}
        <div>
          <div style={labelText}>Icon Background Color</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {PALETTE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => patch('color_hex', c)}
                style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  backgroundColor: c,
                  border: form.color_hex === c
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
            {/* Custom hex input */}
            <input
              type="color"
              value={form.color_hex}
              onChange={e => patch('color_hex', e.target.value)}
              title="Custom colour"
              style={{
                width: 32, height: 32,
                padding: 2,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <div style={labelText}>Icon</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
            gap: 6,
            marginTop: 6,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: 8,
          }}>
            {ICON_OPTIONS.map(({ name, icon }) => (
              <button
                key={name}
                title={name}
                onClick={() => patch('icon_name', name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40, height: 40,
                  borderRadius: 8,
                  backgroundColor: form.icon_name === name
                    ? (form.color_hex || 'var(--color-accent-light)')
                    : 'transparent',
                  border: form.icon_name === name
                    ? '2px solid var(--color-accent)'
                    : '1px solid transparent',
                  color: form.icon_name === name
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                <FontAwesomeIcon icon={icon} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div style={labelText}>Preview</div>
          <div style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg)',
          }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: 12,
              backgroundColor: form.color_hex || '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              fontSize: 20,
              flexShrink: 0,
            }}>
              <FontAwesomeIcon icon={ICON_MAP[form.icon_name] ?? faStethoscope} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                {form.name_en || 'Specialty Name'}
              </div>
              {form.name_ar && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', direction: 'rtl' }}>
                  {form.name_ar}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} disabled={busy} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={busy} style={btnPrimary}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpecialtiesManager() {
  const navigate      = useNavigate()
  const { toast }     = useToast()   // ← FIX: was `showToast`

  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)

  // Which specialty's conditions panel is expanded
  const [expandedId, setExpandedId] = useState(null)

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  // Confirm modal
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  // Drag state
  const dragIdx  = useRef(null)
  const dragOver = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchAllSpecialties()
    setLoading(false)
    if (error) { toast.error('Failed to load specialties'); return }
    setRows(data ?? [])
  }, [toast])

  useEffect(() => { load() }, [load])

  // ── Move row up / down (arrow buttons) ────────────────────────────────────

  async function moveRow(idx, direction) {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= rows.length) return
    // Don't let anything move above Uncategorized (always index 0)
    if (targetIdx === 0 && rows[0]?.id === UNCATEGORIZED_ID) return

    const reordered = [...rows]
    ;[reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]]
    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setRows(withOrder)

    const { error } = await reorderSpecialties(
      withOrder.map(s => ({ id: s.id, sort_order: s.sort_order }))
    )
    if (error) {
      toast.error('Reorder failed')
      load()
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  function handleToggleActive(specialty) {
    const turningOff = specialty.is_active

    if (turningOff && specialty.conditionCount > 0) {
      setConfirmConfig({
        title:   'Deactivate Specialty?',
        message: `All ${specialty.conditionCount} condition(s) in "${specialty.name_en}" will be moved to Uncategorized. Continue?`,
        onConfirm: () => doToggle(specialty, false),
      })
      setConfirmOpen(true)
      return
    }

    doToggle(specialty, !specialty.is_active)
  }

  async function doToggle(specialty, newValue) {
    setRows(r => r.map(s => s.id === specialty.id ? { ...s, is_active: newValue } : s))
    const { error } = await toggleSpecialtyActive(specialty.id, newValue)
    if (error) {
      toast.error('Update failed')
      setRows(r => r.map(s => s.id === specialty.id ? { ...s, is_active: !newValue } : s))
    } else {
      toast.success(newValue ? 'Specialty activated' : 'Specialty deactivated')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(specialty) {
    if (specialty.id === UNCATEGORIZED_ID) {
      toast.error('Cannot delete Uncategorized'); return
    }
    if (specialty.conditionCount > 0) {
      toast.error(`Move all ${specialty.conditionCount} condition(s) out first`); return
    }
    setConfirmConfig({
      title:   'Delete Specialty?',
      message: `Delete "${specialty.name_en}" permanently? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await deleteSpecialty(specialty.id)
        if (error) { toast.error('Delete failed'); return }
        toast.success('Specialty deleted')
        load()
      },
    })
    setConfirmOpen(true)
  }

  // ── Drag to reorder ───────────────────────────────────────────────────────

  function onDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, idx) {
    e.preventDefault()
    dragOver.current = idx
  }

  async function onDrop() {
    const from = dragIdx.current
    const to   = dragOver.current
    if (from === null || to === null || from === to) return
    // Prevent anything being dragged above Uncategorized
    const effectiveTo = (rows[0]?.id === UNCATEGORIZED_ID && to === 0) ? 1 : to

    const reordered = [...rows]
    const [moved]   = reordered.splice(from, 1)
    reordered.splice(effectiveTo, 0, moved)

    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setRows(withOrder)

    const { error } = await reorderSpecialties(
      withOrder.map(s => ({ id: s.id, sort_order: s.sort_order }))
    )
    if (error) {
      toast.error('Reorder failed')
      load()
    }

    dragIdx.current  = null
    dragOver.current = null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => navigate('/admin')} style={iconBtn} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Specialties
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {rows.length} specialt{rows.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </div>

        <button
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
          style={btnPrimary}
        >
          <Plus size={15} />
          Add Specialty
        </button>
      </header>

      {/* Body */}
      <main style={{ flex: 1, padding: 'var(--space-4)', maxWidth: 720, width: '100%', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Loading…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            No specialties found. Add one to get started.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Legend row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 48px 1fr 90px 60px 96px',
              gap: 8,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <span />
              <span />
              <span>Name</span>
              <span style={{ textAlign: 'center' }}>Conditions</span>
              <span style={{ textAlign: 'center' }}>Active</span>
              <span />
            </div>

            {rows.map((specialty, idx) => {
              const isUncategorized = specialty.id === UNCATEGORIZED_ID
              const icon            = ICON_MAP[specialty.icon_name] ?? faCircleQuestion
              const isExpanded      = expandedId === specialty.id
              const conditionNames  = specialty.conditionNames ?? []  // from updated fetchAllSpecialties
              const isFirst         = idx === 0
              const isLast          = idx === rows.length - 1
              // Can't move above Uncategorized (always pinned first)
              const canMoveUp   = !isUncategorized && !(rows[idx - 1]?.id === UNCATEGORIZED_ID ? false : idx === 1 && rows[0]?.id === UNCATEGORIZED_ID) && idx > 1
              const canMoveDown = !isUncategorized && !isLast

              // Simpler: Uncategorized is locked; others can move within their range
              const moveUpDisabled   = isUncategorized || idx <= 1 && rows[0]?.id === UNCATEGORIZED_ID && idx === 1
              const moveDownDisabled = isUncategorized || isLast

              return (
                <div key={specialty.id}>
                  {/* ── Main row ── */}
                  <div
                    draggable={!isUncategorized}
                    onDragStart={e => onDragStart(e, idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDrop={onDrop}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 48px 1fr 90px 60px 96px',
                      gap: 8,
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: specialty.is_active
                        ? 'var(--color-surface)'
                        : 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                      borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)',
                      opacity: specialty.is_active ? 1 : 0.6,
                      cursor: isUncategorized ? 'default' : 'grab',
                      userSelect: 'none',
                    }}
                  >
                    {/* Drag handle */}
                    <div style={{
                      color: isUncategorized ? 'transparent' : 'var(--color-text-tertiary)',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <GripVertical size={16} />
                    </div>

                    {/* Icon chip */}
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 10,
                      backgroundColor: specialty.color_hex || '#DBEAFE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--color-accent)', fontSize: 18, flexShrink: 0,
                    }}>
                      <FontAwesomeIcon icon={icon} />
                    </div>

                    {/* Name */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {specialty.name_en}
                        {isUncategorized && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: 'var(--color-accent-light)',
                            color: 'var(--color-accent)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            Default
                          </span>
                        )}
                        {!specialty.is_active && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: 'var(--color-border)',
                            color: 'var(--color-text-tertiary)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      {specialty.name_ar && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', direction: 'rtl', marginTop: 1 }}>
                          {specialty.name_ar}
                        </div>
                      )}
                    </div>

                    {/* Condition count — clickable to expand */}
                    <div style={{ textAlign: 'center' }}>
                      {specialty.conditionCount > 0 ? (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : specialty.id)}
                          title={isExpanded ? 'Collapse' : 'View conditions'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 13, fontWeight: 500,
                            color: 'var(--color-accent)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '2px 6px', borderRadius: 6,
                            backgroundColor: 'var(--color-accent-light)',
                          }}
                        >
                          {specialty.conditionCount}
                          <ChevronRight
                            size={12}
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.15s',
                            }}
                          />
                        </button>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>0</span>
                      )}
                    </div>

                    {/* Active toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {isUncategorized ? (
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(specialty)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                          aria-label={specialty.is_active ? 'Deactivate' : 'Activate'}
                          title={specialty.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {specialty.is_active
                            ? <ToggleRight size={24} color="var(--color-accent)" />
                            : <ToggleLeft  size={24} color="var(--color-text-tertiary)" />
                          }
                        </button>
                      )}
                    </div>

                    {/* Actions: up/down + edit + delete */}
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {!isUncategorized && (
                        <>
                          {/* Up arrow */}
                          <button
                            onClick={() => moveRow(idx, -1)}
                            disabled={idx === 1 && rows[0]?.id === UNCATEGORIZED_ID}
                            title="Move up"
                            style={{
                              ...iconBtn,
                              opacity: (idx === 1 && rows[0]?.id === UNCATEGORIZED_ID) ? 0.3 : 1,
                            }}
                          >
                            <ChevronUp size={14} />
                          </button>

                          {/* Down arrow */}
                          <button
                            onClick={() => moveRow(idx, 1)}
                            disabled={isLast}
                            title="Move down"
                            style={{
                              ...iconBtn,
                              opacity: isLast ? 0.3 : 1,
                            }}
                          >
                            <ChevronDown size={14} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => { setEditTarget(specialty); setModalOpen(true) }}
                            style={iconBtn}
                            aria-label="Edit"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(specialty)}
                            style={{ ...iconBtn, color: 'var(--color-error, #dc2626)' }}
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Expanded conditions panel ── */}
                  {isExpanded && conditionNames.length > 0 && (
                    <div style={{
                      border: '1px solid var(--color-border)',
                      borderTop: 'none',
                      borderRadius: '0 0 10px 10px',
                      backgroundColor: 'var(--color-bg)',
                      padding: '8px 12px 12px 72px',  // indent to align with name column
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                        textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
                        marginBottom: 6,
                      }}>
                        Conditions
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {conditionNames.map((name, i) => (
                          <div key={i} style={{
                            fontSize: 13, color: 'var(--color-text-secondary)',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              backgroundColor: specialty.color_hex || 'var(--color-accent)',
                              flexShrink: 0,
                            }} />
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <SpecialtyModal
        open={modalOpen}
        specialty={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load() }}
        nextOrder={rows.length > 0 ? Math.max(...rows.map(r => r.sort_order ?? 0)) + 1 : 1}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => { setConfirmOpen(false); confirmConfig.onConfirm?.() }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}

// ─── Shared micro styles ──────────────────────────────────────────────────────

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const iconBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  padding: 0,
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const labelText = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}
