/**
 * src/hooks/useVisualViewport.js
 *
 * Tracks the visual viewport height and sets --viewport-height on :root.
 * This accounts for the on-screen keyboard shrinking the available space,
 * preventing content from scrolling into the dead zone behind the keyboard.
 *
 * Usage: call once at the top of the app (Layout) — no return value needed.
 */
import { useEffect } from 'react'

export function useVisualViewport() {
  useEffect(() => {
    function update() {
      const height = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--viewport-height', `${height}px`)
    }

    update()

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', update)
      vv.addEventListener('scroll', update)
    } else {
      window.addEventListener('resize', update)
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update)
        vv.removeEventListener('scroll', update)
      } else {
        window.removeEventListener('resize', update)
      }
    }
  }, [])
}
