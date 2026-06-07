/**
 * PrescriptionBuilder — manages prescription tabs for a condition.
 *
 * Props:
 *   conditionId  string               — required (condition must be saved first)
 *   disabled     boolean
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import {
  fetchPrescriptionsForCondition,
  insertPrescription,
  updatePrescription,
  deletePrescription,
  reorderItems,
} from '../../lib/adminQueries'
import PrescriptionItemList from './PrescriptionItemList'

// ─── Editable label pill ──────────────────────────────────────────────────────

function LabelPill({ label, active, onClick, onRename }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(label)

  function commitRename() {
    setEditing(false)
    if (val.trim() && val.trim() !== label) {
      onRename(val.trim())
    } else {
      setVal(label)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commitRename}
        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setVal(label); setEditing(false) } }}
        style={{
          padding: '5px 12px', borderRadius: 20,
          border: '2px solid var(--color-accent)',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
          outline: 'none', minWidth: 60, maxWidth: 160,
        }}
      />
    )
  }

  return (
    <button
      onClick={onClick}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
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

  // ─── Load on mount ─────────────────────────────────────────────────────────

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

  async function handleAdd() {
    const label = window.prompt('Prescription label (e.g. "First line", "Mild case"):')
    if (!label?.trim()) return
    setAdding(true)
    const sort_order = prescriptions.length
    const { data: row, error: insertErr } = await insertPrescription({
      condition_id: conditionId,
      label: label.trim(),
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

  // ─── Rename prescription ──────────────────────────────────────────────────

  async function handleRename(id, newLabel) {
    const { error: updateErr } = await updatePrescription(id, { label: newLabel })
    if (updateErr) {
      setError(updateErr.message ?? 'Rename failed')
      return
    }
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, label: newLabel } : p))
  }

  // ─── Delete prescription ──────────────────────────────────────────────────

  async function handleDelete(id, idx) {
    if (!window.confirm('Delete this prescription and all its items?')) return
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

  // ─── Reorder prescriptions ────────────────────────────────────────────────

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

  // ─── Update items callback (from PrescriptionItemList) ───────────────────

  function handleItemsChange(prescriptionId, newItems) {
    setPrescriptions(prev =>
      prev.map(p => p.id === prescriptionId ? { ...p, prescription_items: newItems } : p)
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
              onRename={newLabel => handleRename(p.id, newLabel)}
            />
            {i === activeIdx && prescriptions.length > 1 && (
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
            {i === activeIdx && (
              <button
                onClick={() => handleDelete(p.id, i)}
                disabled={disabled}
                title="Delete prescription"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: '50%',
                  border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                  color: '#DC2626', cursor: disabled ? 'default' : 'pointer',
                  flexShrink: 0,
                }}
              ><Trash2 size={11} /></button>
            )}
          </div>
        ))}

        <button
          onClick={handleAdd}
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
    </div>
  )
}
