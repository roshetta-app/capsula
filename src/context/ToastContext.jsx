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
 * 2026-10-04 (search mode toast): two additions, nothing existing changes.
 *   toast.custom(message, { color, icon, duration })
 *       'message' can be plain text or a small piece of JSX (for example with
 *       one word in bold).
 *       A toast in a colour the caller picks (any CSS colour or theme variable,
 *       white text on it) with its own icon: 'icon' is a Lucide component
 *       (for example Tag), drawn white. Both are optional; with no colour it
 *       looks like toast.info.
 *   toast.dismiss(id)
 *       Closes a toast early. Every toast call returns its id, so a caller
 *       that shows a toast for a setting can close the earlier one first and
 *       the stack never piles up.
 *
 * Icon update (offline-banner-pro-refine session) — toast icons were
 * plain unicode characters (checkmark, cross, triangle, info glyph),
 * which broke Icon.jsx's own app-wide rule ('always use <Icon>, never a
 * raw glyph/svg'). Swapped to <Icon> with a Lucide name per type, same
 * fix already applied to the old offline banner.
 *
 * 2026-11-09 (toast refinement): the stack could grow without limit when a
 * toast was fired repeatedly (fast taps, retries). Now:
 *   - the same message (same type + same text) never stacks: the toast that
 *     is already showing gets a small pulse and its timer restarts;
 *   - at most 2 toasts are visible; a third pushes the oldest one out;
 *   - each toast leaves with its own exit animation (it used to just vanish);
 *   - display time follows the text length, and errors stay a little longer;
 *   - tap, or swipe it away sideways or down, to dismiss;
 *   - motion follows the phone's reduce-motion setting.
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Icon from '../components/ui/Icon'

const ToastContext = createContext(null)

let _nextId = 1

const MAX_VISIBLE = 2
const EXIT_MS = 240

// Longer text stays longer; errors always get a bit more time to be read.
function defaultDuration(type, message) {
  const base = type === 'error' ? 4500 : 2800
  if (typeof message !== 'string') return base
  return base + Math.min(1500, Math.max(0, message.length - 30) * 30)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  const liveIds = useRef([])   // toasts that are showing (not leaving), oldest first
  const byKey = useRef({})     // 'type|text' -> id, for toasts that are showing
  const idKey = useRef({})     // id -> 'type|text'

  const dismiss = useCallback((id) => {
    if (!liveIds.current.includes(id)) return
    liveIds.current = liveIds.current.filter(x => x !== id)
    clearTimeout(timers.current[id])
    delete timers.current[id]
    const k = idKey.current[id]
    if (k) { delete byKey.current[k]; delete idKey.current[id] }
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), EXIT_MS)
  }, [])

  const add = useCallback((type, message, duration, extra = null) => {
    const ms = duration ?? defaultDuration(type, message)
    const key = typeof message === 'string' ? `${type}|${extra?.color ?? ''}|${message}` : null

    // Same message already showing: pulse it and restart its timer. No new toast.
    if (key && byKey.current[key] != null) {
      const id = byKey.current[key]
      clearTimeout(timers.current[id])
      timers.current[id] = setTimeout(() => dismiss(id), ms)
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, pulse: t.pulse + 1 } : t)))
      return id
    }

    const id = _nextId++
    liveIds.current = [...liveIds.current, id]
    if (key) { byKey.current[key] = id; idKey.current[id] = key }
    setToasts(prev => [...prev, { id, type, message, pulse: 0, leaving: false, ...extra }])
    timers.current[id] = setTimeout(() => dismiss(id), ms)

    // Keep the stack short: push the oldest out.
    while (liveIds.current.length > MAX_VISIBLE) dismiss(liveIds.current[0])
    return id
  }, [dismiss])

  const toast = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
    custom:  (msg, { color, icon, duration } = {}) => add('info', msg, duration, { color, icon }),
    dismiss,
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
  const { bg: typeBg, iconName } = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info
  const bg = toast.color ?? typeBg
  const CustomIcon = toast.icon

  // Drag to dismiss (sideways or down). A touch that barely moves is a tap.
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const start = useRef(null)

  function onPointerDown(e) {
    start.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ x: 0, y: 0, active: true })
  }
  function onPointerMove(e) {
    if (!start.current) return
    setDrag({
      x: e.clientX - start.current.x,
      y: Math.max(0, e.clientY - start.current.y), // no dragging upward
      active: true,
    })
  }
  function onPointerUp() {
    if (!start.current) return
    const { x, y } = drag
    start.current = null
    if (Math.abs(x) > 70 || y > 40 || (Math.abs(x) < 6 && y < 6)) {
      onDismiss(toast.id)
    } else {
      setDrag({ x: 0, y: 0, active: false })
    }
  }
  function onPointerCancel() {
    start.current = null
    setDrag({ x: 0, y: 0, active: false })
  }

  const dist = Math.max(Math.abs(drag.x), drag.y)
  const dragOpacity = drag.active ? Math.max(0.35, 1 - dist / 160) : 1

  return (
    <div
      data-cap-toast
      style={{
        width: '100%',
        pointerEvents: toast.leaving ? 'none' : 'auto',
        touchAction: 'none',
        transform: `translate(${drag.x}px, ${drag.y}px)`,
        opacity: dragOpacity,
        transition: drag.active ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
        animation: toast.leaving ? `cap-toast-out ${EXIT_MS}ms ease-in forwards` : 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        key={toast.pulse}
        data-cap-toast
        role="status"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '12px var(--space-4)',
          borderRadius: 14,
          backgroundColor: bg,
          color: '#fff',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'var(--font-body)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.12)',
          animation: toast.pulse > 0
            ? 'cap-toast-pulse 0.3s ease-out'
            : 'cap-toast-in 0.34s cubic-bezier(0.2, 0.9, 0.25, 1.1)',
          width: '100%',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {CustomIcon
          ? <CustomIcon size={16} color="#fff" style={{ flexShrink: 0 }} />
          : <Icon name={iconName} size={16} color="#fff" />}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      </div>
    </div>
  )
}
