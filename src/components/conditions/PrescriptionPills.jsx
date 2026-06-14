import { useState, useEffect, useRef } from 'react'

/**
 * PrescriptionPills — dropdown selector for choosing between prescription sheets.
 *
 * Phase 1.2 (fixed):
 *  - Inline SVG icons only — no Tabler/FontAwesome classes
 *  - Uses real CSS vars: --color-border, --color-border-subtle (not -secondary/-tertiary)
 *  - Outside-click closes the dropdown via useEffect document listener
 *  - z-index on dropdown list to prevent being occluded
 *  - Only rendered when sheets.length >= 2 (enforced by parent PrescriptionsTab)
 *
 * Props:
 *   prescriptions   { id, label }[]
 *   activeIndex     number
 *   onSelect        (index: number) => void
 */

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function IconFileText({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconChevronDown({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconChevronUp({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function IconCheck({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconDot({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrescriptionPills({ prescriptions, activeIndex, onSelect }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  if (!prescriptions?.length) return null

  const selected = prescriptions[activeIndex] ?? prescriptions[0]

  function handleSelect(i) {
    onSelect(i)
    setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{ marginBottom: 'var(--space-4)', position: 'relative' }}
    >
      {/* Micro-label */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
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
          border: `1.5px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: open ? '10px 10px 0 0' : '10px',
          borderBottom: open ? 'none' : undefined,
          background: 'var(--color-surface)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* Left: icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconFileText
            size={16}
            color={open ? 'var(--color-accent)' : 'var(--color-text-tertiary)'}
          />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            {selected.label}
          </span>
        </div>

        {/* Right: chevron */}
        {open
          ? <IconChevronUp size={16} color="var(--color-accent)" />
          : <IconChevronDown size={16} color="var(--color-text-tertiary)" />
        }
      </button>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          zIndex: 60,
          border: '1.5px solid var(--color-accent)',
          borderTop: '1px solid var(--color-border-subtle)',
          borderRadius: '0 0 10px 10px',
          background: 'var(--color-surface)',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-light)' : 'none',
                  border: 'none',
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'background 0.1s ease',
                }}
              >
                {/* Left: dot or check icon + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isActive
                    ? <IconCheck size={15} color="var(--color-accent)" />
                    : <IconDot size={15} color="var(--color-border)" />
                  }
                  <span>{rx.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
