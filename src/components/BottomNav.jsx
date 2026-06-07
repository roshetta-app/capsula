import { useLocation, useNavigate } from 'react-router-dom'
import { useFavouritesContext } from '../context/FavouritesContext'

export default function BottomNav() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { favourites } = useFavouritesContext()

  if (location.pathname.startsWith('/admin')) return null

  const hasAnyFavourites =
    favourites.drugs.length + favourites.conditions.length > 0

  const activeTab = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Icon renderers — inline SVG avoids extra icon imports in this component
  // except for the Favourites tab which switches between bookmark variants
  const TABS = [
    {
      path: '/',
      label: 'Conditions',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      path: '/drugs',
      label: 'Drugs',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ),
    },
    {
      path: '/favourites',
      label: 'Favourites',
      // BookmarkCheck (filled) when any favourites exist, Bookmark (outline) when empty
      icon: (active) => hasAnyFavourites
        ? (
          // BookmarkCheck — filled bookmark with checkmark
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
            strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            <polyline points="9 11 12 14 15 9" stroke="white" strokeWidth="1.8" fill="none" />
          </svg>
        )
        : (
          // Bookmark — outline only
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        ),
    },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Inner row — centred and capped at 680px */}
      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        height: 60,
      }}>
        {TABS.map(tab => {
          const active = activeTab(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                transition: 'color 0.15s ease',
                fontFamily: 'var(--font-body)',
                padding: '8px 0',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
              }}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {tab.icon(active)}
              <span style={{
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                letterSpacing: '0.01em',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
