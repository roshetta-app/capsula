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
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.2, decision 4.10):
 * Uses migrated out to UsesSection.jsx (now mounted second on the page,
 * per the locked §11.3 order). This file has no content left to render.
 * Kept in place — not deleted, still mounted in DrugDetailScreen.jsx —
 * per STEPS_DRUG_DETAIL.md 1.10, which retires all 4 old grouped section
 * files together in one final cleanup pass, once each of them has had its
 * content fully absorbed (DosingSection/SafetySection/PrescribingSection
 * still hold unmigrated content — steps 1.3–1.9). Renders nothing until
 * then.
 *
 * Props: drug — flat drug object from DrugContext
 */

export default function ClinicalOverview() {
  return null
}
