/**
 * src/components/conditions/SpecialtyFilterPills.jsx
 * Phase 2C — Conditions Screen
 *
 * Horizontal scrollable row of specialty filter pills.
 * "All" is always first. Each pill shows the emoji icon + specialty name.
 * Active pill: filled with specialty color. Inactive: outline/ghost.
 *
 * Props:
 *   specialties      — [{ id, name, slug, iconName, colorHex }] from ConditionContext
 *   activeSpecialty  — 'all' | specialty id
 *   onSelect         — (id: string) => void
 */

const FALLBACK_COLOR = 'var(--color-accent)'
const FALLBACK_ICON  = '🩺'

export default function SpecialtyFilterPills({ specialties, activeSpecialty, onSelect }) {
  if (!specialties || specialties.length === 0) return null

  const all = ['all', ...specialties.map(s => s.id)]

  return (
    <div style={{
      display:         'flex',
      gap:             'var(--space-2)',
      overflowX:       'auto',
      paddingBottom:   'var(--space-2)',
      marginBottom:    'var(--space-3)',
      scrollbarWidth:  'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {all.map(id => {
        const isActive   = activeSpecialty === id
        const specialty  = id === 'all' ? null : specialties.find(s => s.id === id)
        const label      = id === 'all' ? 'All' : (specialty?.name ?? id)
        const colorHex   = specialty?.colorHex  ?? null
        const icon       = specialty?.iconName   ?? null

        // Active pill: use specialty color as bg; inactive: ghost outline
        const activeBg     = colorHex ?? FALLBACK_COLOR
        const activeBorder = colorHex ?? FALLBACK_COLOR

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              flexShrink:      0,
              display:         'flex',
              alignItems:      'center',
              gap:             5,
              padding:         '6px 14px',
              borderRadius:    'var(--radius-full)',
              fontSize:        13,
              fontWeight:      isActive ? 600 : 400,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
              transition:      'all 0.15s ease',
              border:          isActive
                ? `1.5px solid ${activeBorder}`
                : '1.5px solid var(--color-border)',
              backgroundColor: isActive
                ? activeBg
                : 'var(--color-surface)',
              color:           isActive ? '#ffffff' : 'var(--color-text-secondary)',
              outline:         'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {icon && (
              <span style={{ fontSize: 13, lineHeight: 1, userSelect: 'none' }}>
                {icon}
              </span>
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
