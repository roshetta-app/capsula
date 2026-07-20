/**
 * src/components/drugs/sections/SafetySection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Safety group for a drug: Side Effects + Contraindications +
 * Pregnancy & Breastfeeding. Content logic carried over unchanged from the
 * retiring DrugInfoSections.jsx, except for one ride-along fix (plan §11
 * item 8, below).
 *
 * Ride-along fix (§11 item 8): crossesPlacenta/crossesBbb were previously
 * compared against the booleans true/false, but the database column is
 * text constrained to 'yes' / 'no' / 'unknown', so the comparison never
 * matched and the raw lowercase string was printed. Fixed here by
 * comparing against the actual string values and capitalizing for display.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { AlertTriangle } from 'lucide-react'
import { SectionHeader, Divider, EmptySection, PregnancyBadge, IconRow } from './sectionPrimitives.jsx'

function displayYesNo(value) {
  if (value === 'yes')     return 'Yes'
  if (value === 'no')      return 'No'
  if (value === 'unknown') return 'Unknown'
  return value
}

export default function SafetySection({ drug }) {
  const {
    sideEffectsCommon = [],
    sideEffectsSerious = [],
    pregnancyCategory,
    breastfeedingSafety,
    crossesPlacenta,
    crossesBbb,
    contraindications = [],
  } = drug

  const hasPregnancySection =
    !!pregnancyCategory || !!breastfeedingSafety || crossesPlacenta != null || crossesBbb != null

  return (
    <div>

      {/* -- Side Effects -- */}
      {(sideEffectsCommon.length > 0 || sideEffectsSerious.length > 0) ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          {sideEffectsCommon.length > 0 && (
            <>
              <SectionHeader title="Side Effects — Common" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                {sideEffectsCommon.map((se, i) => (
                  <span key={i} style={{
                    fontSize:        13,
                    color:           '#92400E',
                    backgroundColor: '#FEF3C7',
                    borderRadius:    'var(--radius-sm)',
                    padding:         '3px 10px',
                  }}>
                    {se}
                  </span>
                ))}
              </div>
            </>
          )}

          {sideEffectsSerious.length > 0 && (
            <>
              <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           'var(--space-1)',
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         '#DC2626',
                marginBottom:  'var(--space-3)',
              }}>
                <AlertTriangle size={11} />
                Side Effects — Serious
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {sideEffectsSerious.map((se, i) => (
                  <li key={i} style={{
                    fontSize:        13,
                    color:           '#991B1B',
                    backgroundColor: '#FEE2E2',
                    borderRadius:    'var(--radius-sm)',
                    padding:         'var(--space-2) var(--space-3)',
                    marginBottom:    'var(--space-2)',
                    lineHeight:      1.4,
                  }}>
                    {se}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Divider />
        </div>
      ) : (
        <EmptySection title="Side Effects" />
      )}

      {/* -- Contraindications -- */}
      {contraindications.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Contraindications" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {contraindications.map((ci, i) => (
              <li key={i} style={{
                fontSize:     14,
                color:        'var(--color-text-secondary)',
                padding:      'var(--space-2) 0',
                borderBottom: i < contraindications.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                lineHeight:   1.4,
              }}>
                {ci}
              </li>
            ))}
          </ul>
          <Divider />
        </div>
      ) : (
        <EmptySection title="Contraindications" />
      )}

      {/* -- Pregnancy & Breastfeeding -- */}
      {hasPregnancySection ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Pregnancy & Breastfeeding" />
          {pregnancyCategory && <PregnancyBadge category={pregnancyCategory} />}
          <IconRow icon="🤱" label="Breastfeeding" value={breastfeedingSafety} />
          <IconRow icon="🧬" label="Crosses placenta" value={displayYesNo(crossesPlacenta)} />
          <IconRow icon="🧠" label="Crosses BBB" value={displayYesNo(crossesBbb)} />
          <Divider />
        </div>
      ) : (
        <EmptySection title="Pregnancy & Breastfeeding" />
      )}

    </div>
  )
}
