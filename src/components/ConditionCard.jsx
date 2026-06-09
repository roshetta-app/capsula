/**
 * src/components/ConditionCard.jsx
 * Phase 2C — Conditions Screen
 *
 * Rebuilt to masterplan spec:
 *   REMOVED: favourite/bookmark button, age group badge, clinical picture preview
 *   ADDED:   card_tagline (optional italic line), chevron right
 *   KEPT:    specialty icon in tinted circle (left), condition name (bold), specialty name (muted)
 *
 * Card height: ~72px with no tagline, ~88px with tagline.
 * Favourite star moved to ConditionDetailScreen header (Phase 2D).
 *
 * Props:
 *   condition  — ConditionFull object from context
 *   onTap      — optional (condition) => void  (falls back to navigate)
 */

import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStethoscope,
  faBrain,
  faHeartPulse,
  faLungs,
  faBone,
  faTooth,
  faEye,
  faEarListen,
  faBacteria,
  faUserDoctor,
  faNotesMedical,
  faFlask,
  faSyringe,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

// ─── Specialty → FA icon map ──────────────────────────────────────────────────

const SPECIALTY_ICONS = {
  'neurology':          faBrain,
  'cardiology':         faHeartPulse,
  'pulmonology':        faLungs,
  'respiratory':        faLungs,
  'orthopedics':        faBone,
  'musculoskeletal':    faBone,
  'dentistry':          faTooth,
  'ophthalmology':      faEye,
  'ent':                faEarListen,
  'infectious-disease': faBacteria,
  'microbiology':       faBacteria,
  'general':            faUserDoctor,
  'internal-medicine':  faUserDoctor,
  'gastroenterology':   faFlask,
  'gi':                 faFlask,
  'surgery':            faSyringe,
  'emergency':          faNotesMedical,
}

function specialtyIcon(slug) {
  return SPECIALTY_ICONS[slug] ?? faStethoscope
}

// ─── ConditionCard ────────────────────────────────────────────────────────────

export default function ConditionCard({ condition, onTap }) {
  const navigate = useNavigate()
  const icon     = specialtyIcon(condition.specialtySlug)

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

      {/* Left: specialty icon in tinted circle */}
      <div style={{
        width:           36,
        height:          36,
        flexShrink:      0,
        borderRadius:    'var(--radius-md)',
        backgroundColor: 'var(--color-accent-light)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <FontAwesomeIcon
          icon={icon}
          style={{ fontSize: 15, color: 'var(--color-accent)' }}
        />
      </div>

      {/* Middle: text content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Specialty name — small, muted */}
        {condition.specialtyName && (
          <div style={{
            fontSize:   11,
            fontWeight: 500,
            color:      'var(--color-text-tertiary)',
            marginBottom: 2,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {condition.specialtyName}
          </div>
        )}

        {/* Condition name — bold */}
        <div style={{
          fontSize:   15,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
          lineHeight: 1.3,
          overflow:   'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {condition.name}
        </div>

        {/* Optional tagline — italic, muted. Renders nothing if null/empty. */}
        {condition.cardTagline && (
          <div style={{
            fontSize:    12,
            fontStyle:   'italic',
            color:       'var(--color-text-tertiary)',
            marginTop:   3,
            overflow:    'hidden',
            whiteSpace:  'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {condition.cardTagline}
          </div>
        )}
      </div>

      {/* Right: chevron */}
      <FontAwesomeIcon
        icon={faChevronRight}
        style={{
          fontSize:   12,
          color:      'var(--color-text-tertiary)',
          flexShrink: 0,
          opacity:    0.5,
        }}
      />

    </div>
  )
}

```

`src\components\conditions\SpecialtyFilterPills.jsx`:

