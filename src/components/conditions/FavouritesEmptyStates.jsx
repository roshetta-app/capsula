/**
 * src/components/conditions/FavouritesEmptyStates.jsx
 *
 * Favourites Screen Refactor plan, Phase 1 (extraction) + Phase 9
 * (NoSearchResultsState redesign, Decision 12).
 *
 * Three named exports, grouped in one file since they're all small,
 * Favourites-specific empty-state variants:
 *   - NothingSavedEmptyState  — moved verbatim from FavouritesScreen.jsx.
 *   - NoSearchResultsState    — REDESIGNED (Decision 12): was plain text +
 *     an underlined "Clear search" link; now matches the icon + headline +
 *     supporting-line + filled-button style DrugsScreen's own EmptyState
 *     uses (SearchX icon, bold headline naming the query, a helpful subtext
 *     line, a solid accent button). Used by BOTH tabs, so this changes
 *     Conditions' existing search-empty visual too, not just the new Drugs
 *     one — that's intentional, per the locked decision.
 *   - SpecialtyEmptyState     — moved verbatim from FavouritesScreen.jsx.
 *
 * FavFilledHintButton is a small local equivalent of DrugsScreen.jsx's
 * private FilledHintButton (not imported/reused — that file stays out of
 * scope, and FilledHintButton isn't exported from it anyway). Mirrors its
 * visual look exactly (same border/fill/radius/press-scale treatment).
 *
 * Favourites empty-state sign-in banner (this session) —
 * NothingSavedEmptyState gained a showSignIn prop, true for guests only,
 * shown below the existing icon/headline/subtext/button. Originally
 * opened the shared AccountSheet popup via FavouritesSignInContext — see
 * "Direct-to-Google sign-in" below for what replaced that.
 *
 * Favourites empty-state graphic (this session) — NothingSavedEmptyState's
 * placeholder Heart-in-circle icon is replaced with the provided PNG
 * illustration (src/assets/favourites-empty-illustration.png), imported
 * the same way src/assets/hero.png and the onboarding illustrations
 * already are elsewhere in this project. Heart is no longer imported from
 * lucide-react and the now-unused FAV_ACCENT constant was removed.
 *
 * Empty-state layout/copy pass (this session) — reworked per feedback:
 *  - No longer vertically centered in the tab; sits at a fixed position
 *    near the top instead, so Conditions/Drugs line up identically
 *    regardless of their (slightly different-length) copy.
 *  - Illustration/title/description are now one tight top group; a
 *    single larger gap separates that group from the buttons below,
 *    instead of even spacing between every element.
 *  - Title copy: "No favourite conditions/drugs yet" (states what's
 *    empty, rather than the generic "Nothing saved yet").
 *  - Description copy: "Save conditions/drugs for quick access whenever
 *    you need them."
 *  - Description block has a fixed min-height so both tabs' button
 *    position lines up even though the two sentences aren't quite the
 *    same length.
 *  - "Browse conditions/drugs" is now the clearly primary action: full
 *    width, ~50px tall, bold.
 *  - Sign-in copy simplified to "Already have saved favourites?"; the
 *    Sign in button itself stays a small outlined secondary action so it
 *    doesn't compete with Browse.
 *
 * Direct-to-Google sign-in (this session, follow-up) — per feedback, the
 * Sign in action here no longer opens the shared AccountSheet popup; it
 * calls signInWithGoogle() directly, using the exact same "Continue with
 * Google" button (styling, GoogleIcon mark, busy/error handling) copied
 * verbatim from AccountSheet.jsx, so it matches the app's one standard
 * Google button pixel-for-pixel rather than introducing a second style.
 * FavouritesSignInContext is no longer used by this file as a result —
 * it had no other consumer, so it's been dropped from App.jsx and
 * SignInNudge.jsx too (see those files' headers).
 *
 * Button pass (this session, follow-up) — Browse and the Google button
 * now share one rounded-rectangle shape (var(--radius-sm), not the
 * earlier pill) and the same, slightly shorter height, so they read as a
 * matched pair. The Google button is filled white with a border instead
 * of accent-blue, keeping it visually secondary to Browse. An "or"
 * divider now sits between the two, above "Already have saved
 * favourites?".
 *
 * Button pass 2 (this session, follow-up) — per feedback: corner radius
 * bumped from var(--radius-sm) to var(--radius-md) on both Browse and the
 * Google button, matching SpecialtiesBottomSheet.jsx's row-button radius
 * instead of the tighter one used elsewhere. Both buttons' height/padding
 * trimmed down slightly, and the button group's container narrowed
 * (maxWidth 320 → 280) so the pair reads a touch smaller overall. The
 * Google button's fill was hardcoded '#fff', which stayed white in dark
 * mode instead of following the app's theme — switched to
 * var(--color-surface), the same token AccountSheet.jsx's own idle-state
 * surface color resolves to, so it now darkens correctly with the rest of
 * the app.
 *
 * Illustration pop-in fix (this session) — the <img> below only ever
 * requested favouritesEmptyIllustration's bytes the moment
 * NothingSavedEmptyState itself first mounted (i.e. the first time
 * someone actually landed on an empty Favourites/search-empty tab), so it
 * visibly popped in rather than just being there. FavouritesScreen.jsx
 * imports this module directly (not React.lazy), so it's already
 * evaluated at app startup regardless of whether Favourites is even
 * visited yet — the two lines below just use that same head start to ask
 * the browser to fetch/decode the image right away, instead of waiting
 * for the component that displays it to mount. No existing preload
 * precedent elsewhere in the app to match (hero.png and the onboarding
 * illustrations are plain imports too, same as this one was) — this is
 * the standard technique for warming a browser's image cache ahead of
 * when an image is actually displayed.
 *
 * Empty-state visual pass 2 (this session) — per feedback, all scoped to
 * NothingSavedEmptyState (FavFilledHintButton, used only by
 * NoSearchResultsState below, is untouched):
 *  - Title bumped from 15/600 to 19/700 with -0.2px letterSpacing —
 *    matches FavouritesHero.jsx's own "Favourites" h1 exactly, rather
 *    than inventing a new size.
 *  - Both CTAs (Browse, Google sign-in) trimmed down a step: filled
 *    Browse text 15/700 → 14/600, the Google button's 600 → 500. Kept as
 *    a small step, not a full restyle.
 *  - The "or" divider's label is now "Already have favourites?" itself
 *    (matching the rest of the app's spelling), and the separate
 *    "Already have saved favourites?" line that used to sit below the
 *    divider is gone — it said the same thing twice.
 *  - Browse gets a trailing ArrowRight (lucide-react, already used
 *    elsewhere in the app — e.g. FavouritesHero.jsx's own ArrowLeft) to
 *    signal it navigates away, rather than acting in place.
 *  - Both buttons: borderRadius var(--radius-md) → 999px (full pill),
 *    per feedback to round them "to the max."
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchX, ArrowRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import favouritesEmptyIllustration from '../../assets/favourites-empty-illustration.png'

const preloadFavouritesEmptyIllustration = new Image()
preloadFavouritesEmptyIllustration.src = favouritesEmptyIllustration

// ─── Shared small button for the redesigned empty states ───────────────────

function FavFilledHintButton({ onClick, children }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:                 'inline-flex',
        alignItems:              'center',
        justifyContent:          'center',
        gap:                     4,
        cursor:                  'pointer',
        border:                  '1.5px solid var(--color-accent)',
        backgroundColor:         'var(--color-accent)',
        color:                   '#fff',
        fontSize:                13,
        fontWeight:              600,
        fontFamily:              'var(--font-body)',
        padding:                 '6px 12px',
        borderRadius:            'var(--radius-md)',
        lineHeight:              1,
        flexShrink:              0,
        transform:               pressed ? 'scale(0.96)' : 'scale(1)',
        transition:              'transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ─── Small pressable button shared by NothingSavedEmptyState's two CTAs ────
// Refined-buttons pass (this session) — both the primary "Browse X" button
// and the "Sign in" banner button now share this, so they match on width,
// radius, and press feedback (mirrors FavFilledHintButton's press-scale
// treatment, kept as its own local copy since the two buttons differ in
// fill/border rather than sharing FavFilledHintButton's fixed filled look).

function EmptyStatePressableButton({ onClick, filled, fullWidth, children }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        gap:                     'var(--space-2)',
        width:                   fullWidth ? '100%' : 'auto',
        minWidth:                fullWidth ? undefined : 160,
        minHeight:               filled ? 40 : undefined,
        padding:                 filled ? '10px 18px' : '9px 18px',
        borderRadius:            999,
        border:                  filled ? 'none' : '1.5px solid var(--color-border)',
        backgroundColor:         filled ? 'var(--color-accent)' : 'transparent',
        color:                   filled ? '#fff' : 'var(--color-text-secondary)',
        fontSize:                filled ? 14 : 13,
        fontWeight:              filled ? 600 : 500,
        fontFamily:              'var(--font-body)',
        lineHeight:              1,
        cursor:                  'pointer',
        transform:               pressed ? 'scale(0.96)' : 'scale(1)',
        transition:              'transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ─── Empty state: nothing saved yet ─────────────────────────────────────────
// Fixed-position layout (not vertically centered): illustration + title +
// description form one tight top group, a single larger gap separates that
// from the action buttons below. Shared between both tabs — only the
// label/destination/copy differ, everything else (spacing, positions,
// sizes) is identical so the two tabs line up.

export function NothingSavedEmptyState({ label, showSignIn }) {
  const navigate = useNavigate()
  const isConditions = label === 'conditions'
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [googlePressed, setGooglePressed] = useState(false)

  // Copied from AccountSheet.jsx's handleGoogleSignIn — same busy/error
  // handling, including resetting `busy` on every path (native
  // signInWithGoogle() only opens the system browser and returns right
  // away, so this keeps the button from getting stuck busy).
  async function handleGoogleSignIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error: authError } = await signInWithGoogle()
    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      textAlign:      'center',
      paddingTop:     'var(--space-6)',
      paddingBottom:  'var(--space-6)',
      paddingLeft:    'var(--space-4)',
      paddingRight:   'var(--space-4)',
    }}>
      {/* Top group — illustration, title, description kept close together
          as one visual unit. */}
      <img
        src={favouritesEmptyIllustration}
        alt=""
        style={{ width: 120, height: 'auto', marginBottom: 'var(--space-3)' }}
      />

      <div style={{
        fontSize:      19,
        fontWeight:    700,
        letterSpacing: '-0.2px',
        color:         'var(--color-text-primary)',
        marginBottom:  'var(--space-2)',
      }}>
        {isConditions ? 'No favourite conditions yet' : 'No favourite drugs yet'}
      </div>

      <div style={{
        fontSize:   13,
        color:      'var(--color-text-tertiary)',
        lineHeight: 1.5,
        maxWidth:   260,
        // Fixed min-height so both tabs' buttons line up in the same
        // place even though the two sentences aren't quite the same length.
        minHeight:  40,
      }}>
        {isConditions
          ? 'Save conditions for quick access whenever you need them.'
          : 'Save drugs for quick access whenever you need them.'}
      </div>

      {/* Gap between the top group and the action buttons below. */}
      <div style={{
        width:         '100%',
        maxWidth:      280,
        marginTop:     'var(--space-6)',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           'var(--space-3)',
      }}>
        <EmptyStatePressableButton
          filled
          fullWidth
          onClick={() => navigate(isConditions ? '/conditions' : '/drugs')}
        >
          {isConditions ? 'Browse conditions' : 'Browse drugs'}
          <ArrowRight size={16} strokeWidth={2.5} />
        </EmptyStatePressableButton>

        {showSignIn && (
          <div style={{
            marginTop:     'var(--space-3)',
            width:         '100%',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           'var(--space-3)',
          }}>
            {/* Divider — separates the primary Browse action above from
                the secondary sign-in option below. Its own label doubles
                as the prompt ("Already have favourites?") instead of a
                plain "or" with a separate line repeating the same
                question underneath. */}
            <div style={{
              width:      '100%',
              display:    'flex',
              alignItems: 'center',
              gap:        'var(--space-2)',
            }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                Already have favourites?
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
            </div>

            {error && (
              <div style={{
                width:           '100%',
                fontSize:        12,
                color:           '#DC2626',
                backgroundColor: '#FEF2F2',
                border:          '1px solid #FECACA',
                borderRadius:    'var(--radius-sm)',
                padding:         'var(--space-2) var(--space-3)',
                lineHeight:      1.4,
                textAlign:       'left',
              }}>
                {error}
              </div>
            )}

            {/* Based on AccountSheet.jsx's "Continue with Google" button
                (same icon, wording, busy label), but filled white with a
                border instead of the accent-filled look — this is the
                secondary action here, so it stays visually quieter than
                the primary Browse button above rather than matching its
                blue fill. Height/radius/padding match Browse exactly so
                the two read as one consistent button pair. Fill uses
                var(--color-surface) rather than a literal '#fff' so it
                darkens in dark mode instead of staying stuck white. */}
            <button
              onClick={handleGoogleSignIn}
              onPointerDown={() => setGooglePressed(true)}
              onPointerUp={() => setGooglePressed(false)}
              onPointerLeave={() => setGooglePressed(false)}
              disabled={busy}
              style={{
                width:                   '100%',
                minHeight:               40,
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                gap:                     'var(--space-2)',
                padding:                 '10px 18px',
                borderRadius:            999,
                border:                  '1.5px solid var(--color-border)',
                backgroundColor:         busy ? 'var(--color-bg)' : 'var(--color-surface)',
                color:                   busy ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                fontSize:                14,
                fontWeight:              500,
                fontFamily:              'var(--font-body)',
                cursor:                  busy ? 'not-allowed' : 'pointer',
                transform:               googlePressed ? 'scale(0.97)' : 'scale(1)',
                transition:              'transform var(--motion-fast) var(--ease-settle)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {!busy && <GoogleIcon size={18} />}
              {busy ? 'Opening Google…' : 'Continue with Google'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Copied verbatim from AccountSheet.jsx's local GoogleIcon (itself copied
// from AccountScreen.jsx originally) so this button's mark matches the
// rest of the app's Google buttons exactly, pixel for pixel.
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

// ─── Empty state: search matched nothing ────────────────────────────────────
// Distinct from NothingSavedEmptyState — the user DOES have favourites,
// their search just didn't match any of them. REDESIGNED (Decision 12) to
// match DrugsScreen's own search-empty visual: icon + headline + supporting
// line + filled button, instead of the previous plain text + underlined
// link. Used by both tabs.

export function NoSearchResultsState({ query, onClear }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <SearchX size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        No matches{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        Try a different search term
      </div>
      <FavFilledHintButton onClick={onClear}>
        Clear search
      </FavFilledHintButton>
    </div>
  )
}

// ─── Empty state: specialty filter matched nothing ──────────────────────────
// Distinct from both states above — the user has favourites and isn't
// searching by text, but the active specialty filter (set via
// FavouritesManagerSheet) doesn't match any of their saved conditions.
// Conditions-tab only; unaffected by the search-empty redesign above.

export function SpecialtyEmptyState({ specialtyName, onClear }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-2)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No saved conditions{specialtyName ? ` in ${specialtyName}` : ''}
      </div>
      <button
        onClick={onClear}
        style={{
          fontSize:       13,
          color:          'var(--color-accent)',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          textDecoration: 'underline',
          fontFamily:     'var(--font-body)',
          padding:        '4px 0',
        }}
      >
        Clear filter
      </button>
    </div>
  )
}
