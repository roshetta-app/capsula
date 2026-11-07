/**
 * src/components/admin/blocks/rows/NoteRowEditor.jsx
 *
 * Row editor for { row_type: "note" } rows inside a prescription_sheet block.
 * These are inline notes within a prescription sheet, distinct from top-level
 * note_callout blocks.
 *
 * Props:
 *   row      — { row_type, text_en, text_ar, flavor } (NOTE_ROW_TEMPLATE; rows
 *              saved before flavor existed have none and show as info)
 *   onChange — (nextRow) => void
 *
 * One text area, any language. The app reads text_en then text_ar, so the
 * typed text is saved in text_en. An older row that has both fields shows
 * them joined (English, blank line, Arabic) in the one area; the first edit
 * saves it all into text_en and clears text_ar.
 *
 * Pure controlled component — zero DB calls.
 */

import { NoteFlavorPicker, NoteTextArea } from '../NoteFlavorPicker'

export default function NoteRowEditor({ row, onChange }) {
  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  const text = [row.text_en, row.text_ar].filter(Boolean).join('\n\n')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <NoteFlavorPicker value={row.flavor ?? 'info'} onChange={flavor => patch({ flavor })} />
      <NoteTextArea
        value={text}
        onChange={next => patch({ text_en: next, text_ar: null })}
        placeholder="Note (e.g. Take with food) — any language"
      />
    </div>
  )
}
