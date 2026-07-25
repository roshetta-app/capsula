/**
 * src/components/drugs/sections/PrescribingSection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * 2026-07-25 (drug_detail_rebuild, step 1.7, decision 4.15): Drug
 * Interactions content moved out to its own standalone
 * DrugInteractionsSection.jsx (mounted right after ContraindicationsSection
 * in DrugDetailScreen.jsx, per the locked §11.3 order). This file then
 * rendered Pharmacokinetics only.
 *
 * 2026-07-25 (drug_detail_rebuild, step 1.8b, decision 4.16): Pharmacokinetics
 * content also moved out, into its own standalone PharmacologySection.jsx
 * (mounted right after DrugInteractionsSection, per the locked §11.3 order).
 * This file now renders nothing. Stays mounted, unbuilt, until
 * STEPS_DRUG_DETAIL.md 1.10's final retirement pass deletes it for real —
 * same treatment already given to ClinicalOverview.jsx, DosingSection.jsx,
 * and SafetySection.jsx.
 *
 * Props: drug — flat drug object from DrugContext (unused, kept only for a
 * consistent call signature at the mount site until this file is deleted)
 */

export default function PrescribingSection() {
  return null
}
