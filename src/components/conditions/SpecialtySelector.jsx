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
 * Phase 11 — Hierarchy rebalance: selected specialty name made the
 *            dominant element (21px/600, dark) instead of a uniform
 *            14px/500 row. Icon container shrunk and flattened against
 *            the left edge (radius 13px) with an ambient halo. Card
 *            corners increased to 18px; vertical padding trimmed.
 * Phase 12 — Active-state tint pass: icon's container box and halo
 *            removed entirely — icon now sits bare on the card. Card
 *            background picks up a light wash of the active specialty's
 *            token color instead of staying flat white. Specialty name
 *            now tints to the same accent color as the icon when active
 *            (darker than the new background tint, so it stays readable).
 *            Card corners increased to 20px (between Phase 11's 18px and
 *            the search bar's full pill). Name/label font sizes reduced
 *            (21px→16px, 13px→12px) to match the surrounding screen's
 *            font hierarchy. Vertical padding loosened now that the
 *            removed icon box freed up room. Clear button's alignment
 *            switched from a flex-end + manual bottom-padding hack to
 *            true center alignment, fixing a vertical baseline mismatch
 *            against the icon/name/chevron row. Chevron and clear button
 *            keep their existing specialty-tint treatment, unchanged.
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

  // Idle surface stays clean white (light) / elevated surface (dark) — no tint.
  // Active surface picks up a very light wash of the specialty's bg tint over
  // that same base, so the card reads as gently colored rather than pure white.
  const idleSurfaceBg = isDark ? 'var(--color-surface)' : '#FFFFFF'
  const [bgR, bgG, bgB] = hexToRgb(colors.bg)
  const tintAlpha = isDark ? 0.16 : 0.35
  const surfaceBg = isActive ? `rgba(${bgR}, ${bgG}, ${bgB}, ${tintAlpha})` : idleSurfaceBg
  const pressedBg = isDark ? '#262D3A' : '#F5F4F2'

  // Subtle ambient shadow to lift container off page background without a border.
  // Lighter than search bar's shadow so hierarchy is preserved.
  const containerShadow = pressed
    ? '0 1px 2px rgba(0,0,0,0.04)'
    : '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)'

  // Icon color — accent token color when a specialty is active, neutral
  // tertiary text color when idle.
  const iconColor = isActive ? colors.fg : 'var(--color-text-tertiary)'

  // Soft specialty tint for the chevron and clear button — a lighter touch
  // than the icon's full accent color, so these controls read as gently
  // tinted rather than fully colored. Falls back to neutral grey when idle.
  const [r, g, b] = hexToRgb(colors.fg)
  const controlTint = isActive ? `rgba(${r}, ${g}, ${b}, 0.65)` : 'var(--color-text-tertiary)'

  return (
    <div
      style={{
        display:         'flex',
        alignItems:      'stretch',
        width:           '100%',
        backgroundColor: pressed ? pressedBg : surfaceBg,
        border:          'none',
        borderRadius:    '20px',
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
          padding:                 '10px 8px 10px 14px',
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
          fontSize:     12,
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
          gap:        8,
          minWidth:   0,
        }}>
          {/* Specialty icon — sits bare on the card, no container box or
              halo. Flex span retained only for centering against the
              name and chevron on the same row. */}
          <span style={{
            display:        'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
            color:           iconColor,
            transition:      'color 0.2s ease',
          }}>
            {isActive ? (
              <SpecialtyIcon
                iconType={activeSpecialtyObj.iconType   ?? 'lucide'}
                iconValue={activeSpecialtyObj.iconValue ?? 'Stethoscope'}
                size={16}
                color={iconColor}
              />
            ) : (
              // Neutral stethoscope — communicates filter purpose without color
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                <circle cx="20" cy="10" r="2"/>
              </svg>
            )}
          </span>

          {/* Specialty name — the dominant element on this control.
              Semibold, and tinted with the specialty's accent color
              (same as the icon) when active, in a darker shade than
              the card's background tint so it stays readable. Falls
              back to neutral primary text color when idle. */}
          <span style={{
            flex:         1,
            minWidth:     0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontSize:     16,
            fontWeight:   600,
            fontFamily:   'var(--font-body)',
            color:        isActive ? iconColor : 'var(--color-text-primary)',
            letterSpacing: '-0.2px',
            transition:   'color 0.2s ease',
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
          divider. Centered against the card's full height, which now
          matches the value row's vertical center since both the main
          button and this button share the same stretched height and
          true center alignment — no manual offset needed. */}
      <button
        onClick={e => { e.stopPropagation(); onClear() }}
        aria-label={isActive ? `Clear ${activeSpecialtyObj.name} filter` : undefined}
        tabIndex={isActive ? 0 : -1}
        style={{
          display:                 'flex',
          alignItems:              'center',
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
          padding:                 0,
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
