/**
 * src/components/drugs/sections/DoseSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.3
 * (plan decisions 4.6 [§11.1 resolved], 4.11 — see STEPS_DRUG_DETAIL.md §1.3,
 * plan §10 Sections 6, 10)
 *
 * Replaces DosingSection.jsx's Doses + Dose Adjustments content with:
 *   - one tab per population entry in textbookDoses, in array order (see
 *     2026-08-03 note below — ordering is no longer position-derived)
 *   - each tab's own `brackets` array renders as one card per bracket, in
 *     array order
 *   - each card shows `bracket` (title, optional) and `instruction`
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
 *   - Unselected tab pill is outlined (transparent bg, bordered), not
 *     filled gray — only the active tab gets a filled background.
 *
 * Follow-up, 2026-07-25 (dose notes — "both" direction, brainstormed and
 * approved same session): each bracket can carry an optional `note` field,
 * entered per bracket in DoseRowList.jsx. Unlike `textbookDoseNotes` above
 * (generic-wide, shown once regardless of tab), this is scoped to a single
 * bracket and renders inside that bracket's own card — so it can differ per
 * tab, or be left blank on tabs it doesn't apply to.
 *
 * 2026-08-03 (CMS Library rebuild, plan §7 Doses step 3, decision 7) —
 * textbook_doses reshaped from flat population+bracket rows to population-
 * owns-brackets objects. This component updated to match:
 *   - tabs now come directly from `textbookDoses` array order — no more
 *     deriving tabs by sorting a flat array by `position` and taking
 *     first-appearance order, since population is now the top-level grouping
 *     itself, not something to reconstruct
 *   - `max_dose` moved from per-bracket to once per tab: rendered once,
 *     under all of the active tab's bracket cards, reusing the same tinted
 *     callout style (the existing "major" severity red — #FEE2E2 / #991B1B,
 *     already established in sectionPrimitives.jsx's SEVERITY_STYLE) rather
 *     than the old per-card placement
 *   - `Source: {entry.source}` citation line removed — `source` is dropped
 *     from the data model entirely (confirmed 0 of 8 real entries used it)
 *   - `textbookDoseNotes` repositioned from above the tabs/bracket cards to
 *     after the tab's max-dose callout, at the very end of the section —
 *     reverses the 2026-07-25 placement, per decision 7
 *
 * Props:
 *   drug — flat drug object from DrugContext (textbookDoses, doseAdjustments,
 *          textbookDoseNotes)
 *
 * Phase 6 (re-scoped, 2026-09-03, plan §4.9): empty-state changed from the
 * EmptySection "Not yet added" placeholder to rendering nothing at all —
 * now matches every other section's hide-when-empty rule. The three-status
 * loading model §4.9 originally called for is no longer needed: Phase 1's
 * 1.18 single-unified-download change means a drug's data always arrives
 * complete in one shot, so there's no point where a section is "still
 * loading" versus genuinely empty.
 *
 * 2026-09-23: the bracket cards and the max-dose callout both used a
 * hardcoded light-mode-only background (`#F9FAFB` on the cards, `#FEE2E2`
 * on the callout) that never switched for dark mode. Both backgrounds are
 * removed entirely — the cards now sit flat against the section's own
 * surface. The max-dose callout's text color is now the app's
 * `--color-danger` token (globals.css) instead of the hardcoded
 * `#991B1B` — already dark/light-mode aware via the `.dark` overrides —
 * at a smaller font size (13 → 11) now that it's plain text rather than
 * a filled pill. It's also folded into the same gap-based flex stack as
 * the bracket cards (instead of a separately-set `marginTop`), so the
 * space above it matches the gap between the bracket cards exactly
 * rather than stacking on top of the last card's own padding.
 *
 * 2026-09-23 (follow-up — spacing pass): with the card backgrounds gone,
 * each bracket's own `var(--space-3)` internal padding no longer had a
 * visible box to justify it — it just read as extra blank space and an
 * unexplained left indent versus the "Dosage" title and tabs above.
 * Dropped entirely; brackets now sit flush left, separated purely by the
 * container's own `--space-3` gap (matches UsesSection.jsx's points,
 * which are likewise flush with no per-item padding). The bracket
 * title's `marginBottom` (a bare `4`) and the max-dose callout's padding
 * (a bare `'4px 10px'`) are now expressed as `--space-1`/`--space-2`
 * tokens instead of magic numbers, so every gap in the section comes
 * from the same scale. Tier stays as before: `--space-3` between
 * separate brackets/max-dose/the tab-level note (distinct items),
 * `--space-2`/`--space-1` for a sub-element nested under one bracket
 * (its own note, its own title-to-instruction gap).
 */

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import DoseAdjustmentsBottomSheet from './DoseAdjustmentsBottomSheet.jsx'

