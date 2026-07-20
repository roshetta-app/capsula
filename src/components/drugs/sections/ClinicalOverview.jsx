/**
 * src/components/drugs/sections/ClinicalOverview.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Clinical Overview group for a drug: Mechanism of Action + Uses.
 * Content logic carried over unchanged from the retiring DrugInfoSections.jsx.
 * Each of the two sections shows its own independent "Not yet added" state —
 * the old single classification fallback for zero content anywhere has been
 * dropped (see plan decisions).
 *
 * 2026-07-20 (drug_detail_moa_spacing_fix): Mechanism of Action no longer
 * wraps its content in Collapsible — it now renders as a plain static
 * section (header + text), matching how Uses (and every other section on
 * this page) already renders. There was no reason for MOA alone to hide
 * its content by default.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { SectionHeader, Divider, EmptySection } from './sectionPrimitives.jsx'

export default function ClinicalOverview({ drug }) {
  const {
    mechanismOfAction,
    uses = [],
  } = drug

  return (
    <div>

      {/* -- Mechanism of Action -- */}
      {mechanismOfAction ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Mechanism of Action" />
          <p style={{
            fontSize:   14,
            color:      'var(--color-text-primary)',
            lineHeight: 1.6,
            margin:     0,
          }}>
            {mechanismOfAction}
          </p>
          <Divider />
        </div>
      ) : (
        <EmptySection title="Mechanism of Action" />
      )}

      {/* -- Uses -- */}
      {uses.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Uses" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {uses.map((use, i) => {
              const name    = typeof use === 'string' ? use : use.use_name
              const context = typeof use === 'object' ? use.context : ''
              return (
                <li key={i} style={{ marginBottom: 'var(--space-2)' }}>
                  <span style={{
                    fontSize:   14,
                    fontWeight: 600,
                    color:      'var(--color-text-primary)',
                  }}>
                    {name}
                  </span>
                  {context && (
                    <span style={{
                      fontSize:   13,
                      fontStyle:  'italic',
                      color:      'var(--color-text-tertiary)',
                      marginLeft: 'var(--space-2)',
                    }}>
                      {context}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <Divider />
        </div>
      ) : (
        <EmptySection title="Uses" />
      )}

    </div>
  )
}
