/**
 * src/components/drugs/DrugHeader.jsx
 * Phase 2G — Drug Detail Screen
 *
 * Props:
 *   drug          — flat drug object from DrugContext
 *   isFavourited  — boolean
 *   onBack        — () => void
 *   onToggleFav   — () => void
 */

import { ArrowLeft, Star } from 'lucide-react'
import { DRUG_CATEGORIES }  from '../../config/categories'

const CATEGORY_COLORS = {
  'antibiotic':               { bg: '#FEF3C7', color: '#92400E' },
  'antiviral':                { bg: '#DBEAFE', color: '#1E40AF' },
  'antifungal':               { bg: '#EDE9FE', color: '#5B21B6' },
  'antiparasitic':            { bg: '#D1FAE5', color: '#065F46' },
  'analgesic-nsaid':          { bg: '#F0FDF4', color: '#166534' },
  'cardiovascular':           { bg: '#FFF1F2', color: '#9F1239' },
  'respiratory':              { bg: '#F0F9FF', color: '#0C4A6E' },
  'gastrointestinal':         { bg: '#FDF4FF', color: '#6B21A8' },
  'endocrine-metabolic':      { bg: '#ECFDF5', color: '#064E3B' },
  'neurological-psychiatric': { bg: '#F5F3FF', color: '#4C1D95' },
  'musculoskeletal':          { bg: '#FFF7ED', color: '#9A3412' },
  'vitamins-minerals':        { bg: '#F7FEE7', color: '#3F6212' },
  'dermatological':           { bg: '#F5F3FF', color: '#4C1D95' },
  'ophthalmic-otic':          { bg: '#ECFEFF', color: '#164E63' },
  'urological':               { bg: '#EFF6FF', color: '#1E40AF' },
  'obstetric-gynecological':  { bg: '#FDF2F8', color: '#831843' },
  'other':                    { bg: '#FEE2E2', color: '#7F1D1D' },
}

const CATEGORY_LABELS = Object.fromEntries(
  DRUG_CATEGORIES.map(c => [c.value, c.label])
)

export default function DrugHeader({ drug, isFavourited, onBack, onToggleFav }) {
  const chipStyle = CATEGORY_COLORS[drug.category] ?? { bg: '#F3F4F6', color: '#374151' }
  const label     = CATEGORY_LABELS[drug.category]  ?? drug.category ?? ''

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      padding:         'var(--space-5)',
      marginBottom:    'var(--space-4)',
      boxShadow:       'var(--shadow-card)',
    }}>
      {/* Top row: back ← ····· ★ */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   'var(--space-4)',
      }}>
        <button
          onClick={onBack}
          aria-label="Go back"
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--space-1)',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'var(--color-accent)',
            fontSize:   14,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            padding:    0,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onToggleFav}
          aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            padding:    4,
            color:      isFavourited ? '#F59E0B' : 'var(--color-text-tertiary)',
            display:    'flex',
            alignItems: 'center',
          }}
        >
          <Star
            size={20}
            fill={isFavourited ? '#F59E0B' : 'none'}
            strokeWidth={isFavourited ? 0 : 1.5}
          />
        </button>
      </div>

      {/* Generic name */}
      <h1 style={{
        fontSize:   22,
        fontWeight: 700,
        color:      'var(--color-text-primary)',
        margin:     '0 0 var(--space-1)',
        lineHeight: 1.2,
      }}>
        {drug.genericName}
      </h1>

      {/* Concentration · Form */}
      {(drug.concentration || drug.form) && (
        <div style={{
          fontSize:     14,
          fontWeight:   500,
          color:        'var(--color-text-secondary)',
          marginBottom: 'var(--space-3)',
        }}>
          {[drug.concentration, drug.form].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Category breadcrumb badge */}
      {label && (
        <span style={{
          display:         'inline-block',
          fontSize:        11,
          fontWeight:      600,
          letterSpacing:   '0.04em',
          textTransform:   'uppercase',
          backgroundColor: chipStyle.bg,
          color:           chipStyle.color,
          padding:         '3px 10px',
          borderRadius:    'var(--radius-full)',
        }}>
          {label}
        </span>
      )}
    </div>
  )
}
