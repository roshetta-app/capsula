/**
 * authSnapshot.js — remembers just enough of the signed-in person's info
 * (name, email, avatar, tier) so AccountScreen.jsx can render instantly on
 * reopen, instead of showing a blank screen while AuthContext re-checks
 * the real session.
 *
 * account-instant-load (2026-08-24): deliberately kept separate from
 * utils/cache.js's drugs/conditions/categories slices — those are
 * invalidated on a 7-day TTL plus a server version check, which doesn't
 * make sense for "who is signed in right now." This is invalidated by
 * identity instead: written after a real, successful profile load, and
 * wiped the moment AuthContext.jsx sees a sign-out or no session at all.
 * A snapshot for the wrong id should never be treated as usable data by
 * a caller — the `id` is stored specifically so a future version of
 * AccountScreen could compare it against the real signed-in user if
 * needed, though today's version trusts whatever is stored since only
 * one signed-in identity is expected on a given device in the common
 * case.
 *
 * `tier` added (Pro-offline-cold-start fix round 1, 2026-09-01) — this
 * snapshot was already exactly the right mechanism for a second problem:
 * AuthContext's existing "Pro-offline bug fix" only protects a profile
 * that's already loaded in memory during the current session from being
 * wiped out by a mid-session connectivity blip. It does nothing for a
 * genuine cold start while offline (app process killed, then relaunched
 * with no connection) — there, `profile` starts at null again, the
 * re-fetch to confirm tier fails because the device is offline, and
 * there's no in-memory "last known good" to fall back on, so a Pro
 * account gets treated as free until connectivity returns.
 *
 * Full profile (role/themePreference/phoneNumber/occupation/country/
 * specialty/profileSetupDismissed) added (round 2, same day) — round 1
 * fixed the offline gate itself but only cached tier, so every other
 * profile field still read as blank on a cold offline start: an
 * already-set-up person's occupation/country/specialty looked wiped, and
 * `profileSetupDismissed` reading as missing risked bouncing them back
 * into the setup wizard as if they'd never finished it. AuthContext now
 * also reads this snapshot BEFORE attempting the network re-fetch (not
 * only after it fails), since with no network at all that failure isn't
 * instant — waiting for it produced a correct-but-late fallback (the
 * offline block would show, then disappear several seconds later).
 *
 * Shape: { id, email, avatarUrl, role, tier, fullName, themePreference,
 * phoneNumber, occupation, country, specialty, profileSetupDismissed }.
 * Every field is whatever AuthContext's last successful profile load saw
 * — a snapshot, not a source of truth, always superseded the moment a
 * real check succeeds again.
 */

import { CACHE_KEYS } from '../constants/cache'

/**
 * Read the remembered snapshot, or null if there isn't one / it's
 * corrupted. See file header for the full shape.
 */
export function getCachedAuthSnapshot() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.AUTH_SNAPSHOT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.id) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Save a snapshot of the signed-in person's info. Called from
 * AuthContext.jsx right after a real profile load succeeds. See file
 * header for the full shape.
 */
export function writeCachedAuthSnapshot(snapshot) {
  if (!snapshot?.id) return
  try {
    localStorage.setItem(CACHE_KEYS.AUTH_SNAPSHOT, JSON.stringify(snapshot))
  } catch {
    // localStorage full or unavailable — fail silently, same convention
    // as the other cache functions in this app
  }
}

/**
 * Wipe the remembered snapshot. Called on sign-out, and whenever
 * AuthContext.jsx resolves to "no one is signed in" — so a stale
 * signed-in snapshot can never survive past an actual sign-out.
 */
export function clearCachedAuthSnapshot() {
  try {
    localStorage.removeItem(CACHE_KEYS.AUTH_SNAPSHOT)
  } catch {
    // fail silently
  }
}
