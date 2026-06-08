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
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react'

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

  const add = useCallback((type, message, duration = 3000) => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, type, message }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
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

// ── Visual stack ──────────────────────────────────────────────────────────────

const TYPE_STYLES = {
  success: { bg: '#16a34a', icon: '✓' },
  error:   { bg: '#dc2626', icon: '✕' },
  warning: { bg: '#d97706', icon: '⚠' },
  info:    { bg: '#2563eb', icon: 'ℹ' },
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
  const { bg, icon } = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info

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
      onClick={() => onDismiss(toast.id)}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  )
}
