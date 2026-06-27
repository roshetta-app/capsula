/**
 * src/components/admin/blocks/PrescriptionSheetEditor.jsx
 *
 * Phase 1 changes (prescription redesign):
 *   - Replaced separate Drug (library) / Drug (free text) row types with a
 *     single unified 'drug' row_type, using UnifiedDrugRowEditor.
 *     Old drug_library and drug_freetext add-row buttons replaced with one
 *     "+ Drug" button.
 *   - Wired PromoteAlternativeDialog (§2.2a / step 1.11): attempting to
 *     delete a 'drug' row that has alternatives now shows a promote dialog
 *     instead of immediately removing the row.
 *   - rowSummary and ROW_TYPE_LABELS updated for new row types.
 *   - _formulationMeta (and any other underscore-prefixed transient fields)
 *     are still the parent's responsibility to strip before persisting;
 *     this behaviour is unchanged.
 *
 * PHASE 4 changes (2026-06-21, audit-and-plan §7 Phase 4, resolves §3.4):
 *   - New 'section' row_type added — see prescriptionRowSchema.js
 *     SECTION_ROW_TEMPLATE. A 'section' row is a self-contained card with
 *     its own nested `drugs[]` array, rendered via the same RowCard
 *     component used at the top level (recursion, not duplication).
 *   - The "Section" add-button creates this shape.
 *   - Row-list mutation logic (add/update/move/delete-with-promote) is
 *     factored into the useRowList() hook so both the top-level rows array
 *     and a section's nested drugs[] array share the same logic instead of
 *     two copies of it.
 *   - New cross-list actions on drug rows: "move into section…" (top-level
 *     drug rows only, shown when at least one section exists) and "move
 *     out of section" (nested drug rows only). Both are explicit buttons,
 *     no drag-and-drop.
 *   - Add actions: "+ Drug" (top level, always available), "+ Add drug"
 *     (inside an open section card only), "+ Section" (creates an empty
 *     section).
 *
 * PHASE 7 (2026-06-21): removed support for the legacy `section_header`,
 * `drug_library`, and `drug_freetext` row types — no persisted data of
 * these shapes remained in the database at the time of removal (confirmed
 * via audit before this change). `section` (Phase 4) is now the only
 * section mechanism, and `drug` (Phase 1) is now the only drug row shape.
 * Removed in this phase: ROW_TYPE_LABELS legacy entries, the
 * normaliseLegacyDrugRow() upgrade-on-expand function, and the
 * SectionHeaderRowEditor component.
 *
 * PHASE 8 (2026-06-21): gap-insert controls.
 *   - A '+' strip appears in the gap between every pair of rows, and before
 *     the first / after the last row. Hidden by default, revealed on hover
 *     or focus (keyboard) or tap (touch).
 *   - At the top-level rows list, clicking the '+' opens an inline
 *     type-picker (drug / section / note / free_text) and inserts at that
 *     exact array index — no append-then-reorder.
 *   - Inside a section's nested drugs[] list, clicking the '+' inserts a
 *     drug row directly at that index (no picker needed — sections only
 *     ever hold drug rows).
 *   - Touch devices: the strip is always rendered but opacity-hidden until
 *     a tap targets it. A per-list `activeTouchGap` index tracks which gap
 *     is "revealed"; tapping any gap either reveals it (first tap) or fires
 *     the insert (second tap on the same revealed gap). Tapping anywhere
 *     else in the editor clears the active gap. This avoids hover-only UX
 *     on touch without any external library.
 *   - useRowList gains `insertRowAt(index, newRow)` — inserts before the
 *     row currently at `index` (or appends when index === list.length).
 *
 * Data shape (block.data):
 *   {
 *     label: string,
 *     rows: Array<
 *       | { row_type: "drug",    id, brand_name, brand_id, generic_name, generic_id,
 *                                 formulation_id, concentration, form, dose, dose_who,
 *                                 note, drug_link_enabled, source_flag,
 *                                 alternatives: AlternativeDrug[] }
 *       | { row_type: "section", id, label, drugs: DrugRow[] }
 *       | { row_type: "note",    id, text_en, text_ar }
 *       | { row_type: "free_text", id, content }
 *     >
 *   }
 */

import { useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, LogOut, Plus } from 'lucide-react'
import UnifiedDrugRowEditor, { PromoteAlternativeDialog } from './rows/UnifiedDrugRowEditor'
import NoteRowEditor         from './rows/NoteRowEditor'
import FreeTextPostEditor    from './FreeTextPostEditor'
import { DRUG_ROW_TEMPLATE, SECTION_ROW_TEMPLATE, promoteAlternativeToMain } from '../../../constants/prescriptionRowSchema'
import { nanoid } from 'nanoid'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_TYPE_LABELS = {
  drug:           { label: 'Drug',           color: '#6366f1' },
  section:        { label: 'Section',        color: '#10b981' },
  note:           { label: 'Note',           color: '#f59e0b' },
  free_text:      { label: 'Text Block',     color: '#1D4ED8' },
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
  if (row.row_type === 'drug') {
    const name = row.brand_name || row.generic_name || ''
    const rest = [row.concentration, row.form].filter(Boolean).join(' ')
    return [name, rest].filter(Boolean).join(' ') || 'Empty drug'
  }
  if (row.row_type === 'section') {
    const count = (row.drugs ?? []).length
    const countLabel = count === 1 ? '1 drug' : `${count} drugs`
    return [row.label || 'Untitled section', `(${countLabel})`].join(' ')
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

// ─── Shared row-list mutation hook (PHASE 4) ──────────────────────────────────
// Add/update/move/delete-with-promote logic, factored out so both the
// top-level rows array (PrescriptionSheetEditor) and a section's nested
// drugs[] array (SectionRowEditor) share the same behaviour instead of two
// parallel copies of it.
//
//   list     — the array this hook operates on (rows, or a section's drugs)
//   onChange — (nextList) => void, called with the full replacement array

function useRowList(list, onChange) {
  // { idx } when open, null when closed
  const [promoteDialog, setPromoteDialog] = useState(null)

  function addRow(newRow) {
    onChange([...list, { ...newRow, _isNew: true }])
  }

  // PHASE 8: insert before the row currently at 'index'.
  // When index === list.length, this is equivalent to addRow (append).
  function insertRowAt(index, newRow) {
    const next = [...list]
    next.splice(index, 0, { ...newRow, _isNew: true })
    onChange(next)
  }

  function updateRow(idx, nextRow) {
    onChange(list.map((r, i) => i === idx ? { ...nextRow, _isNew: false } : r))
  }

  function moveRow(idx, direction) {
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= list.length) return
    const next = [...list]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    onChange(next)
  }

  function deleteRow(idx) {
    onChange(list.filter((_, i) => i !== idx))
  }

  // Delete request: if it's a drug row with alternatives, show the promote
  // dialog instead of deleting immediately (step 1.11).
  function handleDeleteRequest(idx) {
    const row = list[idx]
    const isDrug = row.row_type === 'drug'
    const hasAlternatives = isDrug && (row.alternatives ?? []).length > 0
    if (hasAlternatives) {
      setPromoteDialog({ idx })
    } else {
      deleteRow(idx)
    }
  }

  // Promote an alternative to the main slot, then remove the original row
  function handlePromote(altIndex) {
    const { idx } = promoteDialog
    const row = list[idx]
    const promoted = promoteAlternativeToMain(row, altIndex)
    onChange(list.map((r, i) => i === idx ? promoted : r))
    setPromoteDialog(null)
  }

  function handleDeleteAll() {
    deleteRow(promoteDialog.idx)
    setPromoteDialog(null)
  }

  return {
    addRow, insertRowAt, updateRow, moveRow, deleteRow,
    handleDeleteRequest, handlePromote, handleDeleteAll,
    promoteDialog, setPromoteDialog,
  }
}

// ─── Gap insert control — top-level list (4-type picker) ──────────────────────
//
// Props:
//   insertIndex     — array index to insert before (list.length = append)
//   onInsert        — (type: 'drug'|'section'|'note'|'free_text') => void
//   isTouchActive   — boolean, true when this gap is the touch-revealed one
//   onTouchActivate — () => void  called on first tap to reveal
//   onTouchDismiss  — () => void  called when picker closes / row inserted
//
// Hover/focus reveal: pure CSS-driven via the parent group wrapper.
// Touch reveal: driven by isTouchActive prop set by the parent list.

const TOP_LEVEL_TYPES = [
  { type: 'drug',      label: 'Drug',       color: '#6366f1' },
  { type: 'section',   label: 'Section',    color: '#10b981' },
  { type: 'note',      label: 'Note',       color: '#f59e0b' },
  { type: 'free_text', label: 'Text Block', color: '#1D4ED8' },
]

function GapInsertControl({ insertIndex, onInsert, isTouchActive, onTouchActivate, onTouchDismiss, disabled = false }) {
  const [hovered,    setHovered]    = useState(false)
  const [focused,    setFocused]    = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const visible = hovered || focused || pickerOpen || isTouchActive

  function handlePlusClick(e) {
    // On touch devices the click fires after touchstart reveals the gap.
    // If the gap is already visible (isTouchActive), open the picker.
    // Otherwise (mouse) open directly.
    if (disabled) return
    e.stopPropagation()
    setPickerOpen(true)
  }

  function handlePlusTouchStart(e) {
    if (disabled) return
    if (!isTouchActive) {
      e.preventDefault()         // prevent the subsequent mouse events
      onTouchActivate()
      return
    }
    // Already active — let click fire to open picker
  }

  function handlePickType(type) {
    onInsert(type)
    setPickerOpen(false)
    setHovered(false)
    setFocused(false)
    onTouchDismiss()
  }

  function handlePickerBlur(e) {
    // Close picker only if focus leaves the entire picker container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setPickerOpen(false)
      setFocused(false)
    }
  }

  return (
    <div
      style={{ position: 'relative', height: 20, marginTop: -4, marginBottom: -4, zIndex: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!pickerOpen) setPickerOpen(false) }}
    >
      {/* ── Horizontal rule with centred + button ── */}
      <div style={{
        position: 'absolute', inset: '50% 0 auto 0',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        <button
          type="button"
          aria-label={`Insert row at position ${insertIndex + 1}`}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (!pickerOpen) setPickerOpen(false) }}
          onTouchStart={handlePlusTouchStart}
          onClick={handlePlusClick}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, flexShrink: 0,
            borderRadius: '50%',
            border: '1.5px solid var(--color-accent)',
            background: 'var(--color-surface)',
            color: 'var(--color-accent)',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            padding: 0,
            margin: '0 6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          }}
        >
          <Plus size={11} />
        </button>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      {/* ── Inline type-picker (opens below the + button) ── */}
      {pickerOpen && (
        <div
          tabIndex={-1}
          onBlur={handlePickerBlur}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, 14px)',
            zIndex: 100,
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.13)',
            padding: '6px',
            display: 'flex', gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {TOP_LEVEL_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              type="button"
              onMouseDown={e => { e.preventDefault(); handlePickType(type) }}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${color}40`,
                background: color + '12',
                color: color,
                fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setPickerOpen(false); setFocused(false); onTouchDismiss() }}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-tertiary)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Gap insert control — section nested list (drug-only, no picker) ──────────
//
// Sections can only contain drug rows, so there is no type ambiguity —
// clicking inserts a drug row immediately. No picker UI is shown.

function GapInsertDrugOnly({ insertIndex, onInsert, isTouchActive, onTouchActivate, onTouchDismiss, disabled = false }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const visible = hovered || focused || isTouchActive

  function handleClick(e) {
    if (disabled) return
    e.stopPropagation()
    onInsert()
    onTouchDismiss()
  }

  function handleTouchStart(e) {
    if (disabled) return
    if (!isTouchActive) {
      e.preventDefault()
      onTouchActivate()
    }
    // second tap falls through to onClick
  }

  return (
    <div
      style={{ position: 'relative', height: 16, marginTop: -3, marginBottom: -3, zIndex: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        position: 'absolute', inset: '50% 0 auto 0',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        <button
          type="button"
          aria-label={`Insert drug at position ${insertIndex + 1}`}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          title="Insert drug here"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, flexShrink: 0,
            borderRadius: '50%',
            border: '1.5px solid #6366f1',
            background: 'var(--color-surface)',
            color: '#6366f1',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            padding: 0,
            margin: '0 5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Plus size={10} />
        </button>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>
    </div>
  )
}

// ─── Section row editor (PHASE 4 — nested drugs[] card) ──────────────────────
// Renders a 'section' row's label field plus its own nested drug-row list,
// each member rendered via the same RowCard component used at the top level
// (recursion, not duplication). Only drug-type rows belong here — two levels
// max (sheet -> section -> drugs).

function SectionRowEditor({ row, onChange, onMoveDrugOut, disabled = false }) {
  const drugs = row.drugs ?? []
  const {
    insertRowAt, updateRow, moveRow, handleDeleteRequest,
    promoteDialog, handlePromote, handleDeleteAll, setPromoteDialog,
  } = useRowList(drugs, nextDrugs => onChange({ ...row, drugs: nextDrugs }))

  // Touch gap reveal state for the nested list
  const [activeTouchGap, setActiveTouchGap] = useState(null)

  function addDrugAt(index) {
    insertRowAt(index, { ...DRUG_ROW_TEMPLATE, id: nanoid() })
    setActiveTouchGap(null)
  }

  // Dismiss active touch gap when tapping anywhere in the section body
  function handleSectionBodyTouch() {
    if (activeTouchGap !== null) setActiveTouchGap(null)
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      onTouchStart={handleSectionBodyTouch}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Section label
          </span>
        </div>
        <input
          type="text"
          value={row.label ?? ''}
          onChange={e => onChange({ ...row, label: e.target.value })}
          placeholder="Section heading…"
          disabled={disabled}
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

      {/* ── Nested drug rows ── */}
      {drugs.length === 0 ? (
        <>
          <GapInsertDrugOnly
            insertIndex={0}
            onInsert={() => addDrugAt(0)}
            isTouchActive={activeTouchGap === 0}
            onTouchActivate={() => setActiveTouchGap(0)}
            onTouchDismiss={() => setActiveTouchGap(null)}
            disabled={disabled}
          />
          <div style={{
            textAlign: 'center', fontSize: 12,
            color: 'var(--color-text-tertiary)',
            padding: '10px 0',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            No drugs in this section yet.
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Gap before the first row */}
          <GapInsertDrugOnly
            insertIndex={0}
            onInsert={() => addDrugAt(0)}
            isTouchActive={activeTouchGap === 0}
            onTouchActivate={() => setActiveTouchGap(0)}
            onTouchDismiss={() => setActiveTouchGap(null)}
            disabled={disabled}
          />
          {drugs.map((drug, idx) => (
            <div key={drug.id ?? idx}>
              <RowCard
                row={drug}
                idx={idx}
                total={drugs.length}
                onChange={nextRow => updateRow(idx, nextRow)}
                onMove={moveRow}
                onDeleteRequest={handleDeleteRequest}
                isNested
                onMoveOut={() => onMoveDrugOut(idx)}
                disabled={disabled}
              />
              {/* Gap after every row (including the last — acts as append) */}
              <GapInsertDrugOnly
                insertIndex={idx + 1}
                onInsert={() => addDrugAt(idx + 1)}
                isTouchActive={activeTouchGap === idx + 1}
                onTouchActivate={() => setActiveTouchGap(idx + 1)}
                onTouchDismiss={() => setActiveTouchGap(null)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Promote-alternative dialog, scoped to this section's drugs ── */}
      {promoteDialog && (
        <PromoteAlternativeDialog
          row={drugs[promoteDialog.idx]}
          onPromote={handlePromote}
          onDeleteAll={handleDeleteAll}
          onCancel={() => setPromoteDialog(null)}
        />
      )}
    </div>
  )
}


function RowCard({
  row, idx, total, onChange, onMove, onDeleteRequest,
  isNested = false, onMoveOut = null,
  sections = [], onMoveIntoSection = null,
  onMoveDrugOutOfSection = null,
  disabled = false,
}) {
  const [expanded, setExpanded] = useState(row._isNew ?? false)
  const cfg = ROW_TYPE_LABELS[row.row_type] ?? { color: '#9ca3af' }
  const isDrugRow = row.row_type === 'drug'

  function handleEditorChange(nextRow) {
    onChange(nextRow)
  }

  function handleExpand() {
    setExpanded(!expanded)
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

        {/* Move into section… / move out of section / ↑ ↓ 🗑 controls */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* PHASE 4: top-level drug rows can be filed into an existing section */}
          {isDrugRow && !isNested && sections.length > 0 && (
            <select
              value=""
              onChange={e => { if (e.target.value) onMoveIntoSection(e.target.value) }}
              title="Move into section…"
              disabled={disabled}
              style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                background: 'var(--color-surface)',
                padding: '3px 4px',
                maxWidth: 132,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <option value="">Move into section…</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.label || 'Untitled section'}</option>
              ))}
            </select>
          )}

          {/* PHASE 4: nested drug rows can be moved back out to the top level */}
          {isDrugRow && isNested && (
            <button
              type="button"
              onClick={onMoveOut}
              disabled={disabled}
              title="Move out of section"
              style={iconBtn(disabled)}
            >
              <LogOut size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onMove(idx, -1)}
            disabled={disabled || idx === 0}
            title="Move up"
            style={iconBtn(disabled || idx === 0)}
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => onMove(idx, 1)}
            disabled={disabled || idx === total - 1}
            title="Move down"
            style={iconBtn(disabled || idx === total - 1)}
          >
            <ChevronDown size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(idx)}
            disabled={disabled}
            title="Remove row"
            style={iconBtn(disabled, true)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Expanded editor ── */}
      {expanded && (
        <div style={{ padding: '12px 14px' }}>
          {isDrugRow && (
            <UnifiedDrugRowEditor key={row.id} row={row} onChange={handleEditorChange} />
          )}
          {row.row_type === 'section' && (
            <SectionRowEditor
              row={row}
              onChange={handleEditorChange}
              onMoveDrugOut={onMoveDrugOutOfSection}
              disabled={disabled}
            />
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

function AddRowButton({ label, color, onClick, disabled = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 14px',
        border: `1.5px solid ${hovered && !disabled ? color : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        background: hovered && !disabled ? color + '12' : 'var(--color-surface)',
        color: hovered && !disabled ? color : 'var(--color-text-secondary)',
        fontSize: 12, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      + {label}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PrescriptionSheetEditor({ block, onChange, disabled = false }) {
  const data  = block?.data ?? {}
  const label = data.label ?? ''
  const rows  = data.rows  ?? []

  // Touch gap reveal state for the top-level list.
  // null = no gap revealed; number = gap index currently active on touch.
  const [activeTouchGap, setActiveTouchGap] = useState(null)

  function update(patch) {
    onChange({ label, rows, ...patch })
  }

  // ── Row mutations (shared hook — same logic the section's nested drugs[]
  //    list uses, applied here to the top-level rows array) ───────────────
  const {
    addRow, insertRowAt, updateRow, moveRow,
    handleDeleteRequest, promoteDialog, handlePromote, handleDeleteAll, setPromoteDialog,
  } = useRowList(rows, nextRows => update({ rows: nextRows }))

  // ── PHASE 4: move a drug row into / out of a section ───────────────────
  // Crosses list boundaries (top-level rows <-> a section's nested drugs[]),
  // so this lives at this level rather than inside useRowList, which only
  // ever sees one list at a time.

  const sections = rows
    .filter(r => r.row_type === 'section')
    .map(r => ({ id: r.id, label: r.label }))

  function moveDrugIntoSection(topIdx, sectionId) {
    const row = rows[topIdx]
    const withoutRow = rows.filter((_, i) => i !== topIdx)
    const next = withoutRow.map(r =>
      r.row_type === 'section' && r.id === sectionId
        ? { ...r, drugs: [...(r.drugs ?? []), { ...row, _isNew: false }] }
        : r
    )
    update({ rows: next })
  }

  function moveDrugOutOfSection(sectionTopIdx, drugIdx) {
    const section = rows[sectionTopIdx]
    const sectionDrugs = section.drugs ?? []
    const drug = sectionDrugs[drugIdx]
    const remainingDrugs = sectionDrugs.filter((_, i) => i !== drugIdx)
    const next = rows.map((r, i) => i === sectionTopIdx ? { ...r, drugs: remainingDrugs } : r)
    next.splice(sectionTopIdx + 1, 0, { ...drug, _isNew: false })
    update({ rows: next })
  }

  // ── Gap insert helpers (top-level) ────────────────────────────────────

  function insertAt(index, type) {
    const templates = {
      drug:      { ...DRUG_ROW_TEMPLATE,      id: nanoid() },
      section:   { ...SECTION_ROW_TEMPLATE,   id: nanoid() },
      note:      { row_type: 'note',      id: nanoid(), text_en: null, text_ar: null },
      free_text: { row_type: 'free_text', id: nanoid(), content: '' },
    }
    insertRowAt(index, templates[type])
    setActiveTouchGap(null)
  }

  // ── Add templates (bottom buttons — still append) ──────────────────────

  function addDrug() {
    addRow({ ...DRUG_ROW_TEMPLATE, id: nanoid() })
  }

  function addSection() {
    addRow({ ...SECTION_ROW_TEMPLATE, id: nanoid() })
  }

  function addNote() {
    addRow({ row_type: 'note', id: nanoid(), text_en: null, text_ar: null })
  }

  function addFreeText() {
    addRow({ row_type: 'free_text', id: nanoid(), content: '' })
  }

  // Dismiss touch gap when tapping anywhere outside the active gap
  function handleEditorBodyTouch() {
    if (activeTouchGap !== null) setActiveTouchGap(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      onTouchStart={handleEditorBodyTouch}
    >

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
        </div>
        <input
          type="text"
          value={label}
          onChange={e => update({ label: e.target.value })}
          placeholder="e.g. Standard, Adults, Paediatric"
          disabled={disabled}
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Gap before the first row */}
          <GapInsertControl
            insertIndex={0}
            onInsert={type => insertAt(0, type)}
            isTouchActive={activeTouchGap === 0}
            onTouchActivate={() => setActiveTouchGap(0)}
            onTouchDismiss={() => setActiveTouchGap(null)}
            disabled={disabled}
          />
          {rows.map((row, idx) => (
            <div key={row.id ?? idx}>
              <RowCard
                row={row}
                idx={idx}
                total={rows.length}
                onChange={nextRow => updateRow(idx, nextRow)}
                onMove={moveRow}
                onDeleteRequest={handleDeleteRequest}
                sections={sections}
                onMoveIntoSection={sectionId => moveDrugIntoSection(idx, sectionId)}
                onMoveDrugOutOfSection={drugIdx => moveDrugOutOfSection(idx, drugIdx)}
                disabled={disabled}
              />
              {/* Gap after every row (including the last — acts as append) */}
              <GapInsertControl
                insertIndex={idx + 1}
                onInsert={type => insertAt(idx + 1, type)}
                isTouchActive={activeTouchGap === idx + 1}
                onTouchActivate={() => setActiveTouchGap(idx + 1)}
                onTouchDismiss={() => setActiveTouchGap(null)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Add-row buttons (still present — append to end) ──────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AddRowButton label="Drug"         color="#6366f1" onClick={addDrug} disabled={disabled} />
        <AddRowButton label="Section"      color="#10b981" onClick={addSection} disabled={disabled} />
        <AddRowButton label="Note"         color="#f59e0b" onClick={addNote} disabled={disabled} />
        <AddRowButton label="Text Block"   color="#1D4ED8" onClick={addFreeText} disabled={disabled} />
      </div>

      {/* ── Promote-alternative dialog (step 1.11) ─────────────────────────── */}
      {promoteDialog && (
        <PromoteAlternativeDialog
          row={rows[promoteDialog.idx]}
          onPromote={handlePromote}
          onDeleteAll={handleDeleteAll}
          onCancel={() => setPromoteDialog(null)}
        />
      )}

    </div>
  )
}

