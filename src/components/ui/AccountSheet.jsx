/**
 * src/components/ui/AccountSheet.jsx
 *
 * The sign-in sheet — opened automatically whenever a signed-out user
 * tries to save a favourite or add a personal note. Never gates content
 * on its own; it's just a dismissible surface.
 *
 * Redesign (Phase 7):
 *   - Rebuilt as a true bottom sheet, on the same pattern
 *     SpecialtiesBottomSheet.jsx already uses elsewhere in the app (fixed
 *     backdrop, slide-up sheet, drag handle, rounded top corners, safe-area
 *     bottom padding, closes on backdrop tap / Escape) — replacing the old
 *     centered pop-up.
 *   - Signed-out content is now the same "Sign in or create account" card
 *     used on the Account screen (AccountScreen.jsx) — same icon, headline,
 *     subtext, error handling, and Google button (including the real
 *     multi-color Google mark, copied from AccountScreen.jsx's local
 *     GoogleIcon) — instead of separate wording/styling living in two
 *     places.
 *   - Dismissal simplified to a single "Not now" action.
 *
 * favourites-pending-fix follow-up (copy) — signed-out headline/subtext now
 * swap to favourite-specific wording when this sheet was opened because of
 * a pending favourite tap (favouriteContext, passed by SignInNudge.jsx),
 * instead of always showing the generic copy.
 *
 * notes-signin-required — added noteContext, same shape as
 * favouriteContext but its own copy branch. Deliberately not reusing
 * favouriteContext's "save this" framing: a favourite tap has already
 * happened by the time this sheet opens (something's mid-action), but a
 * note prompt opens before anything's been typed — there's no content yet
 * to "save this" implies. Copy here is forward-looking instead ("Sign in
 * to add your thoughts…"). favouriteContext and noteContext are mutually
 * exclusive in practice (SignInNudge.jsx only ever sets one at a time),
 * so favouriteContext is checked first, then noteContext, then the
 * generic default.
 *
 * notes-comment-redesign (this session) — both signed-out subtexts
 * shortened to one consistent, concise line each. Dropped "with Google"
 * and "it's free" from the favourite one — the button directly below
 * already reads "Continue with Google", so naming it again in the
 * sentence above was redundant. The note one lost its "saved to your
 * account and available on any device" wording in favor of the same
 * length/rhythm as the favourite line, so the two read as one consistent
 * voice instead of two differently-worded asks. PersonalNotes.jsx's own
 * card no longer asks the person to sign in at all (see that file) — this
 * sheet's copy is now the only place that ask is made.
 *
 * signin-sheet-copy-and-notes-emptystate (this session) — favouriteContext/
 * noteContext headlines and note subtext updated per feedback.
 *
 * paywall-sheet-copy-tweaks (this session, follow-up) — headlines dropped
 * "Sign in to..." entirely (the ask reads as an action, not a login
 * prompt): "Save this to Favourites" / "Add your notes". The "sign in"
 * framing moved down into the subtext instead, which is why noteContext's
 * subtext changed too ("Sign in to add notes and access them
 * everywhere."). favouriteContext's subtext already carried that framing
 * and is unchanged.
 *
 * Props:
 *   isOpen             boolean
 *   onClose            () => void   — call on any dismissal (backdrop tap,
 *                                     Escape, or the "Not now" link).
 *   user               SupabaseUser | null
 *   signInWithGoogle    () => Promise<{ error }>
 *   signOut             () => Promise<void>
 *   favouriteContext    boolean — true when a pending favourite is why
 *                                 this sheet is open. Swaps the
 *                                 signed-out copy only; everything else
 *                                 about the sheet is unchanged. Defaults
 *                                 to false.
 *   noteContext         boolean — true when a pending note sign-in
 *                                 request (see NotesSignInContext.jsx) is
 *                                 why this sheet is open. Swaps the
 *                                 signed-out copy only, same as
 *                                 favouriteContext above. Defaults to
 *                                 false.
 * account-sheet-close-flash fix (this session) — favouriteContext/
 * noteContext/user are driven by state elsewhere (pendingFavourite,
 * pendingNoteConditionId) that clears the instant the sheet is dismissed
 * or sign-in completes — the same render that flips isOpen to false also
 * flips these back to their defaults. But shouldRender keeps this
 * component mounted for another 280ms after that so the close transition
 * can play, and it kept re-rendering with those now-stale live props
 * during that window — visible as a flash of the generic "Sign in or
 * create account" copy behind whatever context-specific content had
 * actually been showing, right as the sheet faded out. `display` below
 * snapshots {user, favouriteContext, noteContext} only while isOpen is
 * true, so the close animation always plays out on the last real state
 * instead of whatever the props happen to become a moment later.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { User } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../context/ToastContext'

export default function AccountSheet({
  isOpen,
  onClose,
  user,
  signInWithGoogle,
  signOut,
  favouriteContext = false,
  noteContext = false,
}) {
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)
  const [googlePressed, setGooglePressed] = useState(false)
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()

  // account-sheet-close-flash fix — see file header. Only updates while
  // isOpen is true, so it stays live for anything that changes during a
  // genuinely open sheet (e.g. signing in without closing first), but
  // freezes at its last value for the entire close-transition window
  // rather than snapping to whatever the live props become the moment
  // dismissal starts.
  const [display, setDisplay] = useState({ user, favouriteContext, noteContext })
  useEffect(() => {
    if (isOpen) {
      setDisplay({ user, favouriteContext, noteContext })
    }
  }, [isOpen, user, favouriteContext, noteContext])

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual position — same
  // shouldRender/animateIn pattern SpecialtiesBottomSheet.jsx uses.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
      setError(null)
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

  // Same body-scroll lock SpecialtiesBottomSheet.jsx uses while a bottom
  // sheet is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!shouldRender) return null

  async function handleGoogleSignIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error: authError } = await signInWithGoogle()
    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Please try again.')
    }
    // Stage 3 (F6) bug fix, 2026-08-13 — confirmed on-device: on native,
    // signInWithGoogle() only opens the system browser and returns right
    // away; it does NOT wait for the OAuth flow to finish. Resetting
    // `busy` on every path (not just the error one) keeps the button from
    // getting stuck in a busy state once the user returns already signed
    // in — unchanged from the previous version of this file.
    setBusy(false)
  }

  // Offline-sign-out bug fix (2026-09-01) — signOut() needs a network
  // round-trip to actually complete (see AuthContext.jsx). Checking
  // isOnline first means an offline tap gets an immediate, clear message
  // instead of silently doing nothing while nothing visibly changes. The
  // error check after calling it is a safety net for the rarer case where
  // the connection drops between the tap and the call finishing.
  async function handleSignOut() {
    if (busy) return
    if (!isOnline) {
      toast.error("You'll need an internet connection to sign out.")
      return
    }
    setBusy(true)
    const { error } = await signOut()
    setBusy(false)
    if (error) {
      toast.error("Couldn't sign out — please check your connection and try again.")
      return
    }
    onClose()
  }

  // Rendered via portal to document.body — same reasoning as ConfirmSheet
  // and SpecialtiesBottomSheet: position: fixed only resolves against the
  // viewport if no ancestor has a transform/filter/etc that creates its
  // own containing block, and this can be opened from screens that do
  // (e.g. condition detail's tab-swipe wrapper).
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
        aria-label={display.user ? 'Account' : 'Sign in'}
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
        {/* Drag handle — same visual affordance SpecialtiesBottomSheet.jsx
            uses, signaling "swipe down to close" even though the sheet
            itself doesn't need a drag gesture handler to close (backdrop
            tap / Escape / Not now already cover it). */}
        <div style={{
          width:           40,
          height:          4,
          borderRadius:    2,
          backgroundColor: 'var(--color-border)',
          margin:          '0 auto var(--space-5)',
        }} />

        {display.user ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize:     16,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              Signed in
            </div>
            <p style={{
              margin:     '0 0 var(--space-5)',
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
              wordBreak:  'break-word',
            }}>
              {display.user.email}
            </p>
            <button
              onClick={handleSignOut}
              disabled={busy}
              style={secondaryButtonStyle}
            >
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        ) : (
          // Signed-out content — the exact same card as AccountScreen.jsx's
          // "Sign in or create account" section: same icon, headline,
          // subtext, error handling, and Google button. The sheet itself
          // stands in for that card's own bordered box, so no extra border
          // is added here.
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width:           48,
              height:          48,
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-bg)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              margin:          '0 auto var(--space-3)',
            }}>
              <User size={22} color="var(--color-text-secondary)" strokeWidth={1.8} />
            </div>

            <div style={{
              fontSize:     16,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              {display.favouriteContext
                ? 'Save this to Favourites'
                : display.noteContext
                  ? 'Add your notes'
                  : 'Sign in or create account'}
            </div>
            <p style={{
              margin:     '0 0 var(--space-4)',
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
            }}>
              {display.favouriteContext
                ? 'Sign in to save it and access it on any device.'
                : display.noteContext
                  ? 'Sign in to add notes and access them everywhere.'
                  : 'Sync your favourites across devices with your Google account.'}
            </p>

            {error && (
              <div style={{
                fontSize:        13,
                color:           '#DC2626',
                backgroundColor: '#FEF2F2',
                border:          '1px solid #FECACA',
                borderRadius:    'var(--radius-sm)',
                padding:         'var(--space-2) var(--space-3)',
                lineHeight:      1.4,
                marginBottom:    'var(--space-3)',
                textAlign:       'left',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              onPointerDown={() => setGooglePressed(true)}
              onPointerUp={() => setGooglePressed(false)}
              onPointerLeave={() => setGooglePressed(false)}
              disabled={busy}
              style={{
                width:                   '100%',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                gap:                     'var(--space-2)',
                padding:                 'var(--space-2) var(--space-4)',
                borderRadius:            'var(--radius-sm)',
                border:                  'none',
                backgroundColor:         busy ? 'var(--color-border)' : 'var(--color-accent)',
                color:                   busy ? 'var(--color-text-tertiary)' : '#fff',
                fontSize:                14,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                cursor:                  busy ? 'not-allowed' : 'pointer',
                transform:               googlePressed ? 'scale(0.97)' : 'scale(1)',
                transition:              'transform var(--motion-fast) var(--ease-settle)',
                WebkitTapHighlightColor: 'transparent',
                marginBottom:            'var(--space-3)',
              }}
            >
              {!busy && (
                <span style={{
                  display:         'inline-flex',
                  backgroundColor: '#fff',
                  borderRadius:    'var(--radius-sm)',
                  padding:         2,
                }}>
                  <GoogleIcon size={16} />
                </span>
              )}
              {busy ? 'Opening Google…' : 'Continue with Google'}
            </button>

            {/* Single dismiss action. */}
            <button onClick={onClose} style={linkButtonStyle}>
              Not now
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

// ─── Local components & styles ─────────────────────────────────────────────

// Copied verbatim from AccountScreen.jsx's local GoogleIcon so the popup's
// Google button matches the Account screen's exactly, pixel for pixel.
function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}

const secondaryButtonStyle = {
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
}

const linkButtonStyle = {
  padding:         'var(--space-1) 0',
  border:          'none',
  background:      'none',
  color:           'var(--color-text-tertiary)',
  fontSize:        13,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
  textDecoration:  'underline',
}

