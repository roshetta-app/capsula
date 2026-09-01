/**
 * src/components/ui/NotificationsBanner.jsx
 *
 * Proactive "turn on notifications" prompt.
 *
 * Redesign (2026-09-01, notif-banner-standardized-timing) — this session:
 *   - Timing: previously fired 2.5s after every single app open, with no
 *     regard for whether the person had done anything yet. The "when/
 *     whether to ask" decision now lives in a new dedicated hook,
 *     useNotificationsPrompt.js, mirroring the same dedicated-hook pattern
 *     useSignInPrompt.js already established for the sign-in popup. The
 *     banner is now only eligible starting on someone's 2nd visit (never
 *     their very first), on top of the existing per-session one-shot and a
 *     24h cooldown between genuine asks.
 *   - Counting: replaced the old attempts-cap + separate permanent
 *     "dismissed forever" flag with a single lifetime impression counter,
 *     the same model useSignInPrompt.js uses — including its
 *     accidental-tap protection (a close doesn't spend the lifetime
 *     budget unless the banner was genuinely visible for at least half a
 *     second). A successful subscribe no longer needs its own separate
 *     permanent flag: once `subscribed` is true, the eligibility check
 *     passed into the hook is false, so it simply never runs again — the
 *     same way useSignInPrompt relies on `isSignedIn` rather than a
 *     stored "done" flag.
 *   - This component itself is otherwise unchanged: same visuals, same
 *     animation, same auto-dismiss-after-8s behavior, same Allow/Ask
 *     Later actions, same "don't lock anyone out if subscribeToPush()
 *     fails" protection.
 *
 * Auto-dismiss (2026-08-11): if left untouched for AUTO_DISMISS_MS after
 * the banner becoming visible, it closes itself the same way "Ask
 * Later" does — soft decline, no permanent flag, still governed by the
 * timing/frequency rules above. Keeps this a single soft-decline path
 * instead of adding a second one.
 *
 * Stage 2 follow-up fix (2026-08-11) — flaw #1 from the F4 banner audit:
 * handleAllow() previously set a permanent "dismissed forever" flag before
 * knowing whether subscribeToPush() actually succeeded, so a failed
 * subscribe silently locked the banner out forever with no way back in
 * through this UI. A failed subscribe now just closes the banner softly
 * (not permanently) and the normal timing/frequency rules above decide
 * if/when it asks again — same as any other soft decline. Regardless of
 * this fix, NotificationSheet.jsx (opened via the bell in
 * ConditionsScreen) is now always available as a non-attempt-limited
 * fallback.
 *
 * Fix (2026-08-11, notif-sync-and-race-fix) — now reads
 * usePushSubscriptionContext() instead of mounting its own
 * usePushSubscription() instance, so its status is always the same one
 * the bell sheet sees — one subscribe/unsubscribe in flight, one status,
 * both places see it the instant it changes.
 *
 * Bug fix (2026-08-17, notif-banner-native-permission-fix) — this
 * component was still tracking its own local `permission` state, read
 * only from the browser's `Notification.permission`. That API doesn't
 * exist inside the native app's WebView (same fact usePushSubscription.js
 * documented and fixed for itself on 2026-08-13), so on native `permission`
 * stayed `null` forever, and the banner's own show-condition
 * (`permission === null` blocks display) meant it could never appear on
 * native at all — not at first install, not on any later visit, regardless
 * of the timing/frequency rules. Fixed by reading `permission` from
 * usePushSubscriptionContext() instead, the same shared, native-aware
 * source `supported` and `subscribed` already come from. The banner's own
 * local permission state and its Notification-reading effect are removed
 * entirely — one source of truth, no duplicate/drifted copy.
 *
 * Bug fix (2026-08-17, capsula-path-sweep) — the icon image was a
 * hardcoded `/capsula/icons/icon-192.png`, which only resolves on the
 * website build (GitHub Pages subpath). The native app build has no such
 * prefix, so this 404'd on-device and showed a broken-image placeholder.
 * Fixed by routing through `import.meta.env.BASE_URL`, which Vite fills
 * in correctly for whichever target compiled the file. A repo-wide sweep
 * for other hardcoded `/capsula/`-prefixed paths (per project rule) found
 * three more hits, all in main.jsx — confirmed harmless, not fixed: two
 * are inside a block already guarded by `!Capacitor.isNativePlatform()`
 * (never runs on native), and one is a stale comment with no matching
 * hardcoded path in the actual code below it.
 *
 * Usage — mounted once in layout.jsx below OfflineBanner.
 */

import { useState, useEffect } from 'react'
import { usePushSubscriptionContext } from '../../context/PushSubscriptionContext'
import { useToast } from '../../context/ToastContext'
import { useNotificationsPrompt } from '../../hooks/useNotificationsPrompt'

const EXIT_DURATION_MS  = 220
const AUTO_DISMISS_MS   = 8000 // auto-close as a soft decline if untouched

export default function NotificationsBanner() {
  const { supported, permission, subscribed, subscribeToPush } = usePushSubscriptionContext()
  const { toast } = useToast()

  // Same eligibility conditions the old inline effect used: supported,
  // not already subscribed, and permission neither unknown-on-native nor
  // denied. Once true, the timing/frequency decision itself lives in
  // useNotificationsPrompt — see that file's header for the full model.
  const eligible = supported && !subscribed && permission !== null && permission !== 'denied'
  const { shouldShow, dismiss } = useNotificationsPrompt({ eligible })

  // 'hidden' (not shown yet / gone) → 'visible' (shown, animates in)
  // → 'leaving' (animates out, then finalizes to 'hidden')
  const [phase, setPhase] = useState('hidden')

  useEffect(() => {
    if (shouldShow) setPhase('visible')
  }, [shouldShow])

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

  // Primary action — requests permission and subscribes. `dismiss()` is
  // called regardless of outcome (same as any other close), spending the
  // lifetime impression budget if the banner was genuinely seen. There's
  // no separate permanent flag on success any more — once `subscribed`
  // becomes true, `eligible` above goes false and the hook simply never
  // fires again. On failure, the banner still closes (soft, not
  // permanent) and the normal timing/frequency rules decide if/when it
  // asks again — same as "Ask Later".
  function handleAllow() {
    closeWithAnimation(() => {
      setPhase('hidden')
      dismiss()
      subscribeToPush().then((ok) => {
        if (!ok) toast.error('Could not enable notifications. Please try again.')
      })
    })
  }

  // Secondary action — soft decline. Also used by the auto-dismiss timer
  // above.
  function handleAskLater() {
    closeWithAnimation(() => {
      setPhase('hidden')
      dismiss()
    })
  }

  if (!supported) return null
  if (permission === 'denied') return null
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
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
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
