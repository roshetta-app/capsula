/**
 * useIsPhone — src/hooks/useIsPhone.js
 *
 * True while the screen is 767px wide or narrower (the one phone breakpoint
 * used by the CMS, see CMS_RESPONSIVE_PLAN.md D1). For the few places that
 * must change structure on a phone (the admin top bar, for example), not just
 * size. Everything that only needs to change size or spacing is done in
 * src/styles/cms-responsive.css instead, so keep the number below in sync
 * with the media queries there.
 *
 * Reads the screen width straight away (no flash of the desktop layout on
 * first paint) and follows changes, such as turning the phone sideways.
 */
import { useEffect, useState } from 'react'

export const PHONE_MAX_WIDTH = 767
const QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`

function readNow() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(QUERY).matches
}

export default function useIsPhone() {
  const [isPhone, setIsPhone] = useState(readNow)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsPhone(mql.matches)
    onChange()
    // Older Safari only has addListener / removeListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])

  return isPhone
}
