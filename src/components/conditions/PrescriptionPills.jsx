import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown } from 'lucide-react'

/**
 * PrescriptionPills — selector for choosing between treatment plans.
 *
 * RESTRUCTURE (2026-11-09): the old control was a plain white card with a
 * tiny floating label, so it read as one more content block. It is now an
 * unmistakable control, still inline at the top of the tab (not in the
 * header, no chips, no bottom sheet):
 *
 *   TRIGGER — a filled accent button. Left: the plan name in bold white
 *     text (no icon, no caption — simplified 2026-11-09). Right: a round
 *     chevron button. The fill + round chevron are what make it look
 *     tappable instead of like a card.
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
  // entered: flips one frame after the menu mounts, so the blur and the menu
  // actually animate in (mounting already-open would just snap).
  const [entered, setEntered] = useState(false)
  // Where the blur starts: just under the sticky page header, so the header
  // stays sharp. Measured each time the menu opens.
  const [scrimTop, setScrimTop] = useState(0)
  const containerRef = useRef(null)
  const unmountTimer = useRef(null)

  // Keep the menu in the DOM for one transition cycle after close so the
  // fade/scale plays on the way out instead of snapping away.
  useEffect(() => {
    if (open) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
      setMounted(true)
    } else if (mounted) {
      unmountTimer.current = setTimeout(() => setMounted(false), 240)
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      const h = document.querySelector('header')
      setScrimTop(h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0)
    }
  }, [open])

  useEffect(() => {
    if (!open) { setEntered(false); return }
    if (!mounted) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(id)
  }, [open, mounted])

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
    <>
    <div
      ref={containerRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        position: 'relative',
        marginBottom: 'var(--space-4)',
        zIndex: open ? 56 : 'auto',
      }}
    >
      {/* ── Blur scrim — softly blurs and dims the page behind the open menu.
          Sits behind the trigger and menu (same stacking context), fades and
          blurs in/out with the menu; tapping it closes the menu. ───────── */}
      {mounted && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            top: scrimTop,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            background: entered
              ? 'color-mix(in srgb, var(--color-bg) 38%, transparent)'
              : 'color-mix(in srgb, var(--color-bg) 0%, transparent)',
            backdropFilter: entered ? 'blur(7px)' : 'blur(0px)',
            WebkitBackdropFilter: entered ? 'blur(7px)' : 'blur(0px)',
            transition: 'background 0.24s ease, backdrop-filter 0.24s ease, -webkit-backdrop-filter 0.24s ease',
            pointerEvents: open ? 'auto' : 'none',
          }}
        />
      )}

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
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 52,
          padding: '8px 10px 8px 18px',
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
        {/* Plan name — the round chevron on the right is the tap cue, so no
            icon badge or "Tap to change" caption (aria-label still says it). */}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
            opacity: entered ? 1 : 0,
            transform: entered ? 'scaleY(1) translateY(0)' : 'scaleY(0.96) translateY(-6px)',
            transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
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

    {/* Divider — marks where the selector ends and the plan's content begins */}
    <div
      aria-hidden="true"
      style={{
        height: 1,
        margin: '0 var(--space-1) var(--space-4)',
        background: 'linear-gradient(to right, transparent, var(--color-border) 12%, var(--color-border) 88%, transparent)',
      }}
    />
    </>
  )
}
