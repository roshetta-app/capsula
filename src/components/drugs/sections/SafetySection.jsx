/**
 * src/components/drugs/sections/SafetySection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Safety group for a drug: Contraindications + Pregnancy &
 * Breastfeeding. Side Effects moved out to its own standalone
 * SideEffectsSection.jsx (drug_detail_rebuild, step 1.4, decision 4.12).
 *
 * Ride-along fix (§11 item 8): crossesPlacenta/crossesBbb were previously
 * compared against the booleans true/false, but the database column is
 * text constrained to 'yes' / 'no' / 'unknown', so the comparison never
 * matched and the raw lowercase string was printed. Fixed here by
 * comparing against the actual string values and capitalizing for display.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { SectionHeader, Divider, EmptySection, PregnancyBadge, IconRow } from './sectionPrimitives.jsx'

function displayYesNo(value) {
  if (value === 'yes')     return 'Yes'
  if (value === 'no')      return 'No'
  if (value === 'unknown') return 'Unknown'
  return value
}

export default function SafetySection({ drug }) {
  const {
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
