/**
 * src/components/admin/ConfirmModal.jsx
 * Phase 3A — Replaces every window.confirm() in the CMS.
 *
 * Props:
 *   isOpen         boolean
 *   onClose        () => void
 *   onConfirm      () => void
 *   title          string
 *   message        string
 *   confirmLabel   string        (default 'Confirm')
 *   confirmVariant 'danger' | 'primary'  (default 'primary')
 */

import Modal from './Modal'

const VARIANT_STYLES = {
  danger: {
    backgroundColor: 'var(--color-error, #ef4444)',
    color: '#fff',
    border: 'none',
  },
  primary: {
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    border: 'none',
  },
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title         = 'Are you sure?',
  message       = '',
  confirmLabel  = 'Confirm',
  confirmVariant = 'primary',
}) {
  function handleConfirm() {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {message && (
        <p style={{
          margin: '0 0 var(--space-5)',
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          {message}
        </p>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 'var(--space-2)',
        paddingTop: message ? 0 : 'var(--space-2)',
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
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            ...VARIANT_STYLES[confirmVariant],
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
