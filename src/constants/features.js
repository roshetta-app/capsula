/**
 * src/constants/features.js
 * Phase 2K — Feature flags
 *
 * Central place for toggling features that are built but not yet active.
 * Change a flag here → takes effect everywhere without hunting call sites.
 *
 * OFFLINE_MODE: when true, full offline experience is unlocked (future paid tier).
 *   Currently false — infrastructure is built (SW caching, OfflineBanner, cached data),
 *   but the paywall gate is not yet shown. Flip to true when accounts exist.
 */

export const FEATURES = {
  /**
   * Full offline mode — premium feature (requires user accounts, deferred).
   * Infrastructure in place: service worker, OfflineBanner, localStorage cache.
   * UI gate: check this flag before showing "Offline mode — Premium feature" prompt.
   */
  OFFLINE_MODE: false,
}

/**
 * Phase 7 — Favouriting caps (free tier)
 *
 * Free accounts are capped separately per list (drugs and conditions each
 * get their own ceiling, not one shared number). Pro accounts are never
 * checked against these (see useIsPro.js).
 */
export const FAVOURITES_CAP_DRUGS = 10
export const FAVOURITES_CAP_CONDITIONS = 10

export const FAVOURITES_LIMIT_MESSAGE_DRUGS =
  "You've reached your free limit of 10 saved drugs — go Pro for unlimited favourites."
export const FAVOURITES_LIMIT_MESSAGE_CONDITIONS =
  "You've reached your free limit of 10 saved conditions — go Pro for unlimited favourites."

/**
 * notes-pro-image-and-char-cap
 *
 * Personal Notes character caps — not shared between tiers. 400 still
 * keeps a free note feeling like a quick jot, just with a bit more room
 * than the original Twitter-style 280; 2000 feels like a real upgrade
 * next to it. The photo attachment (Pro-only, see PersonalNotes.jsx)
 * does most of the convincing to go Pro — this number is a secondary
 * nudge. Pro accounts are never checked against the free cap (see
 * useIsPro.js), same pattern as the favourites caps above.
 */
export const NOTES_CHAR_CAP_FREE = 400
export const NOTES_CHAR_CAP_PRO = 2000

