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
 *   - Stays on screen until it's tapped or closed with the X — no
 *     auto-dismiss timer. The first version of this reused the general
 *     toast, which auto-dismissed after a few seconds; that turned out to
 *     also be why taps weren't reliably being counted in the admin stats
 *     — the toast was often gone before there was time to tap it.
 *
 * Used only by usePushSubscription.js, for the case where a push arrives
 * while the app is already open (in place of a native OS notification,
 * which is what used to trigger the "Alarms & reminders" redirect on
 * MIUI — see usePushSubscription.js's file header for the full story).
 * Notifications received while the app is closed or backgrounded are
 * unaffected by this file — those are still shown natively by Android.
 *
 * Usage:
 *   const { showBanner } = usePushBanner()
 *   showBanner({
 *     title: 'New update',
 *     body: 'Something changed',
 *     onAction: () => { ... }, // called on tap, before the banner closes
 *   })
 */

import { createContext, useCallback, useContext, useState } from 'react'
import Icon from '../components/ui/Icon'

const PushBannerContext = createContext(null)

let _nextId = 1

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
  function handleTap() {
    banner.onAction?.()
    onDismiss(banner.id)
  }

  return (
    <div
      role="alert"
      onClick={handleTap}
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
        animation:       'toast-in 200ms ease',
      }}
    >
      {/* Small bell icon, same treatment as NotificationSheet.jsx's bell,
          so this reads as "a Capsula notification" rather than a generic
          alert. */}
      <div style={{
        width:           28,
        height:          28,
        flexShrink:      0,
        marginTop:       1,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-hero-bg)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Icon name="Bell" size={14} color="var(--color-accent)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {banner.title && (
          <p style={{
            margin:     0,
            fontSize:   14,
            fontWeight: 600,
            lineHeight: 1.4,
            color:      'var(--color-text-primary)',
          }}>
            {banner.title}
          </p>
        )}
        {banner.body && (
          <p style={{
            margin:     banner.title ? '2px 0 0' : 0,
            fontSize:   13,
            lineHeight: 1.4,
            color:      'var(--color-text-secondary)',
          }}>
            {banner.body}
          </p>
        )}
      </div>

      {/* Dismiss without triggering the tap action — mirrors swiping away
          a real notification (no click credited) rather than tapping it. */}
      <button
        onClick={e => { e.stopPropagation(); onDismiss(banner.id) }}
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
