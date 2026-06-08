/**
 * src/components/admin/Modal.jsx
 * Phase 3A — Base modal component. Replaces all inline overlays in CMS.
 *
 * Props:
 *   isOpen    boolean
 *   onClose   () => void
 *   title     string
 *   children  ReactNode
 *   size      'sm' | 'md' | 'lg' | 'xl'  (default 'md')
 */

import { useEffect, useRef } from 'react'

const SIZE_MAP = {
  sm: 400,
  md: 560,
  lg: 720,
  xl: 960,
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const panelRef = useRef(null)

  // ── Escape key ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── Focus trap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    function trapTab(e) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', trapTab)
    first?.focus()
    return () => document.removeEventListener('keydown', trapTab)
  }, [isOpen])

  // ── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          animation: 'modal-fade-in 150ms ease',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: SIZE_MAP[size] ?? SIZE_MAP.md,
          maxHeight: 'calc(100dvh - var(--space-8))',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          border: '1px solid var(--color-border)',
          animation: 'modal-scale-in 150ms ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            ×
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-5)',
        }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modal-fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-scale-in { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  )
}
