/**
 * src/components/admin/blocks/PrescriptionSheetEditor.jsx
 *
 * Changes:
 *   - Removed the distinct colored top-edge border from RowCard.
 *     All four borders are now uniform (1px solid var(--color-border)).
 *   - Row header background is a faint per-type color tint (color + '12')
 *     matching the rx-level block header style, instead of transparent / color-bg.
 *   - The rows section beneath the sheet label now mirrors the rx-level block map:
 *     a labelled section header, the row list, and the add-row buttons rendered
 *     in the same visual grouping used for top-level blocks.
 *
 * Data shape (block.data):
 *   {
 *     label: string,
 *     rows: Array<
 *       | { row_type: "drug_library",  formulation_id, _formulationMeta?, dose_override, note_en, note_ar, drug_link_enabled }
 *       | { row_type: "drug_freetext", drug_name, dose_text }
 *       | { row_type: "note",          text, flavor? }
 *       | { row_type: "free_text",     markdown }
 *     >
 *   }
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import DrugLibraryRowEditor  from './rows/DrugLibraryRowEditor'
import DrugFreetextRowEditor from './rows/DrugFreetextRowEditor'
import NoteRowEditor         from './rows/NoteRowEditor'
import FreeTextPostEditor    from './FreeTextPostEditor'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_TYPE_LABELS = {
  drug_library:  { label: 'Drug (library)',   color: '#6366f1' },
  drug_freetext: { label: 'Drug (free text)', color: '#0ea5e9' },
  note:          { label: 'Note',             color: '#f59e0b' },
  free_text:     { label: 'Text Block',       color: '#1D4ED8' },
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
  if (row.row_type === 'drug_library') {
    const m = row._formulationMeta
    if (m) return `${m.name_en} ${m.concentration} ${m.form}`.trim()
    return row.formulation_id ? `Formulation ${row.formulation_id.slice(0, 8)}…` : 'No formulation selected'
  }
  if (row.row_type === 'drug_freetext') {
    return [row.drug_name, row.dose_text].filter(Boolean).join(' — ') || 'Empty drug'
  }
  if (row.row_type === 'note') {
    return row.text || 'Empty note'
  }
  if (row.row_type === 'free_text') {
    const md = row.markdown ?? ''
    return md.length > 60 ? md.slice(0, 60) + '…' : md || 'Empty text block'
  }
  return ''
}

// ─── Individual row card ───────────────────────────────────────────────────────

function RowCard({ row, idx, total, onChange, onMove, onDelete }) {
  const [expanded, setExpanded] = useState(row._isNew ?? false)
  const cfg = ROW_TYPE_LABELS[row.row_type] ?? { color: '#9ca3af' }

  function handleEditorChange(nextRow) {
    onChange(nextRow)
  }

  return (
    <div style={{
      // Uniform border — no colored top edge (removed Decision 4 colored top border)
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* ── Row header ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          // Faint per-type color tint — same pattern as rx-level block headers
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
            onClick={() => onDelete(idx)}
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
          {row.row_type === 'drug_library'  && <DrugLibraryRowEditor  row={row} onChange={handleEditorChange} />}
          {row.row_type === 'drug_freetext' && <DrugFreetextRowEditor row={row} onChange={handleEditorChange} />}
          {row.row_type === 'note'          && <NoteRowEditor         row={row} onChange={handleEditorChange} />}
          {row.row_type === 'free_text'     && (
            <FreeTextPostEditor
              data={{ markdown: row.markdown ?? '' }}
              onChange={patch => handleEditorChange({ ...row, markdown: patch.markdown })}
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

// ─── BlockMap — the shared drug / note / text add-row section ─────────────────
//
// Mirrors the rx-level block list appearance: a faint-bg labelled section header
// above the row list, followed by the add-row buttons.  Used both for the sheet's
// own rows and (in future) for any per-sheet sub-sections.

function BlockMap({ rows, onAddDrugLibrary, onAddDrugFreetext, onAddNote, onAddFreeText, children }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* Section header — faint bg, same as rx-level block header tint */}
      <div style={{
        padding: '7px 12px',
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Rows
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {rows.length} item{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Row list or empty state */}
      <div style={{ padding: '10px 10px 0' }}>
        {children}
      </div>

      {/* Add-row buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 10px 10px' }}>
        <AddRowButton label="Drug (free text)" color="#0ea5e9" onClick={onAddDrugFreetext} />
        <AddRowButton label="Drug (library)"   color="#6366f1" onClick={onAddDrugLibrary} />
        <AddRowButton label="Note"             color="#f59e0b" onClick={onAddNote} />
        <AddRowButton label="Text Block"       color="#1D4ED8" onClick={onAddFreeText} />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PrescriptionSheetEditor({ block, onChange }) {
  const data  = block?.data ?? {}
  const label = data.label ?? ''
  const rows  = data.rows  ?? []

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

  function deleteRow(idx) {
    update({ rows: rows.filter((_, i) => i !== idx) })
  }

  // ── Add templates ──────────────────────────────────────────────────────────

  function addDrugLibrary() {
    addRow({
      row_type:          'drug_library',
      formulation_id:    null,
      _formulationMeta:  null,
      dose_override:     null,
      note_en:           null,
      note_ar:           null,
      drug_link_enabled: true,
    })
  }

  function addDrugFreetext() {
    addRow({ row_type: 'drug_freetext', drug_name: '', dose_text: '' })
  }

  function addNote() {
    addRow({ row_type: 'note', text: '', flavor: 'info' })
  }

  function addFreeText() {
    addRow({ row_type: 'free_text', markdown: '' })
  }

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

      {/* ── Block map: rows under the sheet label ─────────────────────────────
          Mirrors the rx-level block list: labelled section header, row cards,
          add-row buttons — all inside a single bordered container.
      ──────────────────────────────────────────────────────────────────────── */}
      <BlockMap
        rows={rows}
        onAddDrugLibrary={addDrugLibrary}
        onAddDrugFreetext={addDrugFreetext}
        onAddNote={addNote}
        onAddFreeText={addFreeText}
      >
        {rows.length === 0 ? (
          <div style={{
            textAlign: 'center', fontSize: 13,
            color: 'var(--color-text-tertiary)',
            padding: '14px 0',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 10,
          }}>
            No rows yet — add a drug, note, or text block below.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {rows.map((row, idx) => (
              <RowCard
                key={idx}
                row={row}
                idx={idx}
                total={rows.length}
                onChange={nextRow => updateRow(idx, nextRow)}
                onMove={moveRow}
                onDelete={deleteRow}
              />
            ))}
          </div>
        )}
      </BlockMap>

    </div>
  )
}
