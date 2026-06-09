import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
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
  { name: 'fa-x-ray',            icon: faXRay },
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

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name_en:    '',
  name_ar:    '',
  icon_name:  'fa-stethoscope',
  color_hex:  '#DBEAFE',
  sort_order: 99,
}

// ─── SpecialtyModal ───────────────────────────────────────────────────────────

function SpecialtyModal({ open, specialty, onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm]   = useState(EMPTY_FORM)
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    if (open) {
      setForm(specialty
        ? {
            name_en:    specialty.name_en   ?? '',
            name_ar:    specialty.name_ar   ?? '',
            icon_name:  specialty.icon_name ?? 'fa-stethoscope',
            color_hex:  specialty.color_hex ?? '#DBEAFE',
            sort_order: specialty.sort_order ?? 99,
          }
        : EMPTY_FORM
      )
    }
  }, [open, specialty])

  function patch(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name_en.trim()) {
      showToast('Name (EN) is required', 'error')
      return
    }
    setBusy(true)

    const payload = {
      name_en:    form.name_en.trim(),
      name_ar:    form.name_ar.trim() || null,
      icon_name:  form.icon_name,
      color_hex:  form.color_hex,
      sort_order: Number(form.sort_order) || 99,
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
      showToast(result.error.message ?? 'Save failed', 'error')
      return
    }

    showToast(specialty ? 'Specialty updated' : 'Specialty added', 'success')
    onSaved()
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

        {/* Sort order */}
        <label style={labelStyle}>
          Sort Order
          <input
            type="number"
            value={form.sort_order}
            onChange={e => patch('sort_order', e.target.value)}
            min={1}
            style={{ ...inputStyle, width: 90 }}
          />
        </label>

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
                  width: 40,
                  height: 40,
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
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
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
  const navigate         = useNavigate()
  const { showToast }    = useToast()

  const [rows, setRows]  = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // null = add, object = edit

  // Confirm modal
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  // Drag state
  const dragIdx   = useRef(null)
  const dragOver  = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchAllSpecialties()
    setLoading(false)
    if (error) { showToast('Failed to load specialties', 'error'); return }
    setRows(data ?? [])
  }, [showToast])

  useEffect(() => { load() }, [load])

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
    // optimistic
    setRows(r => r.map(s => s.id === specialty.id ? { ...s, is_active: newValue } : s))
    const { error } = await toggleSpecialtyActive(specialty.id, newValue)
    if (error) {
      showToast('Update failed', 'error')
      setRows(r => r.map(s => s.id === specialty.id ? { ...s, is_active: !newValue } : s))
    } else {
      showToast(newValue ? 'Specialty activated' : 'Specialty deactivated', 'success')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(specialty) {
    if (specialty.id === UNCATEGORIZED_ID) {
      showToast('Cannot delete Uncategorized', 'error'); return
    }
    if (specialty.conditionCount > 0) {
      showToast(`Move all ${specialty.conditionCount} condition(s) out first`, 'error'); return
    }
    setConfirmConfig({
      title:   'Delete Specialty?',
      message: `Delete "${specialty.name_en}" permanently? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await deleteSpecialty(specialty.id)
        if (error) { showToast('Delete failed', 'error'); return }
        showToast('Specialty deleted', 'success')
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

    const reordered = [...rows]
    const [moved]   = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setRows(withOrder)

    const { error } = await reorderSpecialties(
      withOrder.map(s => ({ id: s.id, sort_order: s.sort_order }))
    )
    if (error) {
      showToast('Reorder failed', 'error')
      load() // revert
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
              gridTemplateColumns: '28px 48px 1fr 80px 60px 80px',
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
              const icon = ICON_MAP[specialty.icon_name] ?? faCircleQuestion

              return (
                <div
                  key={specialty.id}
                  draggable={!isUncategorized}
                  onDragStart={e => onDragStart(e, idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={onDrop}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 48px 1fr 80px 60px 80px',
                    gap: 8,
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: specialty.is_active
                      ? 'var(--color-surface)'
                      : 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    opacity: specialty.is_active ? 1 : 0.6,
                    cursor: isUncategorized ? 'default' : 'grab',
                    userSelect: 'none',
                  }}
                >
                  {/* Drag handle */}
                  <div style={{ color: isUncategorized ? 'transparent' : 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                    <GripVertical size={16} />
                  </div>

                  {/* Icon chip */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: specialty.color_hex || '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)',
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    <FontAwesomeIcon icon={icon} />
                  </div>

                  {/* Name */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {specialty.name_en}
                      {isUncategorized && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-accent-light)',
                          color: 'var(--color-accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          Default
                        </span>
                      )}
                      {!specialty.is_active && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-border)',
                          color: 'var(--color-text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
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

                  {/* Condition count */}
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {specialty.conditionCount}
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

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {!isUncategorized && (
                      <>
                        <button
                          onClick={() => { setEditTarget(specialty); setModalOpen(true) }}
                          style={iconBtn}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
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
  width: 30,
  height: 30,
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
