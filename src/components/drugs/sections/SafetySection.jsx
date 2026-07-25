/**
 * src/components/drugs/sections/SafetySection.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Fully retired as of step 1.6 (decision 4.14). Side Effects moved out to
 * SideEffectsSection.jsx (step 1.4), Pregnancy & Breastfeeding to
 * PregnancySection.jsx (step 1.5), and Contraindications — its last
 * remaining content — to ContraindicationsSection.jsx (step 1.6). Nothing
 * left to render.
 *
 * Stays mounted (renders null) rather than being unmounted/removed here,
 * per the standing 1.10 cleanup rule: file deletion and the matching
 * import/mount removal in DrugDetailScreen.jsx happen together in the
 * final retirement pass (STEPS_DRUG_DETAIL.md 1.10), once every old
 * grouped section file is confirmed empty.
 *
 * Props: drug — flat drug object from DrugContext (unused, kept only for a
 * stable call signature until 1.10 removes this mount entirely)
 */

export default function SafetySection() {
  return null
}
