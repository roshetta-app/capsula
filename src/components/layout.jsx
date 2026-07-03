import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from './ui/OfflineBanner'
import NotificationsBanner from './ui/NotificationsBanner'

/**
 * Routes that render their own top section and suppress the shared header.
 */
const HEADER_SUPPRESSED_ROUTES = ['/', '/conditions']

/**
 * Route prefixes that render their own top section and suppress the shared
 * header. Condition detail screens (/conditions/:slug) render their own
 * DetailHeader (back/share/favourite + tab strip) — without this, Layout's
 * shared header rendered on top of it as a second header bar.
 */
const HEADER_SUPPRESSED_PREFIXES = ['/conditions/']

/**
 * Route prefixes whose screens size and scroll themselves internally.
 * ConditionDetailScreen measures its own height to exactly fill the
 * viewport and already reserves its own bottom-nav clearance inside its
 * internal scroll box. If Layout also adds its usual bottom-nav padding
 * on <main> for these routes, the real page becomes taller than the
 * viewport (permanently, not just briefly) — enough for a touch-drag to
 * scroll the whole document instead of just the screen's internal box,
 * dragging the screen's own sticky header along with it. Skip the padding
 * here so this screen's self-managed spacing is the only spacing that applies.
 */
const SELF_CONTAINED_SCROLL_PREFIXES = ['/conditions/']

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const suppressHeader = HEADER_SUPPRESSED_ROUTES.includes(pathname) ||
    HEADER_SUPPRESSED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  const suppressBottomPadding = SELF_CONTAINED_SCROLL_PREFIXES.some(prefix => pathname.startsWith(prefix))

  return (
    <div style={{
      // Live, JS-measured viewport height (see useVisualViewport, called
      // once in App.jsx) instead of the browser's own 100dvh estimate —
      // same fix as body in globals.css, for the same reason.
      minHeight:       'var(--viewport-height, 100dvh)',
      backgroundColor: 'var(--color-bg)',
      fontFamily:      'var(--font-body)',
      color:           'var(--color-text-primary)',
    }}>
      <OfflineBanner />

      {!suppressHeader && (
        <header style={{
          position:        'sticky',
          top:             0,
          zIndex:          50,
          backgroundColor: 'var(--color-surface)',
          borderBottom:    '1px solid var(--color-border)',
          padding:         'var(--space-3) var(--space-6)',
          display:         'flex',
          alignItems:      'center',
        }}>
          <div style={{
            width:      '100%',
            maxWidth:   680,
            margin:     '0 auto',
            display:    'flex',
            alignItems: 'center',
          }}>
            <img
              src="/capsula/logo.svg"
              alt="Capsula"
              className="capsula-logo"
              style={{ display: 'block', height: 22, width: 'auto' }}
            />
          </div>
        </header>
      )}

      <NotificationsBanner />

      {/* --space-6 (24px) sides. Bottom pad accounts for BottomNav only —
          keyboard resizing is handled natively via interactive-widget=resizes-content
          on the viewport meta tag, so no JS-computed height is needed here.
          Skipped on self-contained-scroll routes (see
          SELF_CONTAINED_SCROLL_PREFIXES above) — those screens already
          reserve their own bottom-nav clearance internally, and adding it
          again here would make the document taller than the viewport. */}
      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  suppressBottomPadding
          ? '0 var(--space-6) 0'
          : '0 var(--space-6) calc(var(--space-12) + 60px)',
      }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
