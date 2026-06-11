/**
 * src/components/conditions/SpecialtyFilterPills.jsx
 * Phase 3 — Conditions Screen Redesign
 *
 * Horizontal scrollable row of specialty filter pills.
 * "All" is always first. Each pill shows emoji icon + short label.
 * When specialties.length >= OVERFLOW_THRESHOLD (5), chips beyond
 * index 4 are hidden and a "More" chip is appended.
 *
 * Props:
 *   specialties      [{ id, name, slug, iconName, colorHex }]
 *   activeSpecialty  string  — 'all' | specialty id
 *   onSelect         (id: string) => void
 *   onMoreTap        () => void  — called when "More" chip is tapped
 */

const FALLBACK_COLOR     = 'var(--color-accent)'
const OVERFLOW_THRESHOLD = 5

/**
 * Abbreviated display labels for known specialty slugs.
 * Falls back to specialty.name for anything not listed here.
 */
const SHORT_LABELS = {
  pediatrics:     'Peds',
  ophthalmology:  'Opth',
  dermatology:    'Derma',
  otolaryngology: 'ENT',
}

function pillStyle({ isActive, colorHex }) {
  const activeBg = colorHex ?? FALLBACK_COLOR
  return {
    flexShrink:              0,
    display:                 'flex',
    alignItems:              'center',
    gap:                     5,
    padding:                 '6px 14px',
    borderRadius:            'var(--radius-full)',
    fontSize:                13,
    fontWeight:              isActive ? 600 : 400,
    fontFamily:              'var(--font-body)',
    cursor:                  'pointer',
    transition:              'all 0.15s ease',
    border:                  isActive
      ? `1.5px solid ${activeBg}`
      : '1.5px solid var(--color-border)',
    backgroundColor:         isActive ? activeBg : 'var(--color-surface)',
    color:                   isActive ? '#ffffff' : 'var(--color-text-secondary)',
    outline:                 'none',
    WebkitTapHighlightColor: 'transparent',
  }
}

export default function SpecialtyFilterPills({
  specialties,
  activeSpecialty,
  onSelect,
  onMoreTap,
}) {
  if (!specialties || specialties.length === 0) return null

  const hasOverflow        = specialties.length >= OVERFLOW_THRESHOLD
  const visibleSpecialties = hasOverflow
    ? specialties.slice(0, OVERFLOW_THRESHOLD)
    : specialties

  return (
    <div style={{
      display:                 'flex',
      gap:                     'var(--space-2)',
      overflowX:               'auto',
      paddingBottom:           'var(--space-2)',
      marginBottom:            'var(--space-3)',
      scrollbarWidth:          'none',
      msOverflowStyle:         'none',
      WebkitOverflowScrolling: 'touch',
    }}>

      {/* "All" pill — always first */}
      <button
        onClick={() => onSelect('all')}
        style={pillStyle({ isActive: activeSpecialty === 'all', colorHex: null })}
      >
        All
      </button>

      {/* Visible specialty pills */}
      {visibleSpecialties.map(specialty => {
        const isActive   = activeSpecialty === specialty.id
        const colorHex   = specialty.colorHex ?? null
        const icon       = specialty.iconName  ?? null
        const shortLabel = SHORT_LABELS[specialty.slug] ?? specialty.name

        return (
          <button
            key={specialty.id}
            onClick={() => onSelect(specialty.id)}
            style={pillStyle({ isActive, colorHex })}
          >
            {icon && (
              <span style={{ fontSize: 13, lineHeight: 1, userSelect: 'none' }}>
                {icon}
              </span>
            )}
            {shortLabel}
          </button>
        )
      })}

      {/* "More" chip — only when count meets or exceeds OVERFLOW_THRESHOLD */}
      {hasOverflow && (
        <button
          onClick={onMoreTap}
          style={{
            flexShrink:              0,
            display:                 'flex',
            alignItems:              'center',
            padding:                 '6px 14px',
            borderRadius:            'var(--radius-full)',
            fontSize:                13,
            fontWeight:              400,
            fontFamily:              'var(--font-body)',
            cursor:                  'pointer',
            border:                  '1.5px solid var(--color-border)',
            backgroundColor:         'var(--color-surface)',
            color:                   'var(--color-text-secondary)',
            outline:                 'none',
            WebkitTapHighlightColor: 'transparent',
            transition:              'all 0.15s ease',
          }}
        >
          More
        </button>
      )}
    </div>
  )
}
