/**
 * src/components/ui/OfflineBanner.jsx
 * Phase 2K — PWA & Offline Infrastructure
 *
 * Slim yellow banner shown at top of screen when isOnline === false.
 * Dismissible via X button.
 * Remounts (re-shows) each time the user goes offline again.
 *
 * Usage — already mounted once in layout.jsx:
 *   import OfflineBanner from './ui/OfflineBanner'
 *   ...
 *   <OfflineBanner />
 */

import { useState, useEffect } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const { isOnline }      = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)

  // Re-show banner whenever the user goes offline again
  useEffect(() => {
    if (!isOnline) setDismissed(false)
  }, [isOnline])

  // Nothing to render when online or dismissed
  if (isOnline || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:        'sticky',
        top:             0,
        zIndex:          60,           // above the sticky header (zIndex 50)
        backgroundColor: '#FEF3C7',   // warning-light
        borderBottom:    '1px solid #FDE68A',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '7px 16px',
        gap:             8,
      }}
    >
      {/* Warning icon + message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg
          width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="#D97706" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>

        <span style={{
          fontSize:   13,
          fontWeight: 500,
          color:      '#92400E',
          lineHeight: 1.3,
        }}>
          You are offline. Showing cached data.
        </span>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline banner"
        style={{
          background:              'none',
          border:                  'none',
          cursor:                  'pointer',
          color:                   '#92400E',
          padding:                 4,
          display:                 'flex',
          alignItems:              'center',
          WebkitTapHighlightColor: 'transparent',
          flexShrink:              0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
