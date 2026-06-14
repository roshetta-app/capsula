import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * PersonalNotes — personal note for a condition (Phase 3.1).
 *
 * - Hairline separator above the block
 * - Always-visible textarea (no tap-to-edit toggle)
 * - Autosaves 500ms after last keystroke
 * - "Saved" indicator fades in then out after save
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const storageKey = `capsula_notes_${conditionId}`

  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? '' } catch { return '' }
  })

  // savedVisible: null | 'in' | 'out'
  const [savedVisible, setSavedVisible] = useState(null)

  const debounceRef  = useRef(null)
  const fadeOutRef   = useRef(null)

  // Cleanup timers on unmount
  useEffect(() => () => {
    clearTimeout(debounceRef.current)
    clearTimeout(fadeOutRef.current)
  }, [])

  const triggerSaved = useCallback(() => {
    clearTimeout(fadeOutRef.current)
    setSavedVisible('in')
    fadeOutRef.current = setTimeout(() => setSavedVisible('out'), 2000)
  }, [])

  function handleChange(e) {
    const next = e.target.value
    setValue(next)

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, next) } catch { /* ignore */ }
      triggerSaved()
    }, 500)
  }

  const savedOpacity =
    savedVisible === 'in'  ? 1 :
    savedVisible === 'out' ? 0 :
    0

  return (
    <div style={{
      borderTop: '0.5px solid var(--color-border)',
      marginTop: 'var(--space-6)',
      paddingTop: 'var(--space-5)',
    }}>
      {/* Section label */}
      <div style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
      }}>
        Personal Note
        <svg
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.5 }}
        >
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Add your personal note for this condition..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 14,
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-surface)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.6,
          resize: 'none',
          outline: 'none',
          minHeight: 80,
          display: 'block',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--color-accent)' }}
        onBlur={e  => { e.target.style.borderColor = 'var(--color-border)' }}
      />

      {/* Autosave indicator */}
      <div style={{
        textAlign: 'right',
        marginTop: 4,
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        opacity: savedOpacity,
        transition: savedVisible === 'in'
          ? 'opacity 0.2s ease'
          : 'opacity 0.4s ease',
        height: 16,           // reserve space so layout doesn't shift
      }}>
        Saved
      </div>
    </div>
  )
}
