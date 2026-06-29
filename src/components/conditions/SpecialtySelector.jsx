/**
 * src/components/conditions/SpecialtySelector.jsx
 * Extracted from src/pages/ConditionsScreen.jsx — previously defined inline.
 * Phase 8  — SpecialtySelector toolbar redesign: filled muted surface, no border,
 *            radius-md, chevron rotation, animated clear button.
 * Phase 9  — Icon identity fix: replaced the 32x32 colored-square badge
 *            (a holdover from ConditionCard's bubble pattern) with a bare
 *            icon and an ambient color halo.
 * Phase 10 — Floating-label field redesign: restructured from a single
 *            tappable row into a two-line labeled field — a small
 *            'Specialty' label on top, the icon/name/chevron/clear value
 *            row below — so the control reads as its own field rather
 *            than a second search bar. Icon now sits in a small, softly
 *            rounded neutral container with the ambient halo around that
 *            container (contained glow, never touching the card edges).
 *            Name is always the primary text color; only the icon and
 *            its halo carry the specialty accent color.
 *
 * Props:
 *   activeSpecialtyObj  { name, iconType, iconValue, colorToken } | null
 *   onOpen              () => void  — opens the specialty bottom sheet
 *   onClear             () => void  — resets to 'All Specialties'
 *   isOpen              boolean     — rotates the chevron when true
 */

import { useState }                     from 'react'
import { SpecialtyIcon, useIsDark }     from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'

// Parses a '#RRGGBB' token color into an [r, g, b] triple so the ambient
// halo can be built as a low-opacity rgba() spread shadow. Specialty
// tokens are always 6-digit hex (see specialtyTokens.js).
function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [r, g, b]
}

export default function SpecialtySelector({ activeSpecialtyObj, onOpen, onClear, isOpen }) {
  const isDark   = useIsDark()
  const [pressed, setPressed] = useState(false)
  const tokenKey = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const colors   = resolveToken(tokenKey, isDark)
  const isActive = !!activeSpecialtyObj

  // Clean white surface (light) / elevated surface (dark) — no tint on the container.
  const surfaceBg = isDark ? 'var(--color-surface)' : '#FFFFFF'
  const pressedBg = isDark ? '#262D3A' : '#F5F4F2'

  // Subtle ambient shadow to lift container off page background without a border.
  // Lighter than search bar's shadow so hierarchy is preserved.
  const containerShadow = pressed
    ? '0 1px 2px rgba(0,0,0,0.04)'
    : '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)'

  // Icon color — accent token color when a specialty is active, neutral
  // tertiary text color when idle.
  const iconColor = isActive ? colors.fg : 'var(--color-text-tertiary)'

  // Icon container — a small, softly rounded neutral fill (not the old
  // 32x32 condition-card badge). The ambient halo sits as a box-shadow
  // around this container, sized to stay contained and never reach the
  // edges of the card. No halo at all when idle.
  const iconContainerBg = isDark ? '#212835' : '#F4F3F1'
  const [r, g, b] = hexToRgb(colors.fg)
  const haloAlpha = isDark ? 0.20 : 0.12
  const haloColor = `rgba(${r}, ${g}, ${b}, ${isActive ? haloAlpha : 0})`

  return (
    <div
      style={{
        display:         'flex',
        alignItems:      'stretch',
        width:           '100%',
        backgroundColor: pressed ? pressedBg : surfaceBg,
        border:          'none',
        borderRadius:    '10px',
        overflow:        'hidden',
        boxShadow:       containerShadow,
        transition:      'background-color 0.12s ease, box-shadow 0.12s ease',
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >

      {/* Main tap area — label on top, value row below, both left-aligned.
          One cohesive field rather than a single tappable line. */}
      <button
        onClick={onOpen}
        aria-label={isActive ? `Specialty: ${activeSpecialtyObj.name}. Tap to change.` : 'Browse specialties'}
        style={{
          flex:                    1,
          display:                 'flex',
          flexDirection:           'column',
          alignItems:              'stretch',
          padding:                 '8px 6px 9px 12px',
          background:              'none',
          border:                  'none',
          cursor:                  'pointer',
          minWidth:                0,
          outline:                 'none',
          textAlign:               'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Floating label — always visible, small, neutral grey */}
        <span style={{
          fontSize:     11.5,
          fontWeight:   500,
          fontFamily:   'var(--font-body)',
          color:        'var(--color-text-tertiary)',
          marginBottom: 5,
        }}>
          Specialty
        </span>

        {/* Value row — icon, name, chevron. Vertically centered, left aligned. */}
        <span style={{
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          minWidth:   0,
        }}>
          {/* Specialty icon — small, softly rounded neutral container.
              A contained ambient halo sits around the container itself,
              never extending to the card. Idle state: neutral stethoscope,
              no halo. */}
          <span style={{
            display:        'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
            width:           26,
            height:          26,
            borderRadius:    '9px',
            backgroundColor: iconContainerBg,
            color:           iconColor,
            boxShadow:       `0 0 0 6px ${haloColor}`,
            transition:      'color 0.2s ease, box-shadow 0.25s ease, background-color 0.2s ease',
          }}>
            {isActive ? (
              <SpecialtyIcon
                iconType={activeSpecialtyObj.iconType   ?? 'lucide'}
                iconValue={activeSpecialtyObj.iconValue ?? 'Stethoscope'}
                size={14}
                color={iconColor}
              />
            ) : (
              // Neutral stethoscope — communicates filter purpose without color
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                <circle cx="20" cy="10" r="2"/>
              </svg>
            )}
          </span>

          {/* Specialty name — always the primary text color. Never tinted
              with the specialty accent color; the icon carries that identity. */}
          <span style={{
            flex:         1,
            minWidth:     0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontSize:     15,
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        'var(--color-text-primary)',
          }}>
            {isActive ? activeSpecialtyObj.name : 'All Specialties'}
          </span>

          {/* Chevron — neutral, rotates when sheet is open */}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            aria-hidden="true"
            style={{
              flexShrink:  0,
              marginRight: isActive ? 0 : 6,
              color:       'var(--color-text-tertiary)',
              transform:   isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition:  'transform 0.2s ease',
            }}>
            <path d="M2 4.5L6 8.5L10 4.5"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Clear (x) — slides in/out; neutral color; no divider. Bottom-aligned
          so it sits level with the value row, not centered against the
          full two-line card (which would visually float it too high). */}
      <button
        onClick={e => { e.stopPropagation(); onClear() }}
        aria-label={isActive ? `Clear ${activeSpecialtyObj.name} filter` : undefined}
        tabIndex={isActive ? 0 : -1}
        style={{
          display:                 'flex',
          alignItems:              'flex-end',
          justifyContent:          'center',
          width:                   isActive ? 44 : 0,
          opacity:                 isActive ? 1 : 0,
          flexShrink:              0,
          overflow:                'hidden',
          background:              'none',
          border:                  'none',
          cursor:                  isActive ? 'pointer' : 'default',
          pointerEvents:           isActive ? 'auto' : 'none',
          color:                   'var(--color-text-tertiary)',
          outline:                 'none',
          WebkitTapHighlightColor: 'transparent',
          transition:              'width 0.18s ease, opacity 0.18s ease',
          padding:                 '0 0 9px 0',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
          <circle cx="7" cy="7" r="6.5" fill="var(--color-border)" />
          <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {/* Right padding spacer when clear is hidden */}
      {!isActive && <span style={{ width: 14, flexShrink: 0 }} />}
    </div>
  )
}
