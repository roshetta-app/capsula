import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { User } from 'lucide-react'
import Icon from '../ui/Icon'
import ConfirmSheet from '../ui/ConfirmSheet'
import ProfileAvatar from '../ui/ProfileAvatar'
import Lightbox from '../ui/Lightbox'
import ProUpsellBanner from '../ui/ProUpsellBanner'
import { useDirtyState } from '../../hooks/useDirtyState'
import { useAuth } from '../../hooks/useAuth'
import { useNotes } from '../../hooks/useNotes'
import { useIsPro } from '../../hooks/useIsPro'
import { useNotesSignInContext } from '../../context/NotesSignInContext'
import { getTextDirection } from '../../utils/textDirection'
import { resizeAndCompressImage } from '../../utils/imageResize'
import { uploadNoteImage } from '../../lib/noteQueries'
import { NOTES_CHAR_CAP_FREE, NOTES_CHAR_CAP_PRO } from '../../constants/features'

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

// notes-pro-image-and-char-cap: the "explain the perk" sheet shown when a
// free account taps the greyed-out camera button. Built locally in this
// file rather than as a new shared component, since the task's file list
// only calls for editing PersonalNotes.jsx here — but visually it follows
// FavouriteLimitSheet.jsx's own shell (bottom sheet, backdrop, drag
// handle, message, ProUpsellBanner, single "Got it" dismiss) exactly, so
// this reads as the same "you've hit a free-tier wall" pattern the app
// already uses for favourites, rather than inventing a new one. Its own
// message is written fresh (photo attachments, not favourite counts);
// ProComingSoonSheet's copy was checked and not reused here since it
// still describes a "no real paid tier yet" world that the favourites
// cap (and this feature) have already moved past.
function NotePhotoUpsellSheet({ isOpen, onClose }) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!shouldRender) return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          1000,
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity:         animateIn ? 1 : 0,
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Photo attachments are a Pro feature"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          1001,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          padding:         'var(--space-5) var(--space-4)',
          paddingBottom:   'calc(var(--space-5) + env(safe-area-inset-bottom))',
          fontFamily:      'var(--font-body)',
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        <div style={{
          width:           40,
          height:          4,
          borderRadius:    2,
          backgroundColor: 'var(--color-border)',
          margin:          '0 auto var(--space-5)',
        }} />

        <p style={{
          margin:     '0 0 var(--space-4)',
          fontSize:   14,
          lineHeight: 1.55,
          color:      'var(--color-text-primary)',
          textAlign:  'center',
        }}>
          Attaching a reference photo to a note — a lecture slide, a
          diagram, a handwritten reminder — is a Pro feature.
        </p>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ProUpsellBanner subtitle="Unlock photo attachments in your notes" />
        </div>

        <button
          onClick={onClose}
          style={{
            width:           '100%',
            padding:         'var(--space-2) var(--space-4)',
            borderRadius:    'var(--radius-sm)',
            border:          '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color:           'var(--color-text-secondary)',
            fontSize:        14,
            fontWeight:      500,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </>,
    document.body
  )
}

