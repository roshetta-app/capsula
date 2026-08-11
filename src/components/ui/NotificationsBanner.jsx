/**
 * src/components/ui/NotificationsBanner.jsx
 *
 * Proactive "turn on notifications" prompt. Shown at most 3 times across
 * separate visits (24h cooldown between attempts), then retires
 * permanently — see MAX_ATTEMPTS/COOLDOWN_MS below.
 *
 * Auto-dismiss (2026-08-11): if left untouched for AUTO_DISMISS_MS after
 * the banner becoming visible, it closes itself the same way "Ask
 * Later" does — soft decline, no permanent flag, still governed by the
 * existing attempt cap/cooldown. Keeps this a single soft-decline path
 * instead of adding a second one.
 *
 * Stage 2 follow-up fix (2026-08-11) — flaw #1 from the F4 banner audit:
 * handleAllow() previously set the permanent DISMISSED_KEY flag before
 * knowing whether subscribeToPush() actually succeeded, so a failed
 * subscribe silently locked the banner out forever with no way back in
 * through this UI. Now the permanent flag is only set once subscribeToPush
 * resolves true. On failure, the banner still closes (soft, not
 * permanent) and the existing attempt/cooldown logic decides if/when it
 * asks again — same as any other soft decline. Regardless of this fix,
 * NotificationSheet.jsx (opened via the bell in ConditionsScreen) is now
 * always available as a non-attempt-limited fallback.
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
const AUTO_DISMISS_MS   = 8000 // auto-close as a soft decline if untouched

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

  // Auto-dismiss: once visible, close on its own like "Ask Later" if the
  // user hasn't interacted within AUTO_DISMISS_MS. Cancelled if the user
  // acts first (phase leaves 'visible') or the banner unmounts.
  useEffect(() => {
    if (phase !== 'visible') return

    const timer = setTimeout(() => {
      handleAskLater()
    }, AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [phase])

  function closeWithAnimation(after) {
    setPhase('leaving')
    setTimeout(after, EXIT_DURATION_MS)
  }

  // Primary action — requests permission and subscribes. The permanent
  // "never ask again" flag is only set once subscribeToPush() actually
  // resolves true (fix, 2026-08-11) — a failed subscribe closes the
  // banner softly instead, leaving the normal attempt/cooldown logic in
  // charge of whether it asks again, same as "Ask Later".
  function handleAllow() {
    closeWithAnimation(() => {
      setPhase('hidden')
      subscribeToPush().then((ok) => {
        if (ok) {
          localStorage.setItem(DISMISSED_KEY, 'true')
          setPermanentlyDismissed(true)
        } else {
          toast.error('Could not enable notifications. Please try again.')
        }
      })
    })
  }

  // Secondary action — soft decline. Does NOT set the permanent flag;
  // the existing attempt cap/cooldown decides if/when to ask again.
  // Also used by the auto-dismiss timer above.
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
