/**
 * src/components/BottomNav.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 10 — Icon system overhaul: replaced custom FA SVG paths with Lucide
 *             icons (House, Pill, Star) consistent with the rest of the app.
 *             Active = filled (fill='currentColor'), inactive = stroke only.
 *             Favourites icon now follows active-tab state only — removed
 *             hasFavourites fill logic and gold label treatment.
 *
 * Changes from previous version:
 *  - Tab 1: Conditions — House (Lucide)
 *  - Tab 2: Drugs      — Pill (Lucide)
 *  - Tab 3: Favourites — Star (Lucide)
 *  - Active tab: filled icon + brand color. Inactive: stroke only + muted.
 *  - Each tab takes exactly 1/3 width (flex:1 with equal flex-basis).
 *  - Safe-area bottom padding for iPhone notch.
 *  - Hidden on all /admin/* routes.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { House, Pill, Star }        from 'lucide-react'

// ─── BottomNav ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  // Hidden on all admin routes
  if (location.pathname.startsWith('/admin')) return null

  // Active detection:
  //   /conditions and / both activate the Conditions tab
  //   /drugs activates Drugs tab (and /drugs/:slug)
  //   /favourites activates Favourites tab
  function isActive(tabPath) {
    if (tabPath === '/conditions') {
      return location.pathname === '/' ||
             location.pathname === '/conditions' ||
             location.pathname.startsWith('/conditions/')
    }
    return location.pathname === tabPath ||
           location.pathname.startsWith(tabPath + '/')
  }

  const TABS = [
    {
      path:  '/conditions',
      label: 'Conditions',
      Icon:  House,
    },
    {
      path:  '/drugs',
      label: 'Drugs',
      Icon:  Pill,
    },
    {
      path:  '/favourites',
      label: 'Favourites',
      Icon:  Star,
    },
  ]

  return (
    <nav style={{
      position:                'fixed',
      bottom:                  0,
      left:                    0,
      right:                   0,
      zIndex:                  100,
      backgroundColor:         'var(--color-surface)',
      borderTop:               '1px solid var(--color-border)',
      paddingBottom:           'env(safe-area-inset-bottom)',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Inner row — centred, capped at 680px, equal 1/3 columns */}
      <div style={{
        maxWidth:   680,
        margin:     '0 auto',
        display:    'flex',
        alignItems: 'stretch',
        height:     60,
      }}>
        {TABS.map(({ path, label, Icon }) => {
          const active = isActive(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex:                    '1 1 0',
                display:                 'flex',
                flexDirection:           'column',
                alignItems:              'center',
                justifyContent:          'center',
                gap:                     3,
                border:                  'none',
                background:              'none',
                cursor:                  'pointer',
                color:                   active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                transition:              'color 0.15s ease',
                fontFamily:              'var(--font-body)',
                padding:                 '8px 0',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                fill="none"
              />
              <span style={{
                fontSize:      10,
                fontWeight:    active ? 600 : 400,
                letterSpacing: '0.01em',
              }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
