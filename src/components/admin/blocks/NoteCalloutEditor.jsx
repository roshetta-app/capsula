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
 * This component only exposes `text` and `flavor`: the type chips and one
 * text area (any language, one line to start, grows as you type).
 */

import { NoteFlavorPicker, NoteTextArea } from './NoteFlavorPicker'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <NoteFlavorPicker value={flavor} onChange={next => update({ flavor: next })} />
      <NoteTextArea
        value={text}
        onChange={next => update({ text: next })}
        placeholder="Note text (**bold** and - lists work)…"
      />
    </div>
  )
}
