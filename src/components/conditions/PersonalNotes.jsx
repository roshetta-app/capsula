import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import { useDirtyState } from '../../hooks/useDirtyState'

/**
 * PersonalNotes — personal note for a condition (Phase 3.5).
 *
 * Redesign pass: brought in line with the rest of the Condition Details
 * page (Treatment/Clinical visual language) instead of a standalone
 * sticky-note widget. Read-mode card (white surface + 1px border +
 * radius-md) reuses the edit textarea's own border/radius scheme.
 *
 * Refinement pass: further decluttered to feel quieter and lighter
 * (closer to Apple Notes than a web form) —
 *   - Empty state collapsed to a single compact line ('No notes yet ·
 *     Add note'), no icons or explanatory copy — the section title
 *     already communicates this is a notes area.
 *   - Privacy note moved to an edit-mode-only footer line; no longer
 *     shown permanently in the empty state.
 *   - Saved indicator fully unmounts (not just fades to opacity 0) once
 *     its transition completes, so afterwards only Edit occupies that
 *     row. Fade timer shortened to 1.5s per spec.
 *   - Textarea shrunk to a 3-4 line default (rows=3, minHeight 80).
 *   - Focused textarea border uses a muted color-mix instead of the full
 *     accent color, avoiding a "thick blue outline" feel.
 *   - Clear is now fully hidden (not just disabled) until a draft exists,
 *     and stays confirm()-gated.
 *   - Read-mode card padding trimmed so it hugs short notes instead of
 *     leaving empty space.
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const storageKey = `capsula_notes_${conditionId}`

  const [savedValue, setSavedValue] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? '' } catch { return '' }
  })
  const [draft, setDraft] = useState(savedValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isDirty = useDirtyState(savedValue, draft)

  // savedVisible: null | 'in' | 'out'
  const [savedVisible, setSavedVisible] = useState(null)

  const fadeOutRef  = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(fadeOutRef.current)
  }, [])

  const triggerSaved = useCallback(() => {
    clearTimeout(fadeOutRef.current)
    setSavedVisible('in')
    fadeOutRef.current = setTimeout(() => {
      setSavedVisible('out')
      // Unmount after the opacity transition finishes, so the indicator
      // doesn't linger as an invisible-but-present flex item — afterwards
      // only the Edit action should occupy this row.
      fadeOutRef.current = setTimeout(() => setSavedVisible(null), 400)
    }, 1500)
  }, [])

  // Auto-grow the textarea to fit content — runs when entering edit mode
  // and whenever the draft changes.
  useLayoutEffect(() => {
    if (!isEditing || !textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [isEditing, draft])

  function startEditing() {
    setDraft(savedValue)
    setIsEditing(true)
  }

  function handleSave() {
    try { localStorage.setItem(storageKey, draft) } catch { /* ignore */ }
    setSavedValue(draft)
    setIsEditing(false)
    triggerSaved()
  }

  function handleCancel() {
    setDraft(savedValue)
    setIsEditing(false)
  }

  function handleClear() {
    setDraft('')
  }

  function handleClearClick() {
    if (window.confirm('Clear this note?')) handleClear()
  }

  return (
    <div style={{
      marginTop: 'var(--space-4)',
      borderTop: '1px solid var(--color-border)',
      paddingTop: 'var(--space-4)',
    }}>
      {/* Label row — section-title styled to match SectionHeader's label
          elsewhere on this page; right slot holds Cancel/Save while
          editing, nothing extra while displaying (Edit lives on the card
          itself, Saved lives on the card's own footer). */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        <Icon name="StickyNote" size={14} color="var(--color-text-primary)" />
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
        }}>
          Personal Notes
        </span>

        {isEditing && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                color: isDirty ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: isDirty ? 'pointer' : 'default',
              }}
            >
              Save
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <>
          {/* Card-style textarea — auto-grows to fit content, soft border
              that only accents on focus (no thick always-on outline). */}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Write a note..."
            rows={3}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${isFocused ? 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border) 55%)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.65,
              resize: 'none',
              outline: 'none',
              minHeight: 80,
              display: 'block',
              overflow: 'hidden',
              transition: 'border-color 0.15s ease',
            }}
          />

          {/* Footer row — privacy note (edit-mode only, never shown in
              read/empty state) on the left, Clear on the right, only when
              a note actually exists to clear. */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
          }}>
            <span style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
            }}>
              Saved to this device only
            </span>

            {draft && (
              <button
                type="button"
                onClick={handleClearClick}
                aria-label="Clear note"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-tertiary)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <Icon name="X" size={12} color="var(--color-text-tertiary)" />
                Clear
              </button>
            )}
          </div>
        </>
      ) : savedValue ? (
        /* Display state — white surface, subtle border, radius-md — same
           border/radius language as the edit textarea, so this reads as
           one continuous surface rather than a separate widget. */
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)',
        }}>
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.65,
            fontFamily: 'var(--font-body)',
            whiteSpace: 'pre-wrap',
            color: 'var(--color-text-primary)',
          }}>
            {savedValue}
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 6,
          }}>
            {savedVisible && (
              <span style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                opacity: savedVisible === 'in' ? 1 : 0,
                transition: savedVisible === 'in'
                  ? 'opacity 0.2s ease'
                  : 'opacity 0.4s ease',
              }}>
                ✓ Saved
              </span>
            )}
            <button
              type="button"
              onClick={startEditing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                color: 'var(--color-accent)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <Icon name="Pencil" size={12} color="var(--color-accent)" />
              Edit
            </button>
          </div>
        </div>
      ) : (
        /* Empty state — single compact line, no icons or explanatory
           copy. The section title above already signals this is a notes
           area, so nothing here repeats that meaning. */
        <p
          onClick={startEditing}
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          No notes yet · <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Add note</span>
        </p>
      )}
    </div>
  )
}
