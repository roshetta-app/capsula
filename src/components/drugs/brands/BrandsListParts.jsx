/**
 * src/components/drugs/brands/BrandsListParts.jsx
 *
 * 2026-10-08 (refactor, phase 3): the small parts of BrandsList.jsx, moved here
 * word for word. No behaviour change.
 *
 *  - PillButton: the filter buttons (outline, or tinted when a filter is on).
 *  - SortButton: the quiet 'Sort' text control on the count line.
 *  - GradualList: draws long lists in batches as the person scrolls.
 *  - CountReporter: tells the screen around the list how many drugs show.
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowUpDown } from 'lucide-react'

// Tells the screen around the list how many drugs show now and how many there
// are in all (see onFilteredCount), without putting a hook after the list's
// early return. Renders nothing; clears itself when the list goes away.
export function CountReporter({ onCount, shown, total, active }) {
  useEffect(() => { onCount({ shown, total, active }) }, [onCount, shown, total, active])
  useEffect(() => () => onCount(null), [onCount])
  return null
}

// Long-list helper: draws the first FIRST_BATCH rows and adds NEXT_BATCH more
// whenever an invisible marker under the last drawn row comes within
// LOOK_AHEAD of the visible area, so rows are ready before the person gets
// there. 'renderRow(item, indexInFullList)' is the same row drawing the list
// used before, so the last real row still drops its divider line. The caller
// gives this a new key whenever the sort or filters change, which starts it
// again from the first batch.
const FIRST_BATCH = 30
const NEXT_BATCH  = 30
const LOOK_AHEAD  = '1200px'

// The nearest ancestor that scrolls (the sheet's list area), or null.
function findScrollParent(el) {
  let node = el?.parentElement
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

export function GradualList({ rows, renderRow }) {
  const [count, setCount] = useState(FIRST_BATCH)
  const markerRef = useRef(null)
  const shown = Math.min(count, rows.length)
  const hasMore = shown < rows.length

  // Watches the marker; each time more rows are drawn (shown changes) the
  // watch restarts, so a marker that is still near the visible area keeps
  // pulling in batches until it is far enough away.
  useEffect(() => {
    if (!hasMore) return undefined
    const marker = markerRef.current
    if (!marker || typeof IntersectionObserver === 'undefined') {
      // No way to watch (very old browser): draw everything, as before.
      setCount(rows.length)
      return undefined
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setCount(c => c + NEXT_BATCH)
      },
      { root: findScrollParent(marker), rootMargin: `0px 0px ${LOOK_AHEAD} 0px` }
    )
    observer.observe(marker)
    return () => observer.disconnect()
  }, [hasMore, shown, rows.length])

  return (
    <>
      {rows.slice(0, shown).map((item, i) => renderRow(item, i))}
      {hasMore && <div ref={markerRef} aria-hidden="true" style={{ height: 1 }} />}
    </>
  )
}

// Sort control: plain text with a small icon and chevron, no outline or fill,
// so it never reads as a filter. Same look whatever is chosen.
export function SortButton({ label, onPress }) {
  return (
    <button
      onClick={onPress}
      aria-haspopup="dialog"
      style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     4,
        flexShrink:              0,
        background:              'none',
        border:                  'none',
        padding:                 '6px 0 6px 8px',
        fontSize:                13,
        fontWeight:              500,
        color:                   'var(--color-text-secondary)',
        fontFamily:              'var(--font-body)',
        cursor:                  'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <ArrowUpDown size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
      <span>{label}</span>
      <ChevronDown size={13} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// The filter buttons. Inactive: plain outline. Active (a filter is
// applied): tinted accent pill with accent text and icon.
export function PillButton({ icon: Icon, label, active, disabled = false, flex = 1, fit = false, onPress }) {
  const [pressed, setPressed] = useState(false)
  const fg = active ? 'var(--color-accent)' : 'var(--color-text-primary)'
  return (
    <button
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      aria-haspopup="dialog"
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        flex:                    fit ? '0 0 auto' : flex,
        minWidth:                0,
        display:                 'flex',
        alignItems:              'center',
        gap:                     6,
        backgroundColor:         active ? 'var(--color-accent-light)' : 'var(--color-surface-muted)',
        border:                  `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius:            'var(--radius-full)',
        padding:                 '8px 12px',
        fontSize:                13,
        fontWeight:              active ? 600 : 500,
        color:                   fg,
        fontFamily:              'var(--font-body)',
        cursor:                  disabled ? 'default' : 'pointer',
        opacity:                 disabled ? 0.5 : 1,
        transform:               pressed ? 'scale(0.97)' : 'scale(1)',
        transition:              'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <Icon size={14} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} style={{ flexShrink: 0 }} />
      <span style={{
        flex: fit ? '0 1 auto' : 1, minWidth: 0, textAlign: 'left',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <ChevronDown
        size={14}
        color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
        style={{ flexShrink: 0 }}
      />
    </button>
  )
}
