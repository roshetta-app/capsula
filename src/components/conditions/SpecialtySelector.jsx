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
 *            Card corners increased to 20px; name/label font sizes
 *            reduced (21px→16px, 13px→12px); vertical padding loosened.
 *            Clear button's alignment switched from a flex-end + manual
 *            bottom-padding hack to center alignment.
 * Phase 13 — Feedback pass on Phase 12: clear button's center-alignment
 *            still didn't match the value row (it centers against the
 *            full card height, which sits higher than the value row's
 *            center once the label row is added above it) — fixed with
 *            a marginTop offset equal to the label row's height. Shadow
 *            reduced further (lower opacity, tighter blur). Corner radius
 *            pulled back from 20px to 16px. Specialty name font reduced
 *            16px→14px, since 16px read too close to the page tagline's
 *            size. Chevron and clear button keep their existing
 *            specialty-tint treatment, unchanged.
 * Phase 14 — Idle icon swapped from inline Stethoscope SVG to ListFilter
 *            (lucide-react) — consistent with the sticky header pill idle state.
 *            Stethoscope is reserved for the Internal Medicine specialty icon.
 * Phase 15 — Idle state gains a 1px var(--color-border) hairline border
 *            (was 'none', relying only on a 4%-opacity shadow). Needed once
 *            ConditionsScreen wrapped this card in a white hero panel — the
 *            idle white fill had nothing to separate it from that background.
 *            Active state (already a colored tint) is untouched.
 * Phase 16 — Active state now follows the specialty token color system
 *            instead of a fixed premium pink tint. Background uses
 *            tintedBg(colors.bg, isDark) — the same soft per-specialty wash
 *            StickyLogoHeader already uses for its active pill — instead of
 *            the hard-coded var(--color-selector-active-bg). Border uses a
 *            low-alpha rgba() of the specialty's own fg color instead of
 *            var(--color-selector-active-border), so both the wash and its
 *            edge now change per specialty, matching the icon/name/chevron/
 *            clear button, which already carried the token color. Local
 *            hexToRgb() removed in favor of the shared one now exported
 *            from specialtyTokens.js (identical implementation — this file
 *            no longer needs its own copy).
 * Phase 17 — Idle-state name weight reduced (600→500, text-primary→
 *            text-secondary) — at 600/primary it outweighed the search
 *            bar's placeholder and icon just above it, pulling attention
 *            away from search on first load. Active state (600, accent
 *            color) is untouched — a selected specialty should still read
 *            as the dominant signal.
 * Phase 8 (conditions-screen-polish-master-plan) — Idle↔active icon swap
 *            (ListFilter → specialty icon) crossfades instead of hard-
 *            cutting: both icons now sit stacked in a fixed 16x16px
 *            wrapper and cross-fade opacity over --motion-fast, using the
 *            same --ease-settle curve as the rest of the screen. The
 *            background/border/box-shadow swap already faded via its
 *            existing 0.12s ease transition — left untouched, it already
 *            met the spec.
 * Phase 9 (conditions-screen-polish-master-plan) — Idle-state
 *            differentiation from the search bar above it, which had
 *            drifted to look nearly identical (same card size, same bg/
 *            border, same 14px/500/secondary text). Card size, background,
 *            and border are unchanged; three idle-only cues were added
 *            instead. Active state is untouched by all three:
 *              1. Icon wrapper grew 16x16 → 26x26 and gained a soft
 *                 var(--color-bg) circular badge behind the idle ListFilter
 *                 glyph only (backgroundColor is 'transparent' when active,
 *                 so the active specialty icon still sits bare as Phase 12
 *                 established). The larger wrapper doesn't change the
 *                 rendered icon size (still 16px, centered).
 *              2. Idle 'All Specialties' text lightened from 500/
 *                 text-secondary to 400/text-tertiary, so it visually
 *                 recedes next to the search placeholder's 500/
 *                 text-secondary weight instead of matching it stroke-
 *                 for-stroke. Active name (600, accent color) unchanged.
 *              3. Press feedback extended from a background-color swap
 *                 alone to a subtle scale(0.985) on the whole card,
 *                 reusing the existing `pressed` state and the shared
 *                 --motion-fast / --ease-settle tokens already used for
 *                 the icon crossfade above — gives opening the specialty
 *                 sheet a tactile tap response instead of just a color
 *                 change.
 *
 * Props:
 *   activeSpecialtyObj  { name, iconType, iconValue, colorToken } | null
 *   onOpen              () => void  — opens the specialty bottom sheet
 *   onClear             () => void  — resets to 'All Specialties'
 *   isOpen              boolean     — rotates the chevron when true
 */

import { useState }                                  from 'react'
import { ListFilter }                                from 'lucide-react'
import { SpecialtyIcon, useIsDark }                  from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN, tintedBg, hexToRgb } from '../../utils/specialtyTokens'

