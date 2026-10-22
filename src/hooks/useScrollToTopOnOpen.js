/**
 * src/hooks/useScrollToTopOnOpen.js
 * 2026-10-22 (UI refresh plan, step 8.13): the Browse pages (Categories, Browse by class, My
 * drug groups) always open at the top. The page scroll belongs to the whole window, so without
 * this a page opened from a screen that was scrolled far down would start at that same place.
 * Runs once when the page appears, before it is drawn, and once more on the next frame in case
 * the first measuring of the page moved it.
 */

import { useLayoutEffect } from 'react'

export default function useScrollToTopOnOpen() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(frame)
  }, [])
}
