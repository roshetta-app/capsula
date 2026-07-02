import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import { useDirtyState } from '../../hooks/useDirtyState'

/**
 * PersonalNotes — personal note for a condition (Phase 3.5).
 *
 * Redesign pass: brought in line with the rest of the Condition Details
 * page (Treatment/Clinical visual language) instead of a standalone
 * sticky-note widget.
 *   - Display card: white surface + 1px border + radius-md, reusing the
 *     same border/radius scheme as the edit textarea below, so read and
 *     edit states feel like one continuous surface.
 *   - Label row: 'Personal Notes', no uppercase, styled to match
 *     PrescriptionSheetBlock's SectionHeader label (13px/700, no
 *     text-transform, text-primary) — the closest existing "section
 *     title" precedent on this same page.
 *   - Divider: 1px var(--color-border) hairline, matching the weight used
 *     elsewhere on the page, replacing the old heavy 2px tertiary border.
 *   - Edit action: plain text action (accent color, no button chrome)
 *     instead of an outlined pill button.
 *   - Save/Cancel: live in the header row instead of a floating row below
 *     the textarea; Save enabled only once dirty.
 *   - Clear: icon-only, gated behind a confirm() instead of a prominent
 *     always-visible action.
 *   - Textarea: soft border that only accents on focus (no thick outline),
 *     auto-grows, defaults to ~4-5 lines instead of a cramped 3.
 *   - Empty state: flattened, lightweight tap row instead of an
 *     onboarding-style circular icon badge.
 *   - Saved indicator: temporary, fades out — unchanged fade timer logic,
 *     just prefixed with a checkmark.
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

  function handleClearClick() {
    if (window.confirm('Clear this note?')) handleClear()
  }

  const savedOpacity =
    savedVisible === 'in'  ? 1 :
    savedVisible === 'out' ? 0 :
    0

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
            rows={4}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${isFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.65,
              resize: 'none',
              outline: 'none',
              minHeight: 100,
              display: 'block',
              overflow: 'hidden',
              transition: 'border-color 0.15s ease',
            }}
          />

          {/* Clear — icon-only, confirm-gated, kept low-key beneath the
              textarea rather than a prominent always-visible action. */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 8,
          }}>
            <button
              type="button"
              onClick={handleClearClick}
              disabled={!draft}
              aria-label="Clear note"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                color: draft ? 'var(--color-text-tertiary)' : 'var(--color-border)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: draft ? 'pointer' : 'default',
              }}
            >
              <Icon name="X" size={12} color={draft ? 'var(--color-text-tertiary)' : 'var(--color-border)'} />
              Clear
            </button>
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
          padding: 'var(--space-3) var(--space-4)',
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
            marginTop: 8,
          }}>
            <span style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              opacity: savedOpacity,
              transition: savedVisible === 'in'
                ? 'opacity 0.2s ease'
                : 'opacity 0.4s ease',
            }}>
              ✓ Saved
            </span>
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
        /* Empty state — lightweight tap row, no onboarding-style circular
           icon badge. Privacy note stays empty-state-only. */
        <div
          onClick={startEditing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <Icon name="StickyNote" size={14} color="var(--color-text-tertiary)" />
          <div>
            <p style={{
              margin: '0 0 2px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              No notes yet — <span style={{ color: 'var(--color-accent)' }}>Add one</span>
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
              <Icon name="Lock" size={11} color="var(--color-text-tertiary)" />
              Add your own clinical pearls, reminders or mnemonics — saved to this device only.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
