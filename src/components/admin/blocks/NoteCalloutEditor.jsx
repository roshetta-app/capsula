/**
 * NoteCalloutEditor.jsx
 *
 * CMS editor for `note_callout` blocks.
 *
 * Props:
 *   block    — { block_type: 'note_callout', data: { text, flavor, context } }
 *   onChange — (nextData) => void   ← called with the updated data object only
 *
 * The `context` field ('clinical' | 'rx') is auto-set by BlockListEditor from
 * the active sub-tab at creation time and is NEVER shown to the admin here.
 * This component only exposes `text` and `flavor`.
 *
 * The preview under the text box is the real app NoteCallout (through
 * NoteFlavorPicker.jsx), live as you type — what you see is what the app shows.
 */

import { NoteFlavorPicker, NoteLivePreview } from './NoteFlavorPicker'

export default function NoteCalloutEditor({ block, onChange }) {
  const data = block?.data ?? {}
  const text    = data.text    ?? ''
  const flavor  = data.flavor  ?? 'info'
  // `context` is preserved but never surfaced in this UI
  const context = data.context ?? 'clinical'

  function update(patch) {
    onChange({ text, flavor, context, ...patch })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <NoteFlavorPicker value={flavor} onChange={next => update({ flavor: next })} />

      {/* ── Text input ── */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={e => update({ text: e.target.value })}
          placeholder="Note text (**bold**, - lists supported)…"
          dir="auto"
          rows={3}
          style={{
            width: '100%',
            resize: 'vertical',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            minHeight: 72,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: '0.7rem',
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none',
          }}
        >
          {text.length}
        </div>
      </div>

      <NoteLivePreview text={text} flavor={flavor} />

    </div>
  )
}
