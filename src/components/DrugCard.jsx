const CATEGORY_LABELS = {
  'antibiotic': 'Antibiotic',
  'antiviral': 'Antiviral',
  'antifungal': 'Antifungal',
  'antiparasitic': 'Antiparasitic',
  'analgesic-nsaid': 'NSAID',
  'antipyretic': 'Antipyretic',
  'steroid': 'Steroid',
  'antihistamine': 'Antihistamine',
  'respiratory': 'Respiratory',
  'gastrointestinal': 'GI',
  'antidiabetic': 'Antidiabetic',
  'cardiovascular': 'Cardiovascular',
  'antihypertensive': 'Antihypertensive',
  'vitamins-minerals': 'Vitamins',
  'emergency': 'Emergency',
  'topical': 'Topical',
  'ophthalmic-otic': 'Eye / Ear',
  'gynecological': 'Gynecological',
  'antispasmodic': 'Antispasmodic',
  'proton-pump-inhibitor': 'PPI',
}

const CATEGORY_COLORS = {
  'antibiotic':           { bg: '#FEF3C7', color: '#92400E' },
  'antiviral':            { bg: '#DBEAFE', color: '#1E40AF' },
  'antifungal':           { bg: '#EDE9FE', color: '#5B21B6' },
  'antiparasitic':        { bg: '#D1FAE5', color: '#065F46' },
  'analgesic-nsaid':      { bg: '#F0FDF4', color: '#166534' },
  'antipyretic':          { bg: '#FEF9C3', color: '#854D0E' },
  'steroid':              { bg: '#FEE2E2', color: '#991B1B' },
  'antihistamine':        { bg: '#E0F2FE', color: '#075985' },
  'respiratory':          { bg: '#F0F9FF', color: '#0C4A6E' },
  'gastrointestinal':     { bg: '#FDF4FF', color: '#6B21A8' },
  'antidiabetic':         { bg: '#ECFDF5', color: '#064E3B' },
  'cardiovascular':       { bg: '#FFF1F2', color: '#9F1239' },
  'antihypertensive':     { bg: '#FFF7ED', color: '#9A3412' },
  'vitamins-minerals':    { bg: '#F7FEE7', color: '#3F6212' },
  'emergency':            { bg: '#FEE2E2', color: '#7F1D1D' },
  'topical':              { bg: '#F5F3FF', color: '#4C1D95' },
  'ophthalmic-otic':      { bg: '#ECFEFF', color: '#164E63' },
  'gynecological':        { bg: '#FDF2F8', color: '#831843' },
  'antispasmodic':        { bg: '#FFFBEB', color: '#78350F' },
  'proton-pump-inhibitor':{ bg: '#F0FDFA', color: '#134E4A' },
}

export default function DrugCard({ drug, onTap, isInStock = true }) {
  const chipStyle = CATEGORY_COLORS[drug.category] || { bg: '#F3F4F6', color: '#374151' }
  const label = CATEGORY_LABELS[drug.category] || drug.category

  return (
    <div
      onClick={() => onTap(drug)}
      style={{
        backgroundColor: isInStock ? 'var(--color-surface)' : 'var(--color-outstock-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-5)',
        marginBottom: 'var(--space-3)',
        cursor: 'pointer',
        opacity: isInStock ? 1 : 0.5,
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
      {/* Top row: chip + stock dot */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-3)',
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

        {/* Stock indicator dot */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: 'var(--radius-full)',
          backgroundColor: isInStock ? 'var(--color-instock)' : 'var(--color-outstock)',
        }} />
      </div>
      {/* Drug name */}
      <div style={{
        fontSize: 16,
        fontWeight: 600,
        color: isInStock ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-1)',
        lineHeight: 1.3,
      }}>
        {drug.genericName}
      </div>

      {/* Brands */}
      {drug.brandNames?.length > 0 && (
        <div style={{
          fontSize: 13,
          color: 'var(--color-accent)',
          fontWeight: 500,
          marginBottom: 'var(--space-1)',
        }}>
          {drug.brandNames.join(' · ')}
        </div>
      )}

      {/* Arabic name */}
      <div style={{
        fontSize: 13,
        color: 'var(--color-text-arabic)',
        fontFamily: 'var(--font-arabic)',
        textAlign: 'right',
        direction: 'rtl',
        marginBottom: 'var(--space-3)',
      }}>
        {drug.arabicName}
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        backgroundColor: 'var(--color-border-subtle)',
        marginBottom: 'var(--space-3)',
      }} />

      {/* Doses */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        marginBottom: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            minWidth: 36,
          }}>Adult</span>
          <span style={{
            fontSize: 13,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {drug.dose?.adult}
          </span>
        </div>
        {drug.dose?.pediatric && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              minWidth: 36,
            }}>Peds</span>
            <span style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {drug.dose.pediatric}
            </span>
          </div>
        )}
      </div>

      {/* Uses preview */}
      {drug.uses?.length > 0 && (
        <div style={{
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.4,
        }}>
          → {drug.uses.slice(0, 2).join(', ')}
          {drug.uses.length > 2 && (
            <span style={{ color: 'var(--color-text-tertiary)' }}> +{drug.uses.length - 2} more</span>
          )}
        </div>
      )}
    </div>
  )
}