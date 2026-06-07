import BottomNav from './BottomNav'

/**
 * Layout — public app shell.
 *
 * On mobile  : full-width, BottomNav fixed at bottom edge.
 * On desktop : centred 680px column with a visible boundary so the app
 *              doesn't look stretched. BottomNav stays inside the column.
 *
 * The column approach means:
 *   - Header content aligns to the same 680px column as page content.
 *   - BottomNav sits at the bottom of the column, not wall-to-wall.
 *   - No layout breakage on ultrawide monitors.
 */

const MAX_W = 680

export default function Layout({ children }) {
  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg-outer)',  // slightly darker outside the column
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
    }}>
      {/* ── Centred column ── */}
      <div style={{
        maxWidth: MAX_W,
        margin: '0 auto',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        position: 'relative',
        // Subtle side borders so the column is visible on wide screens
        boxShadow: '0 0 0 1px var(--color-border)',
      }}>

        {/* Sticky top header — constrained inside the column */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-3) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Logo dot */}
            <div style={{
              width: 26,
              height: 26,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: 9,
                height: 9,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'white',
                opacity: 0.9,
              }} />
            </div>
            <span style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.3px',
            }}>
              Capsula
            </span>
          </div>
        </header>

        {/* Main content — bottom pad for BottomNav */}
        <main style={{
          padding: '0 var(--space-4) calc(var(--space-12) + 60px)',
        }}>
          {children}
        </main>

        {/* BottomNav lives inside the column */}
        <BottomNav />
      </div>
    </div>
  )
}
