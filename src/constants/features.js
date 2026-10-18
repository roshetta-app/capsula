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
// 2026-10-08 — drug classes and families together share one free-tier cap.
export const FAVOURITES_CAP_CLASSES = 5

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

/**
 * 2026-10-18 (Drug groups plan, step 3.1) — Drug groups.
 *
 * DRUG_GROUPS_ENABLED is the one switch for everything about groups in the
 * app. It stays false until release (plan step 9.6), so group screens can
 * be built and pushed without users ever seeing them.
 *
 * Caps mirror the database rules (plan section 6.1): the database refuses
 * a 2nd group / 21st drug on a free account and a 101st group / 51st drug
 * on a Pro account. Keep these numbers in step with the database.
 */
export const DRUG_GROUPS_ENABLED = false
export const DRUG_GROUPS_CAP_FREE = 1
export const DRUG_GROUP_DRUGS_CAP_FREE = 20
export const DRUG_GROUPS_CAP_PRO = 100
export const DRUG_GROUP_DRUGS_CAP_PRO = 50

/**
 * 2026-10-18 (Drug groups plan, step 3.6) — test preview on one phone.
 *
 * The pushed code keeps DRUG_GROUPS_ENABLED false, so nobody sees groups. To
 * try the screens on your own phone, open the app address with ?groups=on
 * once (for example https://roshetta-app.github.io/capsula/?groups=on). That
 * is remembered on that phone only. ?groups=off turns it off again.
 * Remove this preview at release (plan step 9.6).
 */
const GROUPS_PREVIEW_KEY = 'capsula_groups_preview'
try {
  const flag = new URLSearchParams(window.location.search).get('groups')
  if (flag === 'on') localStorage.setItem(GROUPS_PREVIEW_KEY, '1')
  if (flag === 'off') localStorage.removeItem(GROUPS_PREVIEW_KEY)
} catch {
  // no window or storage: the preview stays off
}

export function isDrugGroupsOn() {
  if (DRUG_GROUPS_ENABLED) return true
  try {
    return localStorage.getItem(GROUPS_PREVIEW_KEY) === '1'
  } catch {
    return false
  }
}
