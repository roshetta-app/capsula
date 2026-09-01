import { useState, useEffect, useRef, useCallback } from 'react'

// sessionStorage — resets each new visit/tab.
const SESSION_SHOWN_KEY   = 'capsula_notif_prompt_shown_session'
const VISIT_COUNTED_KEY   = 'capsula_notif_prompt_visit_counted_session'

// localStorage — permanent, lifetime state.
const VISITS_KEY      = 'capsula_notif_prompt_visits'
const IMPRESSIONS_KEY = 'capsula_notif_prompt_impressions'
const LAST_SHOWN_KEY  = 'capsula_notif_prompt_last_shown'

// Never ask on someone's very first visit — only from their 2nd visit on,
// so the very first thing anyone sees isn't a permission ask.
const MIN_VISITS_BEFORE_ASK = 2

// After this many genuine impressions, the banner stops asking for good —
// no separate "dismissed forever" flag needed, same model useSignInPrompt
// uses for the sign-in popup.
const MAX_IMPRESSIONS = 3

// Extra spacing on top of the once-per-visit rule: even across multiple
// separate visits in the same day, don't ask again within 24h of the last
// genuine ask.
const COOLDOWN_MS = 24 * 60 * 60 * 1000

// Small delay after eligibility is confirmed before the banner actually
// appears, so it doesn't pop in the instant a screen renders.
const APPEAR_DELAY_MS = 2500

// An impression only counts toward the lifetime budget if the banner was
// visibly on screen for at least this long — protects the budget from an
// accidental instant close.
const MIN_VISIBLE_MS = 500

/**
 * useNotificationsPrompt — decides when the "turn on notifications" banner
 * is allowed to appear.
 *
 * Redesign (2026-09-01, notif-banner-standardized-timing): previously this
 * logic lived inline inside NotificationsBanner.jsx and fired on a flat
 * 2.5s timer after every single app open, with no regard for whether the
 * person had done anything yet — the classic "asked before I knew why"
 * pattern that hurts opt-in rates. This pulls the decision out into its
 * own hook, the same way useSignInPrompt.js already does for the sign-in
 * popup, and brings it in line with that same standard:
 *   - Never asks on a person's very first visit — only from their 2nd
 *     visit onward. (src/analytics/deviceSession.js was checked first for
 *     an existing visit counter to reuse — it tracks a per-device id and a
 *     same-session id, but nothing that counts visits over time, so this
 *     hook keeps its own small counter rather than repurposing that file.)
 *   - Replaces the old attempts-cap + separate permanent "dismissed
 *     forever" flag with a single lifetime impression counter — the exact
 *     model useSignInPrompt.js uses, including its protection against an
 *     accidental instant close counting as a real decline
 *     (MIN_VISIBLE_MS).
 *   - Keeps a 24h cooldown between genuine asks on top of the once-per-
 *     visit/once-per-session rule, for extra spacing across a day with
 *     several short visits.
 *   - No separate "subscribed successfully, never ask again" flag is
 *     needed: the caller passes `eligible: false` once subscribed, and
 *     this hook's own effect simply won't run again — same as
 *     useSignInPrompt relying on `isSignedIn` rather than a stored flag.
 *
 * Usage:
 *   const eligible = supported && !subscribed && permission !== null && permission !== 'denied'
 *   const { shouldShow, dismiss } = useNotificationsPrompt({ eligible })
 *
 *   // Call `dismiss()` on every way the banner closes — Allow, Ask Later,
 *   // or an auto-dismiss timeout. It always closes it; it only spends the
 *   // lifetime budget if the banner was genuinely visible long enough.
 */
export function useNotificationsPrompt({ eligible }) {
  const [shouldShow, setShouldShow] = useState(false)
  const openedAtRef = useRef(null)

  useEffect(() => {
    if (!eligible) return
    if (sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true') return

    let visits = 0
    let impressions = 0
    let lastShown = 0
    try {
      visits = parseInt(localStorage.getItem(VISITS_KEY) ?? '0', 10) || 0
      impressions = parseInt(localStorage.getItem(IMPRESSIONS_KEY) ?? '0', 10) || 0
      lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) ?? '0', 10) || 0

      // Count this as a new visit at most once per session, regardless of
      // whether the banner ends up eligible to show this time.
      if (sessionStorage.getItem(VISIT_COUNTED_KEY) !== 'true') {
        visits += 1
        localStorage.setItem(VISITS_KEY, String(visits))
        sessionStorage.setItem(VISIT_COUNTED_KEY, 'true')
      }
    } catch {
      // storage unavailable — fail open by NOT prompting, same
      // fail-open-to-inert-behavior pattern useSignInPrompt.js uses.
      return
    }

    if (visits < MIN_VISITS_BEFORE_ASK) return
    if (impressions >= MAX_IMPRESSIONS) return
    if (lastShown && Date.now() - lastShown < COOLDOWN_MS) return

    const timer = setTimeout(() => {
      openedAtRef.current = Date.now()
      setShouldShow(true)
      try {
        sessionStorage.setItem(SESSION_SHOWN_KEY, 'true')
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
      } catch { /* ignore */ }
    }, APPEAR_DELAY_MS)

    return () => clearTimeout(timer)
  }, [eligible])

  // Call on any close — Allow, Ask Later, or an auto-dismiss timeout.
  // Closes the banner immediately; only spends the lifetime budget if it
  // was genuinely visible for at least MIN_VISIBLE_MS.
  const dismiss = useCallback(() => {
    setShouldShow(false)

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

  return { shouldShow, dismiss }
}
