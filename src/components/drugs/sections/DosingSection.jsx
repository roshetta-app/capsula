/**
 * src/components/drugs/sections/DosingSection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Dosing group for a drug: Doses (via the existing DoseTable)
 * and Dose Adjustments. Dose Adjustments content logic carried over
 * unchanged from the retiring DrugInfoSections.jsx.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.1 / decision 4.5):
 * the "Available Brands" trigger row and BrandsBottomSheet mount that used
 * to live here have moved to GenericOverviewSection.jsx — same behavior,
 * just relocated. This file now only renders Doses + Dose Adjustments.
 *
 * Props:
 *   drug — flat drug object from DrugContext (dose + doseAdjustments data)
 */

import DoseTable from '../DoseTable.jsx'
import { SectionHeader, Divider, EmptySection } from './sectionPrimitives.jsx'

export default function DosingSection({ drug }) {
  const {
    defaultDoseOverride,
    textbookDoses = [],
    textbookDoseNotes,
    doseAdjustments = [],
  } = drug

  return (
    <div>

      {/* -- Doses -- */}
      <DoseTable
        defaultDoseOverride={defaultDoseOverride}
        textbookDoses={textbookDoses}
        textbookDoseNotes={textbookDoseNotes}
      />

      {/* -- Dose Adjustments -- */}
      {doseAdjustments.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Dose Adjustments" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {doseAdjustments.map((da, i) => (
              <li key={i} style={{
                padding:      'var(--space-2) 0',
                borderBottom: i < doseAdjustments.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                lineHeight:   1.5,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {da.condition}
                </span>
                {da.adjustment && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {da.adjustment}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Divider />
        </div>
      ) : (
        <EmptySection title="Dose Adjustments" />
      )}

    </div>
  )
}
