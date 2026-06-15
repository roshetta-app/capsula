import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * PersonalNotes — personal note for a condition (Phase 3.1).
 *
 * Design changes:
 *   - Section container now has a muted surface background + subtle shadow
 *     so it reads as a distinct input card rather than a flat text block.
 *   - Textarea border is a full 1px border-subtle; on focus it upgrades to
 *     accent without any JS jank (kept the inline handler).
 *   - Reduced top margin so the spacing above PersonalNotes matches the
 *     overall rhythm of the screen (was --space-6, now --space-4).
 *   - Pencil icon next to label is slightly bolder.
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
      marginTop: 'var(--space-4)',
      borderTop: '0.5px solid var(--color-border)',
      paddingTop: 'var(--space-4)',
    }}>
      {/* Card wrapper — gives the note area visual weight as an input zone */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px 8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Section label */}
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          Personal Note
          <svg
            width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.55 }}
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
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 11px',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
            minHeight: 76,
            display: 'block',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--color-accent)'
            e.target.style.boxShadow = '0 0 0 2px var(--color-accent-light)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--color-border)'
            e.target.style.boxShadow = 'none'
          }}
        />

        {/* Autosave indicator */}
        <div style={{
          textAlign: 'right',
          marginTop: 3,
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          opacity: savedOpacity,
          transition: savedVisible === 'in'
            ? 'opacity 0.2s ease'
            : 'opacity 0.4s ease',
          height: 14,
        }}>
          Saved
        </div>
      </div>
    </div>
  )
}
