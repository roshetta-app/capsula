import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { User, ImagePlus } from 'lucide-react'
import Icon from '../ui/Icon'
import ConfirmSheet from '../ui/ConfirmSheet'
import PaywallGateSheet from '../ui/PaywallGateSheet'
import ProfileAvatar from '../ui/ProfileAvatar'
import Lightbox from '../ui/Lightbox'
import { useDirtyState } from '../../hooks/useDirtyState'
import { useAuth } from '../../hooks/useAuth'
import { useNotes } from '../../hooks/useNotes'
import { useIsPro } from '../../hooks/useIsPro'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useCachedImage } from '../../hooks/useCachedImage'
import { useNotesSignInContext } from '../../context/NotesSignInContext'
import { getTextDirection } from '../../utils/textDirection'
import { resizeAndCompressImage } from '../../utils/imageResize'
import { uploadNoteImage, deleteNoteImage } from '../../lib/noteQueries'
import { NOTES_CHAR_CAP_FREE, NOTES_CHAR_CAP_PRO } from '../../constants/features'

const AVATAR_SIZE = 32
const PILL_RADIUS = 18

// personal-notes-ui-polish: fixed line-heights for the two spots where
// note text can actually wrap to more than one line — used to nudge the
// avatar so it centers on the FIRST line only, not the vertical middle of
// the whole (possibly multi-line) block. Both text spots already declare
// a fixed line-height in their own inline styles (20px for the saved
// note's name line, 1.65em for the editing textarea) — these constants
// just mirror those same values so the offset math has something fixed
// to work from, rather than measuring the real rendered line at runtime.
// A plain `alignItems: 'center'` isn't used instead because that centers
// against the *whole* growing block once text wraps, which is exactly
// the behavior this is meant to avoid.
const SAVED_NAME_LINE_HEIGHT = 20
const EDITING_LINE_HEIGHT = 14 * 1.65 // fontSize 14 * lineHeight 1.65
const AVATAR_FIRST_LINE_OFFSET = {
  saved: (SAVED_NAME_LINE_HEIGHT - AVATAR_SIZE) / 2,
  editing: (EDITING_LINE_HEIGHT - AVATAR_SIZE) / 2,
}

// notes-typing-keyboard-scroll (standardized): the editing textarea used
// to grow to fit content with no limit, which is what forced the old
// per-keystroke "guess where the cursor is and scroll there" code to
// exist in the first place — a textarea taller than the visible area has
// no reliable, cross-platform way to know where the cursor is once it
// scrolls off. Capping the textarea at a fixed number of lines and
// letting it scroll internally past that (see the textarea's own
// maxHeight/overflowY below) sidesteps the problem entirely: every phone
// and browser already keeps the caret visible inside a bounded,
// internally-scrolling text box on its own, regardless of where in the
// text someone is typing.
const MAX_EDITING_LINES = 6
const EDITING_MAX_HEIGHT = EDITING_LINE_HEIGHT * MAX_EDITING_LINES

// notes-photo-uploader-redesign: fixed footprint for the upload box —
// matches the old NotePhotoStrip's footprint exactly (full width, 140px
// tall) so this redesign doesn't change the space the photo area takes
// up on the page, just what can render inside it.
const PHOTO_BOX_HEIGHT = 140

// notes-photo-uploader-redesign: a generous pre-resize sanity ceiling on
// the raw picked file, checked before resizeAndCompressImage ever runs
// (that function always ends up producing a low-hundreds-of-KB to ~1-2MB
// .jpg regardless of input size — see imageResize.js — so this exists
// only to reject something absurd, like a multi-hundred-MB video picked
// by mistake via the image/* file picker, without a network round trip).
const MAX_PHOTO_SOURCE_BYTES = 20 * 1024 * 1024

// notes-photo-uploader-redesign: copied from ImageCarousel.jsx's own
// BLUR_IMG_STYLE/MAIN_IMG_STYLE (see that file's header comment for the
// full reasoning) — a two-layer blurred-background + contain-fit photo,
// reused here so a note photo whose aspect ratio doesn't fill the box's
// fixed 140px height still displays in full rather than being cropped.
// A copy, not an import — ImageCarousel.jsx carries the full Embla
// swipe/drag engine, which a single static note photo doesn't need.
const NOTE_BLUR_IMG_STYLE = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center',
  filter: 'blur(28px) brightness(0.65)',
  transform: 'scale(1.15)',
  pointerEvents: 'none',
}
const NOTE_MAIN_IMG_STYLE = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'contain', objectPosition: 'center',
  pointerEvents: 'none',
}

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

