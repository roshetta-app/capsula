/**
 * src/components/drugs/sections/ClinicalOverview.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Clinical Overview group for a drug. Content logic carried
 * over unchanged from the retiring DrugInfoSections.jsx.
 *
 * 2026-07-20 (drug_detail_moa_spacing_fix): Mechanism of Action no longer
 * wraps its content in Collapsible — it now renders as a plain static
 * section (header + text), matching how Uses (and every other section on
 * this page) already renders. There was no reason for MOA alone to hide
 * its content by default.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.1, decision 4.19):
 * Mechanism of Action removed from this file — it now renders inside
 * GenericOverviewSection.jsx instead (mounted first on the page), so it
 * isn't shown twice now that both files are mounted together. This file
 * temporarily renders Uses only, until UsesSection.jsx (checklist step 1.2)
 * replaces it entirely and it's retired for good.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { SectionHeader, Divider, EmptySection } from './sectionPrimitives.jsx'

export default function ClinicalOverview({ drug }) {
  const {
    uses = [],
  } = drug

  return (
    <div>

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
