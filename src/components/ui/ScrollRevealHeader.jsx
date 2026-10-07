/**
 * src/components/ui/ScrollRevealHeader.jsx
 * 2026-10-07
 *
 * The sliding header that drops in from the top once a screen's own header
 * card (the 'hero') has scrolled out of view, and slides back out when it
 * returns. One shell for the main screens, so the position, shadow, rounded
 * bottom corners and slide are defined once. Each screen passes its own row(s)
 * as children.
 *
 * Why this replaced the per-screen copies: each screen used to watch its hero
 * with an IntersectionObserver and keep 'is the header showing' in its own
 * state. Every flip redrew the whole screen (on Drugs that also re-filtered
 * and re-sorted the full results list) at the exact moment the slide began,
 * and the observer's report arrives late on phones while the page is still
 * gliding. Now the shell owns the decision: it checks the hero's position once
 * per frame while scrolling and moves itself directly, so nothing else on the
 * screen is redrawn and there is no waiting for a report.
 *
 * Shows when the hero's bottom edge has passed the top of the screen (same
 * switch point as before). Reads the hero's position from the screen, not the
 * scroll number, so it also works while a bottom sheet pins the page.
 *
 * Props:
 *   watchRef  ref of the hero element to watch (required).
 *   children  the header's rows.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const SHOW_MS = 250
const HIDE_MS = 180

export default function ScrollRevealHeader({ watchRef, children }) {
  const shellRef = useRef(null)
  const visibleRef = useRef(false)

  // Moves the header straight on the element (no React redraw). 'instant'
  // skips the slide, used for the very first check.
  const apply = useCallback((next, instant = false) => {
    const shell = shellRef.current
    if (!shell) return
    if (next === visibleRef.current && !instant) return
    visibleRef.current = next
    shell.style.transition = instant
      ? 'none'
      : `transform ${next ? SHOW_MS : HIDE_MS}ms ${next ? 'ease' : 'ease-out'}`
    shell.style.transform = next ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)'
    shell.style.pointerEvents = next ? 'auto' : 'none'
  }, [])

  // Before the first paint: hidden, so there is no flash.
  useLayoutEffect(() => { apply(false, true) }, [apply])

  useEffect(() => {
    let ticking = false
    let frame = 0

    function update(instant = false) {
      const el = watchRef.current
      // No hero on screen: leave things as they are.
      if (!el) return
      apply(el.getBoundingClientRect().bottom <= 1, instant)
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      frame = requestAnimationFrame(() => {
        ticking = false
        update()
      })
    }

    // The page may be restored part-way down: show at once, no slide.
    update(true)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    // The hero can change height or appear after the first paint (data
    // arriving, a view change); check again then, not only on scroll.
    let ro
    const el = watchRef.current
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update())
      ro.observe(el)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
      ro?.disconnect()
    }
  }, [watchRef, apply])

  return (
    <div
      ref={shellRef}
      aria-hidden="true"
      style={{
        position:                'fixed',
        top:                     0,
        left:                    0,
        right:                   0,
        zIndex:                  50,
        backgroundColor:         'var(--color-surface)',
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        willChange:              'transform',
      }}
    >
      {children}
    </div>
  )
}
