/**
 * src/components/drugs/sections/PrescribingSection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * 2026-07-25 (drug_detail_rebuild, step 1.7, decision 4.15): Drug
 * Interactions content moved out to its own standalone
 * DrugInteractionsSection.jsx (mounted right after ContraindicationsSection
 * in DrugDetailScreen.jsx, per the locked §11.3 order). This file now
 * renders Pharmacokinetics only.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { SectionHeader, EmptySection } from './sectionPrimitives.jsx'

const PK_FIELDS = [
  { key: 'onset',           label: 'Onset' },
  { key: 'peak',            label: 'Peak' },
  { key: 'duration',        label: 'Duration' },
  { key: 'half_life',       label: 'Half-life' },
  { key: 'bioavailability', label: 'Bioavailability' },
]

export default function PrescribingSection({ drug }) {
  const { pharmacokinetics } = drug

  const hasPharmacokinetics = !!pharmacokinetics && PK_FIELDS.some(({ key }) => pharmacokinetics[key])

  return (
    <div>

      {/* -- Pharmacokinetics -- */}
      {hasPharmacokinetics ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Pharmacokinetics" />
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 'var(--space-3)',
          }}>
            {PK_FIELDS.map(({ key, label }) =>
              pharmacokinetics[key] ? (
                <div key={key} style={{
                  backgroundColor: 'var(--color-bg)',
                  border:          '1px solid var(--color-border-subtle)',
                  borderRadius:    'var(--radius-sm)',
                  padding:         'var(--space-3)',
                }}>
                  <div style={{
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         'var(--color-text-tertiary)',
                    marginBottom:  'var(--space-1)',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize:   14,
                    fontWeight: 600,
                    color:      'var(--color-text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {pharmacokinetics[key]}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      ) : (
        <EmptySection title="Pharmacokinetics" />
      )}

    </div>
  )
}