// notes-pro-image-and-char-cap: the attached photo, shown as a wide strip
// spanning the note's own width (explicit call — not a small square
// thumbnail like the CMS gallery rows use), tapping it opens the
// full-screen Lightbox exactly as-is.
function NotePhotoStrip({ url, onTap }) {
  if (!url) return null
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="View attached photo"
      style={{
        display:         'block',
        width:           '100%',
        marginTop:       8,
        padding:         0,
        border:          'none',
        borderRadius:    'var(--radius-md)',
        overflow:        'hidden',
        cursor:          'pointer',
        background:      'none',
      }}
    >
      <img
        src={url}
        alt="Attached note photo"
        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
      />
    </button>
  )
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
 * notes-comment-polish:
 *   - Avatar is always top-aligned with the pill (loading / editing /
 *     populated / prompt), never vertically centered against it, so a
 *     short one-line pill doesn't look mismatched next to the avatar.
 *   - Placeholder copy (both the textarea's real placeholder and the
 *     empty-state pill text) is now a muted tertiary grey instead of
 *     bold near-black, so it reads as a placeholder rather than content.
 *   - Save is now a "Send" icon button living inside the pill itself,
 *     pinned to the bottom-right corner as the textarea grows — Cancel
 *     and Clear are the only controls left in the footer row below.
 *   - "Visible only to you" no longer appears in the editing footer
 *     (Clear/Cancel felt crowded with it); the privacy note now lives
 *     inline in the header row next to the title (see below).
 *   - Populated state drops the redundant "You" label (the avatar
 *     already signals authorship) and moves "Edited …" out of the header
 *     row and down to a plain line under the pill, so the avatar and
 *     pill align to the top instead of the pill being pushed down by a
 *     caption row above it.
 *   - notes-header-inline: "Only you can see this" (empty state),
 *     "Edit" (populated state), and the "✓ Saved" flash all share ONE
 *     slot — inline on the same row as the "Personal Notes" title,
 *     right-aligned, matching the app's other top corner elements
 *     rather than sitting in a row of their own. Only one of them ever
 *     renders at a time (Saved flash takes priority right after a
 *     save/clear, then the state's normal content returns), so they
 *     never compete for the same spot.
 *   - Loading, empty-state, and populated-state pills are flex rows with
 *     alignItems: 'center', minHeight: AVATAR_SIZE, and an explicit
 *     pixel line-height (20px) on their text rather than a unitless
 *     multiplier (e.g. 1.5) — a unitless value resolves against the
 *     custom body font's own internal metrics, which didn't reliably
 *     produce the same pixel height as the plain avatar circle. A fixed
 *     pixel value plus the minHeight floor pins a single line of content
 *     to exactly the avatar's height, text vertically centered inside;
 *     a note that wraps to multiple lines still grows past that floor
 *     naturally (20px per extra line), which is expected since the
 *     avatar is top-aligned rather than centered against it.
 *   - Signed-out placeholder avatar circle now uses --color-accent-light
 *     (the app's existing tinted-blue token, also used for
 *     fav-sticky-header) instead of the plain page --color-bg, so it
 *     reads as an avatar rather than an empty grey circle; its User icon
 *     switched from tertiary grey to --color-accent to stay legible on
 *     the tint. Every pill (loading / editing / populated / prompt) now
 *     sits on --color-surface (white) instead of the transparent
 *     page background, so the pill reads as its own surface.
 *
 * notes-pro-image-and-char-cap (this task):
 *   - Camera icon button sits right after the "Personal Notes" title, so
 *     it's reachable from every state (prompt / editing / populated)
 *     without needing to enter edit mode first — attaching a photo is
 *     independent of the typed note (see useNotes.js's saveImage, kept
 *     separate from save()). Pro: opens the file picker directly. Free:
 *     greyed out (0.4 opacity) and taps open NotePhotoUpsellSheet instead
 *     of the picker, explaining the perk rather than silently doing
 *     nothing.
 *   - Selected photo is resized/compressed (imageResize.js, a fresh copy
 *     — not shared with the CMS's admin-only version) before upload
 *     (noteQueries.js's uploadNoteImage), then handed straight to
 *     saveImage() — no separate Send tap needed for the photo itself.
 *   - NotePhotoStrip (wide strip, not a small square — explicit call)
 *     renders under the pill in both the editing and populated states
 *     whenever a photo is attached; tapping it opens Lightbox.jsx exactly
 *     as it already works elsewhere, with a single-photo array.
 *   - The populated-state condition below now also fires on
 *     `savedImageUrl` alone (a note can be photo-only, with no typed
 *     text) — previously it required `savedValue` to be truthy.
 *   - Typing is clamped to the free/Pro character cap (280 / 2000, see
 *     constants/features.js) via both a live-clamping onChange and a
 *     native maxLength (defense in depth against IME/paste edge cases).
 *     The live "X / cap" counter shown just above Cancel only renders
 *     while isEditing — never on the saved/read view — matching the
 *     confirmed decision that the saved note should keep looking like a
 *     plain comment, not a form.
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const { user, profile, loading } = useAuth()
  const { savedValue, savedImageUrl, updatedAt, save, saveImage } = useNotes(conditionId)
  const { requestNoteSignIn } = useNotesSignInContext()
  const isPro = useIsPro()

  const charCap = isPro ? NOTES_CHAR_CAP_PRO : NOTES_CHAR_CAP_FREE

  const [draft, setDraft] = useState(savedValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isDirty = useDirtyState(savedValue, draft)

  // savedVisible: null | 'in' | 'out'
  const [savedVisible, setSavedVisible] = useState(null)

  // Clear confirmation sheet
  const [showConfirm, setShowConfirm] = useState(false)

  // notes-pro-image-and-char-cap: photo attach/view state.
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [showProUpsell, setShowProUpsell] = useState(false)
  const fileInputRef = useRef(null)

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

  // Put the cursor at the end of the existing text when entering edit
  // mode, rather than the browser's default (start of text / select-all
  // on some platforms). Only keyed on isEditing — not draft — so this
  // fires once on entry and never yanks the cursor back to the end
  // while someone is actively typing or editing mid-text.
  useLayoutEffect(() => {
    if (!isEditing || !textareaRef.current) return
    const el = textareaRef.current
    const end = el.value.length
    el.focus()
    el.setSelectionRange(end, end)
  }, [isEditing])

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

  // notes-pro-image-and-char-cap: camera tap — Pro opens the picker
  // directly; free accounts see the upsell sheet instead. Requires a
  // signed-in user the same way editing does (the button is only ever
  // rendered when `user` is truthy, see JSX below, but this stays
  // defensive in case that ever changes).
  function handleCameraTap() {
    if (!user) return
    if (!isPro) {
      setShowProUpsell(true)
      return
    }
    fileInputRef.current?.click()
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file || !user) return

    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const resized = await resizeAndCompressImage(file)
      const { url, error } = await uploadNoteImage(resized, user.id, conditionId)
      if (error || !url) {
        setPhotoError('Could not upload photo. Please try again.')
      } else {
        saveImage(url)
      }
    } catch {
      setPhotoError('Could not process photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Drives the header row's right-hand slot — true for every state
  // except loading and editing (neither has anything to show up there).
  // What actually renders inside the slot depends on which state it is:
  // the "✓ Saved" flash takes priority right after a save/clear, then
  // falls back to "Edit" (populated state) or the privacy caption
  // (empty/prompt state) — see the header row JSX below.
  const showHeaderCorner = !loading && !isEditing

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

      {/* Label row — title on the left; camera button right after it
          (notes-pro-image-and-char-cap, see file header); privacy
          caption (empty-prompt state), "Edit" (populated state), or the
          "✓ Saved" flash sits on the right of this same row — all three
          share one inline slot here, same as every other top corner
          element, rather than "Edit" living in a separate row of its
          own below. Fixed height (rather than letting the row size
          itself to whichever text is showing) keeps the row from
          growing or shrinking a few pixels as the right-hand content
          swaps between states. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        marginBottom: 16,
      }}>
        <Icon name="NotebookPen" size={16} color="var(--color-text-primary)" />
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1,
        }}>
          Personal Notes
        </span>

        {!loading && user && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelected}
            />
            <button
              type="button"
              onClick={handleCameraTap}
              disabled={uploadingPhoto}
              aria-label={isPro ? 'Attach a photo to this note' : 'Attach a photo — Pro feature'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: uploadingPhoto ? 'default' : 'pointer',
                opacity: isPro ? 1 : 0.4,
              }}
            >
              <Icon
                name="Camera"
                size={15}
                color={isPro ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)'}
              />
            </button>
          </>
        )}

        {showHeaderCorner && (
          savedVisible ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 'auto',
              fontSize: 11,
              color: 'var(--color-success)',
              fontFamily: 'var(--font-body)',
              opacity: savedVisible === 'in' ? 1 : 0,
              transition: savedVisible === 'in'
                ? 'opacity 0.2s ease'
                : 'opacity 0.4s ease',
            }}>
              <Icon name="Check" size={12} color="var(--color-success)" />
              Saved
            </span>
          ) : user && (savedValue || savedImageUrl) ? (
            <button
              type="button"
              onClick={startEditing}
              style={{
                marginLeft: 'auto',
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
          ) : (
            <span style={{
              marginLeft: 'auto',
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
          )
        )}
      </div>

      {photoError && (
        <p style={{
          margin: '0 0 8px',
          fontSize: 12,
          color: '#DC2626',
          fontFamily: 'var(--font-body)',
        }}>
          {photoError}
        </p>
      )}

      {loading ? (
        /* Loading skeleton — shown only while useAuth()'s sign-in check
           is still settling, so this card doesn't flash the signed-out
           prompt for a person who turns out to already be signed in.
           Same pill shape/height as the real empty-state pill (same
           minHeight + centered content), so nothing resizes once it
           resolves into that state. */
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-border-subtle)',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: AVATAR_SIZE + 2,
              border: '1px solid var(--color-border)',
              borderRadius: PILL_RADIUS,
              padding: '8px 16px',
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
              padding: '12px 18px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface)',
              transition: 'border-color 0.15s ease',
            }}>
              <textarea
                ref={textareaRef}
                className="personal-notes-textarea"
                value={draft}
                onChange={e => setDraft(e.target.value.slice(0, charCap))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Add a note or a thought…"
                dir={getTextDirection(draft)}
                rows={2}
                autoFocus
                maxLength={charCap}
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

            <NotePhotoStrip url={savedImageUrl} onTap={() => setLightboxOpen(true)} />

            {/* Footer row — Clear (only when a note exists to clear) on
                the left, right under the textbox; the live character
                counter (notes-pro-image-and-char-cap; editing-only, per
                the confirmed decision that a saved note never shows it)
                and Cancel share the right side. paddingLeft matches the
                pill's own inner text padding so Clear lines up under the
                textbox, not under the avatar in the row above. */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              paddingLeft: 16,
            }}>
              {draft ? (
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
              ) : <span />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-body)',
                  color: draft.length >= charCap ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                }}>
                  {draft.length}/{charCap}
                </span>
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
        </div>
      ) : user && (savedValue || savedImageUrl) ? (
        /* Populated, signed in — comment-style. Edit/Saved now live in
           the header row above, so this row only ever contains the
           avatar and the pill, top-aligned against each other. On the
           very first save (empty -> populated) the whole block
           fades/scales in; subsequent edits render at steady-state with
           no re-animation.
           notes-pro-image-and-char-cap: this branch now also fires when
           only a photo has been saved (no text yet) — a note can be
           photo-only, so the pill falls back to the same muted prompt
           copy the empty state uses instead of rendering blank. */
        <div style={{
          opacity: justPopulated ? 0 : 1,
          transform: justPopulated ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ProfileAvatar
              user={user}
              fullName={profile?.fullName}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12 }}
            />
            <div style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              minHeight: AVATAR_SIZE + 2,
              border: '1px solid var(--color-border)',
              borderRadius: PILL_RADIUS,
              padding: '8px 16px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface)',
            }}>
              {/* Mixed-language display: rather than manually splitting the
                  text into per-language chunks in code (fragile — proved
                  itself buggy twice), this hands the raw saved text to the
                  browser's own built-in bidi text engine via dir="auto" +
                  unicode-bidi: plaintext. That's the same standard engine
                  every browser and phone uses for this already (WhatsApp,
                  Twitter, Gmail, etc. rely on it rather than writing their
                  own splitter), so English/Arabic runs get positioned and
                  wrapped correctly without any custom logic to maintain. */}
              {savedValue ? (
                <span
                  dir="auto"
                  style={{
                    fontSize: 14,
                    lineHeight: '20px',
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--color-text-primary)',
                    unicodeBidi: 'plaintext',
                  }}
                >
                  {savedValue}
                </span>
              ) : (
                <span style={{
                  fontSize: 14,
                  lineHeight: '20px',
                  fontWeight: 400,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  Add a note or a thought…
                </span>
              )}
            </div>
          </div>

          <NotePhotoStrip url={savedImageUrl} onTap={() => setLightboxOpen(true)} />

          {updatedAt && (
            <p style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
              margin: '6px 0 0 0',
            }}>
              <Icon name="Clock" size={11} color="var(--color-text-tertiary)" />
              {formatRelativeTime(updatedAt)}
            </p>
          )}
        </div>
      ) : (
        /* Unified prompt state — identical whether signed out or signed
           in with no note yet. Tap routes to the sign-in sheet or
           straight into edit mode via handlePromptTap. Avatar and pill
           are top-aligned, same as every other state. */
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
          <div style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            minHeight: AVATAR_SIZE + 2,
            border: '1px solid var(--color-border)',
            borderRadius: PILL_RADIUS,
            padding: '8px 16px',
            boxSizing: 'border-box',
            backgroundColor: 'var(--color-surface)',
          }}>
            <span style={{
              fontSize: 14,
              lineHeight: '20px',
              fontWeight: 400,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
            }}>
              Add a note or a thought…
            </span>
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

      <NotePhotoUpsellSheet
        isOpen={showProUpsell}
        onClose={() => setShowProUpsell(false)}
      />

      {lightboxOpen && savedImageUrl && (
        <Lightbox
          images={[{ id: 'note-photo', url: savedImageUrl, caption: '' }]}
          activeIndex={0}
          onClose={() => setLightboxOpen(false)}
          onGo={() => {}}
        />
      )}
    </div>
  )
}
