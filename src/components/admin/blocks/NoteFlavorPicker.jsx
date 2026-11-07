/**
 * NoteFlavorPicker.jsx
 *
 * Shared CMS pieces for note editing, used by the standalone note editor and
 * the note rows inside a prescription sheet:
 *   NoteFlavorPicker — Info / Warning / Tip chips with the same icons and
 *                      colours the app uses.
 *   NoteTextArea     — one text area for the note, any language. Starts one
 *                      line tall and grows as you type.
 *
 * Pure presentational, no DB calls.
 */

import { useRef, useEffect } from 'react'
import { NoteFlavorIcon } from '../../ui/NoteCallout'
import { NOTE_FLAVOR_OPTIONS, noteFlavorColor } from '../../ui/noteFlavors'

export function NoteFlavorPicker({ value, onChange }) {
  const current = value ?? 'info'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', minWidth: 36 }}>
        Type
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {NOTE_FLAVOR_OPTIONS.map(opt => {
          const active = current === opt.value
          const color = noteFlavorColor(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                border: active
                  ? `1.5px solid ${color}`
                  : '1.5px solid var(--color-border)',
                background: active
                  ? `color-mix(in srgb, ${color} 12%, transparent)`
                  : 'transparent',
                color: active ? color : 'var(--color-text-secondary)',
                fontSize: 13, fontWeight: active ? 700 : 500,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <NoteFlavorIcon flavor={opt.value} size={14} />
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function NoteTextArea({ value, onChange, placeholder }) {
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
      rows={1}
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
