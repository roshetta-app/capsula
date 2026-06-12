/**
 * src/components/ConditionCard.jsx
 * Phase 3 — Conditions Screen Redesign
 * Phase 5 — removed InlineStarButton; tighter row padding (8px vs 11px)
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 *
 * Props:
 *   condition  ConditionFull
 *   onTap      (condition) => void  (optional — falls back to navigate)
 *   highlight  string  — current search query; empty string when not searching
 */

import { useNavigate }    from 'react-router-dom'
import { highlightMatch } from '../utils/highlightMatch'
import { SpecialtyIcon, useIsDark }  from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'


// ─── ConditionCard ────────────────────────────────────────────────────────────

export default function ConditionCard({ condition, onTap, highlight = '' }) {
  const navigate = useNavigate()
  const isDark = useIsDark()

  const tokenKey  = condition.specialtyColorToken || FALLBACK_TOKEN
  const iconType  = condition.specialtyIconType   || 'lucide'
  const iconValue = iconType === 'custom'
    ? (condition.specialtyIconUrl  || '')
    : (condition.specialtyIcon     || 'Stethoscope')
  const colors    = resolveToken(tokenKey, isDark)

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
        alignItems:              'center',
        gap:                     'var(--space-3)',
        padding:                 '8px 0',
        borderBottom:            '0.5px solid var(--color-border-subtle)',
        cursor:                  'pointer',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor:         'transparent',
      }}
    >
      {/* Left: specialty icon bubble */}
      <div style={{
        width:           36,
        height:          36,
        flexShrink:      0,
        borderRadius:    'var(--radius-md)',
        backgroundColor: colors.bg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        boxShadow:       'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}>
        <SpecialtyIcon
          iconType={iconType}
          iconValue={iconValue}
          size={18}
          color={colors.fg}
        />
      </div>

      {/* Middle: text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {condition.specialtyName && (
          <div style={{
            fontSize:      11,
            fontWeight:    500,
            color:         'var(--color-text-tertiary)',
            marginBottom:  2,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {condition.specialtyName}
          </div>
        )}

        <div style={{
          fontSize:     15,
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
            fontSize:     12,
            fontStyle:    'italic',
            color:        'var(--color-text-tertiary)',
            marginTop:    3,
            overflow:     'hidden',
            whiteSpace:   'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {condition.cardTagline}
          </div>
        )}
      </div>

      {/* Trailing: chevron */}
      <svg
        width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ color: 'var(--color-text-tertiary)', opacity: 0.5, flexShrink: 0 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}

