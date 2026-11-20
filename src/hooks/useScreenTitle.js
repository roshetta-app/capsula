/**
 * useScreenTitle — gives a page about one item its own title (Roshetta plan, Phase K, step 12.11).
 *
 * <BackLabelTracker /> already sets every screen's title from the rulebook on each page change.
 * A page about one item calls useScreenTitle(name) once the name is known, so the title becomes
 * "Panadol | Capsula" instead of "Drug | Capsula". Call it with nothing (or an empty name) to
 * keep the rulebook title.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { titleFor } from '../utils/screenTitle'

export function useScreenTitle(name) {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = titleFor(pathname, name)
  }, [pathname, name])
}
