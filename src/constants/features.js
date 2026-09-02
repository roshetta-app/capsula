
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
