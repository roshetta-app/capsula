/**
 * NoteFlavorPicker.jsx
 *
 * Shared CMS pieces for note editing, used by the standalone note editor and
 * the note rows inside a prescription sheet:
 *   NoteFlavorPicker — Info / Warning / Tip chips with the same icons and
 *                      colours the app uses.
 *   NoteLivePreview  — the real NoteCallout, drawn exactly as the app draws it
 *                      (bold, lists, Arabic side flip), updating as you type.
 *
 * Pure presentational, no DB calls.
 */

import NoteCallout, { NoteFlavorIcon } from '../../ui/NoteCallout'
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

export function NoteLivePreview({ text, flavor }) {
  const hasText = !!(text && text.trim())
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        color: 'var(--color-text-secondary)', marginBottom: 6,
      }}>
        Preview
      </div>
      {hasText ? (
        <NoteCallout text={text} flavor={flavor ?? 'info'} flush />
      ) : (
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          border: '1.5px dashed var(--color-border)',
          fontSize: 13, color: 'var(--color-text-tertiary)',
        }}>
          The note will appear here as you type.
        </div>
      )}
    </div>
  )
}
