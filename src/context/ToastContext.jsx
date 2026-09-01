/**
 * src/contexts/ToastContext.jsx
 * Phase 3A — Global toast provider. Wrap the app root once; use anywhere.
 *
 * Usage:
 *   const { toast } = useToast()
 *   toast.success('Saved')
 *   toast.error('Something went wrong')
 *   toast.warning('Check your input')
 *   toast.info('Refreshed')
 *
 * Icon update (offline-banner-pro-refine session) — toast icons were
 * plain unicode characters (checkmark, cross, triangle, info glyph),
 * which broke Icon.jsx's own app-wide rule ('always use <Icon>, never a
 * raw glyph/svg'). Swapped to <Icon> with a Lucide name per type, same
 * fix already applied to the old offline banner.
 *
 * Bug fix, 2026-09-01 (alarms-redirect-fix) — a toast can now optionally
 * be tapped to do something, not just dismiss. Pass an options object as
 * the second argument instead of a plain duration number:
 *   toast.info('New message', { onAction: () => navigate('/inbox') })
 *   toast.info('New message', { duration: 5000, onAction: () => {...} })
 * Every existing call site (a plain number or nothing as the second
 * argument) is unaffected and keeps behaving exactly as before — this
 * was added for usePushSubscription.js, which uses a toast to show a
 * push notification while the app is open, in place of a native
 * notification (see that file's header for why).
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Icon from '../components/ui/Icon'

const ToastContext = createContext(null)

let _nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Bug fix, 2026-09-01 (alarms-redirect-fix) — third argument can now be
  // either a plain duration number (existing behavior, unchanged) or an
  // options object of { duration, onAction }. onAction, if given, fires
  // when the toast itself is tapped, before it's dismissed.
  const add = useCallback((type, message, durationOrOptions) => {
    const isOptions = durationOrOptions !== null && typeof durationOrOptions === 'object'
    const duration = isOptions ? (durationOrOptions.duration ?? 3000) : (durationOrOptions ?? 3000)
    const onAction = isOptions ? durationOrOptions.onAction : undefined
    const id = _nextId++
    setToasts(prev => [...prev, { id, type, message, onAction }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = {
    success: (msg, durationOrOptions) => add('success', msg, durationOrOptions),
    error:   (msg, durationOrOptions) => add('error',   msg, durationOrOptions),
    warning: (msg, durationOrOptions) => add('warning', msg, durationOrOptions),
    info:    (msg, durationOrOptions) => add('info',    msg, durationOrOptions),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// -- Visual stack -----------------------------------------------------------

const TYPE_STYLES = {
  success: { bg: '#16a34a', iconName: 'CheckCircle2' },
  error:   { bg: '#dc2626', iconName: 'XCircle' },
  warning: { bg: '#d97706', iconName: 'AlertTriangle' },
  info:    { bg: '#2563eb', iconName: 'Info' },
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        pointerEvents: 'none',
        width: 'min(calc(100vw - var(--space-8)), 380px)',
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  const { bg, iconName } = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info

  return (
    <div
      role="status"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bg,
        color: '#fff',
        fontSize: 14,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        animation: 'toast-in 200ms ease',
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={() => {
        // Bug fix, 2026-09-01 (alarms-redirect-fix) — fire the toast's
        // optional onAction (e.g. deep-link navigation) before dismissing,
        // so a tap on a toast can do something, not just close it.
        toast.onAction?.()
        onDismiss(toast.id)
      }}
    >
      <Icon name={iconName} size={16} color="#fff" />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  )
}
