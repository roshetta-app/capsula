/**
 * src/components/drugs/sections/SafetySection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the remaining Safety group content for a drug: Contraindications
 * only. Side Effects moved out to SideEffectsSection.jsx (step 1.4, decision
 * 4.12); Pregnancy & Breastfeeding moved out to PregnancySection.jsx (step
 * 1.5, decision 4.13). This file fully retires once Contraindications also
 * migrates to its own section (step 1.6, decision 4.14).
 *
 * Props: drug — flat drug object from DrugContext
 */

import { SectionHeader, Divider, EmptySection } from './sectionPrimitives.jsx'

export default function SafetySection({ drug }) {
  const {
    contraindications = [],
  } = drug

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

    </div>
  )
}
