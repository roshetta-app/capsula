/**
 * src/components/conditions/SpecialtyFilterPills.jsx
 * Phase 3 — Conditions Screen Redesign
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 *
 * Horizontal scrollable row of specialty filter pills.
 * "All" is always first. Each pill shows icon + short label.
 * When specialties.length >= OVERFLOW_THRESHOLD (5), chips beyond
 * index 4 are hidden and a "More" chip is appended.
 *
 * Props:
 *   specialties      [{ id, name, slug, iconType, iconValue, colorToken }]
 *   activeSpecialty  string  — 'all' | specialty id
 *   onSelect         (id: string) => void
 *   onMoreTap        () => void  — called when "More" chip is tapped
 */

import { SpecialtyIcon, useIsDark }        from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN }   from '../../utils/specialtyTokens'


const OVERFLOW_THRESHOLD = 5

const SHORT_LABELS = {
  pediatrics:     'Peds',
  ophthalmology:  'Opth',
  dermatology:    'Derma',
  otolaryngology: 'ENT',
}

export default function SpecialtyFilterPills({
  specialties,
  activeSpecialty,
  onSelect,
  onMoreTap,
}) {
  const isDark = useIsDark()

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
      paddingBottom:           'var(--space-1)',
      marginBottom:            'var(--space-1)',
      scrollbarWidth:          'none',
      msOverflowStyle:         'none',
      WebkitOverflowScrolling: 'touch',
    }}>

      {/* All pill */}
      <button
        onClick={() => onSelect('all')}
        style={{
          flexShrink:              0,
          display:                 'flex',
          alignItems:              'center',
          padding:                 '6px 14px',
          borderRadius:            'var(--radius-full)',
          fontSize:                13,
          fontWeight:              activeSpecialty === 'all' ? 600 : 400,
          fontFamily:              'var(--font-body)',
          cursor:                  'pointer',
          transition:              'all 0.15s ease',
          border:                  activeSpecialty === 'all'
            ? '1.5px solid var(--color-accent)'
            : '1.5px solid var(--color-border)',
          backgroundColor:         activeSpecialty === 'all'
            ? 'var(--color-accent)'
            : 'var(--color-surface)',
          color:                   activeSpecialty === 'all'
            ? '#ffffff'
            : 'var(--color-text-secondary)',
          outline:                 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        All
      </button>

      {visibleSpecialties.map(specialty => {
        const isActive   = activeSpecialty === specialty.id
        const tokenKey   = specialty.colorToken ?? FALLBACK_TOKEN
        const colors     = resolveToken(tokenKey, isDark)
        const shortLabel = SHORT_LABELS[specialty.slug] ?? specialty.name

        return (
          <button
            key={specialty.id}
            onClick={() => onSelect(specialty.id)}
            style={{
              flexShrink:              0,
              display:                 'flex',
              alignItems:              'center',
              gap:                     5,
              padding:                 '6px 12px',
              borderRadius:            'var(--radius-full)',
              fontSize:                13,
              fontWeight:              isActive ? 600 : 400,
              fontFamily:              'var(--font-body)',
              cursor:                  'pointer',
              transition:              'all 0.15s ease',
              border:                  isActive
                ? `1.5px solid ${colors.pill}`
                : '1.5px solid var(--color-border)',
              backgroundColor:         isActive ? colors.pill : 'var(--color-surface)',
              color:                   isActive ? '#ffffff' : 'var(--color-text-secondary)',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <SpecialtyIcon
              iconType={specialty.iconType   ?? 'lucide'}
              iconValue={specialty.iconValue ?? 'Stethoscope'}
              size={13}
              color={isActive ? '#ffffff' : colors.fg}
            />
            {shortLabel}
          </button>
        )
      })}

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