export default function DoseSection({ drug }) {
  const {
    textbookDoses = [],
    textbookDoseNotes,
    doseAdjustments = [],
  } = drug

  const [activeIndex, setActiveIndex] = useState(0)
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false)

  if (textbookDoses.length === 0) {
    return null
  }

  // Tab order = array order — population is now the top-level grouping
  // itself, nothing to derive by sorting/filtering a flat array anymore.
  const currentIndex = Math.min(activeIndex, textbookDoses.length - 1)
  const currentTab = textbookDoses[currentIndex]
  const brackets = currentTab.brackets ?? []

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
      {textbookDoses.length > 1 && (
        <div style={{
          display: 'flex',
          gap:     'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}>
          {textbookDoses.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              style={{
                padding:         '6px 14px',
                borderRadius:    'var(--radius-full)',
                cursor:          'pointer',
                fontFamily:      'var(--font-body)',
                fontSize:        13,
                fontWeight:      600,
                border:          idx === currentIndex ? 'none' : '1px solid var(--color-border)',
                backgroundColor: idx === currentIndex ? 'var(--color-text-primary)' : 'transparent',
                color:           idx === currentIndex ? 'var(--color-surface)' : 'var(--color-text-secondary)',
              }}
            >
              {tab.population}
            </button>
          ))}
        </div>
      )}

      {/* -- Bracket cards for the active tab, plus the max-dose callout as
            the last item in the same gap-based stack — so its spacing
            above matches the gap between the bracket cards exactly,
            instead of a separately-set margin stacking on top of it. -- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {brackets.map((entry, idx) => (
          <div key={idx}>
            {entry.bracket && (
              <div style={{
                fontSize:     13,
                fontWeight:   500,
                color:        'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
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

            {/* Per-bracket note — scoped to this bracket only, distinct
                from the generic-wide textbookDoseNotes shown at the end
                of the section. */}
            {entry.note && (
              <p style={{
                fontSize:     13,
                fontStyle:    'italic',
                color:        'var(--color-text-secondary)',
                lineHeight:   1.5,
                margin:       0,
                marginTop:    'var(--space-2)',
              }}>
                {entry.note}
              </p>
            )}
          </div>
        ))}

        {currentTab.max_dose && (
          <div style={{
            display:      'inline-block',
            fontSize:     11,
            color:        'var(--color-danger)',
            padding:      'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <strong>Max:</strong> {currentTab.max_dose}
          </div>
        )}
      </div>

      {/* -- General note: single field per generic (textbook_dose_notes),
            can't vary by population/bracket. Positioned at the very end of
            the section, after the active tab's max-dose callout. For a
            note scoped to one specific bracket, see entry.note above. -- */}
      {textbookDoseNotes && (
        <p style={{
          fontSize:     13,
          fontStyle:    'italic',
          color:        'var(--color-text-secondary)',
          lineHeight:   1.5,
          margin:       0,
          marginTop:    'var(--space-3)',
        }}>
          {textbookDoseNotes}
        </p>
      )}

      <DoseAdjustmentsBottomSheet
        isOpen={adjustmentsOpen}
        onClose={() => setAdjustmentsOpen(false)}
        doseAdjustments={doseAdjustments}
      />

    </div>
  )
}
