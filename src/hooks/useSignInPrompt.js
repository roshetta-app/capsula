import { useState, useEffect, useRef, useCallback } from 'react'

const SESSION_KEY = 'capsula_signin_prompt_shown_session' // sessionStorage — resets each new visit/tab
const DISMISS_KEY = 'capsula_signin_prompt_dismissed_forever' // localStorage — permanent opt-out

/**
 * useSignInPrompt — decides when to auto-open the sign-in popup after a
 * user's first favourite of a visit.
 *
 * Per D16: re-asks each new visit (sessionStorage — resets on a fresh
 * tab/session) rather than dismiss-once-forever, unless the user
 * explicitly taps "don't ask again" (localStorage — permanent) or is
 * already signed in — in either of those cases the prompt never
 * auto-opens again.
 *
 * `favouritesCount` should be the total count of favourited items
 * (drugs + conditions combined). The hook watches for it going from 0
 * to 1+ — a first favourite this visit — to trigger the prompt. It only
 * ever auto-fires once per visit even if the count keeps changing.
 *
 * Usage:
 *   const { shouldAutoOpen, consumeAutoOpen, dismissForever } =
 *     useSignInPrompt({ isSignedIn: !!user, favouritesCount })
 *
 *   useEffect(() => {
 *     if (shouldAutoOpen) { openAccountSheet(); consumeAutoOpen() }
 *   }, [shouldAutoOpen])
 */
export function useSignInPrompt({ isSignedIn, favouritesCount }) {
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false)
  const prevCount = useRef(favouritesCount)

  useEffect(() => {
    const wentFromZero = prevCount.current === 0 && favouritesCount > 0
    prevCount.current = favouritesCount

    if (!wentFromZero) return
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
  }, [favouritesCount, isSignedIn])

  const consumeAutoOpen = useCallback(() => setShouldAutoOpen(false), [])

  const dismissForever = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, 'true') } catch { /* ignore */ }
  }, [])

  return { shouldAutoOpen, consumeAutoOpen, dismissForever }
}
