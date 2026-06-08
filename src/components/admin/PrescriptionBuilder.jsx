/**
 * PrescriptionBuilder — manages prescription tabs for a condition.
 *
 * Props:
 *   conditionId  string               — required (condition must be saved first)
 *   disabled     boolean
 */

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle, Pencil } from 'lucide-react'
import {
  fetchPrescriptionsForCondition,
  insertPrescription,
  updatePrescription,
  deletePrescription,
  reorderItems,
} from '../../lib/adminQueries'
import PrescriptionItemList from './PrescriptionItemList'
import ConfirmModal         from './ConfirmModal'
import Modal                from './Modal'

// ─── Add / Rename modal ───────────────────────────────────────────────────────

function LabelModal({ isOpen, onClose, onSubmit, initialValue = '', title = 'Prescription label' }) {
  const [val, setVal] = useState(initialValue)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setVal(initialValue)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen, initialValue])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = val.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder='e.g. "First line", "Mild case", "Children"'
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            type="submit"
            disabled={!val.trim()}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: val.trim() ? 'var(--color-accent)' : 'var(--color-border)',
              color: '#fff',
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: val.trim() ? 'pointer' : 'default',
            }}
          >Save</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Label pill ───────────────────────────────────────────────────────────────

function LabelPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Click to select"
      style={{
        padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
        backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        border: active ? 'none' : '1.5px solid var(--color-border)',
        whiteSpace: 'nowrap', transition: 'background-color 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PrescriptionBuilder({ conditionId, disabled }) {
  const [prescriptions, setPrescriptions] = useState([])
  const [activeIdx,     setActiveIdx]     = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [adding,        setAdding]        = useState(false)

  // Modal states
  const [addModalOpen,    setAddModalOpen]    = useState(false)
  const [renameModal,     setRenameModal]     = useState({ open: false, id: null, label: '' })
  const [confirmDelete,   setConfirmDelete]   = useState({ open: false, id: null, idx: null })

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!conditionId) { setLoading(false); return }
    load()
  }, [conditionId])

  async function load() {
    setLoading(true)
    const { data, error: fetchErr } = await fetchPrescriptionsForCondition(conditionId)
    if (fetchErr) {
      setError(fetchErr.message ?? 'Failed to load prescriptions')
    } else {
      setPrescriptions(data ?? [])
      setActiveIdx(0)
    }
    setLoading(false)
  }

  // ─── Add prescription ──────────────────────────────────────────────────────

  async function handleAddSubmit(label) {
    setAdding(true)
    const sort_order = prescriptions.length
    const { data: row, error: insertErr } = await insertPrescription({
      condition_id: conditionId,
      label,
      sort_order,
    })
    if (insertErr) {
      setError(insertErr.message ?? 'Failed to add prescription')
    } else {
      const newPrescription = { ...row, prescription_items: [] }
      setPrescriptions(prev => {
        const next = [...prev, newPrescription]
        setActiveIdx(next.length - 1)
        return next
      })
    }
    setAdding(false)
  }

  // ─── Rename prescription ───────────────────────────────────────────────────

  async function handleRenameSubmit(newLabel) {
    const { id } = renameModal
    const { error: updateErr } = await updatePrescription(id, { label: newLabel })
    if (updateErr) {
      setError(updateErr.message ?? 'Rename failed')
      return
    }
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, label: newLabel } : p))
  }

  // ─── Delete prescription ───────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    const { id, idx } = confirmDelete
    setConfirmDelete({ open: false, id: null, idx: null })
    const { error: delErr } = await deletePrescription(id)
    if (delErr) {
      setError(delErr.message ?? 'Delete failed')
      return
    }
    setPrescriptions(prev => {
      const next = prev.filter(p => p.id !== id)
      setActiveIdx(Math.min(idx, next.length - 1))
      return next
    })
  }

  // ─── Reorder prescriptions ─────────────────────────────────────────────────

  async function handleMove(idx, direction) {
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= prescriptions.length) return
    const next = [...prescriptions]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    const reordered = next.map((p, i) => ({ ...p, sort_order: i }))
    setPrescriptions(reordered)
    setActiveIdx(swapIdx)
    await reorderItems('prescriptions', reordered.map(p => ({ id: p.id, sort_order: p.sort_order })))
  }

  // ─── Items change callback ─────────────────────────────────────────────────

  function handleItemsChange(prescriptionId, newItems) {
    setPrescriptions(prev =>
      prev.map(p => p.id === prescriptionId ? { ...p, prescription_items: newItems } : p)
    )
  }

  // ─── Guards ────────────────────────────────────────────────────────────────

  if (!conditionId) {
    return (
      <div style={{
        backgroundColor: 'var(--color-bg)',
        border: '1.5px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: 13,
      }}>
        Save the condition first to add prescriptions.
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: 'var(--space-3)' }}>
        Loading prescriptions…
      </div>
    )
  }

  const active = prescriptions[activeIdx] ?? null

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
          marginBottom: 'var(--space-3)', fontSize: 13, color: '#DC2626',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Prescription tab pills ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        {prescriptions.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LabelPill
              label={p.label}
              active={i === activeIdx}
              onClick={() => setActiveIdx(i)}
            />

            {/* Controls only visible for the active tab */}
            {i === activeIdx && (
              <>
                {/* Rename */}
                <button
                  onClick={() => setRenameModal({ open: true, id: p.id, label: p.label })}
                  disabled={disabled}
                  title="Rename prescription"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text-tertiary)',
                    cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
                  }}
                ><Pencil size={11} /></button>

                {/* Reorder */}
                {prescriptions.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button
                      onClick={() => handleMove(i, -1)}
                      disabled={i === 0 || disabled}
                      style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', padding: 0, opacity: i === 0 ? 0.3 : 1, display: 'flex' }}
                    ><ChevronUp size={12} /></button>
                    <button
                      onClick={() => handleMove(i, 1)}
                      disabled={i === prescriptions.length - 1 || disabled}
                      style={{ background: 'none', border: 'none', cursor: i === prescriptions.length - 1 ? 'default' : 'pointer', padding: 0, opacity: i === prescriptions.length - 1 ? 0.3 : 1, display: 'flex' }}
                    ><ChevronDown size={12} /></button>
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={() => setConfirmDelete({ open: true, id: p.id, idx: i })}
                  disabled={disabled}
                  title="Delete prescription"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%',
                    border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                    color: '#DC2626', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
                  }}
                ><Trash2 size={11} /></button>
              </>
            )}
          </div>
        ))}

        {/* Add prescription */}
        <button
          onClick={() => setAddModalOpen(true)}
          disabled={adding || disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 12px', borderRadius: 20,
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent', color: 'var(--color-text-tertiary)',
            fontSize: 13, fontWeight: 500, cursor: adding || disabled ? 'default' : 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {/* ── Active prescription items ── */}
      {active ? (
        <PrescriptionItemList
          key={active.id}
          prescriptionId={active.id}
          items={active.prescription_items ?? []}
          onChange={newItems => handleItemsChange(active.id, newItems)}
          disabled={disabled}
        />
      ) : (
        <div style={{
          border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)', textAlign: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 13,
        }}>
          No prescriptions yet. Click "Add" to create one.
        </div>
      )}

      {/* ── Modals ── */}
      <LabelModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        initialValue=""
        title="New prescription label"
      />

      <LabelModal
        isOpen={renameModal.open}
        onClose={() => setRenameModal({ open: false, id: null, label: '' })}
        onSubmit={handleRenameSubmit}
        initialValue={renameModal.label}
        title="Rename prescription"
      />

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null, idx: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete prescription?"
        message="This will permanently delete this prescription and all its items."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
