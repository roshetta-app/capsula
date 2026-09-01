/**
 * src/hooks/useOnlineStatus.js
 *
 * useOnlineStatus now reads from a shared OnlineStatusContext (see
 * src/context/OnlineStatusContext.jsx) instead of running its own separate
 * reachability check every time a component mounts. Every existing call
 * site (OfflineStatusToast.jsx, AppGate.jsx) keeps working completely
 * unchanged — this still returns { isOnline }, plus hasNetworkInterface
 * (2026-09-01, see OnlineStatusContext.jsx's header) for consumers that
 * need to tell a hard "no network at all" state apart from a technically-
 * connected-but-unreachable one — just backed by one shared check for the
 * whole app instead of a separate one per component.
 */
export { useOnlineStatus } from '../context/OnlineStatusContext'
