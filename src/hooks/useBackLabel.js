/**
 * useBackLabel — says where the on-screen Back arrow goes (UI refresh plan, step 6.4).
 *
 * <BackLabelTracker /> sits once above the routes and notes which page is at each
 * step of the browser history. useBackLabel() then looks one step behind the current
 * page and returns a short name for it ("Drugs", "Categories" ...), or null when
 * unknown (a shared link opened first), in which case the arrow just says "Back".
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { labelForPath } from '../utils/homePaths'

const pathsByStep = new Map()

function currentStep() {
  const idx = window.history.state && window.history.state.idx
  return typeof idx === 'number' ? idx : 0
}

export { labelForPath }

export function BackLabelTracker() {
  const location = useLocation()
  useEffect(() => {
    pathsByStep.set(currentStep(), location.pathname)
  }, [location])
  return null
}

export function useBackLabel() {
  useLocation() // draw again when the page changes
  const step = currentStep()
  return step > 0 ? labelForPath(pathsByStep.get(step - 1)) : null
}
