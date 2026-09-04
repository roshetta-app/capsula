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
const PILL_RADIUS = 18

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
 * notes-comment-redesign:
 *   - Saved note renders as a social-style comment: avatar, "You" + a
 *     relative "Edited …" timestamp, note text, inline Edit link.
 *   - Signed-out and signed-in-empty states are visually identical
 *     (avatar + "Add a note or a thought…" / "Only you can see this"),
 *     rather than two differently-worded prompts. Tapping either opens
 *     the sign-in sheet if signed out, or drops straight into edit mode
 *     if already signed in — the sign-in ask itself lives only in the
 *     bottom sheet's own copy (see AccountSheet.jsx's noteContext), not
 *     duplicated here in the card.
 *
 * avatar-instant-load:
 *   - While useAuth()'s sign-in check is still settling, shows a small
 *     skeleton block instead of the signed-out prompt, gated on
 *     `loading`, so an already-signed-in person doesn't see a flash of
 *     the wrong state on a cold open.
 *
 * notes-pill-redesign:
 *   - Every state (loading / empty prompt / editing / saved) shares one
 *     plain pill shape for the actual text content — a single hairline
 *     border, 18px corners, no elevated card surface behind it. The
 *     avatar and the caption/meta line sit OUTSIDE the pill, not nested
 *     inside a bordered wrapper with them — the pill is just the text
 *     box, matching a plain comment-input look rather than a card.
 *   - Placeholder/prompt copy is "Add a note or a thought…" (trailing
 *     ellipsis), used consistently as both the empty-state pill text and
 *     the textarea's real placeholder attribute.
 *
 * clear-note-saves-immediately:
 *   - Confirming Clear (via ConfirmSheet) calls save('') right away
 *     instead of only clearing the in-memory draft — the confirm dialog
 *     tap IS the save intent, so a second Save tap afterward would have
 *     been redundant and confusing.
 *
 * notes-comment-polish (this session):
 *   - Empty/editing/populated rows all top-align the avatar with the
 *     pill directly (no header content pushing the pill down inside the
 *     column), so avatar and pill line up cleanly instead of drifting
 *     apart — the empty-state prompt row centers the avatar against the
 *     pill instead, since that pill is the column's only content.
 *   - Placeholder copy (both the textarea's real placeholder and the
 *     empty-state pill text) is now a muted tertiary grey instead of
 *     bold near-black, so it reads as a placeholder rather than content.
 *   - Save is now a "Send" icon button living inside the pill itself,
 *     pinned to the bottom-right corner as the textarea grows — Cancel
 *     and Clear are the only controls left in the footer row below.
 *   - "Visible only to you" no longer appears in the editing footer
 *     (Clear/Cancel felt crowded with it); the privacy note now lives
 *     in a corner slot beside the pill (see below), and only shows in
 *     the empty-prompt state.
 *   - Populated state drops the redundant "You" label (the avatar
 *     already signals authorship) and moves "Edited …" out of the header
 *     row and down to a plain line under the pill, so the avatar and
 *     pill align to the top instead of the pill being pushed down by a
 *     caption row above it.
 *   - notes-corner-slot: "Only you can see this" (empty state), "Edit"
 *     (populated state), and the "✓ Saved" flash all share ONE slot —
 *     top-right, directly above the pill, never in the header. Only one
 *     of them ever renders at a time (Saved flash takes priority right
 *     after a save/clear, then the state's normal content returns), so
 *     they never compete for the same spot.
 *   - Signed-out placeholder avatar circle now uses --color-accent-light
 *     (the app's existing tinted-blue token, also used for
 *     fav-sticky-header) instead of the plain page --color-bg, so it
 *     reads as an avatar rather than an empty grey circle; its User icon
 *     switched from tertiary grey to --color-accent to stay legible on
 *     the tint. Every pill (loading / editing / populated / prompt) now
 *     sits on --color-surface (white) instead of the transparent
 *     page background, so the pill reads as its own surface.
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const { user, profile, loading } = useAuth()
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
    if (!isDirty) return
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
    // Clearing is confirmed via ConfirmSheet before this runs — that
    // confirmation IS the save intent, so this commits immediately
    // instead of leaving an already-confirmed clear sitting as an
    // unsaved draft the user would have to hit Save on again.
    save('')
    setDraft('')
    setIsEditing(false)
    triggerSaved()
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
      {/* Scoped placeholder color — inline style attributes can't target
          ::placeholder, so this is the one bit of real CSS in an
          otherwise inline-styled file. */}
      <style>{`
        .personal-notes-textarea::placeholder {
          color: var(--color-text-tertiary);
          opacity: 1;
        }
      `}</style>

      {/* Label row — just the static title now. The privacy caption,
          "Edit" link, and "✓ Saved" flash all moved to a shared corner
          slot beside the pill itself (see each state below) instead of
          living here. */}
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
      </div>

      {loading ? (
        /* Loading skeleton — shown only while useAuth()'s sign-in check
           is still settling, so this card doesn't flash the signed-out
           prompt for a person who turns out to already be signed in.
           Same pill shape as the other states, avatar outside, so
           nothing jumps in shape once it resolves. */
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-border-subtle)',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: PILL_RADIUS,
              padding: '9px 14px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface)',
            }}>
              <div style={{
                width: '55%',
                height: 11,
                borderRadius: 4,
                backgroundColor: 'var(--color-border-subtle)',
              }} />
            </div>
          </div>
        </div>
      ) : isEditing ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <ProfileAvatar
            user={user}
            fullName={profile?.fullName}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Pill — text box plus an inline Send button pinned to the
                bottom-right corner, so this reads as one comment-style
                input rather than a text box with a separate Save
                control living elsewhere. */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              border: `1px solid ${isFocused ? 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border) 55%)' : 'var(--color-border)'}`,
              borderRadius: PILL_RADIUS,
              padding: '9px 14px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface)',
              transition: 'border-color 0.15s ease',
            }}>
              <textarea
                ref={textareaRef}
                className="personal-notes-textarea"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Add a note or a thought…"
                rows={2}
                autoFocus
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.65,
                  resize: 'none',
                  outline: 'none',
                  display: 'block',
                  overflow: 'hidden',
                }}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                aria-label="Send note"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  marginBottom: 2,
                  cursor: isDirty ? 'pointer' : 'default',
                }}
              >
                <Icon
                  name="Send"
                  size={17}
                  color={isDirty ? 'var(--color-accent)' : 'var(--color-text-tertiary)'}
                />
              </button>
            </div>

            {/* Footer row — Clear (only when a note exists to clear) and
                Cancel, right-aligned. No privacy caption here anymore —
                it lives once, inline with the title above. */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 14,
              marginTop: 6,
              paddingLeft: 14,
            }}>
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
            </div>
          </div>
        </div>
      ) : user && savedValue ? (
        /* Populated, signed in — comment-style: avatar top-aligned with
           the pill. The corner slot above the pill holds "Edit" in
           steady state, or the "✓ Saved" flash right after a save —
           never both, so they don't fight for the same spot. The
           relative timestamp is a plain line under the pill. On the
           very first save (empty -> populated) this fades/scales in;
           subsequent edits render at steady-state with no re-animation. */
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          opacity: justPopulated ? 0 : 1,
          transform: justPopulated ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          <ProfileAvatar
            user={user}
            fullName={profile?.fullName}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              {savedVisible ? (
                <span style={{
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
              ) : (
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
              )}
            </div>
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: PILL_RADIUS,
              padding: '9px 14px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface)',
            }}>
              <span style={{
                fontSize: 14,
                lineHeight: 1.65,
                fontFamily: 'var(--font-body)',
                whiteSpace: 'pre-wrap',
                color: 'var(--color-text-primary)',
              }}>
                {savedValue}
              </span>
            </div>
            {updatedAt && (
              <p style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-body)',
                margin: '6px 0 0 14px',
              }}>
                {formatRelativeTime(updatedAt)}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Unified prompt state — identical whether signed out or signed
           in with no note yet. Tap routes to the sign-in sheet or
           straight into edit mode via handlePromptTap. Corner slot above
           the pill holds "Only you can see this" in steady state, or the
           "✓ Saved" flash right after clearing a note back to empty. */
        <div
          onClick={handlePromptTap}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
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
              backgroundColor: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={16} color="var(--color-accent)" strokeWidth={1.8} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              {savedVisible ? (
                <span style={{
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
              ) : (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  <Icon name="Lock" size={11} color="var(--color-text-tertiary)" />
                  Only you can see this
                </span>
              )}
            </div>
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: PILL_RADIUS,
              padding: '9px 14px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface)',
            }}>
              <span style={{
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-body)',
              }}>
                Add a note or a thought…
              </span>
            </div>
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
