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
} from '@fortawesome/free-solid-svg-icons'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useFavourites } from '../hooks/useFavourites'

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

// ─── Age group badge colours ──────────────────────────────────────────────────

const AGE_STYLES = {
  adult:     { bg: '#DBEAFE', color: '#1E40AF' },
  pediatric: { bg: '#D1FAE5', color: '#065F46' },
  both:      { bg: '#EDE9FE', color: '#5B21B6' },
}

function ageLabel(group) {
  if (group === 'pediatric') return 'Pediatric'
  if (group === 'both')      return 'All ages'
  return 'Adult'
}

// ─── ConditionCard ────────────────────────────────────────────────────────────

/**
 * ConditionCard — clickable card for a single condition.
 *
 * Props:
 *   condition  ConditionFull
 *   onTap      (condition) => void   — called on card tap (navigate to detail)
 */
export default function ConditionCard({ condition, onTap }) {
  const navigate = useNavigate()
  const { isConditionFavourited, toggleCondition } = useFavourites()
  const isFavourited = isConditionFavourited(condition.id)

  const ageStyle = AGE_STYLES[condition.ageGroup] ?? { bg: '#F3F4F6', color: '#374151' }
  const icon     = specialtyIcon(condition.specialtySlug)

  function handleTap(e) {
    e.stopPropagation()
    if (onTap) {
      onTap(condition)
    } else {
      navigate(`/conditions/${condition.slug}`)
    }
  }

  function handleBookmark(e) {
    e.stopPropagation()
    toggleCondition(condition.id)
  }

  return (
    <div
      onClick={handleTap}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'flex-start',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Specialty icon column */}
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <FontAwesomeIcon
          icon={icon}
          style={{ fontSize: 16, color: 'var(--color-accent)' }}
        />
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Top row: specialty chip + age badge + bookmark */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-1)',
          gap: 'var(--space-2)',
        }}>
          {condition.specialtyName && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              flexShrink: 0,
            }}>
              {condition.specialtyName}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: 'auto' }}>
            {condition.ageGroup && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: ageStyle.bg,
                color: ageStyle.color,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0,
              }}>
                {ageLabel(condition.ageGroup)}
              </span>
            )}

            {/* Bookmark button */}
            <button
              onClick={handleBookmark}
              aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: isFavourited ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                transition: 'color 0.15s ease',
                flexShrink: 0,
              }}
            >
              {isFavourited
                ? <BookmarkCheck size={16} />
                : <Bookmark size={16} />
              }
            </button>
          </div>
        </div>

        {/* Condition name */}
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          lineHeight: 1.3,
          marginBottom: 'var(--space-1)',
        }}>
          {condition.name}
        </div>

        {/* Clinical picture preview */}
        {condition.clinicalPicture && (
          <div
            dir="auto"
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {condition.clinicalPicture}
          </div>
        )}
      </div>
    </div>
  )
}
