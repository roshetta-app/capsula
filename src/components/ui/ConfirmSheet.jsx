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
 * Phase 3 (Back-Button & State-Audit merged plan) — two changes:
 *   1. Wired into useBackClose so back closes this dialog instead of
 *      changing the route. No drag gesture is added here (unlike the
 *      bottom sheets in this same phase) — this is a centered modal with
 *      no drag handle of its own, so step 3.2 doesn't apply to it.
 *   2. onConfirm may now return a promise. While it's pending, a local
 *      `busy` state disables both buttons and swaps the Confirm label for
 *      a busy label; onClose() only fires once the promise resolves. On
 *      rejection, the sheet stays open and shows a short failure message
 *      instead of closing. A synchronous onConfirm (returning undefined)
 *      behaves exactly as before — closes immediately, no busy state —
 *      so every existing caller keeps working unchanged.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   onConfirm     () => void | Promise<void>
 *   title         string
 *   message       string
 *   confirmLabel  string   (default 'Confirm')
 *   confirmingLabel string (default 'Working…') — shown on the Confirm
 *                 button while an async onConfirm's promise is pending.
 *   destructive   boolean  (default false)
 *   zIndex        number   (default 1000) — notes-photo-uploader-redesign:
 *                 lets a caller stack this dialog above another
 *                 already-open fixed-position overlay (specifically,
 *                 PersonalNotes.jsx's delete-photo confirm needs to sit
 *                 above Lightbox.jsx, whose own z-index is 9999 — higher
 *                 than this component's old hardcoded 1000, which would
 *                 otherwise leave the confirm dialog rendered but
 *                 invisible behind the fullscreen photo). Every existing
 *                 caller keeps the original default of 1000, completely
 *                 unchanged.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBackClose } from '../../hooks/useBackClose'

export default function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  message = '',
  confirmLabel = 'Confirm',
  confirmingLabel = 'Working…',
  destructive = false,
  zIndex = 1000,
}) {
  const overlayRef = useRef(null)

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  // Phase 3 async support — see file header. Reset whenever the sheet is
  // reopened for a new confirmation, so a previous failure message never
  // carries over into the next open.
  const [busy, setBusy]             = useState(false)
  const [failure, setFailure]       = useState(null)

  useBackClose(isOpen, !busy ? onClose : () => {})

  // Locks <html> scrolling while this dialog is open — matches
  // SheetShell.jsx's existing scroll-lock (see its file header for why
  // <html>, not <body>, is the element that actually scrolls in this
  // app). SheetShell's own history also tried touch-action: none and
  // position: fixed on top of this, both reverted because they broke a
  // sheet's own drag-to-close gesture — that risk doesn't apply here
  // since this dialog has no drag gesture of its own, so the plain
  // overflow: hidden lock is kept as-is, deliberately not layering on
  // either of those reverted attempts.
  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Mount first, then flip animateIn on the next frame so the
      // browser has painted the start-position before transitioning.
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
      setBusy(false)
      setFailure(null)
    } else {
      // Start exit transition immediately; unmount after it finishes.
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Close on Escape — disabled while a confirm is pending, same as the
  // buttons below, so a keyboard dismiss can't abandon an in-flight
  // action the person can't see the outcome of.
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, busy])

  if (!shouldRender) return null

  function handleConfirm() {
    if (busy) return
    const result = onConfirm()

    // Backward compatibility (3.5): a synchronous onConfirm returns
    // undefined here, so this branch is skipped entirely and the sheet
    // closes immediately, exactly as it always has.
    if (result && typeof result.then === 'function') {
      setBusy(true)
      setFailure(null)
      result.then(
        () => {
          setBusy(false)
          onClose()
        },
        () => {
          setBusy(false)
          setFailure('Check your connection and try again.')
        }
      )
      return
    }

    onClose()
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current && !busy) onClose()
  }

  function handleCancel() {
    if (busy) return
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
      onClick={handleOverlayClick}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex,
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

        {failure && (
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
            {failure}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-2)',
        }}>
          {/* Cancel */}
          <button
            onClick={handleCancel}
            disabled={busy}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: destructive ? 'var(--color-danger)' : 'var(--color-accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
