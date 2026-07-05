/**
 * src/hooks/useBackToTop.js
 * Extracted from ConditionsScreen.jsx so the back-to-top button's scroll
 * tracking + smooth-scroll animation can be shared with FavouritesScreen
 * (and any future screen) instead of being duplicated per screen.
 *
 * Behavior is unchanged from the original ConditionsScreen implementation:
 *  - 'visible' flips true once window.scrollY passes the threshold (default
 *    400px, matching the original BACK_TO_TOP_THRESHOLD).
 *  - scrollToTop() runs a fixed-duration (350ms) easeOutCubic animation via
 *    requestAnimationFrame — fast start, gentle landing — regardless of
 *    scroll distance, same as the original handleBackToTop.
 */
import { useState, useEffect } from 'react'

const DEFAULT_THRESHOLD = 400 // px scrolled before the button appears

export function useBackToTop(threshold = DEFAULT_THRESHOLD) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  function scrollToTop() {
    const start = window.scrollY
    if (start === 0) return

    const duration = 350 // ms — constant regardless of scroll distance
    const startTime = performance.now()

    // easeOutCubic — fast start, gentle landing
    const ease = t => 1 - Math.pow(1 - t, 3)

    function step(now) {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      window.scrollTo(0, start * (1 - ease(progress)))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }

  return { visible, scrollToTop }
}
