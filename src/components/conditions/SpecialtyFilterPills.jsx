/**
 * src/components/conditions/SpecialtyFilterPills.jsx
 * Phase 3 — Conditions Screen Redesign
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 * Phase 7 — Filter toolbar redesign: single full-width row, no border,
 *            filled surface, clearly distinct from the search bar above.
 * Phase 8 — Specialty Filter identity redesign: elevated white surface
 *            (no background tint), bare icon with a diffused ambient
 *            color halo instead of an icon bubble, calm left-aligned
 *            typography, grouped chevron + clear controls. Smaller
 *            radius (--radius-md) and shorter height (42px) than
 *            SearchBar (--radius-full pill, 46px) to read as a
 *            secondary control.
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

// Parses a '#RRGGBB' token color into an [r, g, b] triple for building
// a low-opacity rgba() ambient halo. Tokens are always 6-digit hex
// (see specialtyTokens.js) so no '#RGB' shorthand handling is needed.
function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [r, g, b]
}

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
  const iconColor = isFiltered ? colors.fg : 'var(--color-text-tertiary)'

  // Ambient halo — a diffused, low-opacity spread shadow behind the bare
  // icon. No halo at all in the unfiltered state, since 'All Specialties'
  // has no accent color to communicate.
  const [r, g, b] = hexToRgb(colors.fg)
  const haloAlpha   = isDark ? 0.22 : 0.13
  const haloColor   = `rgba(${r}, ${g}, ${b}, ${isFiltered ? haloAlpha : 0})`

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
        height:                  42,
        gap:                     'var(--space-3)',
        // Shape — smaller radius than the search bar's full pill, to
        // read as a secondary control rather than a sibling search field.
        borderRadius:            'var(--radius-md)',
        // Surface — clean elevated surface, no border. Contrasts with the
        // search bar's flat border-only treatment.
        border:                  'none',
        backgroundColor:         pressed ? 'var(--color-surface-muted)' : 'var(--color-surface)',
        boxShadow:               'var(--shadow-card)',
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
      {/* Specialty icon — bare, no bubble. A diffused ambient color halo
          sits behind it instead of a colored container. */}
      <span style={{
        display:        'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        width:           16,
        height:          16,
        borderRadius:    '50%',
        color:           iconColor,
        boxShadow:       `0 0 0 10px ${haloColor}`,
        transition:      'color 0.2s ease, box-shadow 0.2s ease',
      }}>
        <SpecialtyIcon
          iconType={iconType}
          iconValue={iconValue}
          size={16}
          color={iconColor}
        />
      </span>

      {/* Label — left-aligned, grows to fill available space. Always the
          primary text color and a calm medium weight, per spec. */}
      <span style={{
        flex:         1,
        overflow:     'hidden',
        whiteSpace:   'nowrap',
        textOverflow: 'ellipsis',
        textAlign:    'left',
        color:        'var(--color-text-primary)',
        fontWeight:   500,
      }}>
        {label}
      </span>

      {/* Right-side controls — clear button and chevron grouped closely
          together, both right-anchored, vertically centered. */}
      <span style={{
        display:    'flex',
        alignItems: 'center',
        flexShrink: 0,
        gap:        4,
      }}>
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

        {/* Chevron — always visible */}
        <span style={{
          display:    'flex',
          alignItems: 'center',
          flexShrink: 0,
          color:      'var(--color-text-tertiary)',
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
      </span>
    </button>
  )
}
