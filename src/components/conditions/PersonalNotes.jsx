import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { User } from 'lucide-react'
import Icon from '../ui/Icon'
import ConfirmSheet from '../ui/ConfirmSheet'
import ProfileAvatar from '../ui/ProfileAvatar'
import { useDirtyState } from '../../hooks/useDirtyState'
import { useAuth } from '../../hooks/useAuth'
import { useNotes } from '../../hooks/useNotes'
import { useNotesSignInContext } from '../../context/NotesSignInContext'

const AVATAR_SIZE = 32

// Small, single-purpose relative-time formatter for the "Edited …" line
// below a saved note. Kept local to this file rather than a new shared
// utils/ helper — checked project_tree.md's utils/ folder first and
// nothing else in the app currently needs relative-time formatting, so a
// new shared utility would be introducing a pattern nothing else asked
// for. If a second consumer shows up later, this is the one to promote.
function formatRelativeTime(isoString) {
  if (!isoString) return null
  const diffMs = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1)  return 'Edited just now'
  if (minutes < 60) return `Edited ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Edited ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Edited ${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `Edited ${weeks}w ago`
  return `Edited on ${new Date(isoString).toLocaleDateString()}`
}

/**
 * PersonalNotes — personal note for a condition (Phase 3.5).
 *
 * Redesign pass: brought in line with the rest of the Condition Details
 * page (Treatment/Clinical visual language) instead of a standalone
 * sticky-note widget. Read-mode card (white surface + 1px border +
 * radius-md) reuses the edit textarea's own border/radius scheme.
 *
 * [...earlier redesign/polish pass notes retained from prior versions of
 * this file — see git history for the full sequence of visual-only
 * refinements that predate the account-gating and comment-style work
 * below.]
 *
 * Phase F3 — Personal Data Migration:
 *   - Storage moved out of this component into useNotes.js, which adds
 *     account-aware syncing (D1).
 *
 * notes-signin-required:
 *   - Notes require an account, matching favourites' Phase 7 treatment.
 *     A signed-out user can't type a draft at all — the empty state is a
 *     static prompt instead of a textarea, so there's nothing that can be
 *     lost to the Google sign-in round trip.
 *
 * notes-comment-redesign (this session):
 *   - Saved note now renders as a social-style comment: avatar, "You",
 *     a relative "Edited …" timestamp, note text, and an inline Edit
 *     link underneath — replacing the old plain white text card with a
 *     separate header-row Edit button.
 *   - The header-row Edit button is gone — Edit now lives inline under
 *     the note text, so there is only ever one Edit affordance on screen
 *     at a time. The "✓ Saved" flash keeps its old spot in the header
 *     row, which no longer collides with anything there.
 *   - Signed-out and signed-in-empty states are now visually identical
 *     (avatar + "Add a note or a thought" / "Only you can see this"),
 *     rather than two differently-worded prompts. Tapping either opens
 *     the sign-in sheet if signed out, or drops straight into edit mode
 *     if already signed in — the sign-in ask itself now lives only in
 *     the bottom sheet's own copy (see AccountSheet.jsx's noteContext),
 *     not duplicated here in the card.
 *   - Avatar reuses the shared ProfileAvatar component (sized down to
 *     32px via its style-override prop) for a signed-in user; a plain
 *     generic-person icon fills the same circle for the signed-out
 *     prompt, since ProfileAvatar has nothing to render without a user.
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const { user, profile } = useAuth()
  const { savedValue, updatedAt, save } = useNotes(conditionId)
  const { requestNoteSignIn } = useNotesSignInContext()

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
      // doesn't linger as an invisible-but-present flex item.
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

  // Unified empty/prompt-state tap handler — signed in drops straight
  // into edit mode; signed out opens the sign-in sheet instead. The
  // sign-in ask itself lives only in that sheet's copy now, not here.
  function handlePromptTap() {
    if (user) {
      startEditing()
    } else {
      requestNoteSignIn(conditionId)
    }
  }

  function handleSave() {
    const isFirstSaveForThisCondition = !savedValue && draft
    if (isFirstSaveForThisCondition) {
      setJustPopulated(true)
    }
    save(draft)
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
          editing, the "✓ Saved" flash otherwise, nothing else. */}
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

          {/* Footer row — privacy note (edit-mode only) on the left,
              Clear on the right, only when a note actually exists to
              clear. */}
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
              <Icon name="Lock" size={11} color="var(--color-text-tertiary)" />
              Visible only to you
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
      ) : user && savedValue ? (
        /* Populated, signed in — comment-style card: avatar, "You" +
           relative timestamp, note text, inline Edit link. On the very
           first save (empty -> populated) this fades/scales in;
           subsequent edits render at steady-state with no re-animation. */
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          boxSizing: 'border-box',
          opacity: justPopulated ? 0 : 1,
          transform: justPopulated ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          display: 'flex',
          gap: 10,
        }}>
          <ProfileAvatar
            user={user}
            fullName={profile?.fullName}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              marginBottom: 2,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
              }}>
                You
              </span>
              {updatedAt && (
                <span style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {formatRelativeTime(updatedAt)}
                </span>
              )}
            </div>
            <p style={{
              margin: '0 0 6px',
              fontSize: 14,
              lineHeight: 1.65,
              fontFamily: 'var(--font-body)',
              whiteSpace: 'pre-wrap',
              color: 'var(--color-text-primary)',
            }}>
              {savedValue}
            </p>
            <button
              type="button"
              onClick={startEditing}
              style={{
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
              Edit
            </button>
          </div>
        </div>
      ) : (
        /* Unified prompt state — identical whether signed out or signed
           in with no note yet. Tap routes to the sign-in sheet or
           straight into edit mode via handlePromptTap. The sign-in ask
           itself lives only in the bottom sheet's own copy now, not
           duplicated here. */
        <div
          onClick={handlePromptTap}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 3%, var(--color-surface) 97%)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            minHeight: 56,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          {user ? (
            <ProfileAvatar
              user={user}
              fullName={profile?.fullName}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12 }}
            />
          ) : (
            <div style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={16} color="var(--color-text-tertiary)" strokeWidth={1.8} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
            }}>
              Add a note or a thought
            </p>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
            }}>
              Only you can see this
            </p>
          </div>
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
