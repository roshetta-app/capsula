/**
 * useCmsSurface — src/hooks/useCmsSurface.js
 *
 * The public app locks text selection, copy and pinch-zoom (it should feel like
 * a native app). The CMS is a working tool: staff need to select and copy text
 * and zoom in. While the current page is under /admin this hook:
 *   - puts the `cms-surface` class on <html>, which globals.css uses to turn
 *     text selection and touch zoom back on, and
 *   - swaps the viewport meta tag for one that allows zooming.
 * Both are undone as soon as the user leaves /admin, so the public app keeps its
 * lock exactly as before. Used once, by AdminRoutes in router.jsx.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const CMS_VIEWPORT = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content'

export default function useCmsSurface() {
  const { pathname } = useLocation()
  const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  useEffect(() => {
    if (!onAdmin) return undefined
    const root = document.documentElement
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta?.getAttribute('content') ?? null

    root.classList.add('cms-surface')
    if (meta) meta.setAttribute('content', CMS_VIEWPORT)

    return () => {
      root.classList.remove('cms-surface')
      if (meta && original !== null) meta.setAttribute('content', original)
    }
  }, [onAdmin])
}
