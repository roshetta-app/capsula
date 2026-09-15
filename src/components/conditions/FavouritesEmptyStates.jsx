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
 * NothingSavedEmptyState gained a showSignIn prop. When true (a guest
 * viewing this tab), a quiet bordered "Sign in" banner renders below the
 * existing icon/headline/subtext/button. Tapping it calls requestSignIn()
 * from FavouritesSignInContext, the same way PersonalNotes.jsx already
 * calls requestNoteSignIn() — SignInNudge.jsx opens the shared account
 * sheet with its generic copy in response.
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
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useFavouritesSignInContext } from '../../context/FavouritesSignInContext'
import favouritesEmptyIllustration from '../../assets/favourites-empty-illustration.png'


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
        width:                   fullWidth ? '100%' : 'auto',
        minWidth:                fullWidth ? undefined : 160,
        minHeight:               filled ? 50 : undefined,
        padding:                 filled ? '14px 20px' : '9px 18px',
        borderRadius:            'var(--radius-full)',
        border:                  filled ? 'none' : '1.5px solid var(--color-border)',
        backgroundColor:         filled ? 'var(--color-accent)' : 'transparent',
        color:                   filled ? '#fff' : 'var(--color-text-secondary)',
        fontSize:                filled ? 15 : 13,
        fontWeight:              filled ? 700 : 500,
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
  const { requestSignIn } = useFavouritesSignInContext()

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
        fontSize:     15,
        fontWeight:   600,
        color:        'var(--color-text-primary)',
        marginBottom: 'var(--space-2)',
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
        maxWidth:      320,
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
        </EmptyStatePressableButton>

        {showSignIn && (
          <div style={{
            marginTop:     'var(--space-2)',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           'var(--space-2)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Already have saved favourites?
            </div>
            <EmptyStatePressableButton onClick={requestSignIn}>
              Sign in
            </EmptyStatePressableButton>
          </div>
        )}
      </div>
    </div>
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
