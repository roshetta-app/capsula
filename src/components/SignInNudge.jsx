/**
 * src/components/SignInNudge.jsx
 *
 * Mounts the sign-in popup (AccountSheet) app-wide, alongside
 * FavouriteLimitSheet.
 *
 * Phase 7 — mounts FavouriteLimitSheet and reads two pieces of state from
 * FavouritesContext:
 *   - pendingFavourite: a signed-out heart-tap recorded by useFavourites.js
 *     instead of being saved. AccountSheet opens whenever this is set —
 *     closing it calls dismissPendingFavourite().
 *   - capBlocked: which list ('drugs' | 'conditions') just hit its free-tier
 *     cap. Opens FavouriteLimitSheet, closed via dismissCapBlocked().
 *
 * notes-signin-required (this session) — replaces the old
 * useSignInPrompt-driven auto-open entirely. Notes now require an account
 * to save, the same as favourites' toggle actions: PersonalNotes.jsx opens
 * this sheet directly (via NotesSignInContext's requestNoteSignIn) the
 * moment a signed-out user taps to add a note, instead of waiting for a
 * guest to save once and nudging afterward. useSignInPrompt.js is deleted
 * — the "let them do it once as a guest, then nudge on the next one"
 * moment it watched for can no longer happen for notes (sign-in is
 * required up front) and favourites already replaced its own half of that
 * mechanism with pendingFavourite in the same way. AccountSheet now opens
 * on pendingFavourite || pendingNoteConditionId, full stop.
 *
 * Favourites empty-state sign-in banner (this session) — AccountSheet now
 * also opens on signInRequested (FavouritesSignInContext), set when a
 * guest taps "Sign in" directly from an empty Favourites tab rather than
 * a pending favourite/note action. favouriteContext/noteContext stay
 * false in that case, so the sheet falls through to its existing generic
 * copy unchanged.
 *
 * Mounted once in App.jsx, in the same spot ProfileSetupRedirect sits — as
 * a sibling of OnboardingGate/AppRoutes, inside AuthProvider,
 * FavouritesProvider, and NotesSignInProvider so all three contexts are
 * available. Renders nothing visible of its own except whichever sheet is
 * currently open.
 *
 * Props: none — reads everything it needs from context.
 */

import { useAuth } from '../hooks/useAuth'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useNotesSignInContext } from '../context/NotesSignInContext'
import { useFavouritesSignInContext } from '../context/FavouritesSignInContext'
import AccountSheet from './ui/AccountSheet'
import FavouriteLimitSheet from './ui/FavouriteLimitSheet'

export default function SignInNudge() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const {
    pendingFavourite,
    capBlocked,
    dismissPendingFavourite,
    dismissCapBlocked,
  } = useFavouritesContext()
  const { pendingNoteConditionId, dismissNoteSignIn } = useNotesSignInContext()
  const { signInRequested, dismissSignInRequest } = useFavouritesSignInContext()

  function handleAccountSheetClose() {
    if (pendingFavourite) {
      dismissPendingFavourite()
      return
    }
    if (pendingNoteConditionId) {
      dismissNoteSignIn()
      return
    }
    if (signInRequested) {
      dismissSignInRequest()
      return
    }
  }

  return (
    <>
      <AccountSheet
        isOpen={!!pendingFavourite || !!pendingNoteConditionId || signInRequested}
        onClose={handleAccountSheetClose}
        user={user}
        signInWithGoogle={signInWithGoogle}
        signOut={signOut}
        favouriteContext={!!pendingFavourite}
        noteContext={!!pendingNoteConditionId}
      />
      <FavouriteLimitSheet
        isOpen={!!capBlocked}
        listType={capBlocked}
        onClose={dismissCapBlocked}
      />
    </>
  )
}
