/**
 * src/components/admin/Modal.jsx
 * Phase 3A — CMS Foundation
 *
 * Generic slide-up / overlay modal.
 *
 * Props:
 *   isOpen    boolean
 *   onClose   () => void
 *   title     string          — shown in header
 *   size      'sm' | 'md' | 'lg'  (default 'md')
 *   children  ReactNode
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const WIDTHS = { sm: 400, md: 560, lg: 760 }

export default function Modal({ isOpen, onClose, title, size = 'md', children }) {
  const overlayRef = useRef(null)

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const width = WIDTHS[size] ?? WIDTHS.md

  return (
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
        overflowY:       'auto',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width:           '100%',
          maxWidth:        width,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          display:         'flex',
          flexDirection:   'column',
          maxHeight:       'calc(100dvh - 48px)',
          overflow:        'hidden',
          fontFamily:      'var(--font-body)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         'var(--space-4) var(--space-5)',
          borderBottom:    '1px solid var(--color-border)',
          flexShrink:      0,
        }}>
          <span style={{
            fontSize:   16,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              color:       'var(--color-text-tertiary)',
              display:     'flex',
              alignItems:  'center',
              padding:     4,
              borderRadius: 'var(--radius-sm)',
              transition:  'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{
          overflowY: 'auto',
          padding:   'var(--space-5)',
          flex:      1,
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}
