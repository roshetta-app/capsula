import { useEffect } from 'react'

/**
 * useDarkMode — follows device system preference.
 *
 * - Reads window.matchMedia('(prefers-color-scheme: dark)') on mount
 * - Applies or removes the 'dark' class on <html>
 * - Listens for system changes and updates in real-time
 * - No manual toggle — follows device setting only (Phase 2A spec)
 * - Default: light mode
 */
export function useDarkMode() {
  useEffect(() => {
    const root = document.documentElement
    const mq   = window.matchMedia('(prefers-color-scheme: dark)')

    function apply(dark) {
      if (dark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // Apply immediately on mount
    apply(mq.matches)

    // Listen for system changes
    const handler = (e) => apply(e.matches)
    mq.addEventListener('change', handler)

    return () => mq.removeEventListener('change', handler)
  }, [])
}
