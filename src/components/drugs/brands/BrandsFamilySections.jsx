/**
 * src/components/drugs/brands/BrandsFamilySections.jsx
 *
 * 2026-10-08 (refactor, phase 3): the 'Other families' page body of BrandsList,
 * moved here from BrandsList.jsx. Each family is one soft card, the family name
 * on top with a hairline under it, then its drug card(s). Same look.
 *
 * Props: sections [{ name, items }], renderCard(item, isLast)
 */
import { familyCase } from './brandsText.js'

export default function BrandsFamilySections({ sections, renderCard }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {sections.map(sec => (
        <div
          key={sec.name}
          style={{
            backgroundColor: 'var(--color-surface-muted)',
            borderRadius:    16,
            padding:         '0 var(--space-3) var(--space-1)',
          }}
        >
          <p style={{
            margin:       0,
            padding:      'var(--space-4) 0 var(--space-3)',
            fontSize:     13,
            fontWeight:   600,
            lineHeight:   1.45,
            color:        'var(--color-text-primary)',
            borderBottom: '0.5px solid var(--color-border-subtle)',
          }}>
            {familyCase(sec.name)}
          </p>
          {sec.items.map((item, k) => renderCard(item, k === sec.items.length - 1))}
        </div>
      ))}
    </div>
  )
}
