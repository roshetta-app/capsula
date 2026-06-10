/**
 * src/components/ConditionCard.jsx
 * Phase 2C — Conditions Screen
 *
 * Rebuilt to masterplan spec:
 *   REMOVED: favourite/bookmark button, age group badge, clinical picture preview
 *   ADDED:   card_tagline (optional italic line), chevron right
 *   KEPT:    specialty icon in tinted circle (left), condition name (bold), specialty name (muted)
 *
 * Icon strategy:
 *   icon_name in the DB is now an emoji (e.g. "🫀", "🧠", "👶").
 *   This gives unlimited icon choice with no icon library dependency.
 *   Falls back to "🩺" when no icon is set.
 *
 * Color strategy:
 *   color_hex from the specialty is used as the icon bubble background.
 *   Icon color is derived from the bg: if the hex is "light" (luminance > 0.5)
 *   we darken it by 40% for the emoji tint; otherwise use white.
 *   This keeps icon + bg always compatible regardless of what color the admin picks.
 *
 * Card height: ~72px with no tagline, ~88px with tagline.
 *
 * Props:
 *   condition  — ConditionFull object from context
 *   onTap      — optional (condition) => void  (falls back to navigate)
 */

import { useNavigate } from 'react-router-dom'

// ─── Color helpers ────────────────────────────────────────────────────────────

/**
 * Parse "#RRGGBB" or "#RGB" → { r, g, b } in 0–255.
 * Returns null for anything unparseable.
 */
function parseHex(hex) {
  if (!hex || typeof hex !== 'string') return null
  const h = hex.replace('#', '')
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    }
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  return null
}

/**
 * Relative luminance (WCAG formula), 0 = black, 1 = white.
 */
function luminance({ r, g, b }) {
  const s = [r, g, b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]
}

/**
 * Given a background hex, return a CSS color for the icon that contrasts well.
 * Light bg  → darken the same hue by rendering a semi-transparent dark overlay color
 * Dark bg   → white
 * No hex    → fall back to accent CSS variable
 */
function iconColorFor(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return 'var(--color-accent)'
  const lum = luminance(rgb)
  // Light background → use a dark version of the same hue (multiply by 0.4)
  if (lum > 0.4) {
    const dr = Math.round(rgb.r * 0.35)
    const dg = Math.round(rgb.g * 0.35)
    const db = Math.round(rgb.b * 0.35)
    return `rgb(${dr},${dg},${db})`
  }
  // Dark background → white
  return '#ffffff'
}

// ─── ConditionCard ────────────────────────────────────────────────────────────

const FALLBACK_ICON  = '🩺'
const FALLBACK_COLOR = 'var(--color-accent-light)'

export default function ConditionCard({ condition, onTap }) {
  const navigate = useNavigate()

  // Emoji icon — whatever the admin stored, or fallback
  const icon     = condition.specialtyIcon  || FALLBACK_ICON
  // Bubble background — specialty color or CSS fallback
  const bubbleBg = condition.specialtyColor || FALLBACK_COLOR
  // Icon tint — derived from bubble bg for contrast
  const iconColor = iconColorFor(condition.specialtyColor)

  function handleTap() {
    if (onTap) {
      onTap(condition)
    } else {
      navigate(`/conditions/${condition.slug}`)
    }
  }

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleTap()}
      style={{
        backgroundColor: 'var(--color-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-lg)',
        padding:         '12px var(--space-4)',
        marginBottom:    'var(--space-2)',
        cursor:          'pointer',
        boxShadow:       'var(--shadow-card)',
        display:         'flex',
        alignItems:      'center',
        gap:             'var(--space-3)',
        transition:      'box-shadow 0.15s ease',
        outline:         'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
    >

      {/* Left: specialty icon bubble — color from specialty */}
      <div style={{
        width:           36,
        height:          36,
        flexShrink:      0,
        borderRadius:    'var(--radius-md)',
        backgroundColor: bubbleBg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        // Subtle inner shadow so bubble reads as a chip, not a flat swatch
        boxShadow:       'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}>
        <span style={{
          fontSize:   17,
          lineHeight: 1,
          // CSS filter gives a slight tint to the emoji on light backgrounds
          filter:     condition.specialtyColor ? undefined : undefined,
          userSelect: 'none',
        }}>
          {icon}
        </span>
      </div>

      {/* Middle: text content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Specialty name — small, muted */}
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

        {/* Condition name — bold */}
        <div style={{
          fontSize:     15,
          fontWeight:   600,
          color:        'var(--color-text-primary)',
          lineHeight:   1.3,
          overflow:     'hidden',
          whiteSpace:   'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {condition.name}
        </div>

        {/* Optional tagline — italic, muted */}
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

      {/* Right: chevron */}
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
