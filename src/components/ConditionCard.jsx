/**
 * src/components/ConditionCard.jsx
 * Phase 3 — Conditions Screen Redesign
 *
 * Changes from previous version:
 *   REMOVED: border, box-shadow, borderRadius, marginBottom
 *   ADDED:   borderBottom '0.5px solid var(--color-border-subtle)' (divider-only rows)
 *   ADDED:   InlineStarButton at trailing edge
 *   ADDED:   highlight prop — name rendered via highlightMatch() with bold segments
 *   CHANGED: padding '12px var(--space-4)' → '11px 0'
 *   KEPT:    specialty icon bubble, specialty label, tagline, chevron, onTap
 *
 * Props:
 *   condition  ConditionFull — condition object from context
 *   onTap      (condition) => void  (optional — falls back to navigate)
 *   highlight  string  — current search query; empty string when not searching
 */

import { useNavigate } from 'react-router-dom'
import InlineStarButton from './conditions/InlineStarButton'
import { highlightMatch } from '../utils/highlightMatch'

// ─── Color helpers ────────────────────────────────────────────────────────────

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

function luminance({ r, g, b }) {
  const s = [r, g, b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]
}

function iconColorFor(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return 'var(--color-accent)'
  if (luminance(rgb) > 0.4) {
    return `rgb(${Math.round(rgb.r * 0.35)},${Math.round(rgb.g * 0.35)},${Math.round(rgb.b * 0.35)})`
  }
  return '#ffffff'
}

// ─── ConditionCard ────────────────────────────────────────────────────────────

const FALLBACK_ICON  = '🩺'
const FALLBACK_COLOR = 'var(--color-accent-light)'

export default function ConditionCard({ condition, onTap, highlight = '' }) {
  const navigate = useNavigate()

  const icon     = condition.specialtyIcon  || FALLBACK_ICON
  const bubbleBg = condition.specialtyColor || FALLBACK_COLOR

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
        padding:                 '11px 0',
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
        backgroundColor: bubbleBg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        boxShadow:       'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 17, lineHeight: 1, userSelect: 'none' }}>
          {icon}
        </span>
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

        {/* Name with optional bold highlight segments */}
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

      {/* Trailing: star — stopPropagation handled inside InlineStarButton */}
      <InlineStarButton
        conditionId={condition.id}
        conditionName={condition.name}
      />

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
