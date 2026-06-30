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
 * Dropdown floats over the page (position: absolute) instead of pushing the
 * content below it down. It's flush against the trigger (no gap) and shares
 * the trigger's white background and corner radius so the two read as one
 * continuous card growing downward; when open, the trigger's bottom corners
 * square off and the dropdown's bottom corners round, so the seam between
 * them is invisible. Only the active plan keeps an accent-tinted background
 * on its own row; inactive rows are plain, divided by hairlines.
 *
 * Open-state affordance: when open, a 2px accent-blue border wraps the
 * entire merged shape (trigger + dropdown) so it's unambiguous the control
 * is expanded. The dropdown is position:absolute (overlays the page rather
 * than pushing content down), so the border is necessarily split across
 * the two elements; the trigger's bottom edge and the dropdown both
 * transition on the same synced clock so they read as one continuous
 * border opening/closing together rather than two pieces moving independently.
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
  const [mounted, setMounted] = useState(false)
  const [pressed, setPressed] = useState(false)
  const containerRef = useRef(null)
  const unmountTimer = useRef(null)

  // Keep the dropdown in the DOM for one transition cycle after `open` goes
  // false, so the scale/fade transition can actually play on close instead
  // of the panel snapping away with the hard `{open && ...}` conditional.
  useEffect(() => {
    if (open) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
      setMounted(true)
    } else if (mounted) {
      unmountTimer.current = setTimeout(() => setMounted(false), 180)
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Ambient shadow lives only on the trigger card — the dropdown has none,
  // per the floating-but-seamless treatment.
  const containerShadow = pressed
    ? '0 1px 1px rgba(0,0,0,0.02)'
    : '0 1px 2px rgba(0,0,0,0.04)'

  // Single source of truth for the trigger's background, reused for its
  // bottom border color when open (see note below) — keeps the button's
  // rendered height exactly constant between open/closed states, instead of
  // a removed border edge shrinking it by 2px and nudging the sheet content
  // beneath the whole control up/down.
  const triggerBg = pressed
    ? 'color-mix(in srgb, var(--color-text-primary) 4%, var(--color-surface) 96%)'
    : 'var(--color-surface)'

  return (
    <div
      ref={containerRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        marginBottom: 'var(--space-2)',
        position: 'relative',
        zIndex: open ? 56 : 'auto',
      }}
    >
      {/* Trigger card — floating-label field, same shape as SpecialtySelector.
          Bottom corners square off when open so it visually fuses with the
          dropdown directly beneath it. A 2px accent border appears when open,
          continuing into the dropdown below, to make the expanded state
          unambiguous.
          The dropdown below is position:absolute (floats over the page,
          doesn't push content down), so it sits outside this element's box
          model — there's no single parent box that could own one border
          spanning both pieces without measuring and re-positioning an
          overlay on every render. The border stays split across the two
          elements (as before), but now both pieces move on the same
          synced 0.18s clock as the dropdown's new scale/fade transition,
          so the seam reads as static/fused instead of one piece snapping
          while the other animates.
          LAYOUT-STABILITY FIX: the bottom border always stays 2px wide —
          when open it's colored to match the trigger's own background
          (invisible, fuses with the dropdown) rather than being removed
          entirely, which previously shrank the button's height by 2px and
          caused the sheet content below to visibly shift on open/close. */}
      <button
        onClick={() => setOpen(o => !o)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        aria-label={`Treatment plan: ${selected.label}. Tap to change.`}
        style={{
          position: 'relative',
          zIndex: 56,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          textAlign: 'left',
          padding: '9px 14px',
          background: triggerBg,
          border: open ? '2px solid var(--color-accent)' : '2px solid transparent',
          borderBottom: open ? `2px solid ${triggerBg}` : '2px solid transparent',
          borderRadius: open ? '16px 16px 0 0' : '16px',
          boxShadow: containerShadow,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'background-color 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
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
              transition: 'transform 0.18s ease',
            }}>
            <path d="M2 4.5L6 8.5L10 4.5"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Dropdown — floats over the page (absolute, flush against the
          trigger, no gap), so it overlays content below rather than pushing
          it down. Same white background as the trigger, top corners square
          (fuses with trigger above), bottom corners rounded. Shares the same
          2px accent border as the trigger when open (no border-top, so the
          seam between them is invisible — one continuous outlined shape).
          Kept mounted for one transition cycle past close (`mounted` state)
          so the scale/fade can play on the way out instead of the panel
          snapping away with a hard conditional. Scales/fades from the top,
          synced to the trigger's 0.18s border/background transition and the
          chevron's 0.18s rotation, so all three move together as one unit. */}
      {mounted && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '100%',
          zIndex: 56,
          border: '2px solid var(--color-accent)',
          borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          background: 'var(--color-surface)',
          overflow: 'hidden',
          transformOrigin: 'top',
          opacity: open ? 1 : 0,
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.96) translateY(-2px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}>
          {prescriptions.map((rx, i) => {
            const isActive = i === activeIndex
            const isLast = i === prescriptions.length - 1
            return (
              <button
                key={rx.id}
                onClick={() => handleSelect(i)}
                style={{
                  position: 'relative',
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

                {/* Divider — inset 2px from each side via absolute
                    positioning (rather than a native borderBottom that
                    would run edge-to-edge) so it never visually crosses
                    the outer accent border. */}
                {!isLast && (
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 2,
                    right: 2,
                    height: 1,
                    background: 'var(--color-border-subtle)',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
