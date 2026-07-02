import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import { useDirtyState } from '../../hooks/useDirtyState'

/**
 * PersonalNotes — personal note for a condition (Phase 3.4).
 *
 * Batch 5 tweaks:
 *   - Display state is no longer tappable as a whole — an explicit 'Edit'
 *     button (with pencil icon) makes editability discoverable.
 *   - Editing mode gains a 'Clear' button that empties the draft in one tap
 *     (still requires Save to persist the cleared note).
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
    fadeOutRef.current = setTimeout(() => setSavedVisible('out'), 2000)
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
      {/* Label row — icon + all-caps tertiary micro-label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        <Icon name="StickyNote" size={12} color="var(--color-text-tertiary)" />
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
        {/* Saved indicator — inline, right-aligned, triggered by Save button */}
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

      {isEditing ? (
        <>
          {/* Card-style textarea — auto-grows to fit content, accent border */}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write a note..."
            rows={3}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 10px',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.65,
              resize: 'none',
              outline: 'none',
              minHeight: 72,
              display: 'block',
              overflow: 'hidden',
            }}
          />

          {/* Clear on the left, Cancel / Save on the right */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 8,
          }}>
            <button
              type="button"
              onClick={handleClear}
              disabled={!draft}
              style={{
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                color: draft ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                background: 'none',
                border: 'none',
                padding: '6px 4px',
                cursor: draft ? 'pointer' : 'default',
              }}
            >
              Clear
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-secondary)',
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
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
                  fontFamily: 'var(--font-body)',
                  color: '#fff',
                  background: isDirty ? 'var(--color-accent)' : 'var(--color-border)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
                  cursor: isDirty ? 'pointer' : 'default',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : savedValue ? (
        /* Display state — soft yellow sticky-note card, explicit Edit button */
        <div className="personal-note-card">
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.65,
            fontFamily: 'var(--font-body)',
            whiteSpace: 'pre-wrap',
          }}>
            {savedValue}
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 8,
          }}>
            <button
              type="button"
              onClick={startEditing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              <Icon name="Pencil" size={12} color="var(--color-text-secondary)" />
              Edit
            </button>
          </div>
        </div>
      ) : (
        /* Empty state — inviting tap target with icon and privacy note */
        <div
          onClick={startEditing}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="StickyNote" size={16} color="var(--color-accent)" />
          </div>
          <div>
            <p style={{
              margin: '0 0 4px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-body)',
            }}>
              Add your personal notes
            </p>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Icon name="Lock" size={12} color="var(--color-text-tertiary)" />
              Saved to this device — only you can see it
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
