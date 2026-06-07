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
import DrugRowEditor  from './DrugRowEditor'
import TextRowEditor  from './TextRowEditor'
import NoteRowEditor  from './NoteRowEditor'

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

function ItemRow({ item, idx, total, onMove, onDelete, onChange, disabled }) {
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: '8px 12px',
        borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
        cursor: 'pointer',
        backgroundColor: 'var(--color-surface)',
      }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Drag handle area (visual only — reorder via buttons) */}
        <GripVertical size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />

        <TypeBadge type={item.type} />

        <span style={{
          flex: 1, fontSize: 13, color: 'var(--color-text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {preview}
        </span>

        {/* Reorder buttons */}
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

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(item.id) }}
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
            <DrugRowEditor
              item={item}
              onChange={onChange}
              disabled={disabled}
            />
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
  const [adding, setAdding] = useState(false)

  async function handleAdd(type) {
    setAdding(true)
    const sort_order = items.length
    const { data: row, error } = await insertPrescriptionItem({
      prescription_id: prescriptionId,
      type,
      content: null,
      sort_order,
    })
    if (!error) {
      onChange([...items, { ...row, prescription_drug_alternatives: [] }])
    }
    setAdding(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return
    const { error } = await deletePrescriptionItem(id)
    if (!error) {
      onChange(items.filter(i => i.id !== id))
    }
  }

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
          onDelete={handleDelete}
          onChange={handleItemChange}
          disabled={disabled}
        />
      ))}

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
        {['drug', 'text', 'note'].map(type => (
          <button
            key={type}
            onClick={() => handleAdd(type)}
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
            {type === 'drug' ? '+ Drug Row' : type === 'text' ? '+ Text Row' : '+ Note Row'}
          </button>
        ))}
      </div>
    </div>
  )
}
