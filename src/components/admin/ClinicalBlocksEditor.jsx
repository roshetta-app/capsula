

/**
 * src/components/admin/ClinicalBlocksEditor.jsx
 * Phase 3C — Clinical Blocks Editor
 *
 * Embedded inside ConditionEditor as a tab / expandable section.
 * Manages the clinical_blocks JSONB array on a condition.
 *
 * Props:
 *   conditionId   string          — UUID of the condition being edited
 *   initialBlocks object[]        — current clinical_blocks array from DB
 *   onSaved       (blocks) => void — called after successful save
 */

import { useState, useCallback, useRef } from 'react'
// crypto.randomUUID() is available in all modern browsers — no package needed
const uuidv4 = () => crypto.randomUUID()
import {
  GripVertical, Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import TagInput       from './TagInput'
import ConfirmModal   from './ConfirmModal'
import { useToast }   from '../../context/ToastContext'
import { useDirtyState } from '../../hooks/useDirtyState'
import { supabase }   from '../../lib/supabase'
import { touchAppMetadata } from '../../lib/adminQueries'
import ImageManager   from '../../pages/admin/ImageManager'

// ─── Block type definitions ───────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'clinical_picture', label: 'Clinical Picture', icon: '🩺', kind: 'text' },
  { type: 'examination',      label: 'Examination',      icon: '🔍', kind: 'text' },
  { type: 'investigations',   label: 'Investigations',   icon: '🧪', kind: 'text' },
  { type: 'management',       label: 'Management',       icon: '💊', kind: 'text' },
  { type: 'red_flags',        label: 'Red Flags',        icon: '🚩', kind: 'list' },
  { type: 'differential',     label: 'Differential Dx',  icon: '🔀', kind: 'list' },
  { type: 'note',             label: 'Note / NB',        icon: '📝', kind: 'note' },
  { type: 'image_gallery',    label: 'Image Gallery',    icon: '🖼️', kind: 'gallery' },
  { type: 'prescription',     label: 'Prescription',     icon: '💉', kind: 'prescription' },
]

