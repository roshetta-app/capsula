import { useState } from 'react'

/**
 * PrescriptionPills — dropdown selector for choosing between prescription sheets.
 *
 * Phase 1.2 spec:
 *  - Micro-label "Select protocol" above the trigger box
 *  - Full-width trigger box with ti-file-text icon + selected label + chevron
 *  - Open state: trigger border becomes accent, bottom corners flatten, chevron flips
 *  - Dropdown list flushes below trigger with accent border on sides/bottom
 *  - Active item: accent color + fontWeight 500 + ti-check icon right-aligned
 *  - Clicking trigger toggles; clicking item selects and closes
 *  - Only rendered when sheets.length >= 2 (enforced by parent PrescriptionsTab)
 *  - Touch events stopped so horizontal scroll doesn't trigger tab swipe
 *
 * Props:
 *   prescriptions   { id, label }[]
 *   activeIndex     number
 *   onSelect        (index: number) => void
 */
export default function PrescriptionPills({ prescriptions, activeIndex, onSelect }) {
  const [open, setOpen] = useState(false)

  if (!prescriptions?.length) return null

  const selected = prescriptions[activeIndex] ?? prescriptions[0]

  function handleSelect(i) {
    onSelect(i)
    setOpen(false)
  }

  return (
    <div
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{ marginBottom: 'var(--space-4)' }}
    >
      {/* Micro-label */}
      <div style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: 6,
        fontFamily: 'var(--font-body)',
      }}>
        Select protocol
      </div>

      {/* Trigger box */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 14px',
          border: `0.5px solid ${open ? 'var(--color-accent)' : 'var(--color-border-secondary)'}`,
          borderRadius: open
            ? 'var(--radius-md) var(--radius-md) 0 0'
            : 'var(--radius-md)',
          borderBottom: open ? 'none' : `0.5px solid ${open ? 'var(--color-accent)' : 'var(--color-border-secondary)'}`,
          background: 'var(--color-surface)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-file-text" style={{ fontSize: 15, color: 'var(--color-text-tertiary)' }} />
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}>
            {selected.label}
          </span>
        </div>

        {/* Right: chevron */}
        <i
          className={open ? 'ti ti-chevron-up' : 'ti ti-chevron-down'}
          style={{
            fontSize: 16,
            color: open ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          }}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div style={{
          border: '0.5px solid var(--color-accent)',
          borderTop: '0.5px solid var(--color-border-tertiary)',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          background: 'var(--color-surface)',
          overflow: 'hidden',
        }}>
          {prescriptions.map((rx, i) => {
            const isActive = i === activeIndex
            const isLast = i === prescriptions.length - 1
            return (
              <button
                key={rx.id}
                onClick={() => handleSelect(i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-tertiary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <span>{rx.label}</span>
                {isActive && (
                  <i className="ti ti-check" style={{ fontSize: 15, color: 'var(--color-accent)' }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
