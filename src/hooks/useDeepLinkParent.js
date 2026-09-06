/**
 * useDeepLinkParent — "fake parent screen" helper for detail screens
 * reached via a notification tap or an external/shared link.
 *
 * Confirmed baseline this fixes: a shared link or notification tap can
 * land someone directly on a detail screen with no real screen behind it
 * in history — a plain navigate, no synthetic parent pushed first — so
 * back exits immediately instead of going somewhere sensible.
 *
 * Usage — call once, near the top of a detail screen component, with the
 * path its list should return to on back:
 *
 *   useDeepLinkParent('/conditions')
 *
 * How it decides whether to act: a module-level flag tracks whether any
 * screen has already rendered in this app session. If this detail screen
 * is the very first thing to mount — exactly what happens when a shared
 * link is opened directly, or a notification tap lands here with nothing
 * else visited first — this pushes a synthetic history entry for
 * `parentPath`, then restores the current detail URL on top of it, so
 * back always has somewhere real to land. If some other screen already
 * rendered first this session (a normal in-app visit — e.g. tapping into
 * this item from its list), this does nothing at all: back already has
 * the right thing behind it.
 *
 * The replace-then-push happens inside one effect tick, so React batches
 * both location updates into a single render — the list screen this
 * briefly "visits" in history never actually paints.
 */

import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

let hasMountedAnyScreen = false

export function useDeepLinkParent(parentPath) {
  const navigate = useNavigate()
  const location = useLocation()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    if (!hasMountedAnyScreen) {
      const detailPath = location.pathname + location.search
      navigate(parentPath, { replace: true })
      navigate(detailPath, { replace: false })
    }

    hasMountedAnyScreen = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
