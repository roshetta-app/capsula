/**
 * BlockListEditor — src/components/admin/BlockListEditor.jsx
 *
 * Phase 1 + 2 + 3: Block-list container with Clinical/Rx sub-tab split and wired editors.
 *
 * Props:
 *   blocks   {Array}    — current blocks array (from parent state)
 *   onChange {Function} — (newBlocks) => void   called on every mutation
 *   disabled {Boolean}  — disables all controls during parent save
 *
 * Phase 3 changes:
 *   - Rx tab now shows SheetPickerBar + ActiveSheetEditor instead of stacked BlockCards
 *     for prescription_sheet blocks. Non-sheet Rx blocks (notes, text posts, galleries)
 *     still use BlockCard and appear in a separate "Rx-level blocks" section below.
 *   - activeSheetIndex state added to track which sheet is selected in the picker.
 *   - AddBlockButton accepts an optional `options` prop override (Step 3.6) so the
 *     Rx tab can exclude prescription_sheet from the dropdown — sheets are added via
 *     the "+ Add Sheet" pill in SheetPickerBar instead.
 *   - EmptyState handles a new 'rx-sheets' case for when no sheets exist yet.
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import ImageGalleryEditor      from './blocks/ImageGalleryEditor'
import FreeTextPostEditor      from './blocks/FreeTextPostEditor'
import NoteCalloutEditor       from './blocks/NoteCalloutEditor'
import PrescriptionSheetEditor from './blocks/PrescriptionSheetEditor'

// ─── Constants ────────────────────────────────────────────────────────────────

// Phase 4 (Step 4.1): Context-aware labels so the card header always names the destination tab.
// Format: "Tab — Role". `default` is the fallback for block types with no context field
// (e.g. prescription_sheet) or legacy blocks that pre-date the context field.
const BLOCK_LABELS = {
  image_gallery: {
    clinical: 'Clinical — Image Gallery',
    rx:       'Rx — Image Gallery',
    default:  'Image Gallery',
  },
  free_text_post: {
    clinical: 'Clinical — Text Post',
    rx:       'Rx — Text Post',
    default:  'Text Post',
  },
  note_callout: {
    clinical: 'Clinical — Note',
    rx:       'Rx — Note',
    default:  'Note',
  },
  prescription_sheet: {
    default: 'Prescription Sheet', // always Rx — label is self-evident
  },
}

// Chip colors remain per block_type (context does not affect colour)
const BLOCK_CHIP_COLORS = {
  image_gallery:      { chipColor: '#7C3AED', chipBg: '#EDE9FE' },
  free_text_post:     { chipColor: '#1D4ED8', chipBg: '#DBEAFE' },
  note_callout:       { chipColor: '#B45309', chipBg: '#FEF3C7' },
  prescription_sheet: { chipColor: '#047857', chipBg: '#D1FAE5' },
}

// Add-block options per sub-tab
const CLINICAL_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
]
// Phase 2 (Step 2.3): image_gallery and free_text_post added to Rx options.
// Phase 3 (Step 3.6): prescription_sheet removed — sheets added via SheetPickerBar.
const RX_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
]

// Which block types belong to each sub-tab
// Phase 2 (Step 2.2): image_gallery now context-aware instead of hardcoded Clinical.
// Backward-compat: existing galleries with no context field have context === undefined,
// which is !== 'rx', so they continue to appear in Clinical. No migration needed.
function isClinicalBlock(block) {
  if (block.block_type === 'image_gallery'  && block.data?.context !== 'rx') return true
  if (block.block_type === 'free_text_post' && block.data?.context !== 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context !== 'rx') return true
  return false
}
function isRxBlock(block) {
  if (block.block_type === 'prescription_sheet') return true
  // image_gallery: Rx only when context === 'rx' (Phase 2, Step 2.2)
  if (block.block_type === 'image_gallery'  && block.data?.context === 'rx') return true
  if (block.block_type === 'free_text_post' && block.data?.context === 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context === 'rx') return true
  return false
}

// ─── Default data shapes per block type ──────────────────────────────────────

function defaultData(blockType, context) {
  switch (blockType) {
    case 'image_gallery':
      // Phase 2 (Step 2.1): context now stored so Rx galleries route correctly
      return { images: [], context: context ?? 'clinical' }
    case 'free_text_post':
      return { markdown: '', context: context ?? 'clinical' }
    case 'note_callout':
      return { text: '', flavor: 'info', context: context ?? 'clinical' }
    case 'prescription_sheet':
      return { label: 'Standard', rows: [] }
    default:
      return {}
  }
}

// ─── Block type chip ──────────────────────────────────────────────────────────

// Phase 4 (Step 4.2): accepts `context` so the label reflects the destination tab.
function BlockChip({ blockType, context }) {
  const labels = BLOCK_LABELS[blockType] ?? {}
  const label  = (context && labels[context]) ?? labels.default ?? blockType
  const colors = BLOCK_CHIP_COLORS[blockType] ?? { chipColor: '#6B7280', chipBg: '#F3F4F6' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: colors.chipColor,
      backgroundColor: colors.chipBg,
      border: `1px solid ${colors.chipColor}33`,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-body)',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ─── Block card shell ─────────────────────────────────────────────────────────

function BlockCard({ block, index, total, onMoveUp, onMoveDown, onDelete, disabled, children }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-surface)',
      overflow: 'hidden',
      marginBottom: 'var(--space-3)',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}>
        {/* Phase 4 (Step 4.3): context passed so label names the destination tab */}
        <BlockChip blockType={block.block_type} context={block.data?.context} />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ↑ ↓ 🗑 controls */}
        <button
          onClick={onMoveUp}
          disabled={disabled || index === 0}
          aria-label="Move block up"
          style={iconBtnStyle({ disabled: disabled || index === 0 })}
        >
          <ChevronUp size={15} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={disabled || index === total - 1}
          aria-label="Move block down"
          style={iconBtnStyle({ disabled: disabled || index === total - 1 })}
        >
          <ChevronDown size={15} />
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          aria-label="Delete block"
          style={iconBtnStyle({ disabled, danger: true })}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Editor */}
      <div style={{ padding: 'var(--space-4)' }}>
        {children ?? (
          <div style={{
            fontSize: 13, color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
          }}>
            Editor not available for this block type.
          </div>
        )}
      </div>
    </div>
  )
}

