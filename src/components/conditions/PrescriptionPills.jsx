import { useState, useEffect, useRef } from 'react'

/**
 * PrescriptionPills — dropdown selector for choosing between prescription sheets.
 *
 * Changes:
 *  - Micro-label changed from "Select protocol" → "Treatment options" to better
 *    convey that the list may contain different scenarios, severities, or drug choices
 *    for the same condition — not just protocol variants.
 *  - Trigger icon changed from writing hand → green dot to signal the active /
 *    selected prescription sheet at a glance, consistent with status-dot conventions.
 *
 * Fixes:
 *  - Closed state: bottom border was missing because `borderBottom: open ? 'none' : undefined`
 *    resolves to `undefined` (no style), which browser inherits as the shorthand border's bottom.
 *    Fixed by always setting an explicit borderBottom value.
 *  - Removed marginBottom so the gap between dropdown and first sheet row is controlled
 *    by the sheet itself (tighter layout).
 */

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

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

/** Green status dot — indicates the currently active prescription sheet */
function ActiveDot() {
  return (
    <span style={{
      display: 'inline-block',
      width: 9,
      height: 9,
      borderRadius: '50%',
      backgroundColor: '#22c55e',
      flexShrink: 0,
    }} />
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
      style={{ marginBottom: 'var(--space-3)', position: 'relative' }}
    >
      {/* Micro-label — describes what the dropdown contains */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: 4,
        fontFamily: 'var(--font-body)',
      }}>
        Treatment options
      </div>

      {/* Trigger box */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          borderTop:    `1.5px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderLeft:   `1.5px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRight:  `1.5px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderBottom: open ? 'none' : `1.5px solid var(--color-border)`,
          borderRadius: open ? '10px 10px 0 0' : '10px',
          background: 'var(--color-surface)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* Left: green active dot + selected label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ActiveDot />
          <span style={{
            fontSize: 13,
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
