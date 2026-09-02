/**
 * src/components/SignInNudge.jsx
 *
 * Mounts the sign-in popup (AccountSheet) and its trigger sensor
 * (useSignInPrompt) together, app-wide. Watches a signed-out user's first
 * personal note of a visit and opens AccountSheet when it happens (see
 * useSignInPrompt.js for the exact trigger/cap rules).
 *
 * Phase 7 (this session) — now also mounts FavouriteLimitSheet and reads
 * two new pieces of state from FavouritesContext:
 *   - pendingFavourite: a signed-out heart-tap recorded by useFavourites.js
 *     instead of being saved. AccountSheet now also opens whenever this is
 *     set, not just on the old notes-based auto-trigger — closing it calls
 *     dismissPendingFavourite() when a favourite was pending, otherwise the
 *     original notes-trigger dismiss().
 *   - capBlocked: which list ('drugs' | 'conditions') just hit its free-tier
 *     cap. Opens FavouriteLimitSheet, closed via dismissCapBlocked().
 * The old direct `favourites` read is no longer needed here (favouritesCount
 * was only used to feed useSignInPrompt's now-removed trigger) and has been
 * removed.
 *
 * Mounted once in App.jsx, in the same spot ProfileSetupRedirect sits — as
 * a sibling of OnboardingGate/AppRoutes, inside AuthProvider,
 * FavouritesProvider, and NotesActivityProvider so all three contexts are
 * available. Renders nothing visible of its own except whichever sheet is
 * currently open.
 *
 * Props: none — reads everything it needs from context.
 */

import { useAuth } from '../hooks/useAuth'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useNotesActivityContext } from '../context/NotesActivityContext'
import { useSignInPrompt } from '../hooks/useSignInPrompt'
import AccountSheet from './ui/AccountSheet'
import FavouriteLimitSheet from './ui/FavouriteLimitSheet'

export default function SignInNudge() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { notesActivityCount } = useNotesActivityContext()
  const {
    pendingFavourite,
    capBlocked,
    dismissPendingFavourite,
    dismissCapBlocked,
  } = useFavouritesContext()

  const { shouldAutoOpen, dismiss } = useSignInPrompt({
    isSignedIn: !!user,
    notesActivityCount,
  })

  function handleAccountSheetClose() {
    if (pendingFavourite) {
      dismissPendingFavourite()
      return
    }
    dismiss()
  }

  return (
    <>
      <AccountSheet
        isOpen={shouldAutoOpen || !!pendingFavourite}
        onClose={handleAccountSheetClose}
        user={user}
        signInWithGoogle={signInWithGoogle}
        signOut={signOut}
        favouriteContext={!!pendingFavourite}
      />
      <FavouriteLimitSheet
        isOpen={!!capBlocked}
        listType={capBlocked}
        onClose={dismissCapBlocked}
      />
    </>
  )
}
