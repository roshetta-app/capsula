import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import ConfirmSheet from '../ui/ConfirmSheet'
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
 * Final polish pass:
 *   - Clear confirmation now uses an in-app ConfirmSheet instead of the
 *     native window.confirm() dialog, matching the app's own visual
 *     language and destructive-action styling (real --color-danger
 *     token, not a placeholder fallback).
 *   - Empty state now sits inside a subtly tinted, bordered card instead
 *     of bare text, giving it a visible boundary while staying compact
 *     (no icons/illustrations added).
 *   - Saving the very first note (empty -> populated) triggers a brief
 *     CSS opacity/transform fade-in on the card. Subsequent edits to an
 *     already-populated note do not re-trigger it.
 *
 * Minor fixes pass:
 *   - Privacy icon added before the "Saved to this device only" label.
 *   - Clear button restyled red (--color-danger) to read as destructive.
 *   - Saved flash moved out of the card's own footer (where its
 *     mount/unmount was shifting the card's height) into the label row's
 *     right-hand slot — the same slot Edit normally occupies, so Saved
 *     swaps in over Edit and swaps back to Edit on fade-out, with no
 *     layout shift.
 *   - Display-mode card now shares the edit textarea's minHeight (88)
 *     and padding, so a one-line note no longer collapses to a tiny box
 *     and toggling between display/edit doesn't visibly resize.
 *
 * Final polish pass (v2):
 *   - Empty state redesigned: compact (minHeight 56 vs prior open-ended
 *     height), vertically centered, CTA-first hierarchy ("+ Add your
 *     first note" primary / "Saved only on this device" secondary —
 *     echoes the edit-mode privacy line instead of introducing new copy).
 *   - Saved-state card border switched to --color-border-subtle (softer,
 *     matches the app's general card border weight) and bottom padding
 *     increased for more breathing room under the note text.
 *   - Label row items given lineHeight: 1 so title and Edit sit on the
 *     same baseline.
 *   - Edit-mode helper text pulled closer to the textarea (marginTop
 *     6 -> 4) so it reads as part of the editor, not a floating line.
 *   - Delete-confirmation copy simplified to "This action can't be
 *     undone."
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

  // Clear confirmation sheet
  const [showConfirm, setShowConfirm] = useState(false)

  // First-note fade-in — true only for the single render right after an
  // empty note becomes populated; flipped back to false shortly after
  // mount so it never re-triggers on subsequent edits.
  const [justPopulated, setJustPopulated] = useState(false)

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

  // Flip the fade-in flag off shortly after it turns on, so the
  // transition plays exactly once per first-save.
  useEffect(() => {
    if (!justPopulated) return
    const id = setTimeout(() => setJustPopulated(false), 300)
    return () => clearTimeout(id)
  }, [justPopulated])

  function startEditing() {
    setDraft(savedValue)
    setIsEditing(true)
  }

  function handleSave() {
    try { localStorage.setItem(storageKey, draft) } catch { /* ignore */ }
    if (!savedValue && draft) setJustPopulated(true)
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
    setShowConfirm(true)
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
          lineHeight: 1,
        }}>
          Personal Notes
        </span>

        {isEditing ? (
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
        ) : savedVisible ? (
          /* Saved flash occupies the exact slot Edit lives in, so it
             swaps in/out in place instead of appearing on a separate
             line that changes the card's height. */
          <span style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
            opacity: savedVisible === 'in' ? 1 : 0,
            transition: savedVisible === 'in'
              ? 'opacity 0.2s ease'
              : 'opacity 0.4s ease',
          }}>
            ✓ Saved
          </span>
        ) : savedValue ? (
          <button
            type="button"
            onClick={startEditing}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              lineHeight: 1,
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
        ) : null}
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
              minHeight: 88,
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
            marginTop: 4,
          }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
            }}>
              <Icon name="Shield" size={11} color="var(--color-text-tertiary)" />
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
                  color: 'var(--color-danger)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <Icon name="X" size={12} color="var(--color-danger)" />
                Clear
              </button>
            )}
          </div>
        </>
      ) : savedValue ? (
        /* Display state — white surface, subtle border, radius-md — same
           border/radius language as the edit textarea, so this reads as
           one continuous surface rather than a separate widget. On the
           very first save (empty -> populated) this fades/scales in;
           subsequent edits render at steady-state with no re-animation. */
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px 16px',
          minHeight: 88,
          boxSizing: 'border-box',
          opacity: justPopulated ? 0 : 1,
          transform: justPopulated ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
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
        </div>
      ) : (
        /* Empty state — tinted, bordered card (subtle blue tint over
           surface) so it reads as a distinct tappable area instead of
           bare text, while staying compact — no icons, no illustrations. */
        <div
          onClick={startEditing}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 3%, var(--color-surface) 97%)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            minHeight: 56,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 2,
            cursor: 'pointer',
          }}
        >
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-body)',
          }}>
            + Add your first note
          </span>
          <span style={{
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
          }}>
            Saved only on this device
          </span>
        </div>
      )}

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleClear}
        title="Delete note?"
        message="This action can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
