/**
 * PrescriptionPills — horizontal scrollable prescription label pills.
 *
 * Phase 2D spec:
 *  - Compact 6px top/bottom padding
 *  - Active: filled primary. Inactive: outline/ghost.
 *  - Touch events stopped so pill-area scroll doesn't trigger tab swipe.
 *
 * Props:
 *   prescriptions   PrescriptionFull[]
 *   activeIndex     number
 *   onSelect        (index: number) => void
 */
export default function PrescriptionPills({ prescriptions, activeIndex, onSelect }) {
  if (!prescriptions?.length) return null

  return (
    <div
      // Block swipe-to-switch-tabs while scrolling pills horizontally
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        paddingTop: 6,
        paddingBottom: 6,
        marginBottom: 'var(--space-4)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {prescriptions.map((rx, i) => {
        const isActive = i === activeIndex
        return (
          <button
            key={rx.id}
            onClick={() => onSelect(i)}
            style={{
              flexShrink: 0,
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: isActive
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid var(--color-border)',
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            {rx.label}
          </button>
        )
      })}
    </div>
  )
}
