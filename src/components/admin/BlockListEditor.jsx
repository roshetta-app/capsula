/**
 * BlockListEditor — src/components/admin/BlockListEditor.jsx
 *
 * Visual Redesign — Decisions 1, 2, 3, 5, 6
 *
 * Decision 1: Colored chip + tinted header per block type (left border REMOVED).
 * Decision 2: Collapse by default; new blocks open expanded; preview in header.
 * Decision 3: (removed 2026-11-11) the summary bar above each list is gone.
 * Decision 5: Section dividers ("Prescription Sheets", "Rx-level blocks") are
 *             real visual dividers: larger weight, full-width hairline, more space.
 * Decision 6: "Remove sheet" moved from top action bar to bottom of sheet content,
 *             rendered as a small text-style danger link.
 *
 * Left colored border fully removed from BlockCard and ActiveSheetEditor.
 *
 * Tab changes:
 *   - Rx tab is now first (default active), Clinical is second.
 *   - SubTabBar is full-width with underline active indicator (matches app tab style).
 */

import { useState, useEffect } from 'react'
import PrescriptionSheetEditor from './blocks/PrescriptionSheetEditor'
import { RX_LEVEL_TYPE, REVIEW_TYPE, emptyListBlock } from '../../utils/foldLegacyBlocks'
import PrescriptionPills from '../conditions/PrescriptionPills'
import ConfirmModal from './ConfirmModal'

// ─── Constants ────────────────────────────────────────────────────────────────

// 2026-11-12: the Rx-level blocks and the Review blocks are each ONE list block
// (rows built like a sheet's rows), edited with the same editor a sheet uses, so
// the bars, the add buttons, Select and its actions are the same everywhere and
// every row type works at every level. Older loose blocks are folded into these
// lists when a condition is opened (see utils/foldLegacyBlocks.js).
const LIST_LABELS = { [RX_LEVEL_TYPE]: 'Rx-level blocks', [REVIEW_TYPE]: 'Review' }

// ─── Sub-tab bar — full width, underline style, Treatment first ─────────────────────

const SUB_TABS = [
  { key: 'rx',       label: 'Treatment' },
  { key: 'clinical', label: 'Review'    },
]

