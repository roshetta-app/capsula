/**
 * src/components/BottomNav.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 10 — Icon system overhaul: replaced custom FA SVG paths with Lucide
 *             icons (House, Pill, Heart) consistent with the rest of the app.
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
 * Phase 17 — (Superseded by Phase 18, see below.) Forced onto its own
 *             compositing layer (transform: translateZ(0) + willChange:
 *             'transform') to isolate it from layer churn caused by
 *             ConditionDetailScreen's tab-switch transform animation.
 * Phase 18 — Phase 17's compositing isolation removed. Root-caused: the
 *             visible jump was never a layer/paint problem — it was
 *             ConditionDetailScreen forcing window.scrollTo() on every tab
 *             switch, which combined with a real document-height change to
 *             trigger the mobile browser's toolbar show/hide transition
 *             (this fixed nav is pinned to the visual viewport, exactly
 *             what that transition resizes). ConditionDetailScreen now
 *             scrolls its tab content in its own internal box instead of
 *             the window, so window.scrollY is never touched and there's
 *             nothing left for a compositing layer to isolate here.
 *             Keyboard detection also extracted to useKeyboardOpen() so
 *             ConditionDetailScreen can share the same signal.
 *
 * Changes from previous version:
 *  - Tab 1: Conditions — House (Lucide)
 *  - Tab 2: Drugs      — Pill (Lucide)
 *  - Tab 3: Favourites — Heart (Lucide), red identity when active
 *  - Active tab: filled icon + brand color. Inactive: stroke only + muted.
 *  - Each tab takes exactly 1/3 width (flex:1 with equal flex-basis).
 *  - Safe-area bottom padding for iPhone notch.
 *  - Hidden on all /admin/* routes.
 *  - Hidden while an on-screen keyboard is open (see Phase 16 note above).
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { House, Pill, Heart }        from 'lucide-react'
import { useKeyboardOpen }          from '../hooks/useKeyboardOpen'

// ─── BottomNav ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const keyboardOpen = useKeyboardOpen()

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
    // Favourites gets its own red identity color + fills when active,
    // matching the heart used elsewhere for favourited state (title badge,
    // condition-card row icon, detail-screen toggle) — Conditions/Drugs
    // keep the shared blue accent and stay outline-only.
    { path: '/favourites', label: 'Favourites', Icon: Heart, activeColor: 'var(--color-danger)', fillWhenActive: true },
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
        {TABS.map(({ path, label, Icon, activeColor, fillWhenActive }) => {
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
                // Active: accent (or a tab's own activeColor override).
                // Inactive: text-secondary (was text-tertiary — increased
                // contrast so tabs are clearly readable at rest).
                color:                   active ? (activeColor ?? 'var(--color-accent)') : 'var(--color-text-secondary)',
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
                fill={active && fillWhenActive ? 'currentColor' : 'none'}
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
