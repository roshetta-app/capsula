/**
 * src/components/drugs/BrandsList.jsx
 * Phase 2G — Drug Detail Screen
 *
 * Props:
 *   brands        — array of brand objects { id, name, nameAr }
 *   concentration — string from parent formulation
 *   form          — string from parent formulation
 */

export default function BrandsList({ brands = [], concentration, form }) {
  if (brands.length === 0) return null

  const subtitle = [concentration, form].filter(Boolean).join(' · ')

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Section header */}
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         'var(--color-text-tertiary)',
        marginBottom:  'var(--space-3)',
      }}>
        Available Brands (Egypt)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {brands.map(brand => (
          <div
            key={brand.id}
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'space-between',
              backgroundColor: 'var(--color-bg)',
              border:          '1px solid var(--color-border-subtle)',
              borderRadius:    'var(--radius-sm)',
              padding:         'var(--space-3) var(--space-4)',
            }}
          >
            {/* Brand info */}
            <div>
              <span style={{
                fontSize:   14,
                fontWeight: 600,
                color:      'var(--color-text-primary)',
              }}>
                {brand.name}
              </span>
              {subtitle && (
                <span style={{
                  fontSize:   12,
                  color:      'var(--color-text-tertiary)',
                  marginLeft: 'var(--space-2)',
                }}>
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        height:          1,
        backgroundColor: 'var(--color-border-subtle)',
        marginTop:       'var(--space-5)',
      }} />
    </div>
  )
}
