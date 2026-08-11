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
 *     sheet is always reachable from the bell and shows the real error
 *     inline, so the toggle can simply be retried.
 *   - Status shown here comes from usePushSubscription's real,
 *     server-re-verified state (checked on mount whenever permission is
 *     already granted), not a stale local-only flag.
 *   - Has no attempt cap at all — nothing here can run out.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePushSubscription } from '../../hooks/usePushSubscription'

export default function NotificationSheet({ isOpen, onClose }) {
  const overlayRef = useRef(null)
  const {
    supported, subscribed, permission, loading, error,
    subscribeToPush, unsubscribeFromPush,
  } = usePushSubscription()

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  // Optimistic override for the toggle's visual position. subscribeToPush/
  // unsubscribeFromPush only resolve after the real round trip (permission
  // prompt, Firebase token fetch, Supabase write) — same slow-toggle issue
  // NotificationsBanner.jsx already fixed with instant UI. null = show the
  // real `subscribed` value; true/false = show this instead until the real
  // call resolves, then drop back to null so `subscribed` takes over.
  const [optimistic, setOptimistic] = useState(null)
  const displayedSubscribed = optimistic !== null ? optimistic : subscribed

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
  const toggleDisabled = loading || blocked || !supported

  function handleToggle() {
    if (toggleDisabled) return
    const next = !displayedSubscribed
    setOptimistic(next)
    const action = displayedSubscribed ? unsubscribeFromPush : subscribeToPush
    action().finally(() => setOptimistic(null))
  }

  let statusText = 'Notifications are off'
  if (!supported) statusText = 'Not supported on this device'
  else if (blocked) statusText = 'Blocked in your browser settings'
  else if (displayedSubscribed) statusText = 'Notifications are on'

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
          maxWidth:        360,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          padding:         'var(--space-5)',
          fontFamily:      'var(--font-body)',
          opacity:         animateIn ? 1 : 0,
          transform:       animateIn ? 'scale(1)' : 'scale(0.96)',
          transition:      'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle)',
        }}
      >
        <div style={{
          fontSize:     16,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          Notifications
        </div>

        <p style={{
          margin:     '0 0 var(--space-5)',
          fontSize:   14,
          lineHeight: 1.55,
          color:      'var(--color-text-secondary)',
        }}>
          Get notified the moment there's new drug or condition info.
        </p>

        {blocked && (
          <p style={{
            margin:     '0 0 var(--space-4)',
            fontSize:   13,
            lineHeight: 1.5,
            color:      'var(--color-text-secondary)',
          }}>
            Notifications are blocked for this site at the browser level.
            Enable them in your browser's site settings, then reopen this
            to turn them on here.
          </p>
        )}

        {error && (
          <div style={{
            fontSize:        13,
            color:           '#DC2626',
            backgroundColor: '#FEF2F2',
            border:          '1px solid #FECACA',
            borderRadius:    'var(--radius-sm)',
            padding:         'var(--space-2) var(--space-3)',
            lineHeight:      1.4,
            marginBottom:    'var(--space-4)',
          }}>
            {error}
          </div>
        )}

        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            'var(--space-3)',
          marginBottom:   'var(--space-5)',
          opacity:        (!supported || blocked) ? 0.5 : 1,
        }}>
          <span style={{
            fontSize:   14,
            fontWeight: 500,
            color:      'var(--color-text-primary)',
          }}>
            {statusText}
          </span>

          {/* Toggle switch — same styling as BrandEditor.jsx's publish toggle,
              reused here for visual consistency rather than a new pattern. */}
          <button
            type="button"
            role="switch"
            aria-checked={displayedSubscribed}
            aria-label={displayedSubscribed ? 'Turn notifications off' : 'Turn notifications on'}
            onClick={handleToggle}
            disabled={toggleDisabled}
            style={{
              width: 32, height: 18,
              borderRadius: 9,
              border: 'none',
              backgroundColor: displayedSubscribed ? 'var(--color-accent)' : 'var(--color-border)',
              position: 'relative',
              cursor: toggleDisabled ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              flexShrink: 0,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2, left: displayedSubscribed ? 15 : 2,
              width: 14, height: 14,
              borderRadius: '50%',
              backgroundColor: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

