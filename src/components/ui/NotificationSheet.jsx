/**
 * src/components/ui/NotificationSheet.jsx
 *
 * Persistent, always-available notification on/off control — opened from
 * the bell button in ConditionsScreen's BrandRow. Built on ConfirmSheet.jsx's
 * pattern (portal to body, shouldRender/animateIn delayed-unmount, fade+scale
 * entrance), the same way AccountSheet.jsx extends it, rather than inventing
 * a separate visual language for this one popup.
 *
 * Added 2026-08-11 (F4 Stage 2 follow-up) as a structural fix for flaws
 * found in NotificationsBanner.jsx's dismiss/retire logic:
 *   - A failed subscribe no longer locks anyone out permanently — this
 *     sheet is always reachable from the bell, so the action can simply
 *     be retried.
 *   - Status shown here comes from usePushSubscription's real,
 *     server-re-verified state (checked on mount whenever permission is
 *     already granted), not a stale local-only flag.
 *   - Has no attempt cap at all — nothing here can run out.
 *
 * Redesigned 2026-08-11 (same day) to match the OS-style permission-prompt
 * look (bell icon, question, stacked buttons) instead of a status line +
 * toggle switch. Also switched the interaction model to match
 * NotificationsBanner.jsx exactly: tapping a button closes the sheet
 * instantly (no waiting on the network round trip) and the real
 * subscribe/unsubscribe call finishes in the background, with a toast
 * reporting failure — same pattern, same ToastContext, same colors as
 * the banner's Allow / Ask Later buttons.
 *
 * Fix (2026-08-11, notif-sync-and-race-fix) — now reads
 * usePushSubscriptionContext() instead of mounting its own
 * usePushSubscription() instance on every open, so this sheet always
 * shows the same status the banner does — no more separate hook instance
 * to flash a stale "Allow" state while its own re-verification catches up.
 *
 * Visual fix (2026-08-11, same task) — replaced the old "checking" screen
 * (a visible message + disabled buttons shown while the real status was
 * still being confirmed) with simply not opening the sheet until
 * `checking` is false. Tapping the bell while a check is still in flight
 * now just waits silently and opens already showing the real answer,
 * instead of opening immediately and showing an interim state. Since the
 * status is now shared app-wide (see fix above) instead of re-checked on
 * every open, this check has normally already finished by the time
 * anyone taps the bell, so in practice the sheet opens with no visible
 * delay at all — the only case where a delay is possible is tapping the
 * bell in the first moment after the app loads.
 *
 * Bug fix (2026-09-01, notif-offline-and-pwa-copy-fix) — two issues
 * reported together, same root: the copy and the actions here assumed a
 * regular browser tab and an always-on connection.
 *   1. The "blocked" message used to say "enable them in your browser's
 *      site settings" — meaningless once the app is installed as a PWA,
 *      where there's no visible browser chrome to go find that in.
 *      Reworded to point at "device or browser notification settings"
 *      instead, which reads correctly either way.
 *   2. Turning notifications on/off also has to reach our server (to
 *      save/remove the device's token), not just ask the OS for local
 *      permission — so it silently failed when offline, surfacing only
 *      as the generic "Could not enable notifications. Please try
 *      again." toast, which reads like a permission problem rather than
 *      a connectivity one. Now reads `isOnline` from
 *      usePushSubscriptionContext() and, while offline, shows a dedicated
 *      message with only a Close button — matching the existing
 *      "unsupported"/"blocked" pattern — instead of letting a tap on
 *      Allow/Turn Off run the network call and fail. The underlying
 *      subscribeToPush()/unsubscribeFromPush() calls are also gated the
 *      same way in usePushSubscription.js, so any other caller (e.g.
 *      NotificationsBanner.jsx) gets the same protection.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { usePushSubscriptionContext } from '../../context/PushSubscriptionContext'
import { useToast } from '../../context/ToastContext'

export default function NotificationSheet({ isOpen, onClose }) {
  const overlayRef = useRef(null)
  const {
    supported, subscribed, permission, checking, isOnline,
    subscribeToPush, unsubscribeFromPush,
  } = usePushSubscriptionContext()
  const { toast } = useToast()

  // Don't actually open until the real status is known — avoids ever
  // showing an interim/"checking" state. See file header note above.
  const effectiveOpen = isOpen && !checking

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(effectiveOpen)
  const [animateIn,    setAnimateIn]    = useState(effectiveOpen)

  useEffect(() => {
    if (effectiveOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [effectiveOpen])

  // Close on Escape
  useEffect(() => {
    if (!effectiveOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [effectiveOpen, onClose])

  if (!shouldRender) return null

  const blocked = permission === 'denied'
  // 2026-09-01 offline fix — see file header. Checked after `blocked` on
  // purpose: a permanently-blocked permission is worth surfacing even
  // while offline (fixing it doesn't need a connection), but if it's not
  // blocked, connectivity is the next thing standing between the person
  // and a working toggle.
  const offline = !blocked && !isOnline

  // Primary action when notifications are currently OFF — same shape as
  // NotificationsBanner's handleAllow(): close immediately, subscribe in
  // the background, toast only on failure (the sheet itself is already
  // gone by then, so there's nothing to update inline).
  function handleAllow() {
    onClose()
    subscribeToPush().then(ok => {
      if (!ok) toast.error('Could not enable notifications. Please try again.')
    })
  }

  // Secondary action when OFF — pure soft decline, same as "Ask Later".
  function handleDontAllow() {
    onClose()
  }

  // Primary action when notifications are currently ON — same instant-close
  // + background-resolve shape, mirrored for the opposite direction.
  function handleTurnOff() {
    onClose()
    unsubscribeFromPush().then(ok => {
      if (!ok) toast.error('Could not turn off notifications. Please try again.')
    })
  }

  // Rendered via portal to document.body — same reasoning as ConfirmSheet/
  // AccountSheet: position: fixed only resolves against the viewport if no
  // ancestor has a transform/filter/etc that creates its own containing
  // block, and the bell that opens this lives inside scroll/transform
  // wrappers elsewhere in the app.
  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        opacity:         animateIn ? 1 : 0,
        transition:      'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          width:           '100%',
          maxWidth:        340,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          padding:         'var(--space-5)',
          fontFamily:      'var(--font-body)',
          textAlign:       'center',
          opacity:         animateIn ? 1 : 0,
          transform:       animateIn ? 'scale(1)' : 'scale(0.96)',
          transition:      'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle)',
        }}
      >
        {/* Bell icon */}
        <div style={{
          width:           56,
          height:          56,
          borderRadius:    'var(--radius-full)',
          backgroundColor: 'var(--color-hero-bg)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          margin:          '0 auto var(--space-4)',
        }}>
          <Bell size={26} color="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.15} />
        </div>

        {!supported ? (
          <p style={{
            margin:     '0 0 var(--space-5)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            Notifications aren't supported on this device.
          </p>
        ) : blocked ? (
          <p style={{
            margin:     '0 0 var(--space-5)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            Notifications are blocked for Capsula. Enable them in your
            device or browser's notification settings, then reopen this
            to turn them on here.
          </p>
        ) : offline ? (
          <p style={{
            margin:     '0 0 var(--space-5)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            You're offline. Turning notifications on or off needs an
            internet connection — reconnect and try again.
          </p>
        ) : subscribed ? (
          <>
            <p style={{
              margin:     '0 0 var(--space-2)',
              fontSize:   16,
              fontWeight: 600,
              lineHeight: 1.4,
              color:      'var(--color-text-primary)',
            }}>
              Notifications are on
            </p>
            <p style={{
              margin:     '0 0 var(--space-5)',
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
            }}>
              You'll be notified the moment there's new drug or condition info.
            </p>
          </>
        ) : (
          <>
            <p style={{
              margin:     '0 0 var(--space-2)',
              fontSize:   16,
              fontWeight: 600,
              lineHeight: 1.4,
              color:      'var(--color-text-primary)',
            }}>
              Allow <strong>Capsula</strong> to send you notifications?
            </p>
            <p style={{
              margin:     '0 0 var(--space-5)',
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
            }}>
              Get notified the moment there's new drug or condition info.
            </p>
          </>
        )}

        {/* Actions — same colors/shape as NotificationsBanner's Allow /
            Ask Later pair, stacked instead of side-by-side. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!supported || blocked || offline ? (
            <button
              onClick={onClose}
              style={{
                backgroundColor:         '#F1F5F9',
                color:                   '#334155',
                border:                  'none',
                borderRadius:            999,
                padding:                 '11px 0',
                fontSize:                14,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Close
            </button>
          ) : subscribed ? (
            <>
              <button
                onClick={handleTurnOff}
                style={{
                  backgroundColor:         '#F1F5F9',
                  color:                   '#334155',
                  border:                  'none',
                  borderRadius:            999,
                  padding:                 '11px 0',
                  fontSize:                14,
                  fontWeight:              600,
                  fontFamily:              'var(--font-body)',
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Turn Off Notifications
              </button>
              <button
                onClick={onClose}
                style={{
                  backgroundColor:         'transparent',
                  color:                   'var(--color-text-secondary)',
                  border:                  'none',
                  borderRadius:            999,
                  padding:                 '11px 0',
                  fontSize:                14,
                  fontWeight:              600,
                  fontFamily:              'var(--font-body)',
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Keep Notifications On
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAllow}
                style={{
                  backgroundColor:         '#2563EB',
                  color:                   '#fff',
                  border:                  'none',
                  borderRadius:            999,
                  padding:                 '11px 0',
                  fontSize:                14,
                  fontWeight:              600,
                  fontFamily:              'var(--font-body)',
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Allow
              </button>
              <button
                onClick={handleDontAllow}
                style={{
                  backgroundColor:         '#F1F5F9',
                  color:                   '#334155',
                  border:                  'none',
                  borderRadius:            999,
                  padding:                 '11px 0',
                  fontSize:                14,
                  fontWeight:              600,
                  fontFamily:              'var(--font-body)',
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Maybe Later
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
