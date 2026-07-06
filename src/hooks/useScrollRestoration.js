/**
 * src/hooks/useScrollRestoration.js
 *
 * Takes over scroll position handling from the browser for a given screen.
 *
 * Why this exists: the browser's own automatic scroll restoration (on
 * returning to a page via back/forward, or a component remounting at the
 * same route) happens asynchronously, after mount — and it fires a real
 * 'scroll' event when it jumps the page, indistinguishable from a genuine
 * user scroll. Anything downstream that reacts to scroll position (e.g. a
 * sticky header that shouldn't animate on a restored position) ends up
 * racing that jump with no reliable way to tell it apart from real input.
 *
 * Fix: disable the browser's native restoration once, app-wide (see
 * main.jsx — `history.scrollRestoration = 'manual'`), and do the
 * remembering/restoring ourselves, synchronously, before paint. That
 * removes the race entirely — by the time anything else runs on mount,
 * the correct scroll position is already in place, not something that
 * jumps into place moments later.
 *
 * Usage:
 *   useScrollRestoration(`conditions:${activeSpecialty}`)
 *
 * `key` should change whenever the underlying list content changes shape
 * (e.g. a different filter is active) so a remembered position from a
 * different list isn't applied to the wrong one. Pass null/undefined to
 * skip restoration entirely (e.g. while content is still loading).
 */

import { useLayoutEffect, useRef } from 'react'

const STORAGE_PREFIX = 'capsula_scrollpos:'

export function useScrollRestoration(key) {
  const rafRef = useRef(null)

  useLayoutEffect(() => {
    if (!key) return

    const storageKey = STORAGE_PREFIX + key

    let savedY = 0
    try {
      savedY = Number(sessionStorage.getItem(storageKey)) || 0
    } catch {
      /* sessionStorage unavailable (e.g. private mode edge case) — fall
         back to top of page, same as a fresh visit. */
    }

    // Runs before the browser paints this mount, so there's no visible
    // jump and nothing downstream sees an intermediate "scrolled to top"
    // state.
    window.scrollTo(0, savedY)

    function handleScroll() {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        try {
          sessionStorage.setItem(storageKey, String(window.scrollY))
        } catch {
          /* sessionStorage unavailable — position just won't persist */
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [key])
}
