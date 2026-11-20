/**
 * src/hooks/useListScrollMemory.js
 * 2026-11-20: a list page (My roshettas, My drug groups, Categories, Browse by class) opens at the
 * top when it is opened fresh, and comes back to the place the person left when they go Back
 * to it (rule in utils/scrollMemory.js). The page scroll belongs to the whole window.
 *
 * `ready` is false while the page is still showing placeholders: the place is put back only
 * once the real list is drawn (a short page could not scroll that far), and nothing is kept
 * until then, so the placeholders never overwrite a good place.
 */

import { useLayoutEffect, useRef } from 'react'
import { useNavigationType } from 'react-router-dom'
import { rememberScroll, recalledScroll, startPosition } from '../utils/scrollMemory'

export default function useListScrollMemory(key, ready = true) {
  const navType = useNavigationType()
  const startRef = useRef(null)
  if (startRef.current === null) startRef.current = startPosition(navType, recalledScroll(key))
  const settledRef = useRef(false)

  // Opened fresh: top, before the page is drawn (and once more next frame, as the other pages do).
  useLayoutEffect(() => {
    if (startRef.current !== 0) return undefined
    window.scrollTo(0, 0)
    settledRef.current = true
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Back: put the place back as soon as the real list is drawn.
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

  // Keep the place while the person scrolls. Added and removed in the layout step so it is
  // gone before the next page scrolls itself to the top.
  useLayoutEffect(() => {
    function onScroll() {
      if (settledRef.current) rememberScroll(key, window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [key])
}
