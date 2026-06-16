/**
 * FreeTextPostEditor — src/components/admin/blocks/FreeTextPostEditor.jsx
 *
 * Phase 3.4: CMS editor for free_text_post blocks.
 * Phase 5:   Upgraded preview to render ::: directive cards (matches app renderer).
 *
 * Props:
 *   data     { markdown: string }   — block.data (read-only; patch via onChange)
 *   onChange (dataPatch) => void    — called with { markdown: nextValue }
 *   disabled Boolean                — freeze all controls during parent save
 *
 * Features:
 *   - Auto-growing textarea for markdown input
 *   - Live preview panel — renders directive cards + markdown (matches app exactly)
 *   - Toggle between Edit / Preview / Split view
 *   - Character count
 *   - RTL-aware: dir="auto" on both textarea and preview (Arabic/English mixed content)
 *
 * Data shape (Section 3.2 of masterplan):
 *   { "markdown": "string" }
 */

import { useState, useRef, useEffect } from 'react'
import { renderDirectiveMarkdown } from '../../../lib/directiveRenderer'

// ─── View mode toggle ──────────────────────────────────────────────────────────

const MODES = ['Edit', 'Split', 'Preview']

function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: 'flex',
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 2,
      gap: 2,
    }}>
      {MODES.map(m => {
        const isActive = mode === m
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {m}
          </button>
        )
      })}
    </div>
  )
}

// ─── Auto-growing textarea ─────────────────────────────────────────────────────

function AutoTextarea({ value, onChange, disabled, placeholder }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      dir="auto"
      rows={6}
      style={{
        width: '100%',
        minHeight: 140,
        resize: 'none',
        overflow: 'hidden',
        fontSize: 13,
        lineHeight: 1.6,
        fontFamily: 'var(--font-mono, monospace)',
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        outline: 'none',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    />
  )
}

// ─── Preview panel ─────────────────────────────────────────────────────────────

function PreviewPanel({ markdown }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = renderDirectiveMarkdown(markdown)
  }, [markdown])

  if (!markdown?.trim()) {
    return (
      <div style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-body)',
        fontStyle: 'italic',
        padding: 'var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        minHeight: 140,
      }}>
        Nothing to preview.
      </div>
    )
  }

  return (
    <div
      ref={ref}
      dir="auto"
      className="dir-prose"
      style={{
        padding: 'var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        minHeight: 140,
        overflowY: 'auto',
      }}
    />
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * FreeTextPostEditor
 *
 * @param {{ markdown: string }} data
 * @param {Function} onChange   — (dataPatch) => void; receives { markdown: nextValue }
 * @param {Boolean}  disabled   — freeze controls during parent save
 */
export default function FreeTextPostEditor({ data, onChange, disabled = false }) {
  const markdown = data?.markdown ?? ''
  const [mode, setMode] = useState('Edit')

  const charCount = markdown.length

  function handleChange(val) {
    onChange({ markdown: val })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
      }}>
        <ModeToggle mode={mode} onChange={setMode} />
        <span style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)',
        }}>
          {charCount > 0 ? `${charCount.toLocaleString()} chars` : 'Markdown + cards supported'}
        </span>
      </div>

      {/* Editor area */}
      {mode === 'Edit' && (
        <AutoTextarea
          value={markdown}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Write in markdown… use :::warning, :::dose, :::redflags etc. for cards"
        />
      )}

      {mode === 'Preview' && (
        <PreviewPanel markdown={markdown} />
      )}

      {mode === 'Split' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-2)',
          minWidth: 0,
        }}>
          <AutoTextarea
            value={markdown}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Write in markdown… use :::warning, :::dose, :::redflags etc. for cards"
          />
          <PreviewPanel markdown={markdown} />
        </div>
      )}
    </div>
  )
}
