/**
 * src/hooks/useStickyHeaderScroll.js
 *
 * Shared logic behind the sliding sticky headers on ConditionsScreen and
 * FavouritesScreen. Folded into one hook so both screens behave identically
 * and can't drift out of sync.
 *
 * Phase: sticky-header-permanent-mount-fix
 * The scroll-position "remember and restore" logic that used to live here
 * has been removed. It existed to fake continuity across a full
 * unmount/remount of the screen — now that Conditions/Drugs/Favourites stay
 * permanently mounted and are only shown/hidden, React's own state already
 * preserves everything needed, and the manual memory was a second source of
 * truth that could fight with real scroll position. The `screenKey` param
 * that keyed that memory is gone too, since there's nothing left to key.
 *
 * What it still does:
 *  - Watches the tracked element (brand row / hero) for real scroll-driven
 *    changes via IntersectionObserver — the only trigger that flips the
 *    sticky header's visibility.
 *  - Suppresses the slide transition for a brief window right after mount
 *    (two animation frames), so the very first paint never animates.
 */

import { useState, useRef, useEffect } from 'react'

export function useStickyHeaderScroll() {
  const elementRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [readyToAnimate, setReadyToAnimate] = useState(false)

  // Suppresses the slide transition for a brief window right after mount —
  // two animation frames is the standard "let layout/paint settle" grace
  // period. Only real, user-driven scrolling after that point should ever
  // animate the header.
  useEffect(() => {
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReadyToAnimate(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [])

  // Watches the tracked element (brand row / hero) for real scroll-driven
  // changes — the only trigger that flips the header's visibility.
  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { elementRef, visible, readyToAnimate }
}
