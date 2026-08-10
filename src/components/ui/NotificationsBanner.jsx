/**
 * src/components/ui/NotificationsBanner.jsx
 * Phase 3K — Push Notifications prompt banner
 *
 * Shown to users who haven't subscribed yet, following a soft-ask pattern
 * (industry standard for permission prompts): non-blocking, capped number
 * of unanswered attempts, then retires itself.
 *
 * Memory model — three separate things remembered, on purpose:
 *  1. Explicit "no" (X tapped, or Enable tapped) → capsula_notif_dismissed
 *     in localStorage. Permanent, forever, on this device.
 *  2. "Already shown this visit" → capsula_notif_shown_session in
 *     sessionStorage. Prevents the banner re-triggering every time the
 *     user navigates between screens in the same sitting (this was a
 *     real bug — the banner was remounting per screen and restarting its
 *     delay/animation cycle each time).
 *  3. Ignored across separate visits → capsula_notif_attempts (count) and
 *     capsula_notif_last_shown (timestamp), both in localStorage. Allowed
 *     to reappear on up to MAX_ATTEMPTS separate app-opens total, with at
 *     least COOLDOWN_MS between attempts so it can't hit the same person
 *     twice in one day. Once attempts are used up without an explicit
 *     answer, it retires permanently — same as an explicit dismiss.
 *
 * Never blocks app usage — this is a non-modal floating card, the app is
 * fully usable underneath at all times, matching how every major
 * platform treats a notification-permission ask.
 *
 * Stage 2 follow-up: floating card (icon tile + title + subtitle +
 * Enable, all in one row), sits above BottomNav (same bottom offset
 * ToastContext already uses), delayed first appearance, gentle
 * enter/exit animation instead of an instant snap. Enable dismisses and
 * lets subscribeToPush() finish in the background; only a failure
 * surfaces a toast — a successful enable stays silent (Option A).
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

  // Decide whether this is a real attempt to show the banner — and if so,
  // after how long — based on the three-part memory described above.
  useEffect(() => {
    if (!supported) return
    if (permanentlyDismissed) return
    if (subscribed) return
    if (permission === null || permission === 'denied') return

    // Already shown once this visit — don't restart the cycle just
    // because the user navigated to another screen.
    if (sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true') return

    const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10)

    if (attempts >= MAX_ATTEMPTS) {
      // Used up every chance without an explicit answer — retire it
      // permanently, same as if they'd tapped the X.
      localStorage.setItem(DISMISSED_KEY, 'true')
      setPermanentlyDismissed(true)
      return
    }

    const lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || '0', 10)
    if (attempts > 0 && Date.now() - lastShown < COOLDOWN_MS) {
      // Shown before, but too soon to try again — skip this visit
      // entirely without counting it as a fresh attempt.
      return
    }

    const timer = setTimeout(() => {
      // Only now — right as it's actually about to appear — record the
      // attempt, so a visit that never reaches this point (e.g. user
      // left the page before the delay finished) doesn't get charged.
      sessionStorage.setItem(SESSION_SHOWN_KEY, 'true')
      localStorage.setItem(ATTEMPTS_KEY, String(attempts + 1))
      localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
      setPhase('visible')
    }, APPEAR_DELAY_MS)

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
