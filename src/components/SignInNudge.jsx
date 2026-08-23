/**
 * src/components/SignInNudge.jsx
 *
 * Mounts the sign-in popup (AccountSheet) and its trigger sensor
 * (useSignInPrompt) together, app-wide. Both pieces already existed in the
 * codebase — AccountSheet.jsx and useSignInPrompt.js — but nothing ever
 * rendered them together, so the D12/D16 "prompt after first favourite"
 * nudge never actually fired. This component is the missing connection.
 *
 * This session also extends the trigger to a signed-out user's first
 * personal note, not just their first favourite (see
 * NotesActivityContext.jsx and useSignInPrompt.js).
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

  const { shouldAutoOpen, consumeAutoOpen, dismissForever } = useSignInPrompt({
    isSignedIn: !!user,
    favouritesCount,
    notesActivityCount,
  })

  return (
    <AccountSheet
      isOpen={shouldAutoOpen}
      onClose={consumeAutoOpen}
      user={user}
      signInWithGoogle={signInWithGoogle}
      signOut={signOut}
      onDismissForever={dismissForever}
    />
  )
}
