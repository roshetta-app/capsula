/**
 * src/components/conditions/SpecialtyFilterPills.jsx
 * Phase 3 — Conditions Screen Redesign
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 * Phase 7 — Filter toolbar redesign: single full-width row, no border,
 *            filled surface, clearly distinct from the search bar above.
 *
 * Renders a single tappable filter row:
 *   [icon]  [specialty name or "All Specialties"]  ···  [× clear]  [chevron]
 *
 * Tapping anywhere opens the specialty bottom sheet via onMoreTap.
 * The clear button appears only when a specialty is active and calls
 * onSelect('all') to reset without opening the sheet.
 *
 * Props:
 *   specialties      [{ id, name, slug, iconType, iconValue, colorToken }]
 *   activeSpecialty  string  — 'all' | specialty id
 *   onSelect         (id: string) => void
 *   onMoreTap        () => void  — opens SpecialtiesBottomSheet
 *   scrollRef        ref  (optional, kept for API compat — unused in toolbar)
 */

import { useState }                        from 'react'
import { SpecialtyIcon, useIsDark }        from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN }    from '../../utils/specialtyTokens'

export default function SpecialtyFilterPills({
  specialties,
  activeSpecialty,
  onSelect,
  onMoreTap,
  scrollRef,          // kept for API compat
}) {
  const isDark    = useIsDark()
  const [pressed, setPressed] = useState(false)

  if (!specialties || specialties.length === 0) return null

  const isFiltered   = activeSpecialty && activeSpecialty !== 'all'
  const activeSpec   = isFiltered
    ? specialties.find(s => s.id === activeSpecialty)
    : null

  // Icon + color for the currently selected specialty (or fallback for 'All')
  const tokenKey  = activeSpec?.colorToken ?? FALLBACK_TOKEN
  const colors    = resolveToken(tokenKey, isDark)
  const iconType  = activeSpec?.iconType  ?? 'lucide'
  const iconValue = activeSpec?.iconValue ?? 'Stethoscope'
  const label     = activeSpec?.name      ?? 'All Specialties'

  // Surface: one step below page bg — distinct from search bar's white surface
  // Light: #F3F3F1  Dark: #1A2030 (slightly lifted from bg #111827)
  const surfaceBg = isDark ? '#1A2030' : '#F3F3F1'
  const pressedBg = isDark ? '#222836' : '#ECEAE6'

  function handleClear(e) {
    e.stopPropagation()
    onSelect('all')
  }

  return (
    <button
      onClick={onMoreTap}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-label={`Filter by specialty: ${label}`}
      style={{
        // Layout
        display:                 'flex',
        alignItems:              'center',
        width:                   '100%',
        padding:                 '0 var(--space-4)',
        height:                  44,
        gap:                     'var(--space-2)',
        // Shape — rounded but softer radius than search bar's full pill
        borderRadius:            'var(--radius-md)',
        // Surface — filled, no border
        border:                  'none',
        backgroundColor:         pressed ? pressedBg : surfaceBg,
        // Typography
        fontFamily:              'var(--font-body)',
        fontSize:                14,
        fontWeight:              500,
        color:                   'var(--color-text-primary)',
        // Interaction
        cursor:                  'pointer',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        // Animation
        transition:              'background-color 0.12s ease',
        // Reset default button styles
        textAlign:               'left',
        userSelect:              'none',
      }}
    >
      {/* Specialty icon — bare, no background bubble */}
      <span style={{
        display:    'flex',
        alignItems: 'center',
        flexShrink: 0,
        color:      isFiltered ? colors.fg : 'var(--color-text-tertiary)',
        transition: 'color 0.15s ease',
      }}>
        <SpecialtyIcon
          iconType={iconType}
          iconValue={iconValue}
          size={16}
          color={isFiltered ? colors.fg : 'var(--color-text-tertiary)'}
        />
      </span>

      {/* Label — grows to fill available space */}
      <span style={{
        flex:       1,
        overflow:   'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        color:      isFiltered
          ? 'var(--color-text-primary)'
          : 'var(--color-text-secondary)',
        fontWeight: isFiltered ? 500 : 400,
        transition: 'color 0.15s ease, font-weight 0.15s ease',
      }}>
        {label}
      </span>

      {/* Clear button — only when a specialty is active */}
      <span
        aria-hidden={!isFiltered}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          width:          isFiltered ? 20 : 0,
          height:         20,
          overflow:       'hidden',
          opacity:        isFiltered ? 1 : 0,
          // Animate width + opacity together for a smooth slide-in/out
          transition:     'width 0.18s ease, opacity 0.18s ease',
          pointerEvents:  isFiltered ? 'auto' : 'none',
        }}
        onClick={isFiltered ? handleClear : undefined}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          <circle cx="7" cy="7" r="7" fill="var(--color-border)" />
          <path
            d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {/* Chevron — always visible, right-anchored */}
      <span style={{
        display:    'flex',
        alignItems: 'center',
        flexShrink: 0,
        color:      'var(--color-text-tertiary)',
        transition: 'color 0.15s ease',
      }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          <path
            d="M3 5L7 9L11 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
