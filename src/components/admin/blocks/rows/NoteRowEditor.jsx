/**
 * src/components/admin/blocks/rows/NoteRowEditor.jsx
 *
 * Row editor for { row_type: "note" } rows inside a prescription_sheet block.
 * These are inline notes within a prescription sheet, distinct from top-level
 * note_callout blocks.
 *
 * Props:
 *   row      — { row_type, text_en, text_ar } (NOTE_ROW_TEMPLATE — no flavor;
 *              the app always renders these via NoteCallout's default flavor)
 *   onChange — (nextRow) => void
 *
 * Pure controlled component — zero DB calls.
 */

import { useRef, useEffect } from 'react'

function FieldLabel({ children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {children}
      </span>
    </div>
  )
}

/** Auto-grows to fit content — no fixed height, no scrollbar */
function AutoTextarea({ value, onChange, placeholder }) {
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
      placeholder={placeholder}
      dir="auto"
      rows={2}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '7px 10px',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        lineHeight: 1.55,
        minHeight: 36,
        display: 'block',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    />
  )
}

export default function NoteRowEditor({ row, onChange }) {
  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Note text (English) ── */}
      <div>
        <FieldLabel>Note text (English)</FieldLabel>
        <AutoTextarea
          value={row.text_en ?? ''}
          onChange={text_en => patch({ text_en })}
          placeholder="e.g. Take with food"
        />
      </div>

      {/* ── Note text (Arabic) ── */}
      <div>
        <FieldLabel>Note text (Arabic)</FieldLabel>
        <AutoTextarea
          value={row.text_ar ?? ''}
          onChange={text_ar => patch({ text_ar })}
          placeholder="النص بالعربية (اختياري)"
        />
      </div>

    </div>
  )
}