function iconBtnStyle({ disabled, danger } = {}) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, flexShrink: 0,
    borderRadius: 'var(--radius-md)',
    border: danger ? '1px solid #FECACA' : '1px solid var(--color-border)',
    backgroundColor: danger ? '#FEF2F2' : 'var(--color-surface)',
    color: danger ? '#DC2626' : 'var(--color-text-secondary)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: 0,
    transition: 'opacity 0.1s',
  }
}

// ─── Sub-tab pill bar ─────────────────────────────────────────────────────────

function SubTabBar({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 'var(--space-1)',
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 3,
      marginBottom: 'var(--space-4)',
      width: 'fit-content',
    }}>
      {['clinical', 'rx'].map(tab => {
        const isActive = active === tab
        const label = tab === 'clinical' ? 'Clinical' : 'Rx'
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              padding: '6px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Phase 3: SheetPickerBar ──────────────────────────────────────────────────

/**
 * SheetPickerBar — CMS-side sheet switcher for the Rx sub-tab. (Step 3.3)
 *
 * Mirrors the mental model of the app's PrescriptionPills component so the admin
 * edits sheets in the same one-at-a-time mental model the user sees them in.
 *
 * Props:
 *   sheets       — array of { globalIndex, block } for prescription_sheet blocks only
 *   activeIndex  — which sheet is selected (index into sheets array)
 *   onSelect     — (localIndex) => void
 *   onAdd        — () => void — triggers addBlock('prescription_sheet') in parent
 *   disabled     — freeze controls during parent save
 */
function SheetPickerBar({ sheets, activeIndex, onSelect, onAdd, disabled }) {
  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: 'var(--space-4)',
    }}>
      {sheets.map((item, localIndex) => {
        const isActive = localIndex === activeIndex
        return (
          <button
            key={item.globalIndex}
            onClick={() => onSelect(localIndex)}
            disabled={disabled}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              cursor: disabled ? 'default' : 'pointer',
              border: isActive
                ? '1.5px solid var(--color-accent)'
                : '1px solid var(--color-border)',
              backgroundColor: isActive
                ? 'var(--color-accent)'
                : 'var(--color-surface)',
              color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            {item.block.data?.label || `Sheet ${localIndex + 1}`}
          </button>
        )
      })}

      {/* "+ Add Sheet" pill */}
      <button
        onClick={onAdd}
        disabled={disabled}
        style={{
          padding: '5px 14px',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          fontWeight: 400,
          fontFamily: 'var(--font-body)',
          cursor: disabled ? 'default' : 'pointer',
          border: '1.5px dashed var(--color-border)',
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        + Add Sheet
      </button>
    </div>
  )
}

// ─── Phase 3: ActiveSheetEditor ───────────────────────────────────────────────

/**
 * ActiveSheetEditor — wrapper shown below the SheetPickerBar. (Step 3.4)
 *
 * Adds a "Remove sheet" danger button in a header bar above PrescriptionSheetEditor.
 * PrescriptionSheetEditor is unchanged — it owns the label input and all row editing.
 *
 * Props:
 *   block       — the active prescription_sheet block object
 *   onPatchData — (dataPatch) => void — bound to patchBlockData(globalIndex, ...)
 *   onDelete    — () => void
 *   disabled    — freeze controls during parent save
 */
function ActiveSheetEditor({ block, onPatchData, onDelete, disabled }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      backgroundColor: 'var(--color-surface)',
    }}>
      {/* Action bar — Remove sheet button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 'var(--space-2) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}>
        <button
          onClick={onDelete}
          disabled={disabled}
          aria-label="Remove this sheet"
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            color: '#DC2626',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '5px 12px',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Remove sheet
        </button>
      </div>

      {/* Row editor — PrescriptionSheetEditor owns label input + rows */}
      <div style={{ padding: 'var(--space-4)' }}>
        <PrescriptionSheetEditor
          block={block}
          onChange={onPatchData}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// ─── Add Block dropdown ───────────────────────────────────────────────────────

// Phase 3 (Step 3.6): accepts an optional `options` prop override so the Rx tab
// can pass a filtered list excluding prescription_sheet.
function AddBlockButton({ activeTab, onAdd, disabled, options: optionsOverride }) {
  const [open, setOpen] = useState(false)
  const options = optionsOverride ?? (activeTab === 'clinical' ? CLINICAL_BLOCK_OPTIONS : RX_BLOCK_OPTIONS)

  function handleSelect(blockType) {
    setOpen(false)
    onAdd(blockType)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-body)',
          cursor: disabled ? 'default' : 'pointer',
          border: '1.5px solid var(--color-accent)',
          backgroundColor: 'var(--color-accent)',
          color: '#ffffff',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Plus size={14} />
        Add Block
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            zIndex: 50,
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 200,
            overflow: 'hidden',
          }}>
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

