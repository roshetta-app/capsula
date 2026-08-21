/**
 * src/components/ui/InfoSheet.jsx
 * Phase F13 Mini-stage 5 (Account redesign)
 *
 * Read-only sibling of ConfirmSheet.jsx — same portal/animation/token
 * pattern (portal to body, shouldRender/animateIn delayed-unmount, fade +
 * scale entrance), but with a single "Close" button instead of a
 * Cancel/Confirm pair, since this is a display-only surface (About App
 * content: logo, version, links) rather than a decision the person is
 * making. Not a prop added to ConfirmSheet itself — that component's whole
 * shape (title/message/confirmLabel/destructive) is built around an
 * action being confirmed, and bolting a "no confirm button" mode onto it
 * would make every ConfirmSheet caller carry a branch it doesn't need.
 *
 * Props:
 *   isOpen    boolean
 *   onClose   () => void
 *   title     string
 *   children  ReactNode   — arbitrary content (logo, version text, links),
 *                            not just a plain message string like ConfirmSheet.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function InfoSheet({ isOpen, onClose, title, children }) {
  const overlayRef = useRef(null)

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

  // Rendered via portal to document.body — same reasoning as ConfirmSheet/
  // AccountSheet/NotificationSheet: position: fixed only resolves against
  // the viewport if no ancestor has a transform/filter/etc that creates
  // its own containing block.
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
            fontSize:     16,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            {title}
          </div>
        )}

        <div style={{
          fontSize:     14,
          lineHeight:   1.55,
          color:        'var(--color-text-secondary)',
          marginBottom: 'var(--space-5)',
        }}>
          {children}
        </div>

        <button
          onClick={onClose}
          style={{
            width:           '100%',
            padding:         'var(--space-2) var(--space-4)',
            borderRadius:    'var(--radius-sm)',
            border:          'none',
            backgroundColor: 'var(--color-accent)',
            color:           '#fff',
            fontSize:        14,
            fontWeight:      600,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  )
}
