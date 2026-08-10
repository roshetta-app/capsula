/**
 * src/components/ui/NotificationsBanner.jsx
 * Phase 3K — Push Notifications prompt banner
 *
 * Shown once to users who haven't subscribed yet.
 * Dismissed permanently via localStorage key: capsula_notif_dismissed
 * Disappears automatically after subscribing successfully.
 *
 * Stage 2 follow-up: restyled as a floating card (icon tile + title +
 * subtitle + Enable, all in one row) instead of an inline strip.
 * - Sits above BottomNav, same bottom offset ToastContext already uses
 *   (60px nav height + safe-area + margin), instead of the top of the
 *   screen.
 * - First appearance is delayed (APPEAR_DELAY_MS) instead of showing the
 *   instant the app opens.
 * - Enable dismisses with a brief exit animation and lets
 *   subscribeToPush() finish in the background; only a failure surfaces
 *   a toast — a successful enable stays silent (Option A).
 *
 * Usage — mounted once in layout.jsx below OfflineBanner.
 */

import { useState, useEffect } from 'react'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { useToast } from '../../context/ToastContext'

const DISMISSED_KEY   = 'capsula_notif_dismissed'
const APPEAR_DELAY_MS = 2500
const EXIT_DURATION_MS = 220

export default function NotificationsBanner() {
  const { supported, subscribed, subscribeToPush } = usePushSubscription()
  const { toast } = useToast()
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  )
  const [permission, setPermission] = useState(null)
  // 'hidden' (not shown yet / gone) → 'visible' (shown, animates in)
  // → 'leaving' (animates out, then finalizes to 'hidden')
  const [phase, setPhase] = useState('hidden')

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  // Gate the first appearance behind a short delay instead of showing the
  // instant the app opens. Only starts the timer once every eligibility
  // check has a real answer (permission starts as null until the effect
  // above resolves it).
  useEffect(() => {
    if (!supported) return
    if (permanentlyDismissed) return
    if (subscribed) return
    if (permission === null || permission === 'denied') return

    const timer = setTimeout(() => setPhase('visible'), APPEAR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [supported, permanentlyDismissed, subscribed, permission])

  function finalizeDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setPermanentlyDismissed(true)
    setPhase('hidden')
  }

  function handleDismissClick() {
    setPhase('leaving')
    setTimeout(finalizeDismiss, EXIT_DURATION_MS)
  }

  function handleEnable() {
    // Play the exit animation, then dismiss for real and let
    // registration keep running in the background. Success stays silent
    // (Option A) — a toast only appears on failure.
    setPhase('leaving')
    setTimeout(() => {
      finalizeDismiss()
      subscribeToPush().then((ok) => {
        if (!ok) {
          toast.error('Could not enable notifications. Please try again.')
        }
      })
    }, EXIT_DURATION_MS)
  }

  if (!supported) return null
  if (permission === 'denied') return null
  if (permanentlyDismissed && phase !== 'leaving') return null
  if (subscribed && phase !== 'leaving') return null
  if (phase === 'hidden') return null

  return (
    <>
      <style>{`
        @keyframes notif-banner-in {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notif-banner-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(10px) scale(0.98); }
        }
      `}</style>
      <div
        role="status"
        style={{
          position:   'fixed',
          bottom:     'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          left:       12,
          right:      12,
          zIndex:     90,
          maxWidth:   420,
          margin:     '0 auto',
          background: '#FFFFFF',
          borderRadius: 18,
          boxShadow:  '0 8px 24px rgba(15, 23, 42, 0.16), 0 1px 2px rgba(15, 23, 42, 0.08)',
          padding:    12,
          animation:  phase === 'leaving'
            ? `notif-banner-out ${EXIT_DURATION_MS}ms ease forwards`
            : 'notif-banner-in 260ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>
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

          {/* Dismiss (top) + Enable (bottom), stacked so Enable stays in
              the same row as the icon/text instead of a separate row */}
          <div style={{
            flexShrink:     0,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'flex-end',
            gap:            6,
          }}>
            <button
              onClick={handleDismissClick}
              aria-label="Dismiss notifications banner"
              style={{
                background:              'none',
                border:                  'none',
                cursor:                  'pointer',
                color:                   '#94A3B8',
                padding:                 2,
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

            <button
              onClick={handleEnable}
              style={{
                backgroundColor:         '#2563EB',
                color:                   '#fff',
                border:                  'none',
                borderRadius:            999,
                padding:                 '6px 14px',
                fontSize:                13,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                cursor:                  'pointer',
                whiteSpace:              'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Enable
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
