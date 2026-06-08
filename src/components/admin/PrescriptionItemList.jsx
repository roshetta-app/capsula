/**
 * PrescriptionItemList — renders + manages items for one prescription.
 *
 * Props:
 *   prescriptionId  string
 *   items           PrescriptionItem[]
 *   onChange        (newItems) => void
 *   disabled        boolean
 */

import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import {
  insertPrescriptionItem,
  updatePrescriptionItem,
  deletePrescriptionItem,
  reorderItems,
} from '../../lib/adminQueries'
import DrugRowEditor    from './DrugRowEditor'
import TextRowEditor    from './TextRowEditor'
import NoteRowEditor    from './NoteRowEditor'
import ConfirmModal     from './ConfirmModal'
import DrugPickerModal  from './DrugPickerModal'

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  drug: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  text: { bg: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' },
  note: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
}

function TypeBadge({ type }) {
  const { bg, color, border } = TYPE_COLORS[type] ?? TYPE_COLORS.text
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '2px 7px', borderRadius: 6,
      backgroundColor: bg, color, border: `1px solid ${border}`,
    }}>
      {type}
    </span>
  )
}

// ─── Single item row ──────────────────────────────────────────────────────────

function ItemRow({ item, idx, total, onMove, onDeleteRequest, onChange, disabled }) {
  const [expanded, setExpanded] = useState(true)

  const preview = item.type === 'drug'
    ? `${(item.prescription_drug_alternatives ?? []).length} alternative(s)`
    : (item.content?.slice(0, 60) ?? '(empty)')

  return (
    <div style={{
      border: '1.5px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-surface)',
      marginBottom: 'var(--space-2)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: '8px 12px',
          borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer',
          backgroundColor: 'var(--color-surface)',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <GripVertical size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />

        <TypeBadge type={item.type} />

        <span style={{
          flex: 1, fontSize: 13, color: 'var(--color-text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {preview}
        </span>

        {/* Reorder */}
        <button
          onClick={e => { e.stopPropagation(); onMove(idx, -1) }}
          disabled={idx === 0 || disabled}
          style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 2, opacity: idx === 0 ? 0.3 : 1, display: 'flex' }}
        ><ChevronUp size={14} /></button>
        <button
          onClick={e => { e.stopPropagation(); onMove(idx, 1) }}
          disabled={idx === total - 1 || disabled}
          style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', padding: 2, opacity: idx === total - 1 ? 0.3 : 1, display: 'flex' }}
        ><ChevronDown size={14} /></button>

        {/* Delete — fires parent handler which opens ConfirmModal */}
        <button
          onClick={e => { e.stopPropagation(); onDeleteRequest(item.id) }}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 'var(--radius-md)',
            border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
            color: '#DC2626', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
          }}
        ><Trash2 size={12} /></button>
      </div>

      {/* Editor body */}
      {expanded && (
        <div style={{ padding: 'var(--space-3)' }}>
          {item.type === 'drug' && (
            <DrugRowEditor item={item} onChange={onChange} disabled={disabled} />
          )}
          {item.type === 'text' && (
            <TextRowEditor item={item} onChange={onChange} disabled={disabled} />
          )}
          {item.type === 'note' && (
            <NoteRowEditor item={item} onChange={onChange} disabled={disabled} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PrescriptionItemList({ prescriptionId, items, onChange, disabled }) {
  const [adding,          setAdding]          = useState(false)
  const [pickerOpen,      setPickerOpen]      = useState(false)
  const [confirmState,    setConfirmState]    = useState({ open: false, id: null })

  // ─── Add item ───────────────────────────────────────────────────────────────

  async function addItem(type, extraFields = {}) {
    setAdding(true)
    const sort_order = items.length
    const { data: row, error } = await insertPrescriptionItem({
      prescription_id: prescriptionId,
      type,
      content: null,
      sort_order,
      ...extraFields,
    })
    if (!error) {
      onChange([...items, { ...row, prescription_drug_alternatives: [] }])
    }
    setAdding(false)
  }

  // Drug row: open picker first, then create item with show_generic_link default
  function handleAddDrug() {
    setPickerOpen(true)
  }

  async function handleDrugPicked(formulation) {
    // formulation is the full object from DrugPickerModal
    // We store no foreign key to formulation here — the drug slot identity
    // comes from brand alternatives. We just open a blank drug slot.
    // (Formulation context is available to the editor once brands are added.)
    await addItem('drug', { show_generic_link: true })
  }

  // ─── Delete (ConfirmModal) ──────────────────────────────────────────────────

  function handleDeleteRequest(id) {
    setConfirmState({ open: true, id })
  }

  async function handleDeleteConfirm() {
    const id = confirmState.id
    setConfirmState({ open: false, id: null })
    const { error } = await deletePrescriptionItem(id)
    if (!error) {
      onChange(items.filter(i => i.id !== id))
    }
  }

  // ─── Reorder ────────────────────────────────────────────────────────────────

  async function handleMove(idx, direction) {
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= items.length) return
    const next = [...items]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    const reordered = next.map((item, i) => ({ ...item, sort_order: i }))
    onChange(reordered)
    await reorderItems('prescription_items', reordered.map(i => ({ id: i.id, sort_order: i.sort_order })))
  }

  function handleItemChange(updatedItem) {
    onChange(items.map(i => i.id === updatedItem.id ? updatedItem : i))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {items.length === 0 && (
        <div style={{
          textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13,
          padding: 'var(--space-4)', border: '1.5px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)',
        }}>
          No items yet. Add rows below.
        </div>
      )}

      {items.map((item, idx) => (
        <ItemRow
          key={item.id}
          item={item}
          idx={idx}
          total={items.length}
          onMove={handleMove}
          onDeleteRequest={handleDeleteRequest}
          onChange={handleItemChange}
          disabled={disabled}
        />
      ))}

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
        <button
          onClick={handleAddDrug}
          disabled={adding || disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 'var(--radius-md)',
            border: '1.5px dashed #BFDBFE',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            fontSize: 13, fontWeight: 500,
            cursor: adding || disabled ? 'default' : 'pointer',
            fontFamily: 'var(--font-body)',
            opacity: adding || disabled ? 0.6 : 1,
          }}
        >
          <Plus size={13} />
          + Drug Row
        </button>

        {['text', 'note'].map(type => (
          <button
            key={type}
            onClick={() => addItem(type)}
            disabled={adding || disabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 500,
              cursor: adding || disabled ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={13} />
            {type === 'text' ? '+ Text Row' : '+ Note Row'}
          </button>
        ))}
      </div>

      {/* Drug picker modal */}
      <DrugPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleDrugPicked}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete item?"
        message="This will permanently delete this row and cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
