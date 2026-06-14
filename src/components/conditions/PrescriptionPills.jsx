/**
 * PrescriptionPills — segmented control for selecting between prescription sheets.
 *
 * Phase 1.2 spec:
 *  - Single pill-shaped container housing all options (not loose separate pills)
 *  - Container background: color-border-subtle (very light gray)
 *  - Active option: filled color-accent, white text, border-radius 999px, 0.2s ease transition
 *  - Inactive option: transparent background, color-text-secondary text
 *  - Internal padding per option: 6px 16px
 *  - Container padding: 3px all sides (inset appearance)
 *  - Only rendered when sheets.length >= 2 (enforced by parent PrescriptionsTab)
 *  - Touch events stopped so horizontal scroll doesn't trigger tab swipe
 *
 * Props:
 *   prescriptions   { id, label }[]
 *   activeIndex     number
 *   onSelect        (index: number) => void
 */
export default function PrescriptionPills({ prescriptions, activeIndex, onSelect }) {
  if (!prescriptions?.length) return null

  return (
    <div
      // Block swipe-to-switch-tabs while interacting with segmented control
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        backgroundColor: 'var(--color-border-subtle)',
        borderRadius: 999,
        padding: 3,
        marginBottom: 'var(--space-4)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        maxWidth: '100%',
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
              borderRadius: 999,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              border: 'none',
              transition: 'background-color 0.2s ease, color 0.2s ease',
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
