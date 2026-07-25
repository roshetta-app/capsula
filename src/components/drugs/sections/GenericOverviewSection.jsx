/**
 * src/components/drugs/sections/GenericOverviewSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.1
 * (plan decisions 4.5, 4.7–4.9 — see STEPS_DRUG_DETAIL.md §1.1, plan §10 Section 8)
 *
 * Renders the Active Ingredients / Generic Overview group for a drug:
 *   - fixed decorative icon + generic/combo name (4.9)
 *   - for combo generics (2+ active ingredients), the name line comma-joins
 *     the ingredients array, each capitalized via toTitleCase, truncating to
 *     3 with an expand/collapse chevron past that (4.7) — plain (non-combo)
 *     generics just show their single name, unchanged
 *   - two placeholder "Class"/"Subclass" pill tags — static labels, not
 *     reading any real DB field yet; the real `subclass` column is a
 *     separate, deferred migration (4.8, tracked plan §11.5)
 *   - the "See Available Brands" trigger, relocated here from
 *     DosingSection.jsx (4.5) — same behavior unchanged: opens
 *     BrandsBottomSheet, disappears entirely when there are no siblings
 *   - Mechanism of Action text, same content/logic as it existed in
 *     ClinicalOverview.jsx
 *
 * Props:
 *   drug          — flat drug object from DrugContext
 *   siblings      — array of sibling flat drug objects sharing the same
 *                   generic, same shape BrandsList.jsx already receives
 *   onSelectBrand — (item) => void — passed through to BrandsBottomSheet,
 *                   called after the sheet closes
 *
 * Note: this file is not yet mounted on the drug detail screen — that
 * happens in a later integration step (plan §7 Phase 1 item 10 / checklist
 * step 1.10) once every Phase 1 section exists.
 */

import { useState } from 'react'
import { Atom } from 'lucide-react'
import BrandsBottomSheet from './BrandsBottomSheet.jsx'
import { SectionHeader, Divider, EmptySection, InlineTruncatedList } from './sectionPrimitives.jsx'
import { toTitleCase } from '../../../utils/drugTitleFormat.js'

const pillStyle = {
  fontSize:        11,
  fontWeight:      600,
  backgroundColor: '#F3F4F6',
  color:           '#6B7280',
  padding:         '2px 10px',
  borderRadius:    'var(--radius-full)',
}

export default function GenericOverviewSection({ drug, siblings = [], onSelectBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)

  const {
    genericName,
    ingredients,
    mechanismOfAction,
  } = drug

  // Combo generics (2+ active ingredients) — ingredients is populated only
  // for combos, null otherwise (4.7).
  const isCombo = Array.isArray(ingredients) && ingredients.length > 0

  return (
    <div>

      {/* -- Name row: fixed decorative icon (4.9) + generic/combo name -- */}
      <div style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          'var(--space-3)',
        marginBottom: 'var(--space-3)',
      }}>
        <Atom size={22} color="var(--color-text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize:   16,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
            lineHeight: 1.4,
          }}>
            {isCombo
              ? <InlineTruncatedList items={ingredients.map(toTitleCase)} max={3} />
              : genericName
            }
          </div>

          {/* -- Placeholder Class/Subclass tags (4.8) — static labels, not
                real data yet; subclass column deferred, plan §11.5 -- */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <span style={pillStyle}>Class</span>
            <span style={pillStyle}>Subclass</span>
          </div>
        </div>
      </div>

      <Divider />

      {/* -- Available Brands trigger (moved from DosingSection.jsx, 4.5) -- */}
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

      {/* -- Mechanism of Action (reused from ClinicalOverview.jsx) -- */}
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

    </div>
  )
}
