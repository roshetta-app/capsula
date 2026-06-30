import { useState, useEffect, useRef } from 'react'
import { ClipboardPlus } from 'lucide-react'

/**
 * PrescriptionPills — dropdown selector for choosing between prescription sheets.
 *
 * Trigger redesign — matches SpecialtySelector.jsx's floating-label field
 * pattern: a small "Treatment plans" label on top, an icon + selected name +
 * chevron value row below, on a filled accent-tinted card with no border and
 * an ambient shadow (replacing the previous bordered-button + separate
 * uppercase-label treatment). The green ActiveDot is replaced with a
 * clipboard+cross icon (lucide ClipboardPlus) — accent-tinted, since a
 * prescription sheet is always selected here (no idle/unselected state to
 * distinguish, unlike SpecialtySelector's optional filter, so the card stays
 * permanently tinted rather than toggling between idle/active looks).
 *
 * Dropdown menu — restyled to match the new trigger card (borderless,
 * rounded, shadow-lifted, floating slightly below the trigger) instead of
 * the old hard-bordered, sharp-cornered panel. Item rows, selection logic,
 * and outside-click handling are unchanged.
 *
 * Fixes (carried over):
 *  - Removed marginBottom so the gap between dropdown and first sheet row is
 *    controlled by the sheet itself (tighter layout).
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

  // Ambient shadow to lift the card off the page background, matching
  // SpecialtySelector's restrained treatment.
  const containerShadow = pressed
    ? '0 1px 1px rgba(0,0,0,0.02)'
    : '0 1px 2px rgba(0,0,0,0.04)'

  return (
    <div
      ref={containerRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{ marginBottom: 'var(--space-2)', position: 'relative' }}
    >
      {/* Trigger card — floating-label field, same shape as SpecialtySelector */}
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
            ? 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface) 90%)'
            : 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface) 96%)',
          border: 'none',
          borderRadius: '16px',
          boxShadow: containerShadow,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'background-color 0.12s ease, box-shadow 0.12s ease',
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

      {/* Dropdown list — restyled to match the trigger's new borderless,
          shadow-lifted card style (was a hard accent-bordered, sharp-cornered
          panel left over from the old bordered-button trigger). */}
      {open && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 'calc(100% + 4px)',
          zIndex: 60,
          border: 'none',
          borderRadius: '16px',
          background: 'var(--color-surface)',
          overflow: 'hidden',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
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
