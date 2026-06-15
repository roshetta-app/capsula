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

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import ImageGalleryEditor      from './blocks/ImageGalleryEditor'
import FreeTextPostEditor      from './blocks/FreeTextPostEditor'
import NoteCalloutEditor       from './blocks/NoteCalloutEditor'
import PrescriptionSheetEditor from './blocks/PrescriptionSheetEditor'

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
  prescription_sheet: {
    default: 'Prescription Sheet',
  },
}

const BLOCK_CHIP_COLORS = {
  image_gallery:      { chipColor: '#7C3AED', chipBg: '#EDE9FE', headerTint: '#F5F3FF' },
  free_text_post:     { chipColor: '#1D4ED8', chipBg: '#DBEAFE', headerTint: '#EFF6FF' },
  note_callout:       { chipColor: '#B45309', chipBg: '#FEF3C7', headerTint: '#FFFBEB' },
  prescription_sheet: { chipColor: '#047857', chipBg: '#D1FAE5', headerTint: '#F0FDF4' },
}

const FALLBACK_COLORS = { chipColor: '#6B7280', chipBg: '#F3F4F6', headerTint: 'var(--color-bg)' }

const CLINICAL_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
]
const RX_BLOCK_OPTIONS = [
  { value: 'image_gallery',  label: '+ Image Gallery' },
  { value: 'free_text_post', label: '+ Text Post'     },
  { value: 'note_callout',   label: '+ Note'          },
]

function isClinicalBlock(block) {
  if (block.block_type === 'image_gallery'  && block.data?.context !== 'rx') return true
  if (block.block_type === 'free_text_post' && block.data?.context !== 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context !== 'rx') return true
  return false
}
function isRxBlock(block) {
  if (block.block_type === 'prescription_sheet') return true
  if (block.block_type === 'image_gallery'  && block.data?.context === 'rx') return true
  if (block.block_type === 'free_text_post' && block.data?.context === 'rx') return true
  if (block.block_type === 'note_callout'   && block.data?.context === 'rx') return true
  return false
}

function defaultData(blockType, context) {
  switch (blockType) {
    case 'image_gallery':      return { images: [], context: context ?? 'clinical' }
    case 'free_text_post':     return { markdown: '', context: context ?? 'clinical' }
    case 'note_callout':       return { text: '', flavor: 'info', context: context ?? 'clinical' }
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
      const md = data?.markdown?.trim()
      if (!md) return 'Empty text post'
      const plain = md.replace(/[#*_`>\-]/g, '').replace(/\n/g, ' ').trim()
      return plain.length > 60 ? plain.slice(0, 60) + '…' : plain || 'Empty text post'
    }
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
  const [expanded, setExpanded] = useState(defaultExpanded)
  const colors = BLOCK_CHIP_COLORS[block.block_type] ?? FALLBACK_COLORS

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
              backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
              color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            {item.block.data?.label || `Sheet ${localIndex + 1}`}
          </button>
        )
      })}

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
          transition: 'all 0.15s ease',
        }}
      >
        + Add Sheet
      </button>
    </div>
  )
}

// ─── Decision 6: ActiveSheetEditor — "Remove sheet" at bottom, no left border ──

function ActiveSheetEditor({ block, onPatchData, onDelete, disabled }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      backgroundColor: 'var(--color-surface)',
    }}>
      <div style={{ padding: 'var(--space-4)' }}>
        <PrescriptionSheetEditor
          block={block}
          onChange={onPatchData}
          disabled={disabled}
        />
      </div>

      {/* Decision 6: destructive action at the bottom, text-style danger link */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={onDelete}
          disabled={disabled}
          aria-label="Remove this sheet"
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            color: disabled ? '#9CA3AF' : '#DC2626',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '2px 0',
            cursor: disabled ? 'default' : 'pointer',
            textDecoration: 'underline',
            textDecorationColor: disabled ? '#D1D5DB' : '#FECACA',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Remove sheet
        </button>
      </div>
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

export default function BlockListEditor({ blocks = [], onChange, disabled = false }) {
  // Rx is now the default active tab (was 'clinical')
  const [activeTab, setActiveTab] = useState('rx')
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  function handleTabChange(tab) {
    setActiveTab(tab)
    if (tab !== 'rx') setActiveSheetIndex(0)
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  function patchBlock(globalIndex, patch) {
    onChange(blocks.map((b, i) => i === globalIndex ? { ...b, ...patch } : b))
  }

  const CONTEXT_SENSITIVE_TYPES = ['free_text_post', 'note_callout', 'image_gallery']

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
    const context  = activeTab === 'rx' ? 'rx' : 'clinical'
    onChange([...blocks, {
      block_type:  blockType,
      order_index: maxOrder + 1,
      data:        defaultData(blockType, context),
      _isNew:      true,
    }])
  }

  function deleteBlock(globalIndex) {
    onChange(blocks.filter((_, i) => i !== globalIndex))
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
      case 'prescription_sheet':
        return <PrescriptionSheetEditor block={block} onChange={patchData} />
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
                <span style={{
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
