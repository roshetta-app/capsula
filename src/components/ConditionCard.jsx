/**
 * src/components/ConditionCard.jsx
 * Phase 3 — Conditions Screen Redesign
 * Phase 5 — removed InlineStarButton; tighter row padding (8px vs 11px)
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 * Phase 7 — divider stepped up from 0.5px border-subtle to 1px border for
 *            clearer card separation without feeling heavy
 * Phase 8 — specialty name renders as typed in DB; removed textTransform uppercase
 * Phase 9 — specialty name hidden when a specific specialty is active (redundant
 *            with the active chip); icon bubble anchors to top of text content
 *            so 3-line cards don't overflow the bubble height.
 * Phase 10 — cardTagline gets Info icon + secondary color to differentiate from
 *             specialty label; divider lighter (border-subtle); last card no divider;
 *             sort button in ConditionListHeader matches sticky header style.
 * Phase 11 — icon bubble background switched from the token's flat 'bg' hex to
 *             the same soft rgba() wash SpecialtySelector uses for its active
 *             card tint (via tintedBg), so the bubble reads as gently tinted
 *             rather than fully saturated. Inset border removed — the bubble
 *             now sits bare on the tint, matching the selector's bare-icon
 *             treatment.
 * Phase 15 — Visual hierarchy pass: bubble 36→32px, icon 18→16px, softer
 *             radius (10px). Specialty label darker (secondary not tertiary)
 *             so it's readable but still clearly below the name. Condition
 *             name 15→16px so it wins clearly. Row padding 10→12px for
 *             more breathing room. Tagline gap 3→4px.
 *
 * Props:
 *   condition        ConditionFull
 *   onTap            (condition) => void  (optional — falls back to navigate)
 *   highlight        string  — current search query; empty string when not searching
 *   activeSpecialty  string  — 'all' | specialty id. Defaults to 'all'.
 *                              When not 'all', specialtyName is suppressed.
 *   isLast           boolean — when true, suppresses the bottom divider line.
 */

import { useNavigate }    from 'react-router-dom'
import { Info }           from 'lucide-react'
import { highlightMatch } from '../utils/highlightMatch'
import { SpecialtyIcon, useIsDark }  from '../utils/specialtyIcon'
import { resolveToken, tintedBg, FALLBACK_TOKEN } from '../utils/specialtyTokens'


// ─── ConditionCard ────────────────────────────────────────────────────────────

export default function ConditionCard({
  condition,
  onTap,
  highlight = '',
  activeSpecialty = 'all',
  isLast = false,
}) {
  const navigate = useNavigate()
  const isDark = useIsDark()

  const tokenKey  = condition.specialtyColorToken || FALLBACK_TOKEN
  const iconType  = condition.specialtyIconType   || 'lucide'
  const iconValue = iconType === 'custom'
    ? (condition.specialtyIconUrl  || '')
    : (condition.specialtyIcon     || 'Stethoscope')
  const colors    = resolveToken(tokenKey, isDark)

  // Suppress the specialty label when browsing a filtered specialty —
  // the active chip already tells the user which specialty they are in.
  const showSpecialtyName = condition.specialtyName && activeSpecialty === 'all'

  // Only top-align when the card has more than one line of metadata
  // (specialty label or tagline present). Single-line cards (name only)
  // use center alignment so the name sits level with the icon bubble.
  const isMultiLine = showSpecialtyName || !!condition.cardTagline

  function handleTap() {
    if (onTap) {
      onTap(condition)
    } else {
      navigate(`/conditions/${condition.slug}`)
    }
  }

  const nameSegments = highlightMatch(condition.name, highlight)

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleTap()}
      style={{
        display:                 'flex',
        alignItems:              isMultiLine ? 'flex-start' : 'center',
        gap:                     'var(--space-3)',
        padding:                 '12px 0',
        borderBottom:            isLast ? 'none' : '1px solid var(--color-border-subtle)',
        cursor:                  'pointer',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor:         'transparent',
      }}
    >
      {/* Left: specialty icon bubble — 32px, softer radius, lower visual weight
          so the condition name takes priority. The bubble acts as a color accent
          and category signal rather than the dominant element.
          marginTop offsets the bubble down by ~3px to visually centre it against
          the name (the largest text element) on multi-line cards. */}
      <div style={{
        width:           32,
        height:          32,
        flexShrink:      0,
        marginTop:       isMultiLine ? (showSpecialtyName ? 2 : 3) : 0,
        borderRadius:    10,
        backgroundColor: tintedBg(colors.bg, isDark),
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <SpecialtyIcon
          iconType={iconType}
          iconValue={iconValue}
          size={16}
          color={colors.fg}
        />
      </div>

      {/* Middle: text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showSpecialtyName && (
          <div style={{
            fontSize:      11,
            fontWeight:    500,
            color:         'var(--color-text-secondary)',
            marginBottom:  2,
            letterSpacing: '0.02em',
          }}>
            {condition.specialtyName}
          </div>
        )}

        {/* Condition name — dominant element, wins clearly over label and tagline */}
        <div style={{
          fontSize:     16,
          fontWeight:   600,
          color:        'var(--color-text-primary)',
          lineHeight:   1.3,
          overflow:     'hidden',
          whiteSpace:   'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {nameSegments.map((seg, i) =>
            seg.bold
              ? <strong key={i} style={{ fontWeight: 700 }}>{seg.text}</strong>
              : <span key={i}>{seg.text}</span>
          )}
        </div>

        {condition.cardTagline && (
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          4,
            fontSize:     12,
            fontStyle:    'italic',
            color:        'var(--color-text-secondary)',
            marginTop:    3,
            overflow:     'hidden',
            whiteSpace:   'nowrap',
            textOverflow: 'ellipsis',
          }}>
            <Info size={10} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.7 }} />
            {condition.cardTagline}
          </div>
        )}
      </div>

      {/* Trailing: chevron — top-aligned to match icon bubble */}
      <svg
        width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{
          color:     'var(--color-text-tertiary)',
          opacity:   0.5,
          flexShrink: 0,
          marginTop:  isMultiLine ? (showSpecialtyName ? 5 : 7) : 0,
        }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}
