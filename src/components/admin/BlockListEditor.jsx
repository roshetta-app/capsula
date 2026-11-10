/**
 * BlockListEditor — src/components/admin/BlockListEditor.jsx
 *
 * Visual Redesign — Decisions 1, 2, 3, 5, 6
 *
 * Decision 1: Colored chip + tinted header per block type (left border REMOVED).
 * Decision 2: Collapse by default; new blocks open expanded; preview in header.
 * Decision 3: SummaryBar — ordered map of block types above each list.
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

import { useState, useRef, useEffect, useContext } from 'react'
import { useRememberedState } from '../../hooks/useRememberedState'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import ImageGalleryEditor      from './blocks/ImageGalleryEditor'
import FreeTextPostEditor      from './blocks/FreeTextPostEditor'
import NoteCalloutEditor       from './blocks/NoteCalloutEditor'
import BlockDivider            from '../conditions/BlockDivider'
import PrescriptionSheetEditor from './blocks/PrescriptionSheetEditor'
import PrescriptionPills from '../conditions/PrescriptionPills'
import ConfirmModal from './ConfirmModal'
import { CollapseAllContext } from './CollapseAllContext'

// ─── Constants ────────────────────────────────────────────────────────────────

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
  divider: {
    clinical: 'Clinical — Divider',
    rx:       'Rx — Divider',
    default:  'Divider',
  },
  prescription_sheet: {
    default: 'Prescription Sheet',
  },
}

const BLOCK_CHIP_COLORS = {
  image_gallery:      { chipColor: '#7C3AED', chipBg: '#EDE9FE', headerTint: '#F5F3FF' },
  free_text_post:     { chipColor: '#1D4ED8', chipBg: '#DBEAFE', headerTint: '#EFF6FF' },
  note_callout:       { chipColor: '#B45309', chipBg: '#FEF3C7', headerTint: '#FFFBEB' },
  divider:            { chipColor: '#475569', chipBg: '#E2E8F0', headerTint: '#F8FAFC' },
  prescription_sheet: { chipColor: '#047857', chipBg: '#D1FAE5', headerTint: '#F0FDF4' },
}

const FALLBACK_COLORS = { chipColor: '#6B7280', chipBg: '#F3F4F6', headerTint: 'var(--color-bg)' }

const CLINICAL_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
  { value: 'divider',        label: '+ Divider'       },
]
const RX_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
  { value: 'divider',        label: '+ Divider'       },
]

function isClinicalBlock(block) {
  if (block.block_type === 'image_gallery'  && block.data?.context !== 'rx') return true
  if (block.block_type === 'free_text_post' && block.data?.context !== 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context !== 'rx') return true
  if (block.block_type === 'divider'        && block.data?.context !== 'rx') return true
  return false
}
function isRxBlock(block) {
  if (block.block_type === 'prescription_sheet') return true
  if (block.block_type === 'image_gallery'  && block.data?.context === 'rx') return true
  if (block.block_type === 'free_text_post' && block.data?.context === 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context === 'rx') return true
  if (block.block_type === 'divider'        && block.data?.context === 'rx') return true
  return false
}

function defaultData(blockType, context) {
  switch (blockType) {
    case 'image_gallery':      return { images: [], context: context ?? 'clinical' }
    case 'free_text_post':     return { title: '', markdown: '', context: context ?? 'clinical' }
    case 'note_callout':       return { text: '', flavor: 'info', context: context ?? 'clinical' }
    case 'divider':            return { context: context ?? 'clinical' }
    case 'prescription_sheet': return { label: 'Standard', rows: [] }
    default:                   return {}
  }
}

// ─── Decision 2: content preview per block type ───────────────────────────────

function getBlockPreview(block) {
  const { block_type, data } = block
  switch (block_type) {
    case 'note_callout': {
      const t = data?.text?.trim()
      if (!t) return 'Empty note'
      return t.length > 60 ? t.slice(0, 60) + '…' : t
    }
    case 'free_text_post': {
      const ttl = data?.title?.trim()
      const md = data?.markdown?.trim()
      if (!ttl && !md) return 'Empty text post'
      const plain = (ttl || md).replace(/<[^>]*>/g, '').replace(/[#*_`>\-]/g, '').replace(/\n/g, ' ').trim()
      return plain.length > 60 ? plain.slice(0, 60) + '…' : plain || 'Empty text post'
    }
    case 'divider':
      return 'Fading line with a small diamond'
    case 'image_gallery': {
      const n = data?.images?.length ?? 0
      return n === 0 ? 'No images yet' : `${n} image${n !== 1 ? 's' : ''}`
    }
    case 'prescription_sheet': {
      const label = data?.label?.trim() || 'Sheet'
      const n = data?.rows?.length ?? 0
      return `${label} · ${n} row${n !== 1 ? 's' : ''}`
    }
    default:
      return ''
  }
}

// ─── Block type chip ──────────────────────────────────────────────────────────

function BlockChip({ blockType, context }) {
  const labels = BLOCK_LABELS[blockType] ?? {}
  const label  = (context && labels[context]) ?? labels.default ?? blockType
  const colors = BLOCK_CHIP_COLORS[blockType] ?? FALLBACK_COLORS
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

// ─── Decision 1 + 2: BlockCard (no left border) ───────────────────────────────

function BlockCard({
  block, index, total, onMoveUp, onMoveDown, onDelete, disabled,
  defaultExpanded = false, domRef, onRegisterExpand, children,
}) {
  const [expanded, setExpanded] = useRememberedState(block?.id ? `block:${block.id}` : null, defaultExpanded)
  const colors = BLOCK_CHIP_COLORS[block.block_type] ?? FALLBACK_COLORS

  // 2026-11-09: "Collapse all" in the page's top bar closes this card. A card
  // built later starts level with the counter, so old presses do not close it.
  const collapseSignal = useContext(CollapseAllContext)
  const [seenCollapse, setSeenCollapse] = useState(collapseSignal)
  if (seenCollapse !== collapseSignal) {
    setSeenCollapse(collapseSignal)
    setExpanded(false)
  }

  useEffect(() => {
    if (onRegisterExpand) onRegisterExpand(() => setExpanded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() { setExpanded(v => !v) }

  return (
    <div
      ref={domRef}
      style={{
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
        marginBottom: 'var(--space-3)',
        scrollMarginTop: 80,
      }}
    >
      {/* Tinted header; click-to-toggle */}
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
          backgroundColor: colors.headerTint,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <BlockChip blockType={block.block_type} context={block.data?.context} />

        {/* Collapsed preview text */}
        {!expanded && (
          <span style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {getBlockPreview(block)}
          </span>
        )}

        {expanded && <div style={{ flex: 1 }} />}

        {/* Controls — stop propagation so they don't toggle the card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
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

        {/* Expand chevron */}
        <div style={{ color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Editor body — only mounted when expanded */}
      {expanded && (
        <div style={{ padding: 'var(--space-4)' }}>
          {children ?? (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
              Editor not available for this block type.
            </div>
          )}
        </div>
      )}
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

// ─── Decision 3: SummaryBar ───────────────────────────────────────────────────

function SummaryBar({ items, expandRefs }) {
  if (!items || items.length === 0) return null

  function shortLabel(block) {
    switch (block.block_type) {
      case 'note_callout':       return 'Note'
      case 'free_text_post':     return 'Text'
      case 'image_gallery':      return 'Images'
      case 'divider':            return 'Divider'
      case 'prescription_sheet': return block.data?.label || 'Sheet'
      default:                   return block.block_type
    }
  }

  function handleTap(globalIndex) {
    const entry = expandRefs?.get(globalIndex)
    if (!entry) return
    entry.expand()
    setTimeout(() => {
      entry.domRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      padding: '6px 10px',
      marginBottom: 'var(--space-3)',
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-md)',
    }}>
      {items.map(({ block, globalIndex }, i) => {
        const colors = BLOCK_CHIP_COLORS[block.block_type] ?? FALLBACK_COLORS
        return (
          <span key={globalIndex} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', userSelect: 'none' }}>
                →
              </span>
            )}
            <button
              onClick={() => handleTap(globalIndex)}
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.03em',
                color: colors.chipColor,
                backgroundColor: colors.chipBg,
                border: `1px solid ${colors.chipColor}44`,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {shortLabel(block)}
            </button>
          </span>
        )
      })}
    </div>
  )
}

