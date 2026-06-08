import { useState, useRef, useEffect } from 'react'

/**
 * PersonalNotes — tap-to-edit personal note for a condition.
 *
 * Phase 2D spec:
 *  - Stored in localStorage key: capsula_notes_{conditionId}
 *  - Saves automatically on blur
 *  - Pencil icon indicates editability
 *  - Placeholder shown when empty
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const storageKey  = `capsula_notes_${conditionId}`
  const [value, setValue]     = useState(() => {
    try { return localStorage.getItem(storageKey) ?? '' } catch { return '' }
  })
  const [editing, setEditing] = useState(false)
  const textareaRef           = useRef(null)

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  function handleBlur() {
    setEditing(false)
    try { localStorage.setItem(storageKey, value) } catch { /* ignore */ }
  }

  function handleChange(e) {
    setValue(e.target.value)
  }

  const isEmpty = !value.trim()

  return (
    <div style={{ marginTop: 'var(--space-5)' }}>
      {/* Section label */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-2)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
      }}>
        Personal Note
        {/* Pencil icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={4}
          placeholder="Add your personal note for this condition..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface)',
            border: '1.5px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{
            fontSize: 13,
            color: isEmpty ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            cursor: 'text',
            minHeight: 60,
            fontStyle: isEmpty ? 'italic' : 'normal',
          }}
        >
          {isEmpty ? 'Add your personal note for this condition...' : value}
        </div>
      )}
    </div>
  )
}
