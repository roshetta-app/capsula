/**
 * src/hooks/useTabScrollMemory.js
 * 2026-11-21 (step 12.10, assumption K-c): a main tab screen (Topics, Drugs, Favourites) comes
 * back where the person left it when they tap its tab, and (when `restoreOnBack` is on) when they
 * go Back to it. A tap on the tab you are already on still goes to the top (the bottom bar does
 * that). Rule in utils/scrollMemory.js; same shape as useListScrollMemory.
 *
 * The bottom bar marks a tab tap with `state.tabReturn`. A screen opened any other way is left
 * exactly as it was before. `ready` is false while the page still shows placeholders: the place
 * is put back once the real content is drawn, and nothing is kept until then.
 */

import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { rememberScroll, recalledScroll, tabScrollKey, startForTab } from '../utils/scrollMemory'

export default function useTabScrollMemory(name, ready = true, restoreOnBack = true) {
  const navType = useNavigationType()
  const location = useLocation()
  const key = tabScrollKey(name)
  const startRef = useRef(undefined)
  if (startRef.current === undefined) {
    startRef.current = startForTab(navType, location.state?.tabReturn === true, recalledScroll(key), restoreOnBack)
  }
  // Nothing to put back: the screen is settled from the start.
  const settledRef = useRef(startRef.current === null)

  // Put the place back (or the top) as soon as the real content is drawn.
  useLayoutEffect(() => {
    if (!ready || settledRef.current) return undefined
    const y = startRef.current
    window.scrollTo(0, y)
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, y)
      settledRef.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [ready])

  // Keep the place while the person scrolls; removed before the next screen scrolls itself.
  useLayoutEffect(() => {
    function onScroll() {
      if (settledRef.current) rememberScroll(key, window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [key])
}
