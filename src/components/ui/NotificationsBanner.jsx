/**
 * src/components/ui/NotificationsBanner.jsx
 * Phase 3K — Push Notifications prompt banner
 *
 * Shown once to users who haven't subscribed yet.
 * Dismissed permanently via localStorage key: capsula_notif_dismissed
 * Disappears automatically after subscribing successfully.
 *
 * Stage 2 follow-up: restyled as a floating card (icon tile + title +
 * subtitle) instead of an inline strip. Enable now dismisses instantly
 * and lets subscribeToPush() finish in the background; only a failure
 * surfaces a toast — a successful enable stays silent (Option A).
 *
 * Usage — mounted once in layout.jsx below OfflineBanner.
 */

import { useState, useEffect } from 'react'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { useToast } from '../../context/ToastContext'

const DISMISSED_KEY = 'capsula_notif_dismissed'

export default function NotificationsBanner() {
  const { supported, subscribed, subscribeToPush } = usePushSubscription()
  const { toast } = useToast()
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

  function handleEnable() {
    // Dismiss immediately — registration keeps running in the background.
    // Success stays silent (Option A): a toast only appears on failure,
    // matching how background permission grants normally behave.
    dismiss()
    subscribeToPush().then((ok) => {
      if (!ok) {
        toast.error('Could not enable notifications. Please try again.')
      }
    })
  }

  // Don't show if: not supported, already dismissed, subscribed, or permission denied
  if (!supported) return null
  if (dismissed)  return null
  if (subscribed) return null
  if (permission === 'denied') return null

  return (
    <div
      role="status"
      style={{
        position:   'fixed',
        top:        'max(12px, env(safe-area-inset-top))',
        left:       12,
        right:      12,
        zIndex:     59,
        maxWidth:   420,
        margin:     '0 auto',
        background: '#FFFFFF',
        borderRadius: 18,
        boxShadow:  '0 8px 24px rgba(15, 23, 42, 0.16), 0 1px 2px rgba(15, 23, 42, 0.08)',
        padding:    12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon tile */}
        <div style={{
          flexShrink:      0,
          width:           38,
          height:          38,
          borderRadius:    10,
          backgroundColor: '#2563EB',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: 1.3,
          }}>
            Capsula
          </div>
          <div style={{
            fontSize: 13, fontWeight: 400, color: '#64748B', lineHeight: 1.35,
            marginTop: 1,
          }}>
            Enable notifications to get notified about new updates
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          aria-label="Dismiss notifications banner"
          style={{
            background:              'none',
            border:                  'none',
            cursor:                  'pointer',
            color:                   '#94A3B8',
            padding:                 4,
            flexShrink:              0,
            display:                 'flex',
            alignItems:              'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Enable action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          onClick={handleEnable}
          style={{
            backgroundColor:         '#2563EB',
            color:                   '#fff',
            border:                  'none',
            borderRadius:            999,
            padding:                 '6px 16px',
            fontSize:                13,
            fontWeight:              600,
            fontFamily:              'var(--font-body)',
            cursor:                  'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Enable
        </button>
      </div>
    </div>
  )
}
