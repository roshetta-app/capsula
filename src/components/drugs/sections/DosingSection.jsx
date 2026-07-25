/**
 * src/components/drugs/sections/DosingSection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections (retiring)
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.1 / decision 4.5):
 * the "Available Brands" trigger row and BrandsBottomSheet mount moved to
 * GenericOverviewSection.jsx.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.3 / decisions 4.6,
 * 4.11): Doses and Dose Adjustments — this file's only remaining content —
 * have both moved to the new DoseSection.jsx + DoseAdjustmentsBottomSheet.jsx.
 * This file now renders nothing. Same treatment ClinicalOverview.jsx got once
 * Uses moved out (step 1.2) — stays mounted (empty) in DrugDetailScreen.jsx
 * until STEPS_DRUG_DETAIL.md 1.10's final retirement pass removes it, along
 * with the other 3 old grouped section files, once every one of them has had
 * all of its content individually absorbed.
 *
 * Props:
 *   drug — unused now; kept so the call site in DrugDetailScreen.jsx doesn't
 *          need touching again before 1.10
 */

export default function DosingSection() {
  return null
}
