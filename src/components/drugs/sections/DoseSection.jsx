/**
 * src/components/drugs/sections/DoseSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.3
 * (plan decisions 4.6 [§11.1 resolved], 4.11 — see STEPS_DRUG_DETAIL.md §1.3,
 * plan §10 Sections 6, 10)
 *
 * Replaces DosingSection.jsx's Doses + Dose Adjustments content with:
 *   - one tab per distinct `population` value present in textbookDoses,
 *     tab order = first-appearance order once every entry is sorted by its
 *     explicit `position` (4.6 — no clean auto-sort rule for free-text
 *     population/bracket labels, so ordering is fully manual, entered in the
 *     CMS via DoseRowList.jsx)
 *   - each tab's entries sharing that population render as one card per
 *     distinct `bracket` (age/weight/etc., optional), in `position` order
 *   - each card shows `instruction`, `max_dose`, and `source` as a citation
 *     line
 *   - header row carries a "Dose adjustments ›" text-link trigger, styled to
 *     match GenericOverviewSection.jsx's "See Available Brands" link exactly
 *     (plain text + ChevronRight, no border — decision 4.11 distinguishes
 *     this from the bordered Available Brands button), hidden entirely when
 *     `doseAdjustments` is empty. Opens DoseAdjustmentsBottomSheet.jsx.
 *
 * Renal/hepatic/other impairment-based dosing stays fully separate from the
 * population tabs (4.6) — Dose Adjustments lives only in the sheet.
 *
 * No trailing Divider() — page-wide rule (see UsesSection.jsx, decision 4.10
 * correction). Empty-Doses state uses the existing EmptySection primitive;
 * only the Dose Adjustments trigger itself has an explicit hide-when-empty
 * rule (4.11).
 *
 * Correction, 2026-07-25 (against the real mockup image — plan decision 4.6
 * never covered this, a genuine gap, not a missed read):
 *   - "Dosage" renders as a large bold title, matching Side Effects' header
 *     weight/size — not the small uppercase SectionHeader style the 4 old
 *     retiring grouped sections use.
 *   - `generic.textbook_dose_notes` (already selected in queries.js as
 *     `textbookDoseNotes`, previously not read anywhere in this rebuild) is
 *     shown as an italic line. It's a single field per generic, not part of
 *     the textbook_doses array, so it can't vary by population/bracket —
 *     rendered once for the whole section (under the tabs, above the
 *     bracket cards), not repeated inside every card.
 *   - `max_dose` renders inside a tinted callout (reusing the existing
 *     "major" severity red — #FEE2E2 / #991B1B — already established in
 *     sectionPrimitives.jsx's SEVERITY_STYLE, rather than inventing a new
 *     color pair), not plain gray text.
 *   - Citation line reads "Source: {source}", not an em-dash prefix.
 *   - Unselected tab pill is outlined (transparent bg, bordered), not
 *     filled gray — only the active tab gets a filled background.
 *
 * Props:
 *   drug — flat drug object from DrugContext (textbookDoses, doseAdjustments,
 *          textbookDoseNotes)
 */

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import DoseAdjustmentsBottomSheet from './DoseAdjustmentsBottomSheet.jsx'
import { EmptySection } from './sectionPrimitives.jsx'

export default function DoseSection({ drug }) {
  const {
    textbookDoses = [],
    textbookDoseNotes,
    doseAdjustments = [],
  } = drug

  const [activePopulation, setActivePopulation] = useState(null)
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false)

  if (textbookDoses.length === 0) {
    return <EmptySection title="Dosage" />
  }

  // Sort once by the explicit, manually-entered `position` (4.6 — no
  // reliable auto-sort rule for free-text population/bracket labels).
  const sorted = [...textbookDoses].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  // Tab order = first-appearance order within the position-sorted list.
  const populations = []
  for (const entry of sorted) {
    if (entry.population && !populations.includes(entry.population)) {
      populations.push(entry.population)
    }
  }

  const currentPopulation = populations.includes(activePopulation)
    ? activePopulation
    : populations[0]

  const bracketsForCurrentTab = sorted.filter(e => e.population === currentPopulation)

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>

      {/* -- Header row: "Dosage" title + Dose adjustments trigger -- */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   'var(--space-3)',
      }}>
        <div style={{
          fontSize:   17,
          fontWeight: 700,
          color:      'var(--color-text-primary)',
        }}>
          Dosage
        </div>

        {doseAdjustments.length > 0 && (
          <button
            onClick={() => setAdjustmentsOpen(true)}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        2,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              fontFamily: 'var(--font-body)',
              fontSize:   13,
              fontWeight: 600,
              color:      'var(--color-text-primary)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Dose adjustments
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* -- Population tabs -- */}
      {populations.length > 1 && (
        <div style={{
          display: 'flex',
          gap:     'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}>
          {populations.map(pop => (
            <button
              key={pop}
              onClick={() => setActivePopulation(pop)}
              style={{
                padding:         '6px 14px',
                borderRadius:    'var(--radius-full)',
                cursor:          'pointer',
                fontFamily:      'var(--font-body)',
                fontSize:        13,
                fontWeight:      600,
                border:          pop === currentPopulation ? 'none' : '1px solid var(--color-border)',
                backgroundColor: pop === currentPopulation ? 'var(--color-text-primary)' : 'transparent',
                color:           pop === currentPopulation ? 'var(--color-surface)' : 'var(--color-text-secondary)',
              }}
            >
              {pop}
            </button>
          ))}
        </div>
      )}

      {/* -- Dose note: single field per generic (textbook_dose_notes),
            can't vary by population/bracket, so shown once here rather
            than repeated inside every card below. -- */}
      {textbookDoseNotes && (
        <p style={{
          fontSize:     13,
          fontStyle:    'italic',
          color:        'var(--color-text-secondary)',
          lineHeight:   1.5,
          margin:       0,
          marginBottom: 'var(--space-3)',
        }}>
          {textbookDoseNotes}
        </p>
      )}

      {/* -- Bracket cards for the active tab -- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {bracketsForCurrentTab.map((entry, idx) => (
          <div
            key={idx}
            style={{
              padding:         'var(--space-3)',
              borderRadius:    'var(--radius-md)',
              backgroundColor: '#F9FAFB',
            }}
          >
            {entry.bracket && (
              <div style={{
                fontSize:     13,
                fontWeight:   600,
                color:        'var(--color-text-primary)',
                marginBottom: 4,
              }}>
                {entry.bracket}
              </div>
            )}

            {entry.instruction && (
              <p style={{
                fontSize:   14,
                color:      'var(--color-text-primary)',
                lineHeight: 1.6,
                margin:     0,
              }}>
                {entry.instruction}
              </p>
            )}

            {entry.max_dose && (
              <div style={{
                display:         'inline-block',
                fontSize:        13,
                color:           '#991B1B',
                backgroundColor: '#FEE2E2',
                padding:         '4px 10px',
                borderRadius:    'var(--radius-sm)',
                marginTop:       'var(--space-2)',
              }}>
                <strong>Max:</strong> {entry.max_dose}
              </div>
            )}

            {entry.source && (
              <div style={{
                fontSize:  12,
                color:     'var(--color-text-tertiary)',
                fontStyle: 'italic',
                marginTop: 6,
              }}>
                Source: {entry.source}
              </div>
            )}
          </div>
        ))}
      </div>

      <DoseAdjustmentsBottomSheet
        isOpen={adjustmentsOpen}
        onClose={() => setAdjustmentsOpen(false)}
        doseAdjustments={doseAdjustments}
      />

    </div>
  )
}