// ─── Sub-tab bar — full width, underline style, Rx first ─────────────────────

const SUB_TABS = [
  { key: 'rx',       label: 'Rx'       },
  { key: 'clinical', label: 'Clinical' },
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
function SheetPickerBar({ sheets, activeIndex, onSelect, onAdd, onRemove, disabled }) {
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
          />
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Remove sheet ${activeLabel}`}
          title="Remove this sheet"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, width: 48, height: 48,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); onRemove() }}
        title="Remove sheet?"
        message={`"${activeLabel}" and everything in it will be removed from this condition.`}
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

// ─── Add Block dropdown ───────────────────────────────────────────────────────

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
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          />
          <div className="cms-menu-fit" style={{
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

// ─── BlockCardList ────────────────────────────────────────────────────────────

function BlockCardList({ items, disabled, onMoveUp, onMoveDown, onDelete, renderEditor }) {
  const expandRefsRef = useRef(new Map())
  const expandRefs = expandRefsRef.current

  useEffect(() => {
    const currentKeys = new Set(items.map(i => i.globalIndex))
    for (const key of expandRefs.keys()) {
      if (!currentKeys.has(key)) expandRefs.delete(key)
    }
  }, [items, expandRefs])

  return (
    <>
      <SummaryBar items={items} expandRefs={expandRefs} />

      {items.map(({ block, globalIndex }, localIndex) => {
        if (!expandRefs.has(globalIndex)) {
          expandRefs.set(globalIndex, { domRef: { current: null }, expand: () => {} })
        }
        const entry = expandRefs.get(globalIndex)

        return (
          <BlockCard
            key={globalIndex}
            block={block}
            index={localIndex}
            total={items.length}
            disabled={disabled}
            defaultExpanded={block._isNew === true}
            domRef={(el) => { entry.domRef = { current: el } }}
            onRegisterExpand={(expandFn) => { entry.expand = expandFn }}
            onMoveUp={() => onMoveUp(localIndex)}
            onMoveDown={() => onMoveDown(localIndex)}
            onDelete={() => onDelete(globalIndex)}
          >
            {renderEditor(block, globalIndex)}
          </BlockCard>
        )
      })}
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BlockListEditor({ blocks = [], onChange, disabled = false, initialTab = 'rx', initialSheetIndex = 0, onViewChange }) {
  // Rx is now the default active tab (was 'clinical')
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

  const CONTEXT_SENSITIVE_TYPES = ['free_text_post', 'note_callout', 'image_gallery', 'divider']

  function patchBlockData(globalIndex, dataPatch) {
    const block  = blocks[globalIndex]
    const merged = { ...block.data, ...dataPatch }
    if (
      CONTEXT_SENSITIVE_TYPES.includes(block.block_type) &&
      block.data?.context &&
      dataPatch.context === undefined
    ) {
      merged.context = block.data.context
    }
    patchBlock(globalIndex, { data: merged })
  }

  function addBlock(blockType) {
    const maxOrder = blocks.reduce((m, b) => Math.max(m, b.order_index ?? 0), -1)
    const context  = (blockType === 'prescription_sheet') ? undefined : (activeTab === 'rx' ? 'rx' : 'clinical')
    const data = defaultData(blockType, context)
    if (blockType === 'prescription_sheet') {
      // New sheets are named "Sheet 1", "Sheet 2", … — the next number not already used.
      const used = new Set(
        blocks.filter(b => b.block_type === 'prescription_sheet').map(b => (b.data?.label ?? '').trim())
      )
      let n = blocks.filter(b => b.block_type === 'prescription_sheet').length + 1
      while (used.has(`Sheet ${n}`)) n += 1
      data.label = `Sheet ${n}`
    }
    onChange([...blocks, {
      block_type:  blockType,
      order_index: maxOrder + 1,
      data,
      _isNew:      true,
    }])
  }

  function deleteBlock(globalIndex) {
    onChange(blocks.filter((_, i) => i !== globalIndex))
  }

  // 2026-11-10: copy or move rows from one sheet to the end of another. One
  // onChange call, so Undo brings back both sheets in one step. removeIndices
  // are positions in the source sheet; empty for a copy.
  function transferRows(sourceGlobalIndex, targetGlobalIndex, newRows, removeIndices) {
    if (sourceGlobalIndex === targetGlobalIndex || newRows.length === 0) return
    const drop = new Set(removeIndices)
    onChange(blocks.map((b, i) => {
      if (i === targetGlobalIndex) {
        return { ...b, data: { ...b.data, rows: [...(b.data?.rows ?? []), ...newRows] } }
      }
      if (i === sourceGlobalIndex && drop.size > 0) {
        return { ...b, data: { ...b.data, rows: (b.data?.rows ?? []).filter((_, j) => !drop.has(j)) } }
      }
      return b
    }))
  }

  function swapBlocks(indexA, indexB) {
    if (indexA < 0 || indexB >= blocks.length) return
    const next = [...blocks]
    ;[next[indexA], next[indexB]] = [next[indexB], next[indexA]]
    onChange(next.map((b, i) => ({ ...b, order_index: i })))
  }

  // ── Editor renderer ────────────────────────────────────────────────────────

  function renderEditor(block, globalIndex) {
    const patchData = (patch) => patchBlockData(globalIndex, patch)
    switch (block.block_type) {
      case 'image_gallery':
        return <ImageGalleryEditor data={block.data} onChange={patchData} disabled={disabled} />
      case 'free_text_post':
        return <FreeTextPostEditor data={block.data} onChange={patchData} disabled={disabled} />
      case 'note_callout':
        return <NoteCalloutEditor block={block} onChange={patchData} />
      case 'divider':
        return (
          <div>
            <BlockDivider />
            <div style={{ marginTop: 'var(--space-3)', fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
              This is exactly how it looks in the app. Nothing to set — move it or delete it like any other block.
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // ── Derived lists ──────────────────────────────────────────────────────────

  const visibleItems = blocks
    .map((block, globalIndex) => ({ block, globalIndex }))
    .filter(({ block }) => activeTab === 'clinical' ? isClinicalBlock(block) : isRxBlock(block))

  const sheetItems   = visibleItems.filter(({ block }) => block.block_type === 'prescription_sheet')
  const otherRxItems = visibleItems.filter(({ block }) => block.block_type !== 'prescription_sheet')

  const clampedSheetIndex = Math.min(activeSheetIndex, Math.max(0, sheetItems.length - 1))
  const activeSheetItem   = sheetItems[clampedSheetIndex]

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
                addBlock('prescription_sheet')
                setActiveSheetIndex(sheetItems.length)
              }}
              onRemove={() => {
                deleteBlock(activeSheetItem.globalIndex)
                setActiveSheetIndex(Math.max(0, clampedSheetIndex - 1))
              }}
              disabled={disabled}
            />

            {sheetItems.length === 0 ? (
              <EmptyState activeTab="rx-sheets" />
            ) : (
              <ActiveSheetEditor
                key={activeSheetItem.globalIndex}
                block={activeSheetItem.block}
                onPatchData={(patch) => patchBlockData(activeSheetItem.globalIndex, patch)}
                disabled={disabled}
                otherSheets={sheetItems
                  .map((item, i) => ({
                    globalIndex: item.globalIndex,
                    label: item.block.data?.label?.trim() || `Sheet ${i + 1}`,
                  }))
                  .filter(item => item.globalIndex !== activeSheetItem.globalIndex)}
                onTransferRows={(targetGlobalIndex, newRows, removeIndices) =>
                  transferRows(activeSheetItem.globalIndex, targetGlobalIndex, newRows, removeIndices)}
              />
            )}
          </div>

          {/* ── Decision 5: Rx-level blocks section divider ──────────────── */}
          {otherRxItems.length > 0 && (
            <div style={{ marginTop: 'var(--space-6)' }}>
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
                <div style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: 'var(--color-border)',
                }} />
                <span className="cms-hide-phone" style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  shown below all sheets in app
                </span>
              </div>

              <BlockCardList
                items={otherRxItems}
                disabled={disabled}
                onMoveUp={(localIndex) => {
                  if (localIndex === 0) return
                  swapBlocks(otherRxItems[localIndex].globalIndex, otherRxItems[localIndex - 1].globalIndex)
                }}
                onMoveDown={(localIndex) => {
                  if (localIndex === otherRxItems.length - 1) return
                  swapBlocks(otherRxItems[localIndex].globalIndex, otherRxItems[localIndex + 1].globalIndex)
                }}
                onDelete={deleteBlock}
                renderEditor={renderEditor}
              />
            </div>
          )}

          {/* Add Block button — sheets added via picker above */}
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
        // ── Clinical tab ──────────────────────────────────────────────────
        <>
          {visibleItems.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            <BlockCardList
              items={visibleItems}
              disabled={disabled}
              onMoveUp={(localIndex) => {
                if (localIndex === 0) return
                swapBlocks(visibleItems[localIndex].globalIndex, visibleItems[localIndex - 1].globalIndex)
              }}
              onMoveDown={(localIndex) => {
                if (localIndex === visibleItems.length - 1) return
                swapBlocks(visibleItems[localIndex].globalIndex, visibleItems[localIndex + 1].globalIndex)
              }}
              onDelete={deleteBlock}
              renderEditor={renderEditor}
            />
          )}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <AddBlockButton activeTab={activeTab} onAdd={addBlock} disabled={disabled} />
          </div>
        </>
      )}
    </div>
  )
}