// notes-photo-uploader-redesign: replaces the old NotePhotoStrip (a bare
// <img>, only ever rendered when a photo already existed). This renders
// the fixed-footprint box in all 5 states — empty / uploading / offline
// queued / failed+retry / attached — instead of only the last one, so
// there's always a visible next step regardless of where the attach flow
// currently sits.
//
// `state` is computed by the parent (savedImageUrl / uploadingPhoto /
// isOfflineQueued / photoError, in that priority order — see
// PersonalNotes' photoState below) rather than derived in here, since the
// parent already owns every piece of state that determines it.
// notes-offline-prefetch (2026-09-05): the attached-photo view used to be
// a plain <img src={url}> pair (blur + main layers) inside NotePhotoBox
// directly — fine for the upload flow itself (the browser already has the
// just-uploaded photo warm in its own HTTP cache), but it meant this box
// never actually benefited from useNotesPrefetch.js's background download
// into utils/cache.js's 'note-photos' IndexedDB store: a plain <img> tag
// only ever consults the browser's own HTTP cache, never IndexedDB. Pulled
// out into its own small component so it can call
// useCachedImage(url, { store: 'notes' }) — same device-first/network/
// cache-on-view hook every gallery photo already uses via ImageCarousel.jsx
// (mirrors that component's own Slide, just without the Embla swipe
// scaffolding a single static photo doesn't need) — so this box is
// actually instant offline once a note's photo has been prefetched, not
// just theoretically cacheable.
function NoteAttachedPhoto({ url, onTap, boxBase }) {
  const { src, status, retry } = useCachedImage(url, { store: 'notes' })

  if (status === 'error') {
    return (
      <div style={{
        ...boxBase,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-body)' }}>
          Couldn't load photo
        </span>
        <button
          type="button"
          onClick={retry}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="View attached photo"
      style={{ ...boxBase, padding: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', background: 'none', backgroundColor: 'var(--color-surface)' }}
    >
      {status === 'ready' && src && (
        <>
          <img src={src} alt="" aria-hidden="true" draggable={false} style={NOTE_BLUR_IMG_STYLE} />
          <img src={src} alt="Attached note photo" draggable={false} style={NOTE_MAIN_IMG_STYLE} />
        </>
      )}
      {status === 'loading' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            animation: 'personal-notes-spin 0.7s linear infinite',
          }} />
        </div>
      )}
    </button>
  )
}

// personal-notes-mock-restyle: title is always the same regardless of
// whether a note already exists — a context-varying title ("Add a photo"
// once saved) read as inconsistent in testing. Subtitle only ever shows
// for the Pro-locked look, and is the same "Unlock with Pro" wording
// ProUpsellBanner/NotePhotoUpsellSheet already use elsewhere, kept short
// so it doesn't wrap to two lines in the row layout below.
const PHOTO_BOX_TITLE = 'Add a photo to your note'
const PHOTO_BOX_PRO_SUBTITLE = 'Unlock with Pro'

// notes-merged-card: this box no longer draws its own border/background —
// it now always renders as a section inside the shared card the note
// text lives in (see PersonalNotes below), separated from whatever comes
// above it by a single hairline (borderTop). roundBottom is passed by the
// parent only when this box is the LAST section in that card (the
// populated and prompt states) so its bottom corners match the card's
// own rounded corners; the editing state passes nothing (defaults to
// false) since its footer row renders below this box instead.
function NotePhotoBox({ state, url, isPro, onTapEmpty, onTapPhoto, onRetry, roundBottom = false }) {
  const boxBase = {
    display:                 'block',
    width:                   '100%',
    height:                  PHOTO_BOX_HEIGHT,
    borderTop:               '1px solid var(--color-border)',
    borderBottomLeftRadius:  roundBottom ? PILL_RADIUS : 0,
    borderBottomRightRadius: roundBottom ? PILL_RADIUS : 0,
    overflow:                'hidden',
    position:                'relative',
    boxSizing:               'border-box',
  }

  if (state === 'attached' && url) {
    return <NoteAttachedPhoto url={url} onTap={onTapPhoto} boxBase={boxBase} />
  }

  // Every other state shares one plain shell — only the content inside
  // changes. No border/background of its own anymore; boxBase's borderTop
  // is the only divider it needs.
  const shell = {
    ...boxBase,
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    padding:         '0 var(--space-4)',
    textAlign:       'center',
  }

  // personal-notes-mock-restyle: shown for the real duration of an
  // in-flight image delete (see deletingPhoto above) — same shell/spinner
  // pattern as 'uploading' below, so a delete gets the same visible
  // "something is happening" feedback an upload already had.
  if (state === 'deleting') {
    return (
      <div style={shell} aria-live="polite">
        <div
          aria-hidden="true"
          style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            animation: 'personal-notes-spin 0.7s linear infinite',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
          Deleting…
        </span>
      </div>
    )
  }

  if (state === 'uploading') {
    return (
      <div style={shell} aria-live="polite">
        <div
          aria-hidden="true"
          style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            animation: 'personal-notes-spin 0.7s linear infinite',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
          Uploading…
        </span>
      </div>
    )
  }

  if (state === 'offline') {
    return (
      <div style={shell}>
        <Icon name="CloudOff" size={16} color="var(--color-text-tertiary)" />
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
          Will upload once you're back online
        </span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={shell}>
        <span style={{ fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-body)' }}>
          Couldn't upload photo
        </span>
        <button
          type="button"
          onClick={onRetry}
          style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--color-accent)',
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  // 'empty' — same reachability the old camera button had: Pro opens the
  // picker, free opens the upsell sheet instead of silently doing nothing.
  // personal-notes-mock-restyle: rebuilt as a horizontal row — a rounded
  // icon square on the left, a bold title + grey subtitle stack in the
  // middle, and (free accounts only) a solid "PRO" pill pinned to the
  // right via marginLeft: auto — replacing the old centered vertical
  // layout, to match the provided mock.
  // notes-photo-uploader-declutter: icon/row/pill all switched from
  // accent-colored + tinted background to plain tertiary-grey — the
  // previous accent-light tint + bold title + colored icon made this row
  // read louder than the actual note placeholder above it ("Add a note or
  // thought…", which is a plain grey line), pulling attention away from
  // the primary note-taking box. This row still needs to be tappable and
  // legible, just not competing for attention.
  const iconSquare = (
    <span style={{
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      width:           36,
      height:          36,
      flexShrink:      0,
    }}>
      <Icon name="ImagePlus" size={17} color="var(--color-text-tertiary)" />
    </span>
  )
  // notes-merged-card: no longer spreading boxBase — boxBase's fixed
  // PHOTO_BOX_HEIGHT (140px) exists so a full-bleed photo (attached
  // state) or a centered spinner/message (uploading/offline/error) has a
  // consistent footprint. This row's content is a single short line, so
  // it stays sized to its own content instead — but it shares the same
  // borderTop divider and roundBottom corner behavior as every other
  // photo state, since it's still just a section of the same card.
  const rowShell = {
    display:                 'flex',
    alignItems:              'center',
    gap:                     12,
    width:                   '100%',
    padding:                 '14px var(--space-4)',
    boxSizing:               'border-box',
    textAlign:               'left',
    borderTop:               '1px solid var(--color-border)',
    borderBottomLeftRadius:  roundBottom ? PILL_RADIUS : 0,
    borderBottomRightRadius: roundBottom ? PILL_RADIUS : 0,
  }

  if (!isPro) {
    return (
      <button
        type="button"
        onClick={onTapEmpty}
        aria-label={`${PHOTO_BOX_TITLE} — Pro feature`}
        style={{ ...rowShell, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
      >
        {iconSquare}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
            {PHOTO_BOX_TITLE}
          </span>
          <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
            {PHOTO_BOX_PRO_SUBTITLE}
          </span>
        </span>
        <span style={{
          flexShrink:      0,
          fontSize:        11,
          fontWeight:      700,
          padding:         '4px 10px',
          borderRadius:    'var(--radius-full)',
          // notes-photo-uploader-declutter: plain outline badge instead of
          // a solid contrasting chip — still reads as a distinct label,
          // just not a bright accent-colored one.
          backgroundColor: 'transparent',
          border:          '1px solid var(--color-border)',
          color:           'var(--color-text-tertiary)',
          fontFamily:      'var(--font-body)',
        }}>
          PRO
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onTapEmpty}
      aria-label={PHOTO_BOX_TITLE}
      style={{ ...rowShell, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
    >
      {iconSquare}
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
        {PHOTO_BOX_TITLE}
      </span>
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
 *     border, 18px corners, no elevated card surface behind it.
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
 *   - notes-header-inline: "Only you can see this" (empty state),
 *     "Edit" (populated state), and the "✓ Saved" flash all share ONE
 *     slot — inline on the same row as the "Personal Notes" title,
 *     right-aligned. Only one of them ever renders at a time.
 *
 * notes-pro-image-and-char-cap (this task):
 *   - Selected photo is resized/compressed (imageResize.js) before
 *     upload (noteQueries.js's uploadNoteImage), then handed straight to
 *     saveImage() — no separate Send tap needed for the photo itself.
 *   - Originally the populated-state condition also fired on
 *     `savedImageUrl` alone (a photo-only note, no typed text, still read
 *     as "populated"). personal-notes-ui-polish below changed this: an
 *     attached photo with no text now keeps the card in the prompt state
 *     — the photo itself still shows (NotePhotoBox reads savedImageUrl
 *     independently either way), just without the comment-style
 *     name/"Edit" treatment until there's actual text.
 *   - Typing is clamped to the free/Pro character cap (280 / 2000, see
 *     constants/features.js) via both a live-clamping onChange and a
 *     native maxLength. The live "X / cap" counter only renders while
 *     isEditing.
 *
 * notes-photo-uploader-redesign (this task):
 *   - The small camera-icon button that used to sit in the header row is
 *     gone. In its place, a full-width, fixed-140px-tall upload box
 *     (NotePhotoBox above) renders directly under the pill — originally
 *     only in the editing and populated states; personal-notes-ui-polish
 *     below extended this to the prompt state too — reusing exactly the
 *     same tap behavior the camera button had (Pro opens the picker, free
 *     opens NotePhotoUpsellSheet), just moved into the box's own empty
 *     state instead of a header icon. The hidden file `<input>` that used
 *     to sit next to the camera button now renders unconditionally
 *     whenever a user is signed in, since nothing about the box's
 *     position in the tree depends on the header row anymore.
 *   - ProfileAvatar moves from a sibling flex item beside the pill into
 *     the pill's own bordered container, and the pill is now full width
 *     (previously flex: 1, leaving room for the avatar beside it) —
 *     applied consistently across all four pill-bearing states (loading
 *     skeleton, editing, populated, prompt) so none of them look
 *     mismatched against the others. The avatar keeps its top-alignment
 *     behavior (notes-comment-polish, above) via `alignItems: flex-start`
 *     on each merged container, rather than being vertically centered
 *     against a tall pill.
 *   - Five visible box states (see NotePhotoBox above): no photo /
 *     uploading / offline queued / upload failed+retry / attached.
 *     `photoState` below computes which one applies, in priority order:
 *     an attached photo always wins (it means the flow already
 *     succeeded), then an in-flight upload, then an offline-queued pick,
 *     then a genuine error, then the empty default.
 *   - Client-side file-type/size validation (MAX_PHOTO_SOURCE_BYTES
 *     above) runs before resizeAndCompressImage is ever called, so a
 *     bad pick surfaces as photoError immediately with no network round
 *     trip needed to discover it.
 *   - Offline queueing for the upload step itself: if the device is
 *     already known to be offline when a photo is picked, this calls
 *     useNotes.js's queuePendingImage(resized) instead of ever attempting
 *     uploadNoteImage, and flips isOfflineQueued — resolved automatically
 *     once useNotes.js's own reconnect flush succeeds and savedImageUrl
 *     updates (see the effect below that clears isOfflineQueued the
 *     moment that happens).
 *   - Upload failures (genuine errors, not "no connection at all") keep
 *     the resized blob in lastFailedBlobRef so retryUpload() can re-run
 *     the exact same attempt without asking the user to re-pick the file.
 *   - Delete: Lightbox's new opt-in `onDelete` prop is only ever passed
 *     from this file's own <Lightbox /> call (see that component's own
 *     header for why ImageCarousel.jsx's call site is unaffected).
 *     Tapping it opens a second ConfirmSheet (separate from the existing
 *     "Delete note?" one), re-labelled "Delete image?". Confirming closes
 *     the Lightbox, fires deleteNoteImage(user.id, conditionId) to remove
 *     the file from Storage, and calls the existing saveImage(null) to
 *     null out image_url — saveImage already handles a falsy URL
 *     correctly end to end (local write, upsert, offline queue replay).
 *     The storage delete isn't awaited before saveImage(null) runs —
 *     saveImage's own optimistic-write/offline-queue behavior doesn't
 *     depend on it, and there's no user-facing state that needs to wait
 *     on a fire-and-forget Storage call.
 *   - ConfirmSheet.jsx gained a small additive `zIndex` prop (default
 *     1000, unchanged for every existing caller) specifically so this
 *     delete-confirm sheet (zIndex 10000) can render above the open
 *     Lightbox (zIndex 9999) — Lightbox's real z-index is otherwise
 *     higher than ConfirmSheet's old hardcoded value, which would have
 *     left the confirm dialog invisible behind the fullscreen photo.
 *
 * notes-offline-prefetch (2026-09-05): added after discovering that
 *   without it, Task 2's background prefetch (useNotesPrefetch.js) would
 *   populate utils/cache.js's 'note-photos' store with nothing left to
 *   ever read from it — neither of this file's own note-photo display
 *   spots checked that store. Two small additive changes here (this file
 *   wasn't in that task's own original file list, added once this gap
 *   was found):
 *   - NotePhotoBox's 'attached' state (the small photo box on the note
 *     card itself) now renders via a new NoteAttachedPhoto sub-component
 *     using useCachedImage(url, { store: 'notes' }) instead of a plain
 *     <img src={url}> — mirrors ImageCarousel.jsx's own Slide, just
 *     without the Embla swipe scaffolding a single static photo doesn't
 *     need. This is the primary payoff of the whole prefetch task: it's
 *     what makes opening a note screen show its photo instantly offline,
 *     with no tap required, rather than only the fullscreen Lightbox view
 *     benefiting.
 *   - The <Lightbox /> call below now passes imageStore="notes", so
 *     opening a note's photo fullscreen also reads from the same
 *     prefetched store instead of always hitting the network.
 *
 * personal-notes-ui-polish (this task):
 *   - Photo box (NotePhotoBox) now also renders in the prompt state
 *     (previously editing/populated only) — signed-out visitors and
 *     signed-in free accounts both see it in its existing locked
 *     "Pro feature" look; tapping it signed-out opens the sign-in sheet
 *     (handleBoxTap), same as tapping the rest of the prompt.
 *   - Editing state: the Clear/counter/Cancel footer row now sits
 *     directly under the text box, above the photo box (previously
 *     below it). The saved state's "Edited … ago" line stays under the
 *     photo box, unchanged — this reorder only applies to editing.
 *   - Saved note now shows a name line above the note text — the
 *     account's profile name, or "You" when none is set — in the same
 *     column as the note, avatar to the left of both.
 *   - Avatar alignment: in the prompt, editing, and saved states, the
 *     avatar now centers on the FIRST line next to it (the placeholder,
 *     the textarea's first line, or the new name line respectively)
 *     rather than sitting flush with the top of the whole block — so it
 *     no longer drifts visually low against a note that wraps to several
 *     lines. See AVATAR_FIRST_LINE_OFFSET above. The loading skeleton is
 *     unchanged (not real text, nothing to center against).
 *   - Increased the pill's top/bottom padding and left padding (which
 *     also shifts the avatar in with it) across the prompt, editing, and
 *     saved states, plus the loading skeleton for consistency.
 *
 * personal-notes-mock-restyle (this task):
 *   - Header's right-hand slot no longer shows an "Edit" link for a
 *     populated note — it's always "Private" (lock icon) once the
 *     ✓ Saved flash finishes, matching the mock. Edit moved into the
 *     saved note's own new three-dot menu (see below).
 *   - Prompt-state pill dropped its name/"You" line — single placeholder
 *     line next to the avatar now, not a two-line name+placeholder
 *     column. Placeholder copy shortened to "Add a note or thought…"
 *     (was "…or a thought…"), kept in sync between the pill and the
 *     textarea's real placeholder attribute.
 *   - Saved note gained a three-dot menu (top-right of the name/
 *     timestamp row) with Edit and Delete note. Delete note reuses the
 *     existing showConfirm/handleClear "Delete note?" ConfirmSheet
 *     rather than a second dialog.
 *   - NotePhotoBox's empty-state branches (Pro-locked and Pro) rebuilt
 *     as a horizontal row — icon square, bold title + grey subtitle,
 *     and (free accounts only) a solid "PRO" pill on the right — instead
 *     of the previous centered vertical layout. The uploading/offline/
 *     error sub-states are unchanged — the mock doesn't cover those.
 *
 * personal-notes-mock-restyle-fixes (this task, after device testing):
 *   - The row above initially spread boxBase's fixed 140px height (meant
 *     for a full-bleed photo), which left the short icon/title row
 *     floating in a mostly-empty dashed box. rowShell now sizes to its
 *     own content instead.
 *   - Title is now always "Add a photo to your note" — a context-varying
 *     title ("Add a photo" once a note is saved) read as inconsistent.
 *     Dropped the context prop and PHOTO_BOX_COPY map entirely along
 *     with it; nothing else needed per-context copy.
 *   - Pro-locked subtitle shortened from "Photo notes are available with
 *     Pro." to "Unlock with Pro" — same CTA, matches the "Unlock…"
 *     wording ProUpsellBanner/NotePhotoUpsellSheet already use, and no
 *     longer wraps to two lines in the row layout.
 *   - rowShell's background is now --color-surface-muted instead of
 *     --color-surface, so the box reads as a distinct, slightly-recessed
 *     area rather than matching the note card above it exactly.
 *   - Prompt-state placeholder gained a small MessageSquare icon before
 *     the text, matching the icon+text pattern already used for
 *     "Private" and "Edited … ago" elsewhere in this file.
 *   - Editing footer's Clear button now uses a Trash2 icon instead of X,
 *     consistent with the new Delete-note menu item's icon.
 *   - Confirming "Delete image?" used to close the Lightbox and null
 *     image_url with no visible feedback — the photo just disappeared.
 *     Added a deletingPhoto flag that puts the box into its own
 *     "Deleting…" state (same spinner+label shell as 'uploading') for
 *     the real duration of the Storage delete call, which is now
 *     awaited instead of fire-and-forget specifically so this state has
 *     something real to cover.
 *
 * Props:
 *   conditionId  string
 */
export default function PersonalNotes({ conditionId }) {
  const { user, profile, loading } = useAuth()
  const { savedValue, savedImageUrl, updatedAt, save, saveImage, queuePendingImage } = useNotes(conditionId)
  const { requestNoteSignIn } = useNotesSignInContext()
  const isPro = useIsPro()
  const { isOnline } = useOnlineStatus()

  const charCap = isPro ? NOTES_CHAR_CAP_PRO : NOTES_CHAR_CAP_FREE

  const [draft, setDraft] = useState(savedValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isDirty = useDirtyState(savedValue, draft)

  // savedVisible: null | 'in' | 'out'
  const [savedVisible, setSavedVisible] = useState(null)

  // Clear confirmation sheet (note text)
  const [showConfirm, setShowConfirm] = useState(false)

  // personal-notes-mock-restyle: the saved note's three-dot menu
  // (Edit / Delete note) — replaces the old header "Edit" link now that
  // the header's corner slot is always "Private" (or the ✓ Saved flash).
  // Delete note reuses the exact same showConfirm/handleClear flow the
  // old footer Clear button already used, rather than a second confirm
  // dialog — it's the same destructive action, just reached from a new
  // place.
  const [showNoteMenu, setShowNoteMenu] = useState(false)
  const noteMenuRef = useRef(null)

  useEffect(() => {
    if (!showNoteMenu) return
    function onPointerDown(e) {
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target)) {
        setShowNoteMenu(false)
      }
    }
    function onKey(e) { if (e.key === 'Escape') setShowNoteMenu(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showNoteMenu])

  // notes-photo-uploader-redesign: delete-photo confirmation sheet —
  // kept separate from showConfirm above since it's a different action
  // with different copy, and can be open while the Lightbox is also open.
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState(false)

  // notes-pro-image-and-char-cap: photo attach/view state.
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [showProUpsell, setShowProUpsell] = useState(false)
  const fileInputRef = useRef(null)

  // personal-notes-mock-restyle: true while a confirmed image delete is
  // in flight. Previously the box just went straight from "attached" to
  // "empty" the instant Delete was confirmed, with no indication anything
  // was happening — this gives the box its own visible "Deleting…" state
  // (same spinner+label pattern as the 'uploading' state below) for the
  // real duration of the Storage delete call.
  const [deletingPhoto, setDeletingPhoto] = useState(false)

  // notes-photo-uploader-redesign: true once handlePhotoSelected detects
  // the device is offline and queues the pick instead of attempting an
  // upload. Cleared automatically below the moment savedImageUrl actually
  // updates (i.e. useNotes.js's own reconnect flush succeeded).
  const [isOfflineQueued, setIsOfflineQueued] = useState(false)

  // notes-photo-uploader-redesign: the last resized blob that failed to
  // upload, kept so retryUpload() can re-run the exact same attempt
  // without asking the user to re-pick the file. Cleared on success.
  const lastFailedBlobRef = useRef(null)

  useEffect(() => {
    if (savedImageUrl) setIsOfflineQueued(false)
  }, [savedImageUrl])

  // First-note fade-in — true only for the single render right after an
  // empty note becomes populated; flipped back to false shortly after
  // mount so it never re-triggers on subsequent edits.
  const [justPopulated, setJustPopulated] = useState(false)

  const fadeOutRef  = useRef(null)
  const textareaRef = useRef(null)

  // personal-notes-ui-polish: controls the editing footer row's own
  // grow/shrink transition (see the footer row's JSX below for the
  // grid-rows technique this drives). Kept separate from `isEditing`
  // itself so the footer can visibly collapse — smoothly pulling the
  // photo box back up with it — before the card switches away from the
  // editing layout entirely, instead of the whole thing just vanishing.
  const [footerExpanded, setFooterExpanded] = useState(false)
  const closeEditingRef = useRef(null)

  useEffect(() => {
    if (!isEditing) {
      setFooterExpanded(false)
      return
    }
    // Starts collapsed on the same render the editing view mounts, then
    // flips open one frame later so the transition actually plays instead
    // of the row just appearing already-open.
    const id = requestAnimationFrame(() => setFooterExpanded(true))
    return () => cancelAnimationFrame(id)
  }, [isEditing])

  useEffect(() => () => clearTimeout(closeEditingRef.current), [])

  useEffect(() => () => {
    clearTimeout(fadeOutRef.current)
  }, [])

  // personal-notes-ui-polish (tap-to-edit height animation): the card
  // swaps between completely different layouts on entering/leaving edit
  // mode (prompt/saved <-> editing textarea + footer + send button), so
  // React just mounts/unmounts different JSX — there's no single element
  // whose height could transition on its own the way footerExpanded's
  // grid-rows trick works above. This does a manual FLIP-style height
  // animation on the whole card instead: measureCardHeight() is called
  // right before the layout-changing state flips (see startEditing and
  // closeEditing below), capturing the "before" height; this effect then
  // reads the "after" height once the new layout has actually rendered,
  // pins the card at the old height, forces a reflow so the browser
  // registers that starting point, then animates to the new height and
  // releases back to height: 'auto' once the transition finishes — auto
  // is restored afterward so the textarea's own auto-grow (a separate,
  // already-existing effect) can keep resizing the card normally while
  // someone is actively typing, rather than fighting a leftover fixed
  // height from this animation.
  const cardRef = useRef(null)
  const prevCardHeightRef = useRef(null)

  function measureCardHeight() {
    if (cardRef.current) {
      prevCardHeightRef.current = cardRef.current.getBoundingClientRect().height
    }
  }

  useLayoutEffect(() => {
    const el = cardRef.current
    const oldHeight = prevCardHeightRef.current
    if (!el || oldHeight == null) return
    prevCardHeightRef.current = null

    const newHeight = el.getBoundingClientRect().height
    if (Math.abs(newHeight - oldHeight) < 1) return

    el.style.overflow = 'hidden'
    el.style.height = `${oldHeight}px`
    void el.offsetHeight // force reflow so the browser registers the start height
    el.style.transition = 'height var(--motion-base) var(--ease-reveal)'
    el.style.height = `${newHeight}px`

    function onTransitionEnd(e) {
      if (e.target !== el || e.propertyName !== 'height') return
      el.style.height = 'auto'
      el.style.overflow = ''
      el.style.transition = ''
      el.removeEventListener('transitionend', onTransitionEnd)
    }
    el.addEventListener('transitionend', onTransitionEnd)
    return () => el.removeEventListener('transitionend', onTransitionEnd)
  }, [isEditing])

  // notes-typing-keyboard-scroll (standardized): this used to work out
  // the keyboard's height itself (via window.visualViewport) and
  // manually scrollBy() the right amount, then later tried leaning on
  // Element.scrollIntoView() on every keystroke to chase the cursor.
  // Neither is needed now that the editing textarea has a fixed height
  // cap and scrolls internally past that point (see MAX_EDITING_LINES /
  // EDITING_MAX_HEIGHT above, and the textarea's own style below) —
  // every phone and browser already keeps the caret visible inside a
  // bounded, internally-scrolling text box on its own, so there's no
  // custom scroll-tracking code left to write here at all. The one
  // remaining scroll call (below, in its own effect) just nudges the
  // whole card into view once, the moment editing starts.
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
  // and whenever the draft changes. The textarea's own maxHeight/overflowY
  // (see its style below) do the actual capping — this just keeps handing
  // it the full content height on every change, same as before; the
  // browser visually clamps it to EDITING_MAX_HEIGHT and starts scrolling
  // once content passes that point, no extra math needed here.
  useLayoutEffect(() => {
    if (!isEditing || !textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [isEditing, draft])

  // notes-typing-keyboard-scroll (standardized): nudges the whole editing
  // card into view once, the moment editing starts — in case the note
  // card was sitting low on the page when it was tapped. Keyed only on
  // isEditing (not draft), so this fires once on entry and never re-runs
  // on every keystroke — once the card is in view, keeping the caret
  // visible inside the now height-capped textarea is the browser's own
  // native, guaranteed behavior for a scrolling text box (see
  // MAX_EDITING_LINES above), not something this effect needs to manage.
  useEffect(() => {
    if (!isEditing || !textareaRef.current) return
    textareaRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [isEditing])

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
    measureCardHeight()
    setDraft(savedValue)
    setIsEditing(true)
  }

  // personal-notes-ui-polish: shared exit path for Save/Cancel/Clear —
  // collapses the footer row first (same duration as its own CSS
  // transition, var(--motion-base)) so the photo box visibly slides back
  // up, THEN switches isEditing off once that's finished, rather than the
  // whole editing layout disappearing the instant a button is tapped.
  function closeEditing() {
    setFooterExpanded(false)
    clearTimeout(closeEditingRef.current)
    closeEditingRef.current = setTimeout(() => {
      measureCardHeight()
      setIsEditing(false)
    }, 220)
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
    closeEditing()
    triggerSaved()
  }

  function handleCancel() {
    setDraft(savedValue)
    closeEditing()
  }

  function handleClear() {
    // Clearing is confirmed via ConfirmSheet before this runs — that
    // confirmation IS the save intent, so this commits immediately
    // instead of leaving an already-confirmed clear sitting as an
    // unsaved draft the user would have to hit Save on again.
    save('')
    setDraft('')
    closeEditing()
    triggerSaved()
  }

  function handleClearClick() {
    setShowConfirm(true)
  }

  // notes-photo-uploader-redesign: tap handler for the box's empty state —
  // exact same reachability the old header camera button had.
  // personal-notes-ui-polish: the box now also renders for a signed-out
  // visitor (as a locked "Pro feature" preview, same as a free account
  // sees), so a tap there routes to the sign-in sheet first, same as
  // tapping the rest of the prompt does.
  function handleBoxTap() {
    if (!user) {
      requestNoteSignIn(conditionId)
      return
    }
    if (!isPro) {
      setShowProUpsell(true)
      return
    }
    fileInputRef.current?.click()
  }

  // notes-photo-uploader-redesign: shared by both the initial pick and
  // retryUpload() below, so a retry re-runs the exact same upload logic
  // rather than a second hand-written copy of it.
  async function attemptUpload(resizedBlob) {
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const { url, error } = await uploadNoteImage(resizedBlob, user.id, conditionId)
      if (error || !url) {
        lastFailedBlobRef.current = resizedBlob
        setPhotoError('Could not upload photo. Please try again.')
      } else {
        lastFailedBlobRef.current = null
        saveImage(url)
      }
    } catch {
      lastFailedBlobRef.current = resizedBlob
      setPhotoError('Could not upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function retryUpload() {
    const blob = lastFailedBlobRef.current
    if (!blob || !user) return
    attemptUpload(blob)
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file || !user) return

    setPhotoError(null)

    // notes-photo-uploader-redesign: client-side validation before any
    // resize/network work — surfaces immediately, no round trip needed.
    if (!file.type.startsWith('image/')) {
      setPhotoError("That file type isn't supported. Please choose an image.")
      return
    }
    if (file.size > MAX_PHOTO_SOURCE_BYTES) {
      setPhotoError('That photo is too large. Please choose a smaller one.')
      return
    }

    let resized
    try {
      resized = await resizeAndCompressImage(file)
    } catch {
      setPhotoError('Could not process photo. Please try again.')
      return
    }

    // notes-photo-uploader-redesign: offline queueing for the upload step
    // itself — queue the resized blob and stop, rather than letting
    // uploadNoteImage fail with no retry path.
    if (!isOnline) {
      queuePendingImage(resized)
      setIsOfflineQueued(true)
      return
    }

    await attemptUpload(resized)
  }

  // personal-notes-mock-restyle: now awaits the Storage delete (previously
  // fire-and-forget — see the old rationale this replaces) specifically
  // so deletingPhoto has a real duration to cover, rather than a synthetic
  // delay. Best-effort still applies: a Storage failure doesn't block
  // clearing image_url, since the DB row is the source of truth for
  // whether a note "has" a photo.
  async function handleDeletePhotoConfirm() {
    if (!user) return
    setLightboxOpen(false)
    setDeletingPhoto(true)
    try {
      await deleteNoteImage(user.id, conditionId)
    } catch {
      // best-effort — fall through to saveImage(null) regardless
    } finally {
      saveImage(null)
      setDeletingPhoto(false)
    }
  }

  // notes-photo-uploader-redesign: which of the 6 box states applies, in
  // priority order. personal-notes-mock-restyle: deletingPhoto now checked
  // first — an in-flight delete should show its own state even though
  // savedImageUrl is still technically set until saveImage(null) resolves.
  const photoState = deletingPhoto
    ? 'deleting'
    : savedImageUrl
    ? 'attached'
    : uploadingPhoto
      ? 'uploading'
      : isOfflineQueued
        ? 'offline'
        : photoError
          ? 'error'
          : 'empty'

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
          otherwise inline-styled file. Also holds the upload box's
          spinner keyframe (notes-photo-uploader-redesign).
          notes-typing-keyboard-scroll (standardized): also styles the
          editing textarea's own scrollbar — inline styles can't target
          ::-webkit-scrollbar either, so this is the same workaround. A
          thin, brand-colored thumb replaces the browser's default one,
          and is drawn as a "classic" always-reserved scrollbar rather
          than an overlay that fades in/out, so it stays visible as a
          steady cue while a long note is being edited. Firefox's own
          scrollbar-color/-width properties are set alongside for the
          same look there. iPhone's Safari doesn't allow either of these
          to be styled or forced visible at all — that's a restriction
          Apple applies to every website, not something fixable here. */}
      <style>{`
        .personal-notes-textarea::placeholder {
          color: var(--color-text-tertiary);
          opacity: 1;
        }
        .personal-notes-textarea {
          scrollbar-width: thin;
          scrollbar-color: var(--color-accent) var(--color-border-subtle);
        }
        .personal-notes-textarea::-webkit-scrollbar {
          width: 8px;
        }
        .personal-notes-textarea::-webkit-scrollbar-track {
          background: var(--color-border-subtle);
          border-radius: var(--radius-full);
        }
        .personal-notes-textarea::-webkit-scrollbar-thumb {
          background-color: var(--color-accent);
          background-clip: padding-box;
          border: 2px solid transparent;
          border-radius: var(--radius-full);
        }
        @keyframes personal-notes-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* notes-photo-uploader-redesign: the hidden file input used to sit
          next to the header camera button; it now renders unconditionally
          whenever a user is signed in, since the box that triggers it can
          appear in more than one place in the tree below. */}
      {!loading && user && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoSelected}
        />
      )}

      {/* Label row — title on the left; privacy caption (empty-prompt
          state), "Edit" (populated state), or the "✓ Saved" flash sits on
          the right of this same row — all three share one inline slot
          here, same as every other top corner element. Fixed height
          keeps the row from growing or shrinking a few pixels as the
          right-hand content swaps between states.
          notes-photo-uploader-redesign: the camera-icon button that used
          to live in this row is gone — see NotePhotoBox below instead. */}
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
              Private
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

      <div ref={cardRef}>
      {loading ? (
        /* Loading skeleton — shown only while useAuth()'s sign-in check
           is still settling, so this card doesn't flash the signed-out
           prompt for a person who turns out to already be signed in.
           notes-photo-uploader-redesign: avatar now sits inside the same
           bordered container as the pill content, full width, matching
           every other state below. */
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          border: '1px solid var(--color-border)',
          borderRadius: PILL_RADIUS,
          padding: '20px 16px 20px calc(var(--space-4) + 2px)',
          boxSizing: 'border-box',
          backgroundColor: 'var(--color-surface)',
          width: '100%',
          minHeight: AVATAR_SIZE + 2,
        }}>
          <div style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-border-subtle)',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '55%',
              height: 11,
              borderRadius: 4,
              backgroundColor: 'var(--color-border-subtle)',
            }} />
          </div>
        </div>
      ) : isEditing ? (
        /* notes-merged-card: text, photo, and the footer controls now
           share one outer card instead of the text pill and photo box
           being two separately-bordered pieces. The accent focus border
           moved from the text section alone onto this whole outer card,
           so typing highlights the entire card, not just the top half.
           The footer (Clear / counter / Cancel) moved from directly
           under the text box to the very bottom, after the photo
           section — since everything's one card now, those controls
           read as acting on the whole card (text + photo together),
           not just the text half. */
        <div style={{
          border: `1px solid ${isFocused ? 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border) 55%)' : 'var(--color-border)'}`,
          borderRadius: PILL_RADIUS,
          boxSizing: 'border-box',
          backgroundColor: 'var(--color-surface)',
          transition: 'border-color 0.15s ease',
          width: '100%',
        }}>
          {/* Text row — avatar and text box only. notes-send-button-own-row:
              the Send button used to live inline here, pinned to the
              textarea's bottom-right corner as it grew. Moved to its own
              row below (see the row right after this one) so it sits
              under the textarea — and its internal scrollbar, once the
              6-line cap kicks in — instead of floating in the corner of
              a box that can be actively scrolling.
              alignItems: 'flex-start' is kept so the avatar's position
              doesn't get pulled toward the vertical middle of the whole
              textarea as it grows to multiple lines.
              personal-notes-ui-polish: the avatar itself now carries a
              small fixed marginTop (AVATAR_FIRST_LINE_OFFSET.editing) so
              it centers on the textarea's FIRST line specifically —
              staying put there regardless of how many lines the note
              grows to below it — rather than sitting flush with the very
              top of the text like before.
              notes-avatar-icon-alignment: left padding now matches the
              photo-uploader row below (rowShell's left inset is
              var(--space-4)), plus half the width difference between the
              32px avatar and the 36px icon square there (2px), so the
              avatar's own horizontal center lines up exactly with the
              icon+badge row's center underneath it — using the shared
              token rather than a second hardcoded number, so the two
              stay aligned even if the spacing scale itself ever changes. */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '24px 18px 0 calc(var(--space-4) + 2px)',
          }}>
            <ProfileAvatar
              user={user}
              fullName={profile?.fullName}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12, flexShrink: 0, marginTop: AVATAR_FIRST_LINE_OFFSET.editing }}
            />
            <textarea
              ref={textareaRef}
              className="personal-notes-textarea"
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, charCap))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Add a note or thought…"
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
                maxHeight: EDITING_MAX_HEIGHT,
                overflowY: 'auto',
              }}
            />
          </div>

          {/* Send-button row — notes-send-button-own-row: own line below
              the textarea (and its scrollbar), right-aligned to the same
              corner the inline button used to pin to. paddingTop is the
              gap between the textarea/scrollbar above and this row. */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '8px 18px 20px calc(var(--space-4) + 2px)',
          }}>
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

          <NotePhotoBox
            state={photoState}
            url={savedImageUrl}
            isPro={isPro}
            onTapEmpty={handleBoxTap}
            onTapPhoto={() => setLightboxOpen(true)}
            onRetry={retryUpload}
          />

          {/* Footer row — Clear (only when a note exists to clear) on
              the left; the live character counter and Cancel share the
              right side. notes-merged-card: now the card's own bottom
              section, after the photo box, with its own divider line —
              still wrapped in the same grid-rows animated shell (0fr
              collapsed / 1fr expanded, driven by footerExpanded) so it
              grows in when editing starts and shrinks back out on
              Save/Cancel/Clear, instead of snapping in and out. */}
          <div style={{
            display: 'grid',
            gridTemplateRows: footerExpanded ? '1fr' : '0fr',
            opacity: footerExpanded ? 1 : 0,
            borderTop: '1px solid var(--color-border)',
            transition: 'grid-template-rows var(--motion-base) var(--ease-reveal), opacity var(--motion-base) var(--ease-reveal)',
          }}>
            <div style={{ overflow: 'hidden', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
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
                  <Icon name="Trash2" size={12} color="var(--color-danger)" />
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
      ) : user && savedValue ? (
        /* Populated, signed in — comment-style. On the very first save
           (empty -> populated) the whole block fades/scales in;
           subsequent edits render at steady-state with no re-animation.
           notes-photo-uploader-redesign: avatar moved inside the pill's
           own bordered container, pill now full width; the photo box
           renders under it in every populated note, not just ones with
           a photo already attached. */
        <div style={{
          opacity: justPopulated ? 0 : 1,
          transform: justPopulated ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          {/* personal-notes-ui-polish (name/edited restructure pass):
              name + "Edited … ago" live together as the two-line column
              next to the avatar — same two-line pattern the empty/prompt
              state already uses for name + placeholder. Unlike the
              editing state's textarea (which can grow to many lines),
              this column is always exactly these two short lines, so the
              row uses plain alignItems: 'center' — the avatar centers on
              the two lines as one unit, rather than the fixed
              first-line-only offset the editing state still needs for
              its own potentially-long, wrapping text. The note text
              itself is a separate block further down, still inside this
              same bordered box — indented by AVATAR_SIZE + the row's own
              gap so it lines up with the name column above it, not with
              the avatar's left edge. */}
          <div style={{
            position: 'relative',
            border: '1px solid var(--color-border)',
            borderRadius: PILL_RADIUS,
            boxSizing: 'border-box',
            backgroundColor: 'var(--color-surface)',
            width: '100%',
          }}>
          <div style={{ padding: '20px 16px 20px calc(var(--space-4) + 2px)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minHeight: AVATAR_SIZE + 2,
            }}>
              <ProfileAvatar
                user={user}
                fullName={profile?.fullName}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  lineHeight: `${SAVED_NAME_LINE_HEIGHT}px`,
                }}>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-text-primary)',
                  }}>
                    {profile?.fullName || 'You'}
                  </span>
                  {isPro && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                      lineHeight: 1.4,
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontFamily: 'var(--font-body)',
                      color: 'var(--color-accent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                      flexShrink: 0,
                    }}>
                      PRO
                    </span>
                  )}
                </span>
                {updatedAt && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 2,
                    fontSize: 13,
                    lineHeight: '19px',
                    fontWeight: 400,
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <Icon name="Clock" size={11} color="var(--color-text-tertiary)" />
                    {formatRelativeTime(updatedAt)}
                  </span>
                )}
              </div>

              {/* personal-notes-mock-restyle: three-dot menu — Edit and
                  Delete note. Anchored to the outer box (position:
                  relative above) rather than this row, so the dropdown
                  sits flush with the box's own edges regardless of how
                  tall the name/timestamp column is. */}
              <div ref={noteMenuRef} style={{ position: 'relative', flexShrink: 0, alignSelf: 'flex-start' }}>
                <button
                  type="button"
                  onClick={() => setShowNoteMenu(v => !v)}
                  aria-label="Note options"
                  aria-haspopup="true"
                  aria-expanded={showNoteMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="MoreVertical" size={16} color="var(--color-text-tertiary)" />
                </button>

                {showNoteMenu && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 28,
                      right: 0,
                      zIndex: 10,
                      minWidth: 140,
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      padding: 4,
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setShowNoteMenu(false); startEditing() }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: 13,
                        fontFamily: 'var(--font-body)',
                        color: 'var(--color-text-primary)',
                        background: 'none',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon name="Pencil" size={14} color="var(--color-text-secondary)" />
                      Edit
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setShowNoteMenu(false); handleClearClick() }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: 13,
                        fontFamily: 'var(--font-body)',
                        color: 'var(--color-danger)',
                        background: 'none',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon name="Trash2" size={14} color="var(--color-danger)" />
                      Delete note
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Note text — its own body of text below the row, still
                inside the box; the row above guarantees savedValue is
                non-empty here, so no placeholder branch is needed the
                way the row's own column above needed one. Mixed-language
                display still hands the raw text to the browser's own
                bidi engine via dir="auto" + unicode-bidi: plaintext,
                same reasoning as before. */}
            <div
              dir="auto"
              style={{
                marginTop: 10,
                marginLeft: AVATAR_SIZE + 10,
                fontSize: 14,
                lineHeight: '20px',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'pre-wrap',
                color: 'var(--color-text-primary)',
                unicodeBidi: 'plaintext',
              }}
            >
              {savedValue}
            </div>
          </div>

          <NotePhotoBox
            state={photoState}
            url={savedImageUrl}
            isPro={isPro}
            onTapEmpty={handleBoxTap}
            onTapPhoto={() => setLightboxOpen(true)}
            onRetry={retryUpload}
            roundBottom
          />
          </div>
        </div>
      ) : (
        /* Unified prompt state — identical whether signed out or signed
           in with no note yet. Tap routes to the sign-in sheet or
           straight into edit mode via handlePromptTap.
           notes-photo-uploader-redesign: avatar moved inside the pill's
           own bordered container, pill now full width, matching every
           other state.
           personal-notes-ui-polish: the photo box (below) now also
           renders here, including signed-out — as the same locked
           "Pro feature" look a signed-in free account already sees,
           rather than being hidden until someone starts editing.
           personal-notes-mock-restyle: dropped the name/"You" line that
           used to sit above the placeholder here — the mock shows this
           state as a single placeholder line next to the avatar, so the
           name now only appears once a note is actually saved. The row
           keeps plain alignItems: 'center' since the placeholder is
           always exactly one fixed-string line. */
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: PILL_RADIUS,
          boxSizing: 'border-box',
          backgroundColor: 'var(--color-surface)',
          width: '100%',
        }}>
          <div
            onClick={handlePromptTap}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '20px 16px 20px calc(var(--space-4) + 2px)',
              minHeight: AVATAR_SIZE + 2,
            }}
          >
            {user ? (
              <ProfileAvatar
                user={user}
                fullName={profile?.fullName}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: 12, flexShrink: 0 }}
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
            <span style={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              lineHeight: '19px',
              fontWeight: 400,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
            }}>
              Add a note or thought…
            </span>
          </div>

          <NotePhotoBox
            state={photoState}
            url={savedImageUrl}
            isPro={isPro}
            onTapEmpty={handleBoxTap}
            onTapPhoto={() => setLightboxOpen(true)}
            onRetry={retryUpload}
            roundBottom
          />
        </div>
      )}
      </div>

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleClear}
        title="Delete note?"
        message="This action can't be undone."
        confirmLabel="Delete"
        destructive
      />

      <PaywallGateSheet
        isOpen={showProUpsell}
        onClose={() => setShowProUpsell(false)}
        icon={ImagePlus}
        headline="Enhance Your Notes"
        message="Attach lecture slides, diagrams, and written reminders."
        dismissLabel="Not now"
      />

      {lightboxOpen && savedImageUrl && (
        <Lightbox
          images={[{ id: 'note-photo', url: savedImageUrl, caption: '' }]}
          activeIndex={0}
          onClose={() => setLightboxOpen(false)}
          onGo={() => {}}
          onDelete={() => setShowDeletePhotoConfirm(true)}
          imageStore="notes"
        />
      )}

      {/* notes-photo-uploader-redesign: rendered above the open Lightbox
          via ConfirmSheet's additive zIndex prop — see file header. */}
      <ConfirmSheet
        isOpen={showDeletePhotoConfirm}
        onClose={() => setShowDeletePhotoConfirm(false)}
        onConfirm={handleDeletePhotoConfirm}
        title="Delete image?"
        message="This action can't be undone."
        confirmLabel="Delete"
        destructive
        zIndex={10000}
      />
    </div>
  )
}
