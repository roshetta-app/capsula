/**
 * useBackLabel — says where the on-screen Back arrow goes (UI refresh plan, step 6.4).
 *
 * <BackLabelTracker /> sits once above the routes and notes which page is at each
 * step of the browser history. useBackLabel() then looks one step behind the current
 * page and returns a short name for it ("Drugs", "Categories" ...), or null when
 * unknown it falls back to the rulebook's parent name (step 12.8), and gives null ("Back")
 * only for a page with nothing behind it, such as a shared link opened first.
 */
import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { labelForPath } from '../utils/homePaths'
import { backLabelFor } from '../utils/backLabel'
import { titleFor } from '../utils/screenTitle'
import { focusPageHeading } from '../utils/focusPageHeading'
import { arrivalRecord } from './useDeepLinkParent'

const pathsByStep = new Map()

function currentStep() {
  const idx = window.history.state && window.history.state.idx
  return typeof idx === 'number' ? idx : 0
}

export { labelForPath }

export function BackLabelTracker() {
  const location = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    pathsByStep.set(currentStep(), location.pathname)
    // Step 12.3: the arrival record learns every place the router shows. This sits above the
    // routes, so its effect runs before any screen's own effect.
    arrivalRecord.note(location.key)
    // Step 12.11: every screen gets its own title (a page about one item then sets its own name
    // with useScreenTitle), and a screen opened forward hands focus to its heading so a screen
    // reader announces it. Back and refresh do not move focus.
    document.title = titleFor(location.pathname)
    if (navigationType === 'PUSH') return focusPageHeading()
  }, [location]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function useBackLabel() {
  const location = useLocation() // draw again when the page changes
  const step = currentStep()
  // Step 12.8: when the earlier page is unknown the name of this page's parent is used.
  return backLabelFor({ step, prevPath: pathsByStep.get(step - 1), pathname: location.pathname })
}
