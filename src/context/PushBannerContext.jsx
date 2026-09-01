/**
 * src/context/PushBannerContext.jsx
 *
 * Bug fix, 2026-09-01 (alarms-redirect-fix, UI refinement) — dedicated
 * in-app banner for a push notification arriving while the app is open.
 * Kept separate from the general ToastContext (the "Saved" / "Something
 * went wrong" style messages used elsewhere), rather than extending that
 * system further, because a real notification needs to behave in ways
 * that would be wrong for those short status messages:
 *   - Appears at the top of the screen, like a real notification, not at
 *     the bottom where the app's other toasts appear.
 *   - Laid out like a real notification (small bell icon, bold title,
 *     body text underneath) instead of a single colored message line.
 *
 * Used only by usePushSubscription.js, for the case where a push arrives
 * while the app is already open (in place of a native OS notification,
 * which is what used to trigger the "Alarms & reminders" redirect on
 * MIUI — see usePushSubscription.js's file header for the full story).
 * Notifications received while the app is closed or backgrounded are
 * unaffected by this file — those are still shown natively by Android.
 *
 * UI refinement, 2026-09-01 (round 2) — matched to real notification
 * conventions (iOS/Android system notification style, e.g. an app-icon
 * square + bold title + "now"/"Yesterday" timestamp on one line, body
 * capped at a couple lines): title now caps at one line and body at two,
 * both with "…" instead of letting the banner grow to fit a long
 * message; the icon container is a rounded square (an app icon) rather
 * than a circle (a generic status icon); and dismissing — by tap or by
 * the X — now fades/slides the banner out first, with a tap's
 * navigation (onAction) only firing once that's finished, instead of the
 * destination page appearing abruptly underneath it.
 *
 * UI refinement, 2026-09-01 (round 3) — auto-dismiss after
 * DEFAULT_DURATION_MS, rather than staying up indefinitely (round 1's
 * choice, made specifically to fix taps not being counted — see
 * usePushSubscription.js's header for that story). Reconsidered: real
 * apps that do this (WhatsApp, Instagram, Slack) do auto-dismiss a
 * foreground banner like this, typically after 5-6s — closer to how a
 * real heads-up notification briefly appears then retracts — so
 * "disappears on its own" was never actually the wrong call, only 3s
 * (the general toast's default, inherited by round 1's predecessor) was
 * too short to be usable. 6s keeps that standard behavior while giving
 * comfortable time to read and tap; unlike round 1's toast, an
 * auto-dismiss here still doesn't count as a "click" — same as closing it
 * with the X — since reportClick only ever runs from onAction (a real
 * tap), never from the timeout.
 *
 * Usage:
 *   const { showBanner } = usePushBanner()
 *   showBanner({
 *     title: 'New update',
 *     body: 'Something changed',
 *     onAction: () => { ... }, // called on tap, before the banner closes
 *   })
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Icon from '../components/ui/Icon'

const PushBannerContext = createContext(null)

let _nextId = 1
const DEFAULT_DURATION_MS = 6000

export function PushBannerProvider({ children }) {
  const [banners, setBanners] = useState([])

  const dismiss = useCallback((id) => {
    setBanners(prev => prev.filter(b => b.id !== id))
  }, [])

  const showBanner = useCallback(({ title, body, onAction }) => {
    const id = _nextId++
    setBanners(prev => [...prev, { id, title, body, onAction }])
    return id
  }, [])

  return (
    <PushBannerContext.Provider value={{ showBanner }}>
      {children}
      <PushBannerStack banners={banners} onDismiss={dismiss} />
    </PushBannerContext.Provider>
  )
}

export function usePushBanner() {
  const ctx = useContext(PushBannerContext)
  if (!ctx) throw new Error('usePushBanner must be used inside <PushBannerProvider>')
  return ctx
}

// -- Visual stack -----------------------------------------------------------

function PushBannerStack({ banners, onDismiss }) {
  if (!banners.length) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position:      'fixed',
        // Sits below the phone's own status bar (clock/battery row),
        // matching where a real heads-up notification appears.
        top:           'calc(env(safe-area-inset-top, 0px) + 8px)',
        left:          '50%',
        transform:     'translateX(-50%)',
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        gap:           'var(--space-2)',
        width:         'min(calc(100vw - var(--space-8)), 420px)',
        pointerEvents: 'none',
      }}
    >
      {banners.map(banner => (
        <PushBannerItem key={banner.id} banner={banner} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function PushBannerItem({ banner, onDismiss }) {
  // UI refinement, 2026-09-01 (alarms-redirect-fix, round 2) — enter/exit
  // animation. animateIn drives the entrance (slide down + fade in on
  // mount); exiting drives the exit (slide up + fade out) — used for the
  // X (plain dismiss), a tap (dismiss, then run onAction only once the
  // exit animation has actually finished, so tapping never just swaps to
  // the destination page with no transition at all), and now (round 3)
  // the auto-dismiss timer below.
  const [animateIn, setAnimateIn] = useState(false)
  const [exiting, setExiting] = useState(false)
  const closeTimer = useRef(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimateIn(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function close(then) {
    setExiting(true)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      onDismiss(banner.id)
      then?.()
    }, 200) // matches the transition duration below
  }

  // UI refinement, 2026-09-01 (round 3) — see file header. Auto-dismiss
  // after DEFAULT_DURATION_MS, same as closing with the X: no onAction,
  // so this never counts as a click. Cleared on unmount, so a tap or the
  // X firing first (both of which unmount this component via onDismiss)
  // can't also fire this timer afterwards.
  useEffect(() => {
    const autoTimer = setTimeout(() => close(), DEFAULT_DURATION_MS)
    return () => clearTimeout(autoTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="alert"
      onClick={() => close(() => banner.onAction?.())}
      style={{
        pointerEvents:   'auto',
        display:         'flex',
        alignItems:      'flex-start',
        gap:             'var(--space-3)',
        padding:         'var(--space-3) var(--space-4)',
        borderRadius:    'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        boxShadow:       '0 8px 28px rgba(0,0,0,0.18)',
        fontFamily:      'var(--font-body)',
        cursor:          'pointer',
        opacity:         exiting ? 0 : (animateIn ? 1 : 0),
        transform:       exiting ? 'translateY(-16px)' : (animateIn ? 'translateY(0)' : 'translateY(-16px)'),
        transition:      'opacity 200ms ease, transform 200ms ease',
      }}
    >
      {/* Small bell icon in a rounded square, matching how a real
          notification shows its app icon (see file header reference
          images) — was a circle before, which read more like a generic
          status icon than "this came from an app". */}
      <div style={{
        width:           28,
        height:          28,
        flexShrink:      0,
        marginTop:       1,
        borderRadius:    'var(--radius-md)',
        backgroundColor: 'var(--color-hero-bg)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Icon name="Bell" size={14} color="var(--color-accent)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          {banner.title && (
            <p style={{
              margin:       0,
              flex:         1,
              minWidth:     0,
              fontSize:     14,
              fontWeight:   600,
              lineHeight:   1.4,
              color:        'var(--color-text-primary)',
              // UI refinement — a long title used to stretch the banner
              // taller/wider instead of a real notification's fixed-size
              // card; now cuts off with "…" after one line instead.
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {banner.title}
            </p>
          )}
          {/* Matches the "Yesterday" / "now" timestamp both reference
              screenshots show next to the title. Always "now" here since
              this only ever fires for a push arriving while the app is
              open — there's no delay to reflect. */}
          <span style={{
            flexShrink: 0,
            fontSize:   12,
            color:      'var(--color-text-secondary)',
          }}>
            now
          </span>
        </div>
        {banner.body && (
          <p style={{
            margin:            banner.title ? '2px 0 0' : 0,
            fontSize:          13,
            lineHeight:        1.4,
            color:             'var(--color-text-secondary)',
            // UI refinement — same reasoning as the title above: caps a
            // long message at two lines with "…" instead of letting the
            // banner grow to fit it.
            display:           '-webkit-box',
            WebkitLineClamp:   2,
            WebkitBoxOrient:   'vertical',
            overflow:          'hidden',
          }}>
            {banner.body}
          </p>
        )}
      </div>

      {/* Dismiss without triggering the tap action — mirrors swiping away
          a real notification (no click credited) rather than tapping it. */}
      <button
        onClick={e => { e.stopPropagation(); close() }}
        aria-label="Dismiss"
        style={{
          flexShrink:              0,
          border:                  'none',
          background:              'none',
          padding:                 4,
          marginTop:               -2,
          marginRight:             -4,
          cursor:                  'pointer',
          color:                   'var(--color-text-secondary)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  )
}
