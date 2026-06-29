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
 *            row below.
 * Phase 11 — Hierarchy rebalance: selected specialty name is now the
 *            dominant element (21px/600, dark) instead of a uniform
 *            14px/500 row, so the eye lands on the value, not the label.
 *            Icon container shrunk and flattened against the left edge
 *            (radius 13px) instead of floating with its own inset.
 *            Chevron and clear button now pick up a soft specialty tint
 *            when active (previously kept neutral grey in all states —
 *            this is an intentional reversal of that earlier rule, not
 *            an oversight). Card corners increased to 18px; vertical
 *            padding trimmed so the card stays compact despite the
 *            larger value text.
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

  // Icon container — small, flattened against the card's left content edge
  // (not a floating chip). The ambient halo sits as a box-shadow around
  // this container, sized to stay contained and never reach the card edges.
  // No halo at all when idle.
  const iconContainerBg = isDark ? '#212835' : '#F4F3F1'
  const [r, g, b] = hexToRgb(colors.fg)
  const haloAlpha = isDark ? 0.20 : 0.12
  const haloColor = `rgba(${r}, ${g}, ${b}, ${isActive ? haloAlpha : 0})`

  // Soft specialty tint for the chevron and clear button — a lighter touch
  // than the icon's full accent color, so these controls read as gently
  // tinted rather than fully colored. Falls back to neutral grey when idle.
  const controlTint = isActive ? `rgba(${r}, ${g}, ${b}, 0.65)` : 'var(--color-text-tertiary)'

  return (
    <div
      style={{
        display:         'flex',
        alignItems:      'stretch',
        width:           '100%',
        backgroundColor: pressed ? pressedBg : surfaceBg,
        border:          'none',
        borderRadius:    '18px',
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
          padding:                 '5px 6px 5px 14px',
          background:              'none',
          border:                  'none',
          cursor:                  'pointer',
          minWidth:                0,
          outline:                 'none',
          textAlign:               'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Label — low visual emphasis. Its weight relative to the much
            larger value text below is what creates the hierarchy, not
            its own size. */}
        <span style={{
          fontSize:     13,
          fontWeight:   500,
          fontFamily:   'var(--font-body)',
          color:        'var(--color-text-tertiary)',
          marginBottom: 2,
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
          {/* Specialty icon — small container flush with the card's left
              content edge, integrated rather than floating as a chip.
              Equal top/bottom spacing inside. A contained ambient halo
              sits around the container, never extending to the card.
              Idle state: neutral stethoscope, no halo. */}
          <span style={{
            display:        'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
            width:           28,
            height:          28,
            borderRadius:    '13px',
            backgroundColor: iconContainerBg,
            color:           iconColor,
            boxShadow:       `0 0 0 5px ${haloColor}`,
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

          {/* Specialty name — the dominant element on this control. Large,
              semibold, high-contrast dark text. Never tinted with the
              specialty accent color — the icon and controls carry that. */}
          <span style={{
            flex:         1,
            minWidth:     0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontSize:     21,
            fontWeight:   600,
            fontFamily:   'var(--font-body)',
            color:        'var(--color-text-primary)',
            letterSpacing: '-0.2px',
          }}>
            {isActive ? activeSpecialtyObj.name : 'All Specialties'}
          </span>

          {/* Chevron — soft specialty tint when active, neutral when idle */}
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
            aria-hidden="true"
            style={{
              flexShrink:  0,
              marginRight: isActive ? 0 : 6,
              color:       controlTint,
              transform:   isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition:  'transform 0.2s ease, color 0.2s ease',
            }}>
            <path d="M2 4.5L6 8.5L10 4.5"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Clear (x) — slides in/out; soft specialty tint when active; no
          divider. Bottom-aligned so it sits level with the value row,
          not centered against the full two-line card. */}
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
          color:                   controlTint,
          outline:                 'none',
          WebkitTapHighlightColor: 'transparent',
          transition:              'width 0.18s ease, opacity 0.18s ease, color 0.2s ease',
          padding:                 '0 0 5px 0',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
          aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="11" fill="var(--color-border)" opacity="0.5" />
          <path d="M7.5 7.5L14.5 14.5M14.5 7.5L7.5 14.5"
            stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Right padding spacer when clear is hidden */}
      {!isActive && <span style={{ width: 14, flexShrink: 0 }} />}
    </div>
  )
}
