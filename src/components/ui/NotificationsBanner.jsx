/**
 * src/components/ui/NotificationsBanner.jsx
 * Phase 3K — Push Notifications prompt banner
 *
 * Shown once to users who haven't subscribed yet.
 * Dismissed permanently via localStorage key: capsula_notif_dismissed
 * Disappears automatically after subscribing.
 *
 * Usage — mounted once in layout.jsx below OfflineBanner.
 */

import { useState, useEffect } from 'react'
import { usePushSubscription } from '../../hooks/usePushSubscription'

const DISMISSED_KEY = 'capsula_notif_dismissed'

export default function NotificationsBanner() {
  const { supported, subscribed, loading, subscribeToPush } = usePushSubscription()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  )
  const [permission, setPermission] = useState(null)

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  async function handleEnable() {
    await subscribeToPush()
    dismiss()
  }

  // Don't show if: not supported, already dismissed, already granted permission, or subscribed
  if (!supported) return null
  if (dismissed)  return null
  if (subscribed) return null
  if (permission === 'granted') return null
  if (permission === 'denied')  return null

  return (
    <div
      role="status"
      style={{
        position:        'sticky',
        top:             0,
        zIndex:          59,
        backgroundColor: '#EFF6FF',
        borderBottom:    '1px solid #BFDBFE',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '7px 16px',
        gap:             8,
      }}
    >
      {/* Bell icon + message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }} aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span style={{
          fontSize: 13, fontWeight: 500, color: '#1E40AF', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Enable notifications for new updates
        </span>
      </div>

      {/* Enable button */}
      <button
        onClick={handleEnable}
        disabled={loading}
        style={{
          backgroundColor:         '#2563EB',
          color:                   '#fff',
          border:                  'none',
          borderRadius:            999,
          padding:                 '4px 12px',
          fontSize:                12,
          fontWeight:              600,
          fontFamily:              'var(--font-body)',
          cursor:                  loading ? 'not-allowed' : 'pointer',
          opacity:                 loading ? 0.7 : 1,
          flexShrink:              0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {loading ? 'Enabling…' : 'Enable'}
      </button>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss notifications banner"
        style={{
          background:              'none',
          border:                  'none',
          cursor:                  'pointer',
          color:                   '#2563EB',
          padding:                 4,
          display:                 'flex',
          alignItems:              'center',
          WebkitTapHighlightColor: 'transparent',
          flexShrink:              0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