// Phase 3 (Step 3.7): added 'rx-sheets' case for when there are no sheets yet.
function EmptyState({ activeTab }) {
  const msg = activeTab === 'clinical'
    ? 'No clinical blocks yet. Use "Add Block" to add an Image Gallery, Text Post, or Note.'
    : activeTab === 'rx-sheets'
    ? 'No prescription sheets yet. Use "+ Add Sheet" to create the first one.'
    : 'No Rx-level blocks yet. Use "Add Block" to add a Text Post, Image Gallery, or Note.'
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
      {msg}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * BlockListEditor
 *
 * @param {Object[]} blocks   — full array of block objects (all tabs mixed)
 * @param {Function} onChange — (nextBlocks) => void
 * @param {Boolean}  disabled — freeze all controls
 */
export default function BlockListEditor({ blocks = [], onChange, disabled = false }) {
  const [activeTab, setActiveTab] = useState('clinical')
  // Phase 3 (Step 3.2): tracks which prescription sheet is active in the CMS picker
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  // Reset sheet picker index when leaving the Rx tab (Step 3.2)
  function handleTabChange(tab) {
    setActiveTab(tab)
    if (tab !== 'rx') setActiveSheetIndex(0)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Replace the block at the given index with a patched version. */
  function patchBlock(globalIndex, patch) {
    const next = blocks.map((b, i) => i === globalIndex ? { ...b, ...patch } : b)
    onChange(next)
  }

  /** Patch only the data sub-object of a block. */
  // Block types whose `context` field must never be silently dropped by a partial patch.
  const CONTEXT_SENSITIVE_TYPES = ['free_text_post', 'note_callout', 'image_gallery']

  function patchBlockData(globalIndex, dataPatch) {
    const block  = blocks[globalIndex]
    const merged = { ...block.data, ...dataPatch }

    // Re-inject the original context if the block type is context-sensitive
    // and the patch didn't explicitly carry a new context value.
    if (
      CONTEXT_SENSITIVE_TYPES.includes(block.block_type) &&
      block.data?.context &&
      dataPatch.context === undefined
    ) {
      merged.context = block.data.context
    }

    patchBlock(globalIndex, { data: merged })
  }

  /** Add a new block at the end (order_index computed as max + 1). */
  function addBlock(blockType) {
    const maxOrder = blocks.reduce((m, b) => Math.max(m, b.order_index ?? 0), -1)
    const context  = activeTab === 'rx' ? 'rx' : 'clinical'
    const newBlock = {
      // No id — parent assigns a temp key or lets Supabase generate on save
      block_type:  blockType,
      order_index: maxOrder + 1,
      data:        defaultData(blockType, context),
      _isNew:      true,   // sentinel for parent save logic
    }
    onChange([...blocks, newBlock])
  }

  /** Delete block by its position in the full blocks array. */
  function deleteBlock(globalIndex) {
    onChange(blocks.filter((_, i) => i !== globalIndex))
  }

  /**
   * Swap two blocks in the GLOBAL array.
   * Both global indices are passed so Clinical and Rx lists each do their own
   * relative moves without disturbing the other tab's blocks.
   */
  function swapBlocks(indexA, indexB) {
    if (indexA < 0 || indexB >= blocks.length) return
    const next = [...blocks]
    ;[next[indexA], next[indexB]] = [next[indexB], next[indexA]]
    // Re-sync order_index to position so save is simple
    onChange(next.map((b, i) => ({ ...b, order_index: i })))
  }

  // ── Block editor renderer ──────────────────────────────────────────────────

  /**
   * Renders the correct editor for a given block.
   * Used by the Clinical tab and the Rx "other blocks" section.
   * Prescription sheets use ActiveSheetEditor instead (Phase 3).
   */
  function renderEditor(block, patchData) {
    switch (block.block_type) {
      case 'image_gallery':
        return (
          <ImageGalleryEditor
            data={block.data}
            onChange={patchData}
            disabled={disabled}
          />
        )
      case 'free_text_post':
        return (
          <FreeTextPostEditor
            data={block.data}
            onChange={patchData}
            disabled={disabled}
          />
        )
      case 'note_callout':
        return (
          <NoteCalloutEditor
            block={block}
            onChange={patchData}
          />
        )
      case 'prescription_sheet':
        return (
          <PrescriptionSheetEditor
            block={block}
            onChange={patchData}
          />
        )
      default:
        return null
    }
  }

  // ── Derive visible list ────────────────────────────────────────────────────

  // Each item: { block, globalIndex } so we can address mutations on full array
  const visibleItems = blocks
    .map((block, globalIndex) => ({ block, globalIndex }))
    .filter(({ block }) => activeTab === 'clinical' ? isClinicalBlock(block) : isRxBlock(block))

  // ── Phase 3: Rx tab split — sheets vs other Rx blocks ─────────────────────

  const sheetItems   = visibleItems.filter(({ block }) => block.block_type === 'prescription_sheet')
  const otherRxItems = visibleItems.filter(({ block }) => block.block_type !== 'prescription_sheet')

  // Clamp active index whenever the sheet count changes (e.g. after a delete)
  const clampedSheetIndex = Math.min(activeSheetIndex, Math.max(0, sheetItems.length - 1))
  const activeSheetItem   = sheetItems[clampedSheetIndex]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* Sub-tab switcher — now calls handleTabChange to reset sheet index */}
      <SubTabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'rx' ? (
        // ── Rx tab — Phase 3 layout ──────────────────────────────────────────
        <>
          {/* ── Prescription Sheets section ───────────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}>
              Prescription Sheets
            </div>

            <SheetPickerBar
              sheets={sheetItems}
              activeIndex={clampedSheetIndex}
              onSelect={setActiveSheetIndex}
              onAdd={() => {
                addBlock('prescription_sheet')
                // Select the newly added sheet — it lands at the end
                setActiveSheetIndex(sheetItems.length)
              }}
              disabled={disabled}
            />

            {sheetItems.length === 0 ? (
              <EmptyState activeTab="rx-sheets" />
            ) : (
              <ActiveSheetEditor
                block={activeSheetItem.block}
                onPatchData={(patch) => patchBlockData(activeSheetItem.globalIndex, patch)}
                onDelete={() => {
                  deleteBlock(activeSheetItem.globalIndex)
                  setActiveSheetIndex(Math.max(0, clampedSheetIndex - 1))
                }}
                disabled={disabled}
              />
            )}
          </div>

          {/* ── Other Rx blocks (notes, text posts, image galleries) ───────── */}
          {otherRxItems.length > 0 && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-3)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px dashed var(--color-border)',
              }}>
                Rx-level blocks (shown below all sheets in app)
              </div>
              {otherRxItems.map(({ block, globalIndex }, localIndex) => (
                <BlockCard
                  key={globalIndex}
                  block={block}
                  index={localIndex}
                  total={otherRxItems.length}
                  disabled={disabled}
                  onMoveUp={() => {
                    if (localIndex === 0) return
                    const prevGlobal = otherRxItems[localIndex - 1].globalIndex
                    swapBlocks(globalIndex, prevGlobal)
                  }}
                  onMoveDown={() => {
                    if (localIndex === otherRxItems.length - 1) return
                    const nextGlobal = otherRxItems[localIndex + 1].globalIndex
                    swapBlocks(globalIndex, nextGlobal)
                  }}
                  onDelete={() => deleteBlock(globalIndex)}
                >
                  {renderEditor(block, (patch) => patchBlockData(globalIndex, patch))}
                </BlockCard>
              ))}
            </div>
          )}

          {/* Add Block button — prescription_sheet excluded (added via picker above) */}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <AddBlockButton
              activeTab={activeTab}
              onAdd={addBlock}
              disabled={disabled}
              options={RX_BLOCK_OPTIONS}
            />
          </div>
        </>
      ) : (
        // ── Clinical tab — unchanged layout ──────────────────────────────────
        <>
          {visibleItems.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            visibleItems.map(({ block, globalIndex }, localIndex) => (
              <BlockCard
                key={globalIndex}
                block={block}
                index={localIndex}
                total={visibleItems.length}
                disabled={disabled}
                onMoveUp={() => {
                  if (localIndex === 0) return
                  const prevGlobal = visibleItems[localIndex - 1].globalIndex
                  swapBlocks(globalIndex, prevGlobal)
                }}
                onMoveDown={() => {
                  if (localIndex === visibleItems.length - 1) return
                  const nextGlobal = visibleItems[localIndex + 1].globalIndex
                  swapBlocks(globalIndex, nextGlobal)
                }}
                onDelete={() => deleteBlock(globalIndex)}
              >
                {renderEditor(block, (patch) => patchBlockData(globalIndex, patch))}
              </BlockCard>
            ))
          )}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <AddBlockButton activeTab={activeTab} onAdd={addBlock} disabled={disabled} />
          </div>
        </>
      )}
    </div>
  )
}

