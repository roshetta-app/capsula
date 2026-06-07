/**
 * TextRowEditor — edits a prescription_items row of type='text'.
 * Saves on blur.
 *
 * Props:
 *   item      PrescriptionItem
 *   onChange  (updatedItem) => void
 *   disabled  boolean
 */

import { updatePrescriptionItem } from '../../lib/adminQueries'

export default function TextRowEditor({ item, onChange, disabled }) {
  async function handleBlur(e) {
    const content = e.target.value
    onChange({ ...item, content })
    await updatePrescriptionItem(item.id, { content })
  }

  return (
    <textarea
      defaultValue={item.content ?? ''}
      onBlur={handleBlur}
      placeholder="Free text line (e.g. Rest, plenty of fluids, avoid NSAIDs)…"
      rows={2}
      dir="auto"
      disabled={disabled}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '8px 12px',
        border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        fontSize: 13, fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
        resize: 'vertical', outline: 'none',
      }}
    />
  )
}
