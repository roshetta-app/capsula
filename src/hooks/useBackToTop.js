/**
 * src/hooks/useBackToTop.js
 * Extracted from ConditionsScreen.jsx so the back-to-top button's scroll
 * tracking + smooth-scroll animation can be shared with FavouritesScreen
 * (and any future screen) instead of being duplicated per screen.
 *
 * Phase: sticky-header-permanent-mount-fix
 * Generalized to target a scroll box instead of always assuming the whole
 * page scrolls. Conditions and Favourites now each own their own internal
 * scroll box (rather than the window scrolling) — pass that box's ref in
 * as `scrollRef` and this hook watches/scrolls it instead. Pass nothing
 * (or null) and it falls back to the window, exactly as before.
 *
 * Behavior is otherwise unchanged from the original:
 *  - 'visible' flips true once the scroll position passes the threshold
 *    (default 400px, matching the original BACK_TO_TOP_THRESHOLD).
 *  - scrollToTop() runs a fixed-duration (350ms) easeOutCubic animation via
 *    requestAnimationFrame — fast start, gentle landing — regardless of
 *    scroll distance, same as the original handleBackToTop.
 */
import { useState, useEffect } from 'react'

const DEFAULT_THRESHOLD = 400 // px scrolled before the button appears

function getScrollPosition(scrollRef) {
  return scrollRef?.current ? scrollRef.current.scrollTop : window.scrollY
}

function setScrollPosition(scrollRef, y) {
  if (scrollRef?.current) {
    scrollRef.current.scrollTop = y
  } else {
    window.scrollTo(0, y)
  }
}

export function useBackToTop(scrollRef = null, threshold = DEFAULT_THRESHOLD) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // The target may not exist yet on the very first render (ref attaches
    // after mount) — re-running this effect once scrollRef.current becomes
    // available isn't automatic since refs don't trigger re-renders, so we
    // attach to whatever's there now and also re-check on the element
    // itself if it shows up later via a microtask-free retry on next tick.
    const target = scrollRef?.current ?? window

    function onScroll() {
      setVisible(getScrollPosition(scrollRef) > threshold)
    }
    onScroll()
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [threshold, scrollRef?.current]) // eslint-disable-line react-hooks/exhaustive-deps

  function scrollToTop() {
    const start = getScrollPosition(scrollRef)
    if (start === 0) return

    const duration = 350 // ms — constant regardless of scroll distance
    const startTime = performance.now()

    // easeOutCubic — fast start, gentle landing
    const ease = t => 1 - Math.pow(1 - t, 3)

    function step(now) {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setScrollPosition(scrollRef, start * (1 - ease(progress)))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }

  return { visible, scrollToTop }
}
