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

export default function CategoryFilter({ categories, active, onSelect }) {
  const all = ['all', ...categories]

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-2)',
      overflowX: 'auto',
      paddingBottom: 'var(--space-2)',
      marginBottom: 'var(--space-4)',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {all.map(cat => {
        const isActive = active === cat
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: isActive
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid var(--color-border)',
              backgroundColor: isActive
                ? 'var(--color-accent)'
                : 'var(--color-surface)',
              color: isActive
                ? '#ffffff'
                : 'var(--color-text-secondary)',
            }}
          >
            {cat === 'all' ? 'All' : (CATEGORY_LABELS[cat] || cat)}
          </button>
        )
      })}
    </div>
  )
}