import { useState, useEffect, useRef, useCallback } from 'react'

const SESSION_KEY = 'capsula_signin_prompt_shown_session' // sessionStorage — resets each new visit/tab
const DISMISS_KEY = 'capsula_signin_prompt_dismissed_forever' // localStorage — permanent opt-out

/**
 * useSignInPrompt — decides when to auto-open the sign-in popup after a
 * signed-out user's first genuinely useful action of a visit.
 *
 * Per D16: re-asks each new visit (sessionStorage — resets on a fresh
 * tab/session) rather than dismiss-once-forever, unless the user
 * explicitly taps "don't ask again" (localStorage — permanent) or is
 * already signed in — in either of those cases the prompt never
 * auto-opens again.
 *
 * Two independent triggers, either of which can fire the prompt:
 *   favouritesCount     — total favourited items (drugs + conditions).
 *   notesActivityCount  — bumped once per condition the first time a
 *                          personal note is saved for it this visit (see
 *                          NotesActivityContext.jsx). Extension added
 *                          this session — previously favourites-only.
 * The hook watches each for its own first 0-to-1+ transition. Once either
 * one has fired the prompt this visit, the session flag stops it firing
 * again — it's still one prompt per visit, not one per trigger type.
 *
 * Usage:
 *   const { shouldAutoOpen, consumeAutoOpen, dismissForever } =
 *     useSignInPrompt({ isSignedIn: !!user, favouritesCount, notesActivityCount })
 *
 *   useEffect(() => {
 *     if (shouldAutoOpen) { openAccountSheet(); consumeAutoOpen() }
 *   }, [shouldAutoOpen])
 */
export function useSignInPrompt({ isSignedIn, favouritesCount, notesActivityCount = 0 }) {
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false)
  const prevFavouritesCount = useRef(favouritesCount)
  const prevNotesActivityCount = useRef(notesActivityCount)

  useEffect(() => {
    const favouritesWentFromZero = prevFavouritesCount.current === 0 && favouritesCount > 0
    const notesWentFromZero = prevNotesActivityCount.current === 0 && notesActivityCount > 0
    prevFavouritesCount.current = favouritesCount
    prevNotesActivityCount.current = notesActivityCount

    if (!favouritesWentFromZero && !notesWentFromZero) return
    if (isSignedIn) return

    let dismissedForever = false
    let shownThisSession = false
    try {
      dismissedForever = localStorage.getItem(DISMISS_KEY) === 'true'
      shownThisSession = sessionStorage.getItem(SESSION_KEY) === 'true'
    } catch {
      // storage unavailable — fail open by NOT auto-prompting, same
      // fail-open-to-inert-behavior pattern used elsewhere in the app
      // (e.g. useFavourites' own storage try/catch) rather than risking
      // a broken/looping prompt.
      return
    }

    if (dismissedForever || shownThisSession) return

    setShouldAutoOpen(true)
    try { sessionStorage.setItem(SESSION_KEY, 'true') } catch { /* ignore */ }
  }, [favouritesCount, notesActivityCount, isSignedIn])

  const consumeAutoOpen = useCallback(() => setShouldAutoOpen(false), [])

  const dismissForever = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, 'true') } catch { /* ignore */ }
  }, [])

  return { shouldAutoOpen, consumeAutoOpen, dismissForever }
}
