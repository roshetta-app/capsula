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
 * Stage 2 follow-up (2026-08-11, same day) — gated on `checking`. Every
 * time this sheet opens it mounts a fresh usePushSubscription() instance,
 * which starts `subscribed` at false and only corrects itself once its
 * own async re-verification finishes. Previously that showed as a flash
 * of the wrong ("Allow") state on open, and — because the check hadn't
 * settled yet — could let a tap on "Allow" fire subscribeToPush() again
 * while the real subscribe was still resolving, racing against itself and
 * coming back as a failure. Now the sheet shows a neutral "checking"
 * state and disables the buttons until `checking` is false, so it always
 * renders the real, already-resolved state and never fires an action off
 * a stale one.
 *
 * Fix (2026-08-11, notif-sync-and-race-fix) — now reads
 * usePushSubscriptionContext() instead of mounting its own
 * usePushSubscription() instance on every open, so this sheet always
 * shows the same status the banner does — no more separate hook instance
 * to flash a stale "Allow" state while its own re-verification catches up.
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
    supported, subscribed, permission, checking,
    subscribeToPush, unsubscribeFromPush,
  } = usePushSubscriptionContext()
  const { toast } = useToast()

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!shouldRender) return null

  const blocked = permission === 'denied'

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

        {checking ? (
          <p style={{
            margin:     '0 0 var(--space-5)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            Checking your notification status…
          </p>
        ) : !supported ? (
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
            Notifications are blocked for this site at the browser level.
            Enable them in your browser's site settings, then reopen this
            to turn them on here.
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
            Ask Later pair, stacked instead of side-by-side. While
            `checking`, a single disabled placeholder takes the same
            padding as a real button (no fixed height) so the sheet
            doesn't shift once the real state resolves. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {checking ? (
            <button
              disabled
              style={{
                backgroundColor:         '#F1F5F9',
                color:                   'var(--color-text-secondary)',
                border:                  'none',
                borderRadius:            999,
                padding:                 '11px 0',
                fontSize:                14,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                cursor:                  'default',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Checking…
            </button>
          ) : !supported || blocked ? (
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
