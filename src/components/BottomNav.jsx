/**
 * src/components/BottomNav.jsx
 * Phase 2B — Navigation & Routing Overhaul
 *
 * Changes from previous version:
 *  - Tab 1: Conditions — fa-house icon (SVG house path)
 *  - Tab 2: Drugs      — fa-capsules icon (SVG capsule path)
 *  - Tab 3: Favourites — star icon (filled gold = any favourites saved, outline = empty)
 *    The old bookmark icon is fully replaced by the star per locked decision.
 *  - Active tab: primary brand color (#1E40AF) + label. Inactive: ink-muted.
 *  - Each tab takes exactly 1/3 width (flex:1 with equal flex-basis).
 *  - Safe-area bottom padding for iPhone notch.
 *  - Hidden on all /admin/* routes.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { useFavouritesContext } from '../context/FavouritesContext'

// ─── Icon helpers (inline SVG — no extra icon lib required) ───────────────────

/** House icon — mirrors FontAwesome fa-house */
function IconHouse({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 576 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path opacity={active ? 1 : 0.7}
        d="M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"
      />
    </svg>
  )
}

/** Capsule icon — mirrors FontAwesome fa-capsules */
function IconCapsule({ active }) {
  return (
    <svg width="24" height="22" viewBox="0 0 640 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path opacity={active ? 1 : 0.7}
        d="M400 32H240C142.1 32 64 110.1 64 208s78.1 176 176 176h160c97.9 0 176-78.1 176-176S497.9 32 400 32zm-160 96h160c44.1 0 80 35.9 80 80s-35.9 80-80 80H240c-44.1 0-80-35.9-80-80s35.9-80 80-80zm0 128h160V128H240v128z"
      />
    </svg>
  )
}

/** Star icon — filled when any favourites saved, outline when empty */
function IconStar({ active, hasFavourites }) {
  if (hasFavourites) {
    // Filled star
    return (
      <svg width="22" height="22" viewBox="0 0 576 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path opacity={active ? 1 : 0.7}
          d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"
        />
      </svg>
    )
  }
  // Outline star
  return (
    <svg width="22" height="22" viewBox="0 0 576 512" fill="none" stroke="currentColor"
      strokeWidth={active ? 32 : 26} strokeLinecap="round" strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg">
      <path opacity={active ? 1 : 0.7}
        d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"
      />
    </svg>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { favourites } = useFavouritesContext()

  // Hidden on all admin routes
  if (location.pathname.startsWith('/admin')) return null

  const hasFavourites =
    favourites.drugs.length + favourites.conditions.length > 0

  // Active detection:
  //   /conditions and / both activate the Conditions tab
  //   /drugs activates Drugs tab (but NOT /drugs/:slug — still Drugs tab)
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
      renderIcon: (active) => <IconHouse active={active} />,
    },
    {
      path:  '/drugs',
      label: 'Drugs',
      renderIcon: (active) => <IconCapsule active={active} />,
    },
    {
      path:  '/favourites',
      label: 'Favourites',
      renderIcon: (active) => <IconStar active={active} hasFavourites={hasFavourites} />,
    },
  ]

  return (
    <nav style={{
      position:           'fixed',
      bottom:             0,
      left:               0,
      right:              0,
      zIndex:             100,
      backgroundColor:    'var(--color-surface)',
      borderTop:          '1px solid var(--color-border)',
      paddingBottom:      'env(safe-area-inset-bottom)',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Inner row — centred, capped at 680px, equal 1/3 columns */}
      <div style={{
        maxWidth:       680,
        margin:         '0 auto',
        display:        'flex',
        alignItems:     'stretch',
        height:         60,
      }}>
        {TABS.map(tab => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex:           '1 1 0',        // equal 1/3 width
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            3,
                border:         'none',
                background:     'none',
                cursor:         'pointer',
                // Active: brand primary. Inactive: ink-muted (#6B7280)
                color:          active ? '#1E40AF' : '#6B7280',
                transition:     'color 0.15s ease',
                fontFamily:     'var(--font-body)',
                padding:        '8px 0',
                WebkitTapHighlightColor: 'transparent',
                outline:        'none',
              }}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {tab.renderIcon(active)}
              <span style={{
                fontSize:      10,
                fontWeight:    active ? 600 : 400,
                letterSpacing: '0.01em',
                // Star tab: gold label when tab is active AND favourites saved
                color: (tab.path === '/favourites' && hasFavourites && active)
                  ? '#D97706'
                  : undefined,
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