function SubTabBar({ active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      width: '100%',
      borderBottom: '1px solid var(--color-border)',
      marginBottom: 'var(--space-4)',
    }}>
      {SUB_TABS.map(({ key, label }) => {
        const isActive = active === key
        return (
          <div
            key={key}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <button
              onClick={() => onChange(key)}
              style={{
                width: '100%',
                padding: '8px var(--space-2) 10px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-body)',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                transition: 'color 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
              }}
            >
              {label}
            </button>
            <span style={{
              display: 'block',
              height: 2,
              width: '100%',
              borderRadius: '1px 1px 0 0',
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              transition: 'background-color 0.15s ease',
              marginBottom: -1,
            }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── SheetPickerBar ───────────────────────────────────────────────────────────

// The app's treatment-plan selector (PrescriptionPills), with an "Add sheet" row in its
// menu, and a trash icon beside it that removes the open sheet (after a confirmation).
// Shown even for a single sheet so there is always a way to add another.
// With no sheets yet there is nothing to select, so only the Add button shows.
function SheetPickerBar({ sheets, activeIndex, onSelect, onAdd, onRemove, onRename, disabled }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (sheets.length === 0) {
    return (
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <button
          onClick={onAdd}
          disabled={disabled}
          style={{
            padding: '5px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 400,
            fontFamily: 'var(--font-body)',
            cursor: disabled ? 'default' : 'pointer',
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          + Add Sheet
        </button>
      </div>
    )
  }

  const activeItem  = sheets[activeIndex] ?? sheets[0]
  const activeLabel = activeItem?.block.data?.label?.trim() || `Sheet ${activeIndex + 1}`

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
        ...(disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}),
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PrescriptionPills
            prescriptions={sheets.map((item, i) => ({
              id:    item.block.id ?? `new-${item.globalIndex}`,
              label: item.block.data?.label || `Sheet ${i + 1}`,
            }))}
            activeIndex={activeIndex}
            onSelect={onSelect}
            onAdd={onAdd}
            addLabel="Add sheet"
            onRename={onRename}
            renameValue={activeItem?.block.data?.label ?? ''}
            onRemove={() => setConfirmOpen(true)}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); onRemove() }}
        title="Remove sheet?"
        message={`"${activeLabel}" and everything in it will be removed from this topic.`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </>
  )
}

// ─── ActiveSheetEditor — no left border; "Remove sheet" is the trash icon in SheetPickerBar ──

// Bug 2 fix: outer border div removed. BlockListEditor renders inside
// ConditionEditor's SectionCard which already provides the card border —
// wrapping again here created a nested box-inside-a-box (Decision 3 violation).
// Content renders flat. (2026-11-10: the bottom "Remove sheet" link moved to a trash icon
// beside the sheet selector, which asks for confirmation first.)
function ActiveSheetEditor({ block, onPatchData, disabled, otherSheets, onTransferRows }) {
  return (
    <div>
      <PrescriptionSheetEditor
        block={block}
        onChange={onPatchData}
        disabled={disabled}
        otherSheets={otherSheets}
        onTransferRows={onTransferRows}
      />
    </div>
  )
}

// ─── Zigzag separator ─────────────────────────────────────────────────────────
// The same low-opacity accent zigzag the app draws after the last sheet row
// (PrescriptionSheetBlock), stretched to the full width by repeating its shape.
function ZigzagSeparator() {
  return (
    <svg width="100%" height="8" aria-hidden="true" role="separator" style={{ display: 'block' }}>
      <defs>
        <pattern id="rx-zigzag" width="10" height="8" patternUnits="userSpaceOnUse">
          <polyline
            points="0,4 2.5,1 7.5,7 10,4"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill="url(#rx-zigzag)" />
    </svg>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--space-8) var(--space-4)',
      color: 'var(--color-text-tertiary)',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
      border: '1.5px dashed var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-bg)',
    }}>
      No prescription sheets yet. Use "+ Add Sheet" to create the first one.
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BlockListEditor({ blocks = [], onChange, disabled = false, initialTab = 'rx', initialSheetIndex = 0, onViewChange }) {
  // Treatment is the default active tab (keys stay 'rx' and 'clinical'; the tab names
  // shown are Treatment and Review).
  // 2026-11-09: initialTab / initialSheetIndex let the page editor put this view
  // back where it was after an undo or redo rebuilds the list; onViewChange
  // reports every tab or sheet change so the editor knows where it was.
  const [activeTab, setActiveTab] = useState(initialTab)
  const [activeSheetIndex, setActiveSheetIndex] = useState(initialSheetIndex)
  useEffect(() => {
    if (onViewChange) onViewChange(activeTab, activeSheetIndex)
  }, [activeTab, activeSheetIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab) {
    setActiveTab(tab)
    if (tab !== 'rx') setActiveSheetIndex(0)
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  function patchBlock(globalIndex, patch) {
    onChange(blocks.map((b, i) => i === globalIndex ? { ...b, ...patch } : b))
  }

  function patchBlockData(globalIndex, dataPatch) {
    const block = blocks[globalIndex]
    patchBlock(globalIndex, { data: { ...block.data, ...dataPatch } })
  }

  function addSheet() {
    const maxOrder = blocks.reduce((m, b) => Math.max(m, b.order_index ?? 0), -1)
    // New sheets are named "Sheet 1", "Sheet 2", … — the next number not already used.
    const used = new Set(
      blocks.filter(b => b.block_type === 'prescription_sheet').map(b => (b.data?.label ?? '').trim())
    )
    let n = blocks.filter(b => b.block_type === 'prescription_sheet').length + 1
    while (used.has(`Sheet ${n}`)) n += 1
    onChange([...blocks, {
      block_type:  'prescription_sheet',
      order_index: maxOrder + 1,
      data:        { label: `Sheet ${n}`, rows: [] },
      _isNew:      true,
    }])
  }

  function deleteBlock(globalIndex) {
    onChange(blocks.filter((_, i) => i !== globalIndex))
  }

  // The Rx-level list and the Review list: one block each, created the first time
  // something is put in it.
  function listIndex(type) {
    return blocks.findIndex(b => b.block_type === type)
  }

  function patchList(type, dataPatch) {
    const idx = listIndex(type)
    if (idx >= 0) { patchBlockData(idx, dataPatch); return }
    const maxOrder = blocks.reduce((m, b) => Math.max(m, b.order_index ?? 0), -1)
    onChange([...blocks, { ...emptyListBlock(type), order_index: maxOrder + 1, data: { rows: [], ...dataPatch } }])
  }

  // Copy or move rows from one list to the end of another (a sheet, the Rx-level list
  // or the Review list). One onChange call, so Undo brings back both lists in one step.
  // source is the list the rows come from, target is { globalIndex } or { type } (a list
  // not created yet). removeIndices are positions in the source; empty for a copy.
  function transferRows(sourceGlobalIndex, target, newRows, removeIndices) {
    if (newRows.length === 0) return
    let list = blocks
    let targetIndex = target.globalIndex
    if (targetIndex === undefined || targetIndex === null) {
      targetIndex = listIndex(target.type)
      if (targetIndex < 0) {
        const maxOrder = blocks.reduce((m, b) => Math.max(m, b.order_index ?? 0), -1)
        list = [...blocks, { ...emptyListBlock(target.type), order_index: maxOrder + 1 }]
        targetIndex = list.length - 1
      }
    }
    if (sourceGlobalIndex === targetIndex) return
    const drop = new Set(removeIndices)
    onChange(list.map((b, i) => {
      if (i === targetIndex) {
        return { ...b, data: { ...b.data, rows: [...(b.data?.rows ?? []), ...newRows] } }
      }
      if (i === sourceGlobalIndex && drop.size > 0) {
        return { ...b, data: { ...b.data, rows: (b.data?.rows ?? []).filter((_, j) => !drop.has(j)) } }
      }
      return b
    }))
  }

  // ── Derived lists ──────────────────────────────────────────────────────────

  const sheetItems = blocks
    .map((block, globalIndex) => ({ block, globalIndex }))
    .filter(({ block }) => block.block_type === 'prescription_sheet')

  const clampedSheetIndex = Math.min(activeSheetIndex, Math.max(0, sheetItems.length - 1))
  const activeSheetItem   = sheetItems[clampedSheetIndex]

  // Every list a row can be sent to: the sheets, the Rx-level list, the Review list.
  function transferTargets(exceptGlobalIndex, exceptType) {
    const out = sheetItems
      .map((item, i) => ({
        globalIndex: item.globalIndex,
        label: item.block.data?.label?.trim() || `Sheet ${i + 1}`,
      }))
      .filter(item => item.globalIndex !== exceptGlobalIndex)
    for (const type of [RX_LEVEL_TYPE, REVIEW_TYPE]) {
      if (type === exceptType) continue
      const idx = listIndex(type)
      out.push(idx >= 0 ? { globalIndex: idx, label: LIST_LABELS[type] } : { type, label: LIST_LABELS[type] })
    }
    return out
  }

  // The editor for one of the two lists. A list that does not exist yet is shown empty
  // and is created on the first change.
  function renderList(type) {
    const idx   = listIndex(type)
    const block = idx >= 0 ? blocks[idx] : emptyListBlock(type)
    return (
      <PrescriptionSheetEditor
        key={type}
        block={block}
        onChange={patch => patchList(type, patch)}
        disabled={disabled}
        otherSheets={transferTargets(idx >= 0 ? idx : -1, type)}
        onTransferRows={(target, newRows, removeIndices) => transferRows(idx, target, newRows, removeIndices)}
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <SubTabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'rx' ? (
        <>
          {/* ── Decision 5: Prescription Sheets section divider ──────────── */}
          <div style={{ marginBottom: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Prescription Sheets
              </span>
              <div style={{
                flex: 1,
                height: 1,
                backgroundColor: 'var(--color-border)',
              }} />
            </div>

            <SheetPickerBar
              sheets={sheetItems}
              activeIndex={clampedSheetIndex}
              onSelect={setActiveSheetIndex}
              onAdd={() => {
                addSheet()
                setActiveSheetIndex(sheetItems.length)
              }}
              onRename={label => patchBlockData(activeSheetItem.globalIndex, { label })}
              onRemove={() => {
                deleteBlock(activeSheetItem.globalIndex)
                setActiveSheetIndex(Math.max(0, clampedSheetIndex - 1))
              }}
              disabled={disabled}
            />

            {sheetItems.length === 0 ? (
              <EmptyState />
            ) : (
              <ActiveSheetEditor
                key={activeSheetItem.globalIndex}
                block={activeSheetItem.block}
                onPatchData={(patch) => patchBlockData(activeSheetItem.globalIndex, patch)}
                disabled={disabled}
                otherSheets={transferTargets(activeSheetItem.globalIndex, null)}
                onTransferRows={(target, newRows, removeIndices) =>
                  transferRows(activeSheetItem.globalIndex, target, newRows, removeIndices)}
              />
            )}
          </div>

          {/* ── Separator between the sheet area and the Rx-level blocks.
              Always shown, in every state, full width, using the same
              zigzag the app uses. ── */}
          <div style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-5)', width: '100%' }}>
            <ZigzagSeparator />
          </div>

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Rx-level blocks
              </span>
              <span style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-body)',
                flex: 1,
                minWidth: 0,
              }}>
                shown below all sheets in app
              </span>
            </div>
            {renderList(RX_LEVEL_TYPE)}
          </div>
        </>
      ) : (
        // ── Review tab ────────────────────────────────────────────────────
        renderList(REVIEW_TYPE)
      )}
    </div>
  )
}
