/**
 * NoteRowEditor — edits a prescription_items row of type='note'.
 * Saves on blur. Visually distinct with an accent left border.
 *
 * Props:
 *   item      PrescriptionItem
 *   onChange  (updatedItem) => void
 *   disabled  boolean
 */

import { updatePrescriptionItem } from '../../lib/adminQueries'

export default function NoteRowEditor({ item, onChange, disabled }) {
  async function handleBlur(e) {
    const content = e.target.value
    onChange({ ...item, content })
    await updatePrescriptionItem(item.id, { content })
  }

  return (
    <div style={{
      borderLeft: '3px solid var(--color-accent)',
      paddingLeft: 'var(--space-3)',
      backgroundColor: 'var(--color-bg)',
      borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    }}>
      <textarea
        defaultValue={item.content ?? ''}
        onBlur={handleBlur}
        placeholder="Clinical note or warning (e.g. Avoid in renal impairment)…"
        rows={2}
        dir="auto"
        disabled={disabled}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '8px 12px',
          border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontFamily: 'var(--font-body)',
          backgroundColor: '#FFFBEB', color: '#92400E',
          resize: 'vertical', outline: 'none',
        }}
      />
    </div>
  )
}
