import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from './ui/OfflineBanner'
import NotificationsBanner from './ui/NotificationsBanner'
import { useVisualViewport } from '../hooks/useVisualViewport'

/**
 * Routes that render their own top section and suppress the shared header.
 */
const HEADER_SUPPRESSED_ROUTES = ['/', '/conditions']

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const suppressHeader = HEADER_SUPPRESSED_ROUTES.includes(pathname)

  // Tracks visual viewport (shrinks when keyboard opens) and sets
  // --viewport-height on :root so the layout never scrolls behind the keyboard.
  useVisualViewport()

  return (
    <div style={{
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
            gap:        'var(--space-2)',
          }}>
            <div style={{
              width:           26,
              height:          26,
              borderRadius:    'var(--radius-full)',
              background:      'var(--color-accent)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <div style={{
                width:           9,
                height:          9,
                borderRadius:    'var(--radius-full)',
                backgroundColor: 'white',
                opacity:         0.9,
              }} />
            </div>
            <span style={{
              fontSize:      17,
              fontWeight:    600,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.3px',
            }}>
              Capsula
            </span>
          </div>
        </header>
      )}

      <NotificationsBanner />

      {/* --space-6 (24px) sides. Bottom pad accounts for BottomNav only —
          keyboard height is handled by --viewport-height on the outer div. */}
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
