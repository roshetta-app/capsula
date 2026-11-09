import { useState, useEffect, useRef } from 'react'
import { ClipboardPlus, Check, ChevronDown } from 'lucide-react'

/**
 * PrescriptionPills — selector for choosing between treatment plans.
 *
 * RESTRUCTURE (2026-11-09): the old control was a plain white card with a
 * tiny floating label, so it read as one more content block. It is now an
 * unmistakable control, still inline at the top of the tab (not in the
 * header, no chips, no bottom sheet):
 *
 *   TRIGGER — a filled, accent-tinted button with a visible accent outline.
 *     Left: solid accent badge with the clipboard icon. Middle: a small
 *     "Tap to change" caption over the plan name in bold primary
 *     text. Right: a round chevron button. The fill + badge + round chevron
 *     are what make it look tappable instead of like a card.
 *
 *   MENU — a separate floating panel 6px below the trigger (no shared
 *     border trick), with its own elevated shadow. It overlays the page and
 *     never pushes content down. Rows are 48px+ touch targets, rounded,
 *     with a radio ring on the left (filled with a check when active) and
 *     an accent tint on the active row. No hairlines between rows.
 *
 * Props are unchanged: { prescriptions: [{id, label}], activeIndex, onSelect }.
 */

export default function PrescriptionPills({ prescriptions, activeIndex, onSelect }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pressed, setPressed] = useState(false)
  const containerRef = useRef(null)
  const unmountTimer = useRef(null)

  // Keep the menu in the DOM for one transition cycle after close so the
  // fade/scale plays on the way out instead of snapping away.
  useEffect(() => {
    if (open) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
      setMounted(true)
    } else if (mounted) {
      unmountTimer.current = setTimeout(() => setMounted(false), 160)
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside tap/click and on Escape
  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!prescriptions?.length) return null

  const safeIndex = prescriptions[activeIndex] ? activeIndex : 0
  const selected = prescriptions[safeIndex]

  function handleSelect(i) {
    onSelect(i)
    setOpen(false)
  }

  const accentText = 'var(--color-accent-text, var(--color-accent))'
  const accentSolid = 'var(--color-accent-solid, var(--color-accent))'

  return (
    // Selector section — a full-width white sheet under the page header, same
    // look as the header (white surface, soft shadow, rounded corners). It
    // breaks out of the content column's side padding and pulls up toward the
    // header so the page reads as three zones: header, selector, content.
    <div
      style={{
        margin: 'calc(var(--space-5) * -1 + var(--space-3)) calc(var(--space-6) * -1) var(--space-5)',
        padding: 'var(--space-4) var(--space-6)',
        background: 'var(--color-surface)',
        borderRadius: 18,
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      }}
    >
    <div
      ref={containerRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        position: 'relative',
        zIndex: open ? 56 : 'auto',
      }}
    >
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${selected.label}. Tap to change.`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 56,
          padding: '8px 10px 8px 10px',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          boxSizing: 'border-box',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          background: open
            ? 'var(--color-accent-hover, var(--color-accent-solid, var(--color-accent)))'
            : accentSolid,
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 6px 16px color-mix(in srgb, var(--color-accent) 32%, transparent)',
          transform: pressed ? 'scale(0.992)' : 'scale(1)',
          transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.12s ease',
        }}
      >
        {/* Icon badge */}
        <span style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.18)',
          color: '#fff',
        }}>
          <ClipboardPlus size={18} strokeWidth={2} aria-hidden="true" />
        </span>

        {/* Caption + plan name */}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'rgba(255,255,255,0.8)',
          }}>
            Tap to change
          </span>
          <span
            dir="auto"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              overflowWrap: 'anywhere',
              fontSize: 16,
              lineHeight: 1.25,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              color: '#fff',
            }}
          >
            {selected.label}
          </span>
        </span>

        {/* Round chevron button */}
        <span style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-full, 9999px)',
          background: 'var(--color-surface)',
          color: accentText,
        }}>
          <ChevronDown
            size={18}
            strokeWidth={2.2}
            aria-hidden="true"
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s ease',
            }}
          />
        </span>
      </button>

      {/* ── Menu — floats over the page, never pushes content down ─────── */}
      {mounted && (
        <div
          role="listbox"
          aria-label="Options"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 6px)',
            zIndex: 56,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
            maxHeight: '60vh',
            overflowY: 'auto',
            transformOrigin: 'top',
            opacity: open ? 1 : 0,
            transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.96) translateY(-4px)',
            transition: 'opacity 0.16s ease, transform 0.16s ease',
          }}
        >
          {prescriptions.map((rx, i) => {
            const isActive = i === safeIndex
            return (
              <button
                key={rx.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 48,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  background: isActive
                    ? 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))'
                    : 'transparent',
                  border: 'none',
                  borderRadius: 12,
                  boxSizing: 'border-box',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                  transition: 'background 0.1s ease',
                }}
              >
                {/* Radio ring — filled with a check when active */}
                <span style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  boxSizing: 'border-box',
                  background: isActive ? accentSolid : 'transparent',
                  border: isActive ? 'none' : '1.5px solid var(--color-border)',
                  color: '#fff',
                }}>
                  {isActive && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span dir="auto" style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                  {rx.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>

    </div>
  )
}
