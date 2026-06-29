import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * PersonalNotes — personal note for a condition (Phase 3.1).
 *
 * Batch 2 visual fixes:
 *   - Label: removed left accent bar, switched to all-caps tertiary micro-label
 *     pattern ('MY NOTES') matching PrescriptionPills' 'TREATMENT OPTIONS' convention.
 *   - Textarea: removed borderless/bottom-rule-only treatment; now has a visible
 *     light card box (border + background) consistent with the app's other
 *     input-like surfaces. Autosave 'Saved' indicator remains inline next to label.
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

  const debounceRef = useRef(null)
  const fadeOutRef  = useRef(null)

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
      marginTop: 'var(--space-4)',
      borderTop: '0.5px solid var(--color-border)',
      paddingTop: 'var(--space-4)',
    }}>
      {/* Label row — all-caps tertiary micro-label, no accent bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)',
        }}>
          My notes
        </span>
        {/* Autosave indicator — inline, right-aligned */}
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          opacity: savedOpacity,
          transition: savedVisible === 'in'
            ? 'opacity 0.2s ease'
            : 'opacity 0.4s ease',
        }}>
          Saved
        </span>
      </div>

      {/* Card-style textarea — visible border + surface background */}
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Jot down anything useful for this condition…"
        rows={3}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 14,
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 10px',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.65,
          resize: 'none',
          outline: 'none',
          minHeight: 72,
          display: 'block',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-accent)'
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--color-border)'
        }}
      />
    </div>
  )
}
