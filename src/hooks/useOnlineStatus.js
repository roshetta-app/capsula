/**
 * src/hooks/useOnlineStatus.js
 *
 * useOnlineStatus now reads from a shared OnlineStatusContext (see
 * src/context/OnlineStatusContext.jsx) instead of running its own separate
 * reachability check every time a component mounts. Every existing call
 * site (OfflineBanner.jsx, AppGate.jsx) keeps working completely
 * unchanged — this still returns the exact same { isOnline } shape, just
 * backed by one shared check for the whole app instead of a separate one
 * per component. See OnlineStatusContext.jsx's header for why this
 * changed (Pro-offline-lift bug).
 */
export { useOnlineStatus } from '../context/OnlineStatusContext'
