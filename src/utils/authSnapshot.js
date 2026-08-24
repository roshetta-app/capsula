/**
 * authSnapshot.js — remembers just enough of the signed-in person's info
 * (name, email, avatar) so AccountScreen.jsx can render instantly on
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
 */

import { CACHE_KEYS } from '../constants/cache'

/**
 * Read the remembered snapshot, or null if there isn't one / it's
 * corrupted. Shape: { id, email, fullName, avatarUrl }.
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
 * Save a snapshot of the signed-in person's display info. Called from
 * AuthContext.jsx right after a real profile load succeeds.
 * @param {{ id: string, email: string, fullName: string|null, avatarUrl: string|null }} snapshot
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
