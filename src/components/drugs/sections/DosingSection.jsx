/**
 * src/components/drugs/sections/DosingSection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Renders the Dosing group for a drug: Doses (via the existing DoseTable),
 * the compact "Available Brands" trigger row (opens BrandsBottomSheet.jsx),
 * and Dose Adjustments. Dose Adjustments content logic carried over
 * unchanged from the retiring DrugInfoSections.jsx.
 *
 * The Available Brands trigger row (decision 4.27) mirrors BrandsList.jsx's
 * own existing behavior of disappearing entirely (rather than showing a
 * "Not yet added" state) when there are no siblings.
 *
 * Props:
 *   drug          — flat drug object from DrugContext (dose + doseAdjustments data)
 *   siblings      — array of sibling flat drug objects sharing the same
 *                   generic, same shape BrandsList.jsx already receives
 *   onSelectBrand — (item) => void — passed through to BrandsBottomSheet,
 *                   called after the sheet closes
 */

import { useState } from 'react'
import DoseTable from '../DoseTable.jsx'
import BrandsBottomSheet from './BrandsBottomSheet.jsx'
import { SectionHeader, Divider, EmptySection } from './sectionPrimitives.jsx'

export default function DosingSection({ drug, siblings = [], onSelectBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)

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

      {/* -- Available Brands trigger row (4.27) -- */}
      {siblings.length > 0 && (
        <button
          onClick={() => setBrandsOpen(true)}
          style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            width:           '100%',
            backgroundColor: 'var(--color-bg)',
            border:          '1px solid var(--color-border-subtle)',
            borderRadius:    'var(--radius-sm)',
            padding:         'var(--space-3) var(--space-4)',
            marginBottom:    'var(--space-5)',
            cursor:          'pointer',
            fontFamily:      'var(--font-body)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Available Brands (Egypt) &middot; {siblings.length}
          </span>
          <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>&rarr;</span>
        </button>
      )}

      <BrandsBottomSheet
        isOpen={brandsOpen}
        onClose={() => setBrandsOpen(false)}
        siblings={siblings}
        onSelectBrand={onSelectBrand}
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
