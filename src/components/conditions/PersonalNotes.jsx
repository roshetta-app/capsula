import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * PersonalNotes — personal note for a condition (Phase 3.1).
 *
 * Design changes:
 *   - Removed card-within-card look (muted background + shadow wrapper).
 *     Now uses a simple top hairline to separate from the prescription content,
 *     matching the ambient/flat rhythm of the rest of the Rx tab.
 *   - Label uses a small left-accent bar (3px colored rule) for visual anchoring
 *     instead of an uppercase micro-label, giving it a more editorial feel.
 *   - Textarea is completely borderless by default — only the bottom rule shows.
 *     On focus a subtle left accent border appears (no box-shadow, no full border).
 *   - "Saved" indicator moves inline next to the label (right side), not below textarea.
 *   - Placeholder softened so the area reads as ambient/inviting rather than form-like.
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
      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        {/* Left accent bar */}
        <div style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          backgroundColor: 'var(--color-accent)',
          opacity: 0.5,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.01em',
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

      {/* Ambient textarea — borderless, bottom-rule only */}
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
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-border-subtle)',
          borderRadius: 0,
          padding: '4px 0 8px',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.65,
          resize: 'none',
          outline: 'none',
          minHeight: 64,
          display: 'block',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-accent)'
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--color-border-subtle)'
        }}
      />
    </div>
  )
}
