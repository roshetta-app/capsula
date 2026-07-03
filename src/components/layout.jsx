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
 *
 * Phase 19 — these routes are now fully self-managed, not just for the
 * header: ConditionDetailScreen sizes its own root to the exact remaining
 * viewport space, reserves its own BottomNav clearance internally, and
 * renders its own <BottomNav/>. Layout was still adding its normal
 * bottom-nav-clearance padding to <main> AND rendering a second <BottomNav/>
 * on top of that. Neither added visible height on its own — the duplicate
 * nav is position:fixed (no layout impact) — but the leftover main padding
 * sat below ConditionDetailScreen's already-viewport-filling root, making
 * the real document taller than the viewport. That's what let a drag past
 * the tab box's bottom edge become a genuine whole-page scroll (dragging
 * the sticky header off-screen with it) instead of stopping at the box's
 * own edge. Suppressing both here removes that extra height at the source.
 */
const HEADER_SUPPRESSED_PREFIXES = ['/conditions/']

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const suppressHeader = HEADER_SUPPRESSED_ROUTES.includes(pathname) ||
    HEADER_SUPPRESSED_PREFIXES.some(prefix => pathname.startsWith(prefix))

  return (
    <div style={{
      minHeight:       '100dvh',
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
          Phase 19: on condition-detail routes, ConditionDetailScreen already
          reserves its own BottomNav clearance internally (keyboard-aware),
          so this padding is dropped there entirely rather than stacking a
          second reservation on top of it. */}
      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  suppressHeader
          ? '0 var(--space-6)'
          : '0 var(--space-6) calc(var(--space-12) + 60px)',
      }}>
        {children}
      </main>

      {/* Phase 19: not rendered on condition-detail routes — those screens
          render their own <BottomNav/> already; mounting a second one here
          was harmless visually (fixed position, no layout impact) but dead
          duplication. */}
      {!suppressHeader && <BottomNav />}
    </div>
  )
}
