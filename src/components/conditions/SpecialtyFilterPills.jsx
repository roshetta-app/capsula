/**
 * src/components/conditions/SpecialtyFilterPills.jsx
 * Phase 2C — Conditions Screen
 *
 * Horizontal scrollable row of specialty filter pills.
 * "All" is always first. Each pill shows the specialty name.
 * Active pill: filled primary color. Inactive: outline/ghost.
 *
 * Props:
 *   specialties      — [{ id, name, slug, icon_name, color_hex }] from ConditionContext
 *   activeSpecialty  — 'all' | specialty id
 *   onSelect         — (id: string) => void
 */

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
        const isActive = activeSpecialty === id
        const label    = id === 'all'
          ? 'All'
          : specialties.find(s => s.id === id)?.name ?? id

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              flexShrink:      0,
              padding:         '6px 14px',
              borderRadius:    'var(--radius-full)',
              fontSize:        13,
              fontWeight:      isActive ? 600 : 400,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
              transition:      'all 0.15s ease',
              border:          isActive
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid var(--color-border)',
              backgroundColor: isActive
                ? 'var(--color-accent)'
                : 'var(--color-surface)',
              color:           isActive ? '#ffffff' : 'var(--color-text-secondary)',
              outline:         'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
