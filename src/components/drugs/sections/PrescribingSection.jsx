/**
 * src/components/drugs/sections/PrescribingSection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Prescribing group for a drug: Drug Interactions +
 * Pharmacokinetics. Content logic carried over unchanged from the retiring
 * DrugInfoSections.jsx.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { SectionHeader, Divider, EmptySection, SeverityBadge } from './sectionPrimitives.jsx'

const PK_FIELDS = [
  { key: 'onset',           label: 'Onset' },
  { key: 'peak',            label: 'Peak' },
  { key: 'duration',        label: 'Duration' },
  { key: 'half_life',       label: 'Half-life' },
  { key: 'bioavailability', label: 'Bioavailability' },
]

export default function PrescribingSection({ drug }) {
  const {
    drugInteractions = [],
    pharmacokinetics,
  } = drug

  const hasPharmacokinetics = !!pharmacokinetics && PK_FIELDS.some(({ key }) => pharmacokinetics[key])

  return (
    <div>

      {/* -- Drug Interactions -- */}
      {drugInteractions.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Drug Interactions" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {drugInteractions.map((ix, i) => (
              <li key={i} style={{
                padding:      'var(--space-2) 0',
                borderBottom: i < drugInteractions.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {ix.drug ?? ix.drug_name ?? ix.name}
                  </span>
                  {ix.severity && <SeverityBadge severity={ix.severity} />}
                </div>
                {(ix.description ?? ix.risk) && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                    {ix.description ?? ix.risk}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Divider />
        </div>
      ) : (
        <EmptySection title="Drug Interactions" />
      )}

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
