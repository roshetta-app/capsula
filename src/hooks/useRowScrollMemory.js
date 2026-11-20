/**
 * src/hooks/useRowScrollMemory.js
 * 2026-11-20: a sideways row of cards (Home My roshettas, Home My drug groups, the groups row on
 * the Drugs home) starts at its first card when the screen is opened fresh, and shows the same
 * cards the person had scrolled to when they come Back (rule in utils/scrollMemory.js).
 *
 * Use it as the row's ref: <div ref={useRowScrollMemory('row:home-roshettas')} ...>. Placeholder
 * rows get no ref, so only the real row is remembered. The place is put back once, the first
 * time the real row is drawn.
 */

import { useCallback, useRef } from 'react'
import { useNavigationType } from 'react-router-dom'
import { rememberScroll, recalledScroll, startPosition } from '../utils/scrollMemory'

export default function useRowScrollMemory(key) {
  const navType = useNavigationType()
  const startRef = useRef(null)
  if (startRef.current === null) startRef.current = startPosition(navType, recalledScroll(key))
  const detachRef = useRef(null)

  return useCallback(el => {
    if (detachRef.current) { detachRef.current(); detachRef.current = null }
    if (!el) return

    const target = startRef.current
    startRef.current = 0 // used once: a row drawn again later starts at its first card
    let live = target === 0
    if (target !== 0) el.scrollLeft = target
    const frame = target !== 0 ? requestAnimationFrame(() => { el.scrollLeft = target; live = true }) : 0

    function onScroll() {
      if (live) rememberScroll(key, el.scrollLeft)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    detachRef.current = () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', onScroll)
    }
  }, [key])
}
