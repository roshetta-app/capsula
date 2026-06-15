/**
 * BlockListEditor — src/components/admin/BlockListEditor.jsx
 *
 * Phase 3.2 + 3.7: Block-list container with Clinical/Rx sub-tab split and wired editors.
 *
 * Props:
 *   blocks   {Array}    — current blocks array (from parent state)
 *   onChange {Function} — (newBlocks) => void   called on every mutation
 *   disabled {Boolean}  — disables all controls during parent save
 *
 * Block editors (ImageGalleryEditor, FreeTextPostEditor, NoteCalloutEditor,
 * PrescriptionSheetEditor) are wired via internal renderEditor() switch. This file delivers:
 *   - Clinical / Rx sub-tab switcher
 *   - Add Block dropdown (context-aware per active sub-tab)
 *   - Block card frame (header with human name + colored chip + ↑ ↓ 🗑)
 *   - Editor slot (all four block editors wired)
 *   - Stable internal ordering helpers
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import ImageGalleryEditor    from './blocks/ImageGalleryEditor'
import FreeTextPostEditor    from './blocks/FreeTextPostEditor'
import NoteCalloutEditor     from './blocks/NoteCalloutEditor'
import PrescriptionSheetEditor from './blocks/PrescriptionSheetEditor'

// ─── Constants ────────────────────────────────────────────────────────────────

// Human labels and chip colors per block type (Section 3.1 Findings [LOCKED])
const BLOCK_META = {
  image_gallery:     { label: 'Image Gallery',     chipColor: '#7C3AED', chipBg: '#EDE9FE' },
  free_text_post:    { label: 'Text Post',          chipColor: '#1D4ED8', chipBg: '#DBEAFE' },
  note_callout:      { label: 'Note',               chipColor: '#B45309', chipBg: '#FEF3C7' },
  prescription_sheet:{ label: 'Prescription Sheet', chipColor: '#047857', chipBg: '#D1FAE5' },
}

// Add-block options per sub-tab
const CLINICAL_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
]
const RX_BLOCK_OPTIONS = [
  { value: 'prescription_sheet', label: '+ Prescription Sheet' },
  { value: 'note_callout',       label: '+ Note'               },
]

// Which block types belong to each sub-tab
function isClinicalBlock(block) {
  if (block.block_type === 'image_gallery')  return true
  if (block.block_type === 'free_text_post' && block.data?.context !== 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context !== 'rx') return true
  return false
}
function isRxBlock(block) {
  if (block.block_type === 'prescription_sheet') return true
  if (block.block_type === 'free_text_post' && block.data?.context === 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context === 'rx') return true
  return false
}

// ─── Default data shapes per block type ──────────────────────────────────────

function defaultData(blockType, context) {
  switch (blockType) {
    case 'image_gallery':
      return { images: [] }
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

function BlockChip({ blockType }) {
  const meta = BLOCK_META[blockType] ?? { label: blockType, chipColor: '#6B7280', chipBg: '#F3F4F6' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: meta.chipColor,
      backgroundColor: meta.chipBg,
      border: `1px solid ${meta.chipColor}33`,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-body)',
      flexShrink: 0,
    }}>
      {meta.label}
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
        <BlockChip blockType={block.block_type} />

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

// ─── Add Block dropdown ───────────────────────────────────────────────────────

function AddBlockButton({ activeTab, onAdd, disabled }) {
  const [open, setOpen] = useState(false)
  const options = activeTab === 'clinical' ? CLINICAL_BLOCK_OPTIONS : RX_BLOCK_OPTIONS

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

function EmptyState({ activeTab }) {
  const msg = activeTab === 'clinical'
    ? 'No clinical blocks yet. Use "Add Block" to add an Image Gallery, Text Post, or Note.'
    : 'No Rx blocks yet. Use "Add Block" to add a Prescription Sheet or Note.'
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
   *
   * ImageGalleryEditor + FreeTextPostEditor accept { data, onChange(dataPatch) }.
   * NoteCalloutEditor + PrescriptionSheetEditor accept { block, onChange(fullData) }.
   * patchData is the patchBlockData-bound helper that merges a data patch.
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* Sub-tab switcher */}
      <SubTabBar active={activeTab} onChange={setActiveTab} />

      {/* Block list */}
      {visibleItems.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        visibleItems.map(({ block, globalIndex }, localIndex) => (
          <BlockCard
            key={globalIndex}        // stable within render; phase 3.7 can use block._key
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

      {/* Add Block button */}
      <div style={{ marginTop: 'var(--space-3)' }}>
        <AddBlockButton activeTab={activeTab} onAdd={addBlock} disabled={disabled} />
      </div>
    </div>
  )
}

