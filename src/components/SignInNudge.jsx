/**
 * src/components/SignInNudge.jsx
 *
 * Mounts the sign-in popup (AccountSheet) and its trigger sensor
 * (useSignInPrompt) together, app-wide. Watches a signed-out user's first
 * favourite or first personal note of a visit and opens AccountSheet when
 * either happens (see useSignInPrompt.js for the exact trigger/cap rules).
 *
 * Redesign (this session): AccountSheet no longer takes a separate
 * `dismissForever` callback — useSignInPrompt's single `dismiss()` now
 * handles closing the sheet AND recording the lifetime impression (with
 * its own accidental-tap debounce) in one call, so this component just
 * wires it straight through as `onClose`.
 *
 * Mounted once in App.jsx, in the same spot ProfileSetupRedirect sits — as
 * a sibling of OnboardingGate/AppRoutes, inside AuthProvider,
 * FavouritesProvider, and NotesActivityProvider so all three contexts are
 * available. Renders nothing visible of its own except AccountSheet
 * itself, which only actually shows when the popup is open.
 *
 * Props: none — reads everything it needs from context.
 */

import { useAuth } from '../hooks/useAuth'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useNotesActivityContext } from '../context/NotesActivityContext'
import { useSignInPrompt } from '../hooks/useSignInPrompt'
import AccountSheet from './ui/AccountSheet'

export default function SignInNudge() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { favourites } = useFavouritesContext()
  const { notesActivityCount } = useNotesActivityContext()

  const favouritesCount = favourites.drugs.length + favourites.conditions.length

  const { shouldAutoOpen, dismiss } = useSignInPrompt({
    isSignedIn: !!user,
    favouritesCount,
    notesActivityCount,
  })

  return (
    <AccountSheet
      isOpen={shouldAutoOpen}
      onClose={dismiss}
      user={user}
      signInWithGoogle={signInWithGoogle}
      signOut={signOut}
    />
  )
}
