import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useFavouritesContext } from '../context/FavouritesContext'
import { DRUG_CATEGORIES } from '../config/categories'

const CATEGORY_LABELS = Object.fromEntries(
  DRUG_CATEGORIES.map(c => [c.value, c.label])
)

const CATEGORY_COLORS = {
  'antibiotic':              { bg: '#FEF3C7', color: '#92400E' },
  'antiviral':               { bg: '#DBEAFE', color: '#1E40AF' },
  'antifungal':              { bg: '#EDE9FE', color: '#5B21B6' },
  'antiparasitic':           { bg: '#D1FAE5', color: '#065F46' },
  'analgesic-nsaid':         { bg: '#F0FDF4', color: '#166534' },
  'cardiovascular':          { bg: '#FFF1F2', color: '#9F1239' },
  'respiratory':             { bg: '#F0F9FF', color: '#0C4A6E' },
  'gastrointestinal':        { bg: '#FDF4FF', color: '#6B21A8' },
  'endocrine-metabolic':     { bg: '#ECFDF5', color: '#064E3B' },
  'neurological-psychiatric':{ bg: '#F5F3FF', color: '#4C1D95' },
  'musculoskeletal':         { bg: '#FFF7ED', color: '#9A3412' },
  'vitamins-minerals':       { bg: '#F7FEE7', color: '#3F6212' },
  'dermatological':          { bg: '#F5F3FF', color: '#4C1D95' },
  'ophthalmic-otic':         { bg: '#ECFEFF', color: '#164E63' },
  'urological':              { bg: '#EFF6FF', color: '#1E40AF' },
  'obstetric-gynecological': { bg: '#FDF2F8', color: '#831843' },
  'other':                   { bg: '#FEE2E2', color: '#7F1D1D' },
}

export default function DrugCard({ drug, onTap }) {
  const { isDrugFavourited, toggleDrug } = useFavouritesContext()
  const isFavourited = isDrugFavourited(drug.id)

  const chipStyle = CATEGORY_COLORS[drug.category] || { bg: '#F3F4F6', color: '#374151' }
  const label     = CATEGORY_LABELS[drug.category]  || drug.category

  // Item's own concentration/form, e.g. "500mg · Tablet" — either piece can be
  // blank (not every item has strength data), so build it defensively and
  // only show what's actually there.
  const itemDetails = [drug.concentration, drug.form].filter(Boolean).join(' · ')

  function handleBookmark(e) {
    e.stopPropagation()
    toggleDrug(drug.id)
  }

  return (
    <div
      onClick={() => onTap(drug)}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        boxShadow: 'var(--shadow-card)',
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
      {/* Top row: chip + bookmark */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-2)',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          backgroundColor: chipStyle.bg,
          color: chipStyle.color,
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
        }}>
          {label}
        </span>

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

      {/* Item name (+ concentration/form) — primary, per ADR-029 */}
      <div style={{
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-1)',
        lineHeight: 1.3,
      }}>
        {drug.name}
        {itemDetails && (
          <span style={{
            fontWeight: 400,
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
          }}>
            {' '}{itemDetails}
          </span>
        )}
      </div>

      {/* Generic name — secondary */}
      <div style={{
        fontSize: 13,
        color: 'var(--color-accent)',
        fontWeight: 500,
        lineHeight: 1.4,
        marginBottom: 'var(--space-1)',
      }}>
        {drug.genericName}
      </div>

      {/* Arabic name */}
      <div style={{
        fontSize: 13,
        color: 'var(--color-text-arabic)',
        fontFamily: 'var(--font-arabic)',
        textAlign: 'right',
        direction: 'rtl',
        lineHeight: 1.4,
      }}>
        {drug.arabicName}
      </div>
    </div>
  )
}
