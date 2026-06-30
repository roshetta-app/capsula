import { useState, useEffect, useRef } from 'react'
import { ClipboardPlus } from 'lucide-react'

/**
 * PrescriptionPills — dropdown selector for choosing between prescription sheets.
 *
 * Trigger redesign — matches SpecialtySelector.jsx's floating-label field
 * pattern: a small "Treatment plans" label on top, an icon + selected name +
 * chevron value row below. Background is plain white (var(--color-surface)),
 * same as SpecialtySelector's idle state — no accent tint by default. The
 * green ActiveDot is replaced with a clipboard+cross icon (lucide
 * ClipboardPlus), accent-tinted.
 *
 * Dropdown is no longer a separate floating box. The chrome — background,
 * border radius, ambient shadow — now lives on ONE outer container shared by
 * the trigger and the dropdown rows, so opening the list reads as the same
 * card growing downward (continuous shape, single shadow) rather than two
 * stacked boxes. Outer corners stay rounded regardless of open state
 * (overflow: hidden clips the flat-edged rows inside to that shape).
 * Only the active plan keeps an accent-tinted background on its own row;
 * inactive rows are plain, divided by hairlines.
 */

// ─── Inline SVG icons (dropdown list only — trigger uses lucide ClipboardPlus) ─

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
  const [pressed, setPressed] = useState(false)
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

  // Single ambient shadow for the whole merged card (trigger + open rows),
  // matching SpecialtySelector's restrained treatment.
  const containerShadow = pressed
    ? '0 1px 1px rgba(0,0,0,0.02)'
    : '0 1px 2px rgba(0,0,0,0.04)'

  return (
    <div
      ref={containerRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        marginBottom: 'var(--space-2)',
        background: 'var(--color-surface)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: containerShadow,
        transition: 'box-shadow 0.12s ease',
      }}
    >
      {/* Trigger row — floating-label field, same shape as SpecialtySelector.
          No own background/radius/shadow — those live on the shared
          container above so the open dropdown reads as part of the same card. */}
      <button
        onClick={() => setOpen(o => !o)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        aria-label={`Treatment plan: ${selected.label}. Tap to change.`}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          textAlign: 'left',
          padding: '9px 14px',
          background: pressed
            ? 'color-mix(in srgb, var(--color-text-primary) 4%, var(--color-surface) 96%)'
            : 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'background-color 0.12s ease',
        }}
      >
        {/* Label — helper text, smallest element in the hierarchy */}
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 2,
        }}>
          Treatment plans
        </span>

        {/* Value row — icon, name, chevron. Vertically centered, left aligned. */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--color-accent)',
          }}>
            <ClipboardPlus size={16} strokeWidth={1.9} aria-hidden="true" />
          </span>

          <span style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-accent)',
            letterSpacing: '-0.2px',
          }}>
            {selected.label}
          </span>

          {/* Chevron — same path as SpecialtySelector for visual parity */}
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              color: 'var(--color-accent)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}>
            <path d="M2 4.5L6 8.5L10 4.5"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Dropdown rows — plain flow (not absolutely positioned), no own
          background/radius/shadow/border; clipped to the shared container's
          rounded corners via its overflow: hidden. Top hairline separates
          it from the trigger row. */}
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
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
