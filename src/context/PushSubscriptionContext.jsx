/**
 * PushSubscriptionContext — makes usePushSubscription state available
 * app-wide. Wrap once at the root; consume with usePushSubscriptionContext()
 * anywhere. Same shape as FavouritesContext.
 *
 * Added 2026-08-11 (notif-sync-and-race-fix) so the notifications banner
 * and the bell sheet read one shared, live status instead of each mounting
 * their own separate usePushSubscription() instance — previously two
 * instances could each run their own subscribe/unsubscribe and re-verify
 * independently, so one could show stale info relative to the other.
 */

import { createContext, useContext } from 'react'
import { usePushSubscription } from '../hooks/usePushSubscription'

const PushSubscriptionCtx = createContext(null)

export function PushSubscriptionProvider({ children }) {
  const value = usePushSubscription()
  return <PushSubscriptionCtx.Provider value={value}>{children}</PushSubscriptionCtx.Provider>
}

export function usePushSubscriptionContext() {
  const ctx = useContext(PushSubscriptionCtx)
  if (!ctx) throw new Error('usePushSubscriptionContext must be used inside <PushSubscriptionProvider>')
  return ctx
}
