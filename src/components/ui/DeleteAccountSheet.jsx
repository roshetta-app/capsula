/**
 * src/components/ui/DeleteAccountSheet.jsx
 * profile-danger-zone (2026-08-23)
 *
 * Same shell/portal/entrance-animation as ConfirmSheet.jsx (fade + scale
 * 0.96 -> 1, delayed-unmount via shouldRender/animateIn, portaled to
 * document.body for the same reason ConfirmSheet is — an ancestor
 * transform/overflow could otherwise clip a fixed-position overlay), but
 * with a text field the person must type "DELETE" into before the confirm
 * button enables. Built as its own component rather than a ConfirmSheet
 * mode/variant — ConfirmSheet's contract (title/message/Cancel/Confirm)
 * stays simple for its other callers (e.g. Sign Out), and this is the
 * only place in the app that needs the extra type-to-confirm friction, by
 * explicit decision, since deleting an account can't be undone.
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   onConfirm   () => void        — only ever called once the typed value matches
 *   busy        boolean (default false) — shows a "Deleting…" label, disables the button
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const CONFIRM_WORD = 'DELETE'

export default function DeleteAccountSheet({ isOpen, onClose, onConfirm, busy = false }) {
  const overlayRef = useRef(null)
  const [typed, setTyped] = useState('')

  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setTyped('')
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, busy])

  if (!shouldRender) return null

  const canConfirm = typed === CONFIRM_WORD && !busy

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm()
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current && !busy) onClose() }}
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
        aria-label="Delete account"
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
          Delete your account?
        </div>

        <p style={{
          margin:     '0 0 var(--space-4)',
          fontSize:   14,
          lineHeight: 1.55,
          color:      'var(--color-text-secondary)',
        }}>
          This permanently deletes your profile, favourites, notes, and
          history. This can't be undone. Type <strong>DELETE</strong> below
          to confirm.
        </p>

        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          disabled={busy}
          placeholder="Type DELETE"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width:        '100%',
            boxSizing:    'border-box',
            padding:      'var(--space-3)',
            marginBottom: 'var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            border:       '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            color:        'var(--color-text-primary)',
            fontSize:     14,
            fontFamily:   'var(--font-body)',
          }}
        />

        <div style={{
          display:        'flex',
          justifyContent: 'flex-end',
          gap:            'var(--space-2)',
        }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding:         'var(--space-2) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color:           'var(--color-text-secondary)',
              fontSize:        14,
              fontWeight:      500,
              fontFamily:      'var(--font-body)',
              cursor:          busy ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding:         'var(--space-2) var(--space-4)',
              borderRadius:    'var(--radius-sm)',
              border:          'none',
              backgroundColor: 'var(--color-danger)',
              color:           '#fff',
              fontSize:        14,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          canConfirm ? 'pointer' : 'default',
              opacity:         canConfirm ? 1 : 0.5,
            }}
          >
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
