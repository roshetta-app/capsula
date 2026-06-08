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
