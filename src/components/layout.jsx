import { useLocation } from 'react-router-dom'

/**
 * Route prefixes that render their own top section and suppress the shared
 * header. Condition detail screens (/conditions/:slug) render their own
 * DetailHeader (back/share/favourite + tab strip) — without this, Layout's
 * shared header rendered on top of it as a second header bar.
 *
 * Note: the Conditions/Drugs/Favourites tabs used to be suppressed here too
 * via a pathname array, but router.jsx now renders those three permanently
 * mounted side-by-side inside one shared Layout instance, so pathname alone
 * can't tell Layout which tab is "active" for header purposes. router.jsx
 * passes that down explicitly via the `suppressHeader` prop instead. Detail
 * routes still mount/unmount normally through <Routes> (each wrapping its
 * own Layout instance), so pathname-based suppression still works fine for
 * them and is kept as-is.
 */
const HEADER_SUPPRESSED_PREFIXES = ['/conditions/']

export default function Layout({ children, suppressHeader: suppressHeaderProp = false }) {
  const { pathname } = useLocation()
  const suppressHeader = suppressHeaderProp ||
    HEADER_SUPPRESSED_PREFIXES.some(prefix => pathname.startsWith(prefix))

  return (
    <div style={{
      // Fixed, JS-measured viewport height (see useVisualViewport, called
      // once in App.jsx) instead of a percentage or minHeight — this div is
      // now the flex column parent that <main> fills via flex:1, so it needs
      // a bounded height, not just a floor.
      display:         'flex',
      flexDirection:   'column',
      height:          'var(--viewport-height, 100dvh)',
      backgroundColor: 'var(--color-bg)',
      fontFamily:      'var(--font-body)',
      color:           'var(--color-text-primary)',
    }}>
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

      {/* No more bottom-nav padding calc — every screen rendered inside
          here now owns its own internal scroll box (same pattern as
          ConditionDetailScreen) and reserves its own bottom-nav clearance
          internally. flex:1 + minHeight:0 + overflow:hidden lets whichever
          screen sits inside fill this box and own its own scrolling, rather
          than this <main> scrolling the whole document. position:relative
          gives absolutely-positioned hidden panes (used by router.jsx to
          keep inactive tabs mounted-but-hidden) a containing block. */}
      <main style={{
        display:       'flex',
        flexDirection: 'column',
        flex:          1,
        minHeight:     0,
        overflow:      'hidden',
        position:      'relative',
        maxWidth:      680,
        width:         '100%',
        margin:        '0 auto',
        padding:       '0 var(--space-6)',
      }}>
        {children}
      </main>
    </div>
  )
}
