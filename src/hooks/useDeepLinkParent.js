/**
 * useDeepLinkParent — puts the screens behind a page that was opened from outside
 * (a link, a notification on the website, a reopened installed app, a refresh).
 *
 * Step 12.3 (Roshetta plan, Phase K): it takes no argument any more. The screens that belong
 * behind a page (Home, then its parent) come from the navigation rulebook (utils/navRules.js),
 * and when to add them comes from the arrival record (utils/arrivalRecord.js): only when this page
 * is the place the app started on, nothing has been navigated since, and the history has no earlier
 * step. A page opened from inside the app never gets anything added, so there is no second copy
 * of its parent behind it.
 *
 * Usage — call once, near the top of a page that has a parent:
 *
 *   useDeepLinkParent()
 *
 * The replace and the pushes happen inside one effect tick, so React batches them into a single
 * render — the screens laid behind the page never paint.
 */

import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createArrivalRecord, planArrival } from '../utils/arrivalRecord'

// One record for the whole app session. useBackLabel's tracker feeds it every location.
export const arrivalRecord = createArrivalRecord()

export function useDeepLinkParent() {
  const navigate = useNavigate()
  const location = useLocation()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const steps = planArrival({
      isArrival: arrivalRecord.isArrival(location.key),
      historyState: window.history.state,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    })
    for (const step of steps) {
      if (step.replace !== undefined) navigate(step.replace, { replace: true })
      else navigate(step.push, { state: location.state })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