function emptyContent(type) {
  const def = BLOCK_TYPES.find(b => b.type === type)
  switch (def?.kind) {
    case 'text':    return { text: '' }
    case 'list':    return { items: [] }
    case 'note':    return { text: '', label: '' }
    case 'gallery': return { image_ids: [] }
    case 'prescription': return { intro: '', sections: [], footer: '' }
    default:        return {}
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClinicalBlocksEditor({ conditionId, initialBlocks = [], onSaved }) {
  const { toast } = useToast()

  // Normalise: ensure position is set and blocks are sorted
  const normalise = (blocks) =>
    [...blocks]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((b, i) => ({ ...b, position: i + 1 }))

  const [blocks,  setBlocks]  = useState(() => normalise(initialBlocks))
  const [saving,  setSaving]  = useState(false)
  const [editingId, setEditingId] = useState(null)   // block id being edited inline
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [deleteTarget, setDeleteTarget]     = useState(null)  // block id to confirm-delete

  // Dirty state: compare against saved version
  const isDirty = useDirtyState(normalise(initialBlocks), blocks)

  // ── Drag-to-reorder state ────────────────────────────────────────────────
  const dragIdx  = useRef(null)
  const overIdx  = useRef(null)

  function onDragStart(idx) { dragIdx.current = idx }
  function onDragEnter(idx) { overIdx.current = idx }
  function onDragEnd() {
    const from = dragIdx.current
    const to   = overIdx.current
    if (from === null || to === null || from === to) { dragIdx.current = overIdx.current = null; return }
    setBlocks(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((b, i) => ({ ...b, position: i + 1 }))
    })
    dragIdx.current = overIdx.current = null
  }

  // ── Block CRUD ────────────────────────────────────────────────────────────

  function addBlock(type) {
    const newBlock = {
      id:       uuidv4(),
      type,
      position: blocks.length + 1,
      content:  emptyContent(type),
    }
    setBlocks(prev => [...prev, newBlock])
    setEditingId(newBlock.id)
    setShowTypePicker(false)
  }

  function updateBlockContent(id, content) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  function deleteBlock(id) {
    setBlocks(prev =>
      prev.filter(b => b.id !== id).map((b, i) => ({ ...b, position: i + 1 }))
    )
    if (editingId === id) setEditingId(null)
    setDeleteTarget(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('conditions')
      .update({ clinical_blocks: blocks })
      .eq('id', conditionId)

    if (error) {
      toast.error(error.message ?? 'Save failed')
      setSaving(false)
      return
    }

    await touchAppMetadata('conditions_updated_at')
    toast.success('Clinical blocks saved')
    setSaving(false)
    onSaved?.(blocks)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          {isDirty && (
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 600,
              color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              • Unsaved changes
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          style={saveBtnStyle(isDirty, saving)}
        >
          {saving ? 'Saving…' : 'Save Blocks'}
        </button>
      </div>

      {/* ── Block list ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {blocks.length === 0 && (
          <div style={{
            padding: 'var(--space-6)', textAlign: 'center',
            color: 'var(--color-text-tertiary)', fontSize: 13,
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            No blocks yet — add one below
          </div>
        )}

        {blocks.map((block, idx) => (
          <BlockCard
            key={block.id}
            block={block}
            idx={idx}
            conditionId={conditionId}
            isEditing={editingId === block.id}
            onEdit={() => setEditingId(id => id === block.id ? null : block.id)}
            onDelete={() => setDeleteTarget(block.id)}
            onChange={content => updateBlockContent(block.id, content)}
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      {/* ── Add Block button + type picker ──────────────────────────────────── */}
      <div style={{ marginTop: 'var(--space-3)', position: 'relative' }}>
        <button
          onClick={() => setShowTypePicker(p => !p)}
          style={addBtnStyle}
        >
          <Plus size={15} />
          Add Block
          {showTypePicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showTypePicker && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 20,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: 'var(--space-2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-1)',
            minWidth: 280,
          }}>
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                style={typePickerItemStyle}
              >
                <span style={{ fontSize: 18 }}>{bt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{bt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteBlock(deleteTarget)}
        title="Delete Block"
        message="This block will be permanently removed from this condition's clinical content."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}

// ─── BlockCard ────────────────────────────────────────────────────────────────

function BlockCard({ block, idx, conditionId, isEditing, onEdit, onDelete, onChange, onDragStart, onDragEnter, onDragEnd }) {
  const def = BLOCK_TYPES.find(b => b.type === block.type) ?? { label: block.type, icon: '📄', kind: 'text' }

  const preview = getPreview(block)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Card header row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: 'var(--space-2) var(--space-3)',
        gap: 'var(--space-2)',
        backgroundColor: isEditing ? 'var(--color-accent-light)' : 'transparent',
        borderBottom: isEditing ? '1px solid var(--color-border)' : 'none',
        cursor: 'grab',
      }}>
        {/* Drag handle */}
        <GripVertical size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />

        {/* Type badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)',
          padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0,
        }}>
          {def.icon} {def.label}
        </span>

        {/* Preview */}
        {!isEditing && (
          <span style={{
            flex: 1, fontSize: 13, color: 'var(--color-text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {preview || <em style={{ opacity: 0.5 }}>Empty</em>}
          </span>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', marginLeft: 'auto', flexShrink: 0 }}>
          <IconBtn
            icon={isEditing ? <Check size={14} /> : <Pencil size={14} />}
            onClick={onEdit}
            title={isEditing ? 'Done' : 'Edit'}
            variant={isEditing ? 'success' : 'default'}
          />
          <IconBtn icon={<Trash2 size={14} />} onClick={onDelete} title="Delete" variant="danger" />
        </div>
      </div>

      {/* Inline editor */}
      {isEditing && (
        <div style={{ padding: 'var(--space-3)' }}>
          <BlockEditor block={block} onChange={onChange} conditionId={conditionId} />
        </div>
      )}
    </div>
  )
}

// ─── BlockEditor — switches on kind ──────────────────────────────────────────

function BlockEditor({ block, onChange, conditionId }) {
  const def = BLOCK_TYPES.find(b => b.type === block.type) ?? { kind: 'text' }
  const c   = block.content ?? {}

  switch (def.kind) {
    case 'text':
      return (
        <textarea
          value={c.text ?? ''}
          onChange={e => onChange({ ...c, text: e.target.value })}
          placeholder="Write content here… (Arabic text supported)"
          dir="auto"
          rows={5}
          style={textareaStyle}
        />
      )

    case 'list':
      return (
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-1)' }}>
            Type and press Enter to add items
          </div>
          <TagInput
            tags={c.items ?? []}
            onChange={items => onChange({ ...c, items })}
            placeholder="Add item…"
          />
        </div>
      )

    case 'note':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <input
            type="text"
            value={c.label ?? ''}
            onChange={e => onChange({ ...c, label: e.target.value })}
            placeholder="Label (optional, e.g. NB / Important)"
            style={inputStyle}
          />
          <textarea
            value={c.text ?? ''}
            onChange={e => onChange({ ...c, text: e.target.value })}
            placeholder="Note content… (Arabic supported)"
            dir="auto"
            rows={4}
            style={textareaStyle}
          />
        </div>
      )

    case 'gallery':
      return (
        <ImageManager conditionId={conditionId} />
      )

    case 'prescription':
      return (
        <PrescriptionEditor content={c} onChange={onChange} />
      )

    default:
      return (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Unknown block type: {block.type}
        </div>
      )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPreview(block) {
  const c = block.content ?? {}
  switch (block.type) {
    case 'red_flags':
    case 'differential':
      return (c.items ?? []).slice(0, 3).join(' · ') || ''
    case 'note':
      return [c.label, c.text].filter(Boolean).join(': ').slice(0, 80)
    case 'image_gallery':
      return `${(c.image_ids ?? []).length} image(s)`
    case 'prescription': {
      const parts = []
      if (c.intro) parts.push(c.intro.slice(0, 40))
      const drugCount = (c.sections ?? []).reduce((n, s) => n + (s.drugs?.length ?? 0), 0)
      if (drugCount) parts.push(`${drugCount} drug(s)`)
      return parts.join(' · ') || ''
    }
    default:
      return (c.text ?? '').slice(0, 80)
  }
}

// ─── Micro components ─────────────────────────────────────────────────────────

function IconBtn({ icon, onClick, title, variant = 'default' }) {
  const colors = {
    default: { color: 'var(--color-text-tertiary)', hoverBg: 'var(--color-bg)' },
    danger:  { color: 'var(--color-danger)',         hoverBg: '#FEE2E2' },
    success: { color: 'var(--color-success)',         hoverBg: '#D1FAE5' },
  }[variant]

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        border: 'none', borderRadius: 'var(--radius-sm)',
        backgroundColor: 'transparent',
        color: colors.color,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  )
}

// ─── PrescriptionEditor ───────────────────────────────────────────────────────
//
// Manages the prescription block content inline in the CMS.
// Sections can be of three kinds:
//   'bullets' — a list of bullet points (e.g. use of antibiotics rationale)
//   'drugs'   — a list of drug name + dosage pairs separated by OR
//   'text'    — a plain prose paragraph (e.g. drug choice summary)
//
// The editor lets you add/remove sections and add/remove items within each.

function PrescriptionEditor({ content, onChange }) {
  const c = content ?? {}
  const sections = c.sections ?? []

  function updateField(field, value) {
    onChange({ ...c, [field]: value })
  }

  function addSection(kind) {
    const newSection = kind === 'drugs'
      ? { label: '', kind: 'drugs',   drugs: [{ name: '', dose: '' }] }
      : kind === 'bullets'
      ? { label: '', kind: 'bullets', items: [''] }
      : { label: '', kind: 'text',   text: '' }
    onChange({ ...c, sections: [...sections, newSection] })
  }

  function updateSection(idx, section) {
    const next = sections.map((s, i) => i === idx ? section : s)
    onChange({ ...c, sections: next })
  }

  function removeSection(idx) {
    onChange({ ...c, sections: sections.filter((_, i) => i !== idx) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      {/* Intro */}
      <div>
        <div style={sectionLabelStyle}>Opening statement (optional)</div>
        <textarea
          value={c.intro ?? ''}
          onChange={e => updateField('intro', e.target.value)}
          placeholder="e.g. Self-limited condition that normally resolves within 1 week…"
          dir="auto"
          rows={2}
          style={textareaStyle}
        />
      </div>

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={si} style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        }}>
          {/* Section header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--color-accent)',
              backgroundColor: 'var(--color-accent-light)',
              padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0,
            }}>
              {section.kind === 'drugs' ? '💊 Drugs' : section.kind === 'bullets' ? '• Bullets' : '¶ Text'}
            </span>
            <button
              type="button"
              onClick={() => removeSection(si)}
              style={{
                marginLeft: 'auto', border: 'none', background: 'none',
                color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12,
              }}
            >
              Remove section
            </button>
          </div>

          {/* Section label */}
          <input
            type="text"
            value={section.label ?? ''}
            onChange={e => updateSection(si, { ...section, label: e.target.value })}
            placeholder="Section heading (optional, e.g. Use of antibiotics)"
            style={inputStyle}
          />

          {/* Bullet items */}
          {section.kind === 'bullets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(section.items ?? []).map((item, ii) => (
                <div key={ii} style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={item}
                    dir="auto"
                    onChange={e => {
                      const items = section.items.map((v, j) => j === ii ? e.target.value : v)
                      updateSection(si, { ...section, items })
                    }}
                    placeholder={`Item ${ii + 1}…`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateSection(si, { ...section, items: section.items.filter((_, j) => j !== ii) })}
                    style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 13 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateSection(si, { ...section, items: [...(section.items ?? []), ''] })}
                style={ghostBtnStyle}
              >
                + Add item
              </button>
            </div>
          )}

          {/* Drug entries */}
          {section.kind === 'drugs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(section.drugs ?? []).map((drug, di) => (
                <div key={di}>
                  {di > 0 && (
                    <div style={{
                      textAlign: 'center', fontSize: 11, fontWeight: 700,
                      color: 'var(--color-text-tertiary)', letterSpacing: '0.08em',
                      margin: '4px 0 8px',
                    }}>
                      — OR —
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={drug.name}
                        dir="auto"
                        onChange={e => {
                          const drugs = section.drugs.map((d, j) => j === di ? { ...d, name: e.target.value } : d)
                          updateSection(si, { ...section, drugs })
                        }}
                        placeholder="Drug name & strength (e.g. Syp. Co-Amoxiclave 312.50mg/5ml)"
                        style={{ ...inputStyle, flex: 1, fontWeight: 600 }}
                      />
                      <button
                        type="button"
                        onClick={() => updateSection(si, { ...section, drugs: section.drugs.filter((_, j) => j !== di) })}
                        style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={drug.dose}
                      dir="auto"
                      onChange={e => {
                        const drugs = section.drugs.map((d, j) => j === di ? { ...d, dose: e.target.value } : d)
                        updateSection(si, { ...section, drugs })
                      }}
                      placeholder="Dosage (e.g. 10mg/kg/day x TDS x 10 days)"
                      style={{ ...inputStyle, color: 'var(--color-text-secondary)', fontSize: 13 }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateSection(si, { ...section, drugs: [...(section.drugs ?? []), { name: '', dose: '' }] })}
                style={ghostBtnStyle}
              >
                + Add OR option
              </button>
            </div>
          )}

          {/* Plain text */}
          {section.kind === 'text' && (
            <textarea
              value={section.text ?? ''}
              onChange={e => updateSection(si, { ...section, text: e.target.value })}
              placeholder="Plain text (e.g. Drug of choice: Penicillin, Co-Amoxiclave…)"
              dir="auto"
              rows={3}
              style={textareaStyle}
            />
          )}
        </div>
      ))}

      {/* Add section buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => addSection('bullets')} style={ghostBtnStyle}>+ Bullet list</button>
        <button type="button" onClick={() => addSection('drugs')}   style={ghostBtnStyle}>+ Drug group</button>
        <button type="button" onClick={() => addSection('text')}    style={ghostBtnStyle}>+ Text section</button>
      </div>

      {/* Footer */}
      <div>
        <div style={sectionLabelStyle}>Closing line (optional, e.g. Duration of treatment)</div>
        <input
          type="text"
          value={c.footer ?? ''}
          onChange={e => updateField('footer', e.target.value)}
          placeholder="e.g. Duration of treatment: 5 – 10 days"
          style={inputStyle}
        />
      </div>
    </div>
  )
}

const sectionLabelStyle = {
  fontSize: 12, color: 'var(--color-text-tertiary)',
  marginBottom: 'var(--space-1)', fontWeight: 500,
}

const ghostBtnStyle = {
  display: 'inline-flex', alignItems: 'center',
  padding: '6px 12px',
  border: '1px dashed var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 13, fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

// ─── Style constants ──────────────────────────────────────────────────────────

const textareaStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14, fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none', resize: 'vertical', lineHeight: 1.6,
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14, fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

const addBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
  padding: '10px var(--space-4)',
  border: '1.5px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
  cursor: 'pointer', width: '100%', justifyContent: 'center',
}

const typePickerItemStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13, fontFamily: 'var(--font-body)',
  cursor: 'pointer', textAlign: 'left',
}

function saveBtnStyle(isDirty, saving) {
  return {
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
    cursor: saving || !isDirty ? 'default' : 'pointer',
    opacity: !isDirty ? 0.45 : saving ? 0.7 : 1,
    boxShadow: isDirty ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none',
    transition: 'box-shadow 0.2s, opacity 0.2s',
  }
}


