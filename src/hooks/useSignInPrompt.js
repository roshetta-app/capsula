
import { useState, useEffect, useRef, useCallback } from 'react'

// sessionStorage — resets each new visit/tab. Shared across both triggers:
// only one auto-open per visit, whichever trigger (favourite or note) fires
// first.
const SESSION_KEY = 'capsula_signin_prompt_shown_session'

// localStorage — permanent, lifetime count of real (non-accidental)
// dismissals. Replaces the old single "dismissed forever" boolean flag.
const IMPRESSIONS_KEY = 'capsula_signin_prompt_impressions'

// After this many genuine dismissals, the prompt stops auto-opening for
// good — no explicit "don't ask again" button needed.
const MAX_IMPRESSIONS = 3

// A dismissal only counts toward the cap above if the sheet was visibly
// open for at least this long. Protects the lifetime budget from a
// backdrop mis-tap or reflex swipe that closes it almost instantly.
const MIN_VISIBLE_MS = 500

/**
 * useSignInPrompt — decides when to auto-open the sign-in popup after a
 * signed-out user's first genuinely useful action of a visit.
 *
 * Redesign (this session) — standard-practice rework, replacing the D16
 * "re-ask every visit, explicit permanent dismiss button" model:
 *   - No more explicit "don't ask again" button. Instead, a lifetime
 *     impression counter (MAX_IMPRESSIONS) auto-retires the prompt after a
 *     small number of genuine dismissals — the common pattern across apps
 *     that use this kind of lazy-registration nudge, since a manual
 *     opt-out button is rarely the one most people actually reach for.
 *   - A dismissal only counts against that lifetime budget if the sheet
 *     was visibly open for at least MIN_VISIBLE_MS — an instant close
 *     (backdrop mis-tap, reflex swipe) doesn't burn down the budget.
 *   - Signing in stops future prompts automatically, same as before — no
 *     separate flag needed, since the isSignedIn guard below already
 *     blocks the effect once true.
 *
 * Phase 7 (this session) — the favourites-based "went from zero" trigger
 * and its favouritesCount parameter are removed entirely. Favouriting now
 * requires an account (see useFavourites.js), so a signed-out favourite
 * count can never go above zero any more — the trigger had nothing left
 * to fire on. The pending-favourite tap itself opens AccountSheet directly
 * (see SignInNudge.jsx), so this hook only needs to watch the notes
 * trigger now.
 *
 * Usage:
 *   const { shouldAutoOpen, dismiss } =
 *     useSignInPrompt({ isSignedIn: !!user, notesActivityCount })
 *
 *   // Pass `dismiss` as AccountSheet's onClose — it closes the sheet AND
 *   // records the impression (subject to the MIN_VISIBLE_MS debounce).
 */
export function useSignInPrompt({ isSignedIn, notesActivityCount = 0 }) {
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false)
  const prevNotesActivityCount = useRef(notesActivityCount)
  const openedAtRef = useRef(null)

  useEffect(() => {
    const notesWentFromZero = prevNotesActivityCount.current === 0 && notesActivityCount > 0
    prevNotesActivityCount.current = notesActivityCount

    if (!notesWentFromZero) return
    if (isSignedIn) return

    let impressions = 0
    let shownThisSession = false
    try {
      impressions = parseInt(localStorage.getItem(IMPRESSIONS_KEY) ?? '0', 10) || 0
      shownThisSession = sessionStorage.getItem(SESSION_KEY) === 'true'
    } catch {
      // storage unavailable — fail open by NOT auto-prompting, same
      // fail-open-to-inert-behavior pattern used elsewhere in the app
      // (e.g. useFavourites' own storage try/catch) rather than risking
      // a broken/looping prompt.
      return
    }

    if (impressions >= MAX_IMPRESSIONS || shownThisSession) return

    openedAtRef.current = Date.now()
    setShouldAutoOpen(true)
    try { sessionStorage.setItem(SESSION_KEY, 'true') } catch { /* ignore */ }
  }, [notesActivityCount, isSignedIn])

  // Call on any dismissal — backdrop tap, Escape, or the "Not now" link.
  // Closes the sheet immediately; only counts toward the lifetime cap if
  // it was genuinely seen (open for at least MIN_VISIBLE_MS).
  const dismiss = useCallback(() => {
    setShouldAutoOpen(false)

    const openedAt = openedAtRef.current
    openedAtRef.current = null
    if (openedAt == null) return

    const visibleMs = Date.now() - openedAt
    if (visibleMs < MIN_VISIBLE_MS) return // too fast to be a real look — don't spend the budget

    try {
      const current = parseInt(localStorage.getItem(IMPRESSIONS_KEY) ?? '0', 10) || 0
      localStorage.setItem(IMPRESSIONS_KEY, String(current + 1))
    } catch { /* ignore */ }
  }, [])

  return { shouldAutoOpen, dismiss }
}
