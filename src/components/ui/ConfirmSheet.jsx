/**
 * src/components/ui/ConfirmSheet.jsx
 *
 * Consumer-facing confirm dialog. Not a reuse of admin/Modal.jsx —
 * that component is CMS-scoped (400-760px desktop dialog widths,
 * hover-only close button affordance) and importing it here would pull
 * admin code into the patient-facing bundle. This follows the same
 * token language (surface / radius-lg / border) but is sized and
 * interaction-styled for the mobile app instead.
 *
 * Phase 10 — Added the same shouldRender/animateIn delayed-unmount
 *            pattern used by SpecialtiesBottomSheet, but with a fade +
 *            scale(0.96 -> 1) entrance instead of a slide, since this is
 *            a centered dialog rather than a bottom-anchored sheet. Uses
 *            --motion-base (200ms) rather than --motion-screen, since
 *            this is a small transient dialog, not a full-screen-level
 *            transition.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   onConfirm     () => void
 *   title         string
 *   message       string
 *   confirmLabel  string   (default 'Confirm')
 *   destructive   boolean  (default false)
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  message = '',
  confirmLabel = 'Confirm',
  destructive = false,
}) {
  const overlayRef = useRef(null)

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      // Mount first, then flip animateIn on the next frame so the
      // browser has painted the start-position before transitioning.
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      // Start exit transition immediately; unmount after it finishes.
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

  function handleConfirm() {
    onConfirm()
    onClose()
  }

  // Rendered via portal to document.body — position: fixed only resolves
  // against the viewport if no ancestor has a transform/filter/etc that
  // creates its own containing block. PersonalNotes lives inside the
  // condition detail page's tab-swipe wrapper (transform: translateX +
  // overflow: hidden), which would otherwise clip and mis-position this
  // overlay. Portaling to <body> sidesteps that ancestor entirely.
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
        aria-label={title}
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
        {title && (
          <div style={{
            fontSize:   16,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
            marginBottom: message ? 'var(--space-2)' : 'var(--space-5)',
          }}>
            {title}
          </div>
        )}

        {message && (
          <p style={{
            margin: '0 0 var(--space-5)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
          }}>
            {message}
          </p>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-2)',
        }}>
          {/* Cancel */}
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
            Cancel
          </button>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: destructive ? 'var(--color-danger)' : 'var(--color-accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
