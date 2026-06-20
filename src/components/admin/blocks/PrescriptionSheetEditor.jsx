/**
 * src/components/admin/blocks/PrescriptionSheetEditor.jsx
 *
 * Phase 1 changes (prescription redesign):
 *   - Replaced separate Drug (library) / Drug (free text) row types with a
 *     single unified 'drug' row_type, using UnifiedDrugRowEditor.
 *     Old drug_library and drug_freetext add-row buttons replaced with one
 *     "+ Drug" button.
 *   - Added 'section_header' row type with a simple label field (§2.4).
 *   - Wired PromoteAlternativeDialog (§2.2a / step 1.11): attempting to
 *     delete a 'drug' row that has alternatives now shows a promote dialog
 *     instead of immediately removing the row.
 *   - rowSummary and ROW_TYPE_LABELS updated for new row types.
 *   - _formulationMeta (and any other underscore-prefixed transient fields)
 *     are still the parent's responsibility to strip before persisting;
 *     this behaviour is unchanged.
 *
 * Data shape (block.data):
 *   {
 *     label: string,
 *     rows: Array<
 *       | { row_type: "drug",           id, brand_name, brand_id, generic_name, generic_id,
 *                                       formulation_id, concentration, form, dose,
 *                                       note_en, note_ar, drug_link_enabled, source_flag,
 *                                       alternatives: AlternativeDrug[] }
 *       | { row_type: "section_header", id, label }
 *       | { row_type: "note",           id, text_en, text_ar }
 *       | { row_type: "free_text",      id, content }
 *     >
 *   }
 *
 * Legacy row_type values ("drug_library", "drug_freetext") may still exist
 * in persisted data for rows not yet touched by an editor. The RowCard
 * renderer treats them gracefully: both render via UnifiedDrugRowEditor,
 * mapping old field names on the fly (dose_override→dose, drug_name→brand_name,
 * dose_text→dose) so no data migration is required.
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import UnifiedDrugRowEditor, { PromoteAlternativeDialog } from './rows/UnifiedDrugRowEditor'
import NoteRowEditor         from './rows/NoteRowEditor'
import FreeTextPostEditor    from './FreeTextPostEditor'
import { DRUG_ROW_TEMPLATE, promoteAlternativeToMain } from '../../../constants/prescriptionRowSchema'
import { nanoid } from 'nanoid'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_TYPE_LABELS = {
  // New unified type
  drug:           { label: 'Drug',           color: '#6366f1' },
  section_header: { label: 'Section',        color: '#10b981' },
  note:           { label: 'Note',           color: '#f59e0b' },
  free_text:      { label: 'Text Block',     color: '#1D4ED8' },
  // Legacy types — still renderable, will be normalised on next edit
  drug_library:   { label: 'Drug (library)', color: '#6366f1' },
  drug_freetext:  { label: 'Drug (text)',    color: '#0ea5e9' },
}

// ─── Row type chip ─────────────────────────────────────────────────────────────

function RowTypeChip({ rowType }) {
  const cfg = ROW_TYPE_LABELS[rowType] ?? { label: rowType, color: '#9ca3af' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: 99,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: cfg.color + '18',
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Row summary (one-line collapsed view) ─────────────────────────────────────

function rowSummary(row) {
  // New unified drug row
  if (row.row_type === 'drug') {
    const name = row.brand_name || row.generic_name || ''
    const rest = [row.concentration, row.form].filter(Boolean).join(' ')
    return [name, rest].filter(Boolean).join(' ') || 'Empty drug'
  }
  // Legacy: drug_library
  if (row.row_type === 'drug_library') {
    const m = row._formulationMeta
    if (m) return `${m.name_en} ${m.concentration} ${m.form}`.trim()
    return row.formulation_id ? `Formulation ${row.formulation_id.slice(0, 8)}…` : 'No formulation selected'
  }
  // Legacy: drug_freetext
  if (row.row_type === 'drug_freetext') {
    return [row.drug_name, row.dose_text].filter(Boolean).join(' — ') || 'Empty drug'
  }
  if (row.row_type === 'section_header') {
    return row.label || 'Untitled section'
  }
  if (row.row_type === 'note') {
    return row.text_en || row.text || 'Empty note'
  }
  if (row.row_type === 'free_text') {
    const md = row.content ?? row.markdown ?? ''
    return md.length > 60 ? md.slice(0, 60) + '…' : md || 'Empty text block'
  }
  return ''
}

// ─── Normalise legacy rows to new shape on first edit ─────────────────────────
// Called when a legacy row is passed to onChange so it gets upgraded in state.

function normaliseLegacyDrugRow(row) {
  if (row.row_type === 'drug') return row // already new
  if (row.row_type === 'drug_library') {
    const m = row._formulationMeta
    return {
      ...DRUG_ROW_TEMPLATE,
      id:               row.id ?? nanoid(),
      row_type:         'drug',
      generic_name:     m?.name_en ?? null,
      formulation_id:   row.formulation_id ?? null,
      concentration:    m?.concentration ?? null,
      form:             m?.form ?? null,
      dose:             row.dose_override ?? null,
      note_en:          row.note_en ?? null,
      note_ar:          row.note_ar ?? null,
      drug_link_enabled: row.drug_link_enabled ?? true,
      _formulationMeta: m ?? null,
    }
  }
  if (row.row_type === 'drug_freetext') {
    return {
      ...DRUG_ROW_TEMPLATE,
      id:           row.id ?? nanoid(),
      row_type:     'drug',
      brand_name:   row.drug_name ?? null,
      dose:         row.dose_text ?? null,
    }
  }
  return row
}

// ─── Section header editor (inline, simple) ───────────────────────────────────

function SectionHeaderRowEditor({ row, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Section label
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          e.g. "For fever", "For cough"
        </span>
      </div>
      <input
        type="text"
        value={row.label ?? ''}
        onChange={e => onChange({ ...row, label: e.target.value })}
        placeholder="Section heading…"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '7px 10px',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13, fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          outline: 'none',
          fontWeight: 600,
        }}
      />
    </div>
  )
}

// ─── Individual row card ───────────────────────────────────────────────────────

function RowCard({ row, idx, total, onChange, onMove, onDeleteRequest }) {
  const [expanded, setExpanded] = useState(row._isNew ?? false)
  const cfg = ROW_TYPE_LABELS[row.row_type] ?? { color: '#9ca3af' }

  // Normalise legacy drug rows on first change
  function handleEditorChange(nextRow) {
    onChange(nextRow)
  }

  // For drug rows that are legacy, normalise when expanding so the unified
  // editor receives a clean shape. We do this once on expand by firing onChange.
  function handleExpand() {
    const nowExpanded = !expanded
    setExpanded(nowExpanded)
    if (nowExpanded && (row.row_type === 'drug_library' || row.row_type === 'drug_freetext')) {
      onChange(normaliseLegacyDrugRow(row))
    }
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* ── Row header ── */}
      <div
        onClick={handleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          background: cfg.color + '12',
          borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
          userSelect: 'none',
        }}
      >
        {/* Index */}
        <span style={{
          fontSize: 11, color: 'var(--color-text-tertiary)',
          fontWeight: 600, minWidth: 18, textAlign: 'center',
        }}>
          {idx + 1}
        </span>

        <RowTypeChip rowType={row.row_type} />

        {/* Summary */}
        <span style={{
          flex: 1, fontSize: 13,
          color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {rowSummary(row)}
        </span>

        {/* ↑ ↓ 🗑 controls */}
        <div
          style={{ display: 'flex', gap: 2, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onMove(idx, -1)}
            disabled={idx === 0}
            title="Move up"
            style={iconBtn(idx === 0)}
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => onMove(idx, 1)}
            disabled={idx === total - 1}
            title="Move down"
            style={iconBtn(idx === total - 1)}
          >
            <ChevronDown size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(idx)}
            title="Remove row"
            style={iconBtn(false, true)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Expanded editor ── */}
      {expanded && (
        <div style={{ padding: '12px 14px' }}>
          {(row.row_type === 'drug' || row.row_type === 'drug_library' || row.row_type === 'drug_freetext') && (
            <UnifiedDrugRowEditor row={row} onChange={handleEditorChange} />
          )}
          {row.row_type === 'section_header' && (
            <SectionHeaderRowEditor row={row} onChange={handleEditorChange} />
          )}
          {row.row_type === 'note' && (
            <NoteRowEditor row={row} onChange={handleEditorChange} />
          )}
          {row.row_type === 'free_text' && (
            <FreeTextPostEditor
              data={{ markdown: row.content ?? row.markdown ?? '' }}
              onChange={patch => handleEditorChange({ ...row, content: patch.markdown, markdown: patch.markdown })}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Icon button style helper ──────────────────────────────────────────────────

function iconBtn(disabled = false, danger = false) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26,
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    background: 'transparent',
    color: disabled
      ? 'var(--color-text-tertiary)'
      : danger ? '#ef4444' : 'var(--color-text-secondary)',
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? 'default' : 'pointer',
    padding: 0,
    flexShrink: 0,
  }
}

// ─── Add-row buttons ───────────────────────────────────────────────────────────

function AddRowButton({ label, color, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 14px',
        border: `1.5px solid ${hovered ? color : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        background: hovered ? color + '12' : 'var(--color-surface)',
        color: hovered ? color : 'var(--color-text-secondary)',
        fontSize: 12, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      + {label}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PrescriptionSheetEditor({ block, onChange }) {
  const data  = block?.data ?? {}
  const label = data.label ?? ''
  const rows  = data.rows  ?? []

  // State for the promote dialog (step 1.11)
  // { rowIdx: number } when open, null when closed
  const [promoteDialog, setPromoteDialog] = useState(null)

  function update(patch) {
    onChange({ label, rows, ...patch })
  }

  // ── Row mutations ──────────────────────────────────────────────────────────

  function addRow(newRow) {
    update({ rows: [...rows, { ...newRow, _isNew: true }] })
  }

  function updateRow(idx, nextRow) {
    const next = rows.map((r, i) => i === idx ? { ...nextRow, _isNew: false } : r)
    update({ rows: next })
  }

  function moveRow(idx, direction) {
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= rows.length) return
    const next = [...rows]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    update({ rows: next })
  }

  // Delete request: if it's a drug row with alternatives, show the promote
  // dialog instead of deleting immediately (step 1.11).
  function handleDeleteRequest(idx) {
    const row = rows[idx]
    const isDrug = row.row_type === 'drug' || row.row_type === 'drug_library' || row.row_type === 'drug_freetext'
    const hasAlternatives = isDrug && (row.alternatives ?? []).length > 0
    if (hasAlternatives) {
      setPromoteDialog({ rowIdx: idx })
    } else {
      deleteRow(idx)
    }
  }

  function deleteRow(idx) {
    update({ rows: rows.filter((_, i) => i !== idx) })
  }

  // Promote an alternative to the main slot, then remove the original row
  function handlePromote(altIndex) {
    const { rowIdx } = promoteDialog
    const row = rows[rowIdx]
    const promoted = promoteAlternativeToMain(row, altIndex)
    const next = rows.map((r, i) => i === rowIdx ? promoted : r)
    update({ rows: next })
    setPromoteDialog(null)
  }

  function handleDeleteAll() {
    deleteRow(promoteDialog.rowIdx)
    setPromoteDialog(null)
  }

  // ── Add templates ──────────────────────────────────────────────────────────

  function addDrug() {
    addRow({
      ...DRUG_ROW_TEMPLATE,
      id: nanoid(),
    })
  }

  function addSectionHeader() {
    addRow({
      row_type: 'section_header',
      id: nanoid(),
      label: '',
    })
  }

  function addNote() {
    addRow({
      row_type: 'note',
      id: nanoid(),
      text_en: null,
      text_ar: null,
    })
  }

  function addFreeText() {
    addRow({ row_type: 'free_text', id: nanoid(), content: '' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Sheet label ── */}
      <div>
        <div style={{ marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Sheet label
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
            shown as sub-tab name when condition has 2+ prescription sheets
          </span>
        </div>
        <input
          type="text"
          value={label}
          onChange={e => update({ label: e.target.value })}
          placeholder="e.g. Standard, Adults, Paediatric"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 10px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* ── Row list ─────────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div style={{
          textAlign: 'center', fontSize: 13,
          color: 'var(--color-text-tertiary)',
          padding: '14px 0',
          border: '1.5px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          No rows yet — add a drug, section, note, or text block below.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((row, idx) => (
            <RowCard
              key={row.id ?? idx}
              row={row}
              idx={idx}
              total={rows.length}
              onChange={nextRow => updateRow(idx, nextRow)}
              onMove={moveRow}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* ── Add-row buttons ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AddRowButton label="Drug"         color="#6366f1" onClick={addDrug} />
        <AddRowButton label="Section"      color="#10b981" onClick={addSectionHeader} />
        <AddRowButton label="Note"         color="#f59e0b" onClick={addNote} />
        <AddRowButton label="Text Block"   color="#1D4ED8" onClick={addFreeText} />
      </div>

      {/* ── Promote-alternative dialog (step 1.11) ─────────────────────────── */}
      {promoteDialog && (
        <PromoteAlternativeDialog
          row={rows[promoteDialog.rowIdx]}
          onPromote={handlePromote}
          onDeleteAll={handleDeleteAll}
          onCancel={() => setPromoteDialog(null)}
        />
      )}

    </div>
  )
}
