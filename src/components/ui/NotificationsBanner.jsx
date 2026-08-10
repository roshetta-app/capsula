/**
 * src/components/ui/NotificationsBanner.jsx
 * Phase 3K — Push Notifications prompt banner
 *
 * Shown to users who haven't subscribed yet, following a soft-ask pattern
 * (industry standard for permission prompts): non-blocking, capped number
 * of unanswered attempts, then retires itself.
 *
 * Memory model — three separate things remembered, on purpose:
 *  1. Explicit "no" (Allow Notifications tapped and handled) →
 *     capsula_notif_dismissed in localStorage. Permanent, forever, on
 *     this device.
 *  2. "Already shown this visit" → capsula_notif_shown_session in
 *     sessionStorage. Prevents the banner re-triggering every time the
 *     user navigates between screens in the same sitting.
 *  3. "Ask Later" / ignored across separate visits →
 *     capsula_notif_attempts (count) and capsula_notif_last_shown
 *     (timestamp), both in localStorage. Allowed to reappear on up to
 *     MAX_ATTEMPTS separate app-opens total, with at least COOLDOWN_MS
 *     between attempts. Once attempts are used up, it retires
 *     permanently — same as an explicit "no". "Ask Later" does NOT set
 *     the permanent flag — it just closes this instance and lets the
 *     normal cap/cooldown decide when (or whether) to ask again.
 *
 * Never blocks app usage — non-modal floating card, app fully usable
 * underneath at all times.
 *
 * Design: app icon tile + concise one-line body copy (no "Capsula"
 * title), two actions — "Ask Later" (secondary, soft decline) and
 * "Allow Notifications" (primary, grants + subscribes) — side by side,
 * mirroring the standard two-button soft-ask pattern.
 *
 * Usage — mounted once in layout.jsx below OfflineBanner.
 */

import { useState, useEffect } from 'react'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { useToast } from '../../context/ToastContext'

const DISMISSED_KEY    = 'capsula_notif_dismissed'
const ATTEMPTS_KEY     = 'capsula_notif_attempts'
const LAST_SHOWN_KEY   = 'capsula_notif_last_shown'
const SESSION_SHOWN_KEY = 'capsula_notif_shown_session'

const MAX_ATTEMPTS      = 3
const COOLDOWN_MS       = 24 * 60 * 60 * 1000 // 24h between un-actioned attempts
const APPEAR_DELAY_MS   = 2500
const EXIT_DURATION_MS  = 220

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

  useEffect(() => {
    if (!supported) return
    if (permanentlyDismissed) return
    if (subscribed) return
    if (permission === null || permission === 'denied') return
    if (sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true') return

    const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10)

    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(DISMISSED_KEY, 'true')
      setPermanentlyDismissed(true)
      return
    }

    const lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || '0', 10)
    if (attempts > 0 && Date.now() - lastShown < COOLDOWN_MS) {
      return
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem(SESSION_SHOWN_KEY, 'true')
      localStorage.setItem(ATTEMPTS_KEY, String(attempts + 1))
      localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
      setPhase('visible')
    }, APPEAR_DELAY_MS)

    return () => clearTimeout(timer)
  }, [supported, permanentlyDismissed, subscribed, permission])

  function closeWithAnimation(after) {
    setPhase('leaving')
    setTimeout(after, EXIT_DURATION_MS)
  }

  // Primary action — grants permission, subscribes, permanent (never asks again).
  function handleAllow() {
    closeWithAnimation(() => {
      localStorage.setItem(DISMISSED_KEY, 'true')
      setPermanentlyDismissed(true)
      setPhase('hidden')
      subscribeToPush().then((ok) => {
        if (!ok) {
          toast.error('Could not enable notifications. Please try again.')
        }
      })
    })
  }

  // Secondary action — soft decline. Does NOT set the permanent flag;
  // the existing attempt cap/cooldown decides if/when to ask again.
  function handleAskLater() {
    closeWithAnimation(() => {
      setPhase('hidden')
    })
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
          padding:    14,
          animation:  phase === 'leaving'
            ? `notif-banner-out ${EXIT_DURATION_MS}ms ease forwards`
            : 'notif-banner-in 260ms ease',
        }}
      >
        {/* Icon + copy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/capsula/icons/icon-192.png"
            alt=""
            aria-hidden="true"
            style={{
              flexShrink:   0,
              width:        42,
              height:       42,
              borderRadius: 11,
              objectFit:    'cover',
            }}
          />
          <p style={{
            flex: 1, minWidth: 0, margin: 0,
            fontSize: 14, fontWeight: 500, color: '#1E293B', lineHeight: 1.4,
          }}>
            Get notified the moment there's new drug or condition info.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={handleAskLater}
            style={{
              flex:                    1,
              backgroundColor:         '#F1F5F9',
              color:                   '#334155',
              border:                  'none',
              borderRadius:            999,
              padding:                 '9px 0',
              fontSize:                13,
              fontWeight:              600,
              fontFamily:              'var(--font-body)',
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Ask Later
          </button>
          <button
            onClick={handleAllow}
            style={{
              flex:                    1.4,
              backgroundColor:         '#2563EB',
              color:                   '#fff',
              border:                  'none',
              borderRadius:            999,
              padding:                 '9px 0',
              fontSize:                13,
              fontWeight:              600,
              fontFamily:              'var(--font-body)',
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Allow Notifications
          </button>
        </div>
      </div>
    </>
  )
}
