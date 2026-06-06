import BottomNav from './BottomNav'

export default function Layout({ children }) {
  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
    }}>
      {/* Sticky top header */}
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

      {/* Main content — extra bottom padding for BottomNav (60px) + safe area */}
      <main style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '0 var(--space-4) calc(var(--space-12) + 60px)',
      }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
