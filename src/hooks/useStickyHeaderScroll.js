/**
 * src/hooks/useStickyHeaderScroll.js
 *
 * Shared logic behind the sliding sticky headers on ConditionsScreen and
 * FavouritesScreen. Previously each screen carried its own near-identical
 * copy of this; folded into one hook so both screens behave identically
 * and can't drift out of sync.
 *
 * What it does:
 *  - Remembers how far down each screen was scrolled, keyed by a
 *    `screenKey` the caller provides (e.g. 'conditions', 'favourites').
 *    The memory lives only in memory for as long as the app stays open —
 *    a full close/reopen starts everything fresh at the top again.
 *  - The moment a screen mounts, restores its own remembered scroll
 *    position before anything is painted, and sets the sticky header's
 *    starting state to match. This is what stops one screen's leftover
 *    scroll spot from leaking into a different screen when switching
 *    tabs, and what stops the header from replaying its slide-down
 *    animation when you return to a screen you'd already scrolled down.
 *  - After that, only real, user-driven scrolling (watched via an
 *    IntersectionObserver on the element you pass back the ref for) is
 *    ever allowed to change whether the header shows.
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react'

// One shared, in-memory record of each screen's own scroll position.
// Deliberately not sessionStorage/localStorage — this is meant to reset
// to fresh/top on a full app close-and-reopen, not persist across it.
const scrollMemory = {}

export function useStickyHeaderScroll(screenKey) {
  const elementRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [readyToAnimate, setReadyToAnimate] = useState(false)

  // Restore this screen's own remembered scroll position, then set the
  // sticky header's correct starting state to match — both before the
  // browser paints. Without the restore, a screen just reads whatever
  // scroll position is currently sitting on the window (which may belong
  // to whichever screen was visited previously) instead of its own.
  useLayoutEffect(() => {
    const rememberedY = scrollMemory[screenKey] ?? 0
    window.scrollTo(0, rememberedY)

    const el = elementRef.current
    if (el) {
      setVisible(el.getBoundingClientRect().bottom <= 0)
    }
  }, [screenKey])

  // Suppresses the slide transition for a brief window right after mount —
  // two animation frames is the standard "let layout/paint settle" grace
  // period. Any correction to `visible` inside that window (e.g. the
  // restore above) snaps into place instead of animating. Only real,
  // user-driven scrolling after that point should ever animate the header.
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
  // changes — the only trigger that flips the header after the initial
  // restore above.
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

  // Saves this screen's own scroll position the moment it's left, so
  // returning to it later restores exactly this spot. Scoped to
  // `screenKey`, so this never touches any other screen's remembered spot.
  useEffect(() => {
    return () => {
      scrollMemory[screenKey] = window.scrollY
    }
  }, [screenKey])

  return { elementRef, visible, readyToAnimate }
}
