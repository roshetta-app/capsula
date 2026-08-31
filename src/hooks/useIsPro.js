/**
 * src/hooks/useIsPro.js
 * Plan: CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md, §4.8 / §Phase 3
 *
 * The one shared "is this person Pro right now" check. Every gated
 * feature (offline access first, then Phase 7's favourite caps, and any
 * future Pro perk) calls this instead of reading tier itself — one place,
 * reused, rather than a separate copy of the same check per feature.
 *
 * Reads the account tier already loaded by AuthContext — no new data, no
 * new network call, no new loading state.
 *
 * §4.6: the real database value is 'paid', not 'pro' — "Pro" is only the
 * product-facing name shown to people.
 *
 * A signed-out guest's `profile` is already `null` (see AuthContext.jsx's
 * loadProfile), so this returns `false` for guests with no extra handling
 * needed — a guest can never be Pro, by definition.
 *
 * @returns {boolean}
 */

import { useAuth } from './useAuth'

export function useIsPro() {
  const { profile } = useAuth()
  return profile?.tier === 'paid'
}
