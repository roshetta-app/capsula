/**
 * src/components/BottomNav.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 10 — Icon system overhaul: replaced custom FA SVG paths with Lucide
 *             icons (House, Pill, Star) consistent with the rest of the app.
 *             Active = filled (fill='currentColor'), inactive = stroke only.
 *             Favourites icon now follows active-tab state only — removed
 *             hasFavourites fill logic and gold label treatment.
 * Phase 15 — Inactive tab contrast improved: color switched from
 *             text-tertiary to text-secondary so inactive tabs are clearly
 *             readable without competing with the active accent tab.
 *             Inactive strokeWidth 1.8→2.0 for consistent perceived weight
 *             at rest. Label fontWeight 400→500 for inactive tabs.
 * Phase 16 — Hidden while an on-screen keyboard is open (mobile only).
 *             Detected via a real visual-viewport height shrink against a
 *             captured baseline, NOT focus — focus alone fires identically
 *             on desktop (mouse click into a field) where no keyboard ever
 *             appears and the nav should stay put. A keyboard eats a large,
 *             unmistakable chunk of height (150px+), so a shrink past that
 *             threshold is a reliable, platform-agnostic signal without any
 *             UA/mobile sniffing.
 *
 * Changes from previous version:
 *  - Tab 1: Conditions — House (Lucide)
 *  - Tab 2: Drugs      — Pill (Lucide)
 *  - Tab 3: Favourites — Star (Lucide)
 *  - Active tab: filled icon + brand color. Inactive: stroke only + muted.
 *  - Each tab takes exactly 1/3 width (flex:1 with equal flex-basis).
 *  - Safe-area bottom padding for iPhone notch.
 *  - Hidden on all /admin/* routes.
 *  - Hidden while an on-screen keyboard is open (see Phase 16 note above).
 */

import { useState, useEffect }      from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { House, Pill, Star }        from 'lucide-react'

// Minimum viewport height drop (px) to treat as "a keyboard opened" rather
// than a desktop window resize or other minor viewport fluctuation.
const KEYBOARD_HEIGHT_THRESHOLD = 150

// ─── BottomNav ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Tracks the visual viewport against a captured baseline height. A real
  // on-screen keyboard shrinks it by a large, unmistakable amount; clicking
  // into a field with a mouse (desktop) never shrinks it at all, so this
  // stays false there — no separate mobile/desktop detection needed.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let baseline = vv.height

    function update() {
      // Track the largest height seen (keyboard-closed state) as the
      // baseline, so this keeps working correctly even if the browser
      // chrome itself changes height between checks.
      if (vv.height > baseline) baseline = vv.height
      setKeyboardOpen(baseline - vv.height > KEYBOARD_HEIGHT_THRESHOLD)
    }

    update()
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  // Hidden on all admin routes
  if (location.pathname.startsWith('/admin')) return null

  // Hidden while an on-screen keyboard is open — instant, no animation.
  if (keyboardOpen) return null

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
    { path: '/conditions', label: 'Conditions', Icon: House },
    { path: '/drugs',      label: 'Drugs',      Icon: Pill  },
    { path: '/favourites', label: 'Favourites', Icon: Star  },
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
                // Active: accent. Inactive: text-secondary (was text-tertiary —
                // increased contrast so tabs are clearly readable at rest).
                color:                   active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                transition:              'color 0.15s ease',
                fontFamily:              'var(--font-body)',
                padding:                 '8px 0',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2.0}
                fill="none"
              />
              <span style={{
                fontSize:      10,
                fontWeight:    active ? 600 : 500,
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
