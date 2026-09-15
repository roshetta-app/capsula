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
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, SearchX } from 'lucide-react'
import { useFavouritesSignInContext } from '../../context/FavouritesSignInContext'

// Favourites' own identity color — same token used across this screen's
// extracted pieces (RowStarButton.jsx already keeps its own local copy of
// this same one-line alias, same convention followed here).
const FAV_ACCENT = 'var(--color-favourite)'

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

// ─── Empty state: nothing saved yet ─────────────────────────────────────────
// Replaces the old generic "No saved X yet" text block. Accent-tinted
// circular icon background, short body copy, verb-first CTA to go save
// something. Shared between both tabs — only the label/destination differ.

export function NothingSavedEmptyState({ label, showSignIn }) {
  const navigate = useNavigate()
  const isConditions = label === 'conditions'
  const { requestSignIn } = useFavouritesSignInContext()

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-3)',
    }}>
      <div style={{
        width:           64,
        height:          64,
        borderRadius:    '50%',
        backgroundColor: 'var(--color-favourite-light)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Heart size={28} strokeWidth={1.5} style={{ color: FAV_ACCENT }} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Nothing saved yet
      </div>

      <div style={{
        fontSize:   13,
        color:      'var(--color-text-tertiary)',
        lineHeight: 1.5,
        maxWidth:   240,
      }}>
        {isConditions
          ? 'Save conditions you want to find quickly later.'
          : 'Save drugs you want to find quickly later.'}
      </div>

      <button
        onClick={() => navigate(isConditions ? '/conditions' : '/drugs')}
        style={{
          marginTop:       4,
          padding:         '10px 20px',
          borderRadius:    'var(--radius-full)',
          border:          'none',
          backgroundColor: 'var(--color-accent)',
          color:           '#fff',
          fontSize:        13,
          fontWeight:      600,
          fontFamily:      'var(--font-body)',
          cursor:          'pointer',
        }}
      >
        {isConditions ? 'Browse conditions' : 'Browse drugs'}
      </button>

      {showSignIn && (
        <button
          onClick={requestSignIn}
          style={{
            marginTop:       'var(--space-2)',
            width:           '100%',
            maxWidth:        240,
            padding:         '9px 16px',
            borderRadius:    'var(--radius-md)',
            border:          '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color:           'var(--color-text-secondary)',
            fontSize:        13,
            fontWeight:      500,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
          }}
        >
          Sign in
        </button>
      )}
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
