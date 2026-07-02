import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from './ui/OfflineBanner'
import NotificationsBanner from './ui/NotificationsBanner'

/**
 * Routes that render their own top section and suppress the shared header.
 */
const HEADER_SUPPRESSED_ROUTES = ['/', '/conditions']

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const suppressHeader = HEADER_SUPPRESSED_ROUTES.includes(pathname)

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
          on the viewport meta tag, so no JS-computed height is needed here. */}
      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  '0 var(--space-6) calc(var(--space-12) + 60px)',
      }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