export default function SpecialtySelector({ activeSpecialtyObj, onOpen, onClear, isOpen }) {
  const isDark   = useIsDark()
  const [pressed, setPressed] = useState(false)
  const tokenKey = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const colors   = resolveToken(tokenKey, isDark)
  const isActive = !!activeSpecialtyObj

  // Icon color — accent token color when a specialty is active, neutral
  // tertiary text color when idle.
  const iconColor = isActive ? colors.fg : 'var(--color-text-tertiary)'

  // Soft specialty tint for the chevron and clear button — a lighter touch
  // than the icon's full accent color, so these controls read as gently
  // tinted rather than fully colored. Falls back to neutral grey when idle.
  const [r, g, b] = hexToRgb(colors.fg)
  const controlTint = isActive ? `rgba(${r}, ${g}, ${b}, 0.65)` : 'var(--color-text-tertiary)'

  // Idle surface stays clean white (light) / elevated surface (dark) — no tint.
  // Active surface now follows the specialty token color system: a soft
  // per-specialty wash (tintedBg, same helper/alpha StickyLogoHeader's
  // active pill already uses) instead of one fixed premium tint shared by
  // every specialty.
  const idleSurfaceBg = isDark ? 'var(--color-surface)' : '#FFFFFF'
  const surfaceBg = isActive ? tintedBg(colors.bg, isDark) : idleSurfaceBg
  const pressedBg = isDark ? '#262D3A' : '#F5F4F2'

  // Ambient elevation — Premium polish pass. Single diffused shadow shared
  // by idle/active/pressed states, matching the search field's ambient
  // treatment so both controls read as the same elevation system.
  const containerShadow = 'var(--shadow-ambient-selector)'

  return (
    <div
      style={{
        display:         'flex',
        alignItems:      'stretch',
        width:           '100%',
        backgroundColor: pressed ? pressedBg : surfaceBg,
        // Idle state gets a hairline border in the shared border color;
        // active state now gets a low-alpha border of the specialty's own
        // fg color instead of one fixed selected-border token, so the
        // border tints per specialty along with everything else.
        border:          isActive
          ? `1px solid rgba(${r}, ${g}, ${b}, 0.3)`
          : '1px solid var(--color-border)',
        borderRadius:    '16px',
        overflow:        'hidden',
        boxShadow:       containerShadow,
        // Phase 9 (conditions-screen-polish-master-plan): subtle press-scale
        // added alongside the existing background swap, so tapping to open
        // the specialty sheet gives a tactile response, not just a color
        // change. Reuses the same `pressed` state and motion tokens as the
        // icon crossfade below.
        transform:       pressed ? 'scale(0.985)' : 'scale(1)',
        transition:      'background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease, transform var(--motion-fast) var(--ease-settle)',
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
          padding:                 '12px 8px 12px 14px',
          background:              'none',
          border:                  'none',
          cursor:                  'pointer',
          minWidth:                0,
          outline:                 'none',
          textAlign:               'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Label — helper text, smallest element in the hierarchy */}
        <span style={{
          fontSize:     11,
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
          {/* Icon — ListFilter when idle (consistent with sticky header pill),
              specialty icon when active. Both icons are stacked in a
              fixed-size wrapper and cross-fade via opacity instead of
              hard-swapping on isActive change — conditions-screen-polish-
              master-plan Phase 8. Color stays on this outer wrapper
              (inherited via currentColor) so the existing per-specialty
              color transition keeps working unchanged.
              Phase 9 (conditions-screen-polish-master-plan): wrapper grew
              16x16 → 26x26 and gained a soft circular badge behind the
              icon, idle only — backgroundColor is 'transparent' when
              active, so the active specialty icon still sits bare exactly
              as Phase 12 set it. The icons themselves stay 16px, still
              centered, so neither state's rendered icon size changes. */}
          <span style={{
            position:        'relative',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
            width:           26,
            height:          26,
            borderRadius:    'var(--radius-full)',
            backgroundColor: isActive ? 'transparent' : 'var(--color-bg)',
            color:           iconColor,
            transition:      'color 0.2s ease, background-color 0.2s ease',
          }}>
            <span style={{
              position:   'absolute',
              inset:      0,
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity:    isActive ? 0 : 1,
              transition: 'opacity var(--motion-fast) var(--ease-settle)',
            }}>
              <ListFilter size={16} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span style={{
              position:   'absolute',
              inset:      0,
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity:    isActive ? 1 : 0,
              transition: 'opacity var(--motion-fast) var(--ease-settle)',
            }}>
              {isActive && (
                <SpecialtyIcon
                  iconType={activeSpecialtyObj.iconType   ?? 'lucide'}
                  iconValue={activeSpecialtyObj.iconValue ?? 'Stethoscope'}
                  size={16}
                  color={iconColor}
                />
              )}
            </span>
          </span>

          {/* Specialty name — the dominant element on this control when
              active (semibold, tinted with the specialty's accent color,
              unchanged since Phase 12/17). Idle state lightened in Phase 9
              (conditions-screen-polish-master-plan) from 500/text-secondary
              to 400/text-tertiary so it visually recedes next to the
              search placeholder above, which sits at 500/text-secondary —
              the two no longer read as the same weight of text. */}
          <span style={{
            flex:         1,
            minWidth:     0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontSize:     14,
            fontWeight:   isActive ? 600 : 400,
            fontFamily:   'var(--font-body)',
            color:        isActive ? iconColor : 'var(--color-text-tertiary)',
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
          divider. The outer container centers this button against the
          full card height, but the value row it needs to align with sits
          lower than that center (the label row above pushes it down) —
          so a top margin equal to the label row's reserved height nudges
          this button down onto the same line as the icon/name/chevron. */}
      <button
        onClick={e => { e.stopPropagation(); onClear() }}
        aria-label={isActive ? `Clear ${activeSpecialtyObj.name} filter` : undefined}
        tabIndex={isActive ? 0 : -1}
        style={{
          display:                 'flex',
          alignItems:              'center',
          justifyContent:          'center',
          width:                   isActive ? 44 : 0,
          marginTop:               18,
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
          <circle cx="11" cy="11" r="11" fill="currentColor" opacity="0.15" />
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
