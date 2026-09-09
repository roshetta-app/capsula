/**
 * src/components/drugs/sections/PregnancyCategoryBottomSheet.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.5b (decision 4.13, §10 Section 12)
 *
 * Static reference sheet listing every value for all four Safety &
 * Pregnancy fields — fixed content, the same every time, not drug-specific.
 * Opened from PregnancySection.jsx's "What does this mean?" link, once the
 * category badge alone (shown inline in the table) isn't enough context.
 *
 * Visual shell (backdrop fade, slide-up transition, mount/unmount timing,
 * Escape key, body-scroll lock) is copied from BrandsBottomSheet.jsx, same
 * convention already used for DoseAdjustmentsBottomSheet.jsx — no new sheet
 * mechanism introduced. Unlike BrandsBottomSheet.jsx (whose body already
 * supplies its own section header via BrandsList), this sheet has no such
 * built-in title, so a plain title is added directly under the drag handle
 * here.
 *
 * decision 9 / plan §7 Pregnancy step 3 (2026-08-03): generalized from a
 * single "Pregnancy Categories" list into three grouped sections, in the
 * same order as PregnancySection.jsx's table rows:
 *   1. Pregnancy Category   — unchanged: PregnancyBadge + PREGNANCY_META.
 *   2. Breastfeeding Safety — new: same colored-box treatment as pregnancy,
 *      looping BREASTFEEDING_META's L1-L5 entries via a local
 *      BreastfeedingBadge (no exported breastfeeding-badge component exists
 *      yet in sectionPrimitives.jsx; kept local to keep this change
 *      contained to this file).
 *   3. Crosses Placenta / BBB — new: label-only text (no colored box, per
 *      the 6.2 design call), looping CROSSES_META's yes/no/minimal/unknown
 *      entries once — both fields share the same value meanings, so shown
 *      a single time rather than duplicated.
 * Each group uses the existing SectionHeader primitive for its subheading.
 *
 * Phase 3 (Back-Button & State-Audit merged plan) — wired into
 * useBackClose so back closes this sheet instead of changing the route;
 * drag handle now has a real close gesture via useSheetDrag instead of
 * being purely decorative.
 *
 * Phase 5 (Back-Button & State-Audit merged plan) — rebuilt on
 *            SheetShell.jsx (vaul-based). Backdrop/dialog markup, the
 *            shouldRender/animateIn timing, manual Escape-key and
 *            body-scroll-lock effects, and useSheetDrag are all replaced
 *            by the shared shell — the drag handle itself now lives in
 *            SheetShell. Fixed-header/scrollable-body split (title pinned,
 *            three grouped sections scroll) is unchanged.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import {
  PREGNANCY_META,
  PregnancyBadge,
  BREASTFEEDING_META,
  CROSSES_META,
  SectionHeader,
} from './sectionPrimitives.jsx'
import SheetShell from '../../ui/SheetShell'

function BreastfeedingBadge({ level }) {
  const meta = BREASTFEEDING_META[level]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           32,
        height:          32,
        borderRadius:    'var(--radius-sm)',
        backgroundColor: meta.bg,
        color:           meta.color,
        fontSize:        16,
        fontWeight:      700,
        flexShrink:      0,
      }}>
        {level}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
        {meta.label}
      </span>
    </div>
  )
}

function CrossesItem({ item }) {
  return (
    <div style={{
      fontSize:     13,
      color:        'var(--color-text-secondary)',
      lineHeight:   1.4,
      marginBottom: 'var(--space-2)',
    }}>
      {item.label}
    </div>
  )
}

export default function PregnancyCategoryBottomSheet({ isOpen, onClose }) {
  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Pregnancy & breastfeeding" maxHeight="70dvh">
      {/* Fixed header — a plain title, since this sheet's body has no
          built-in header of its own. The drag handle itself now lives in
          SheetShell, above this. */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-4)' }}>
        <div style={{
          fontSize:     17,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          marginBottom: 'var(--space-4)',
        }}>
          Pregnancy & Breastfeeding
        </div>
      </div>

      {/* Scrollable body — three grouped sections, one per meta object. */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '0 var(--space-4) var(--space-6)',
      }}>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Pregnancy Category" />
          {Object.keys(PREGNANCY_META).map(category => (
            <PregnancyBadge key={category} category={category} />
          ))}
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Breastfeeding Safety" />
          {Object.keys(BREASTFEEDING_META).map(level => (
            <BreastfeedingBadge key={level} level={level} />
          ))}
        </div>

        <div>
          <SectionHeader title="Crosses Placenta / Blood-Brain Barrier" />
          {Object.values(CROSSES_META).map(item => (
            <CrossesItem key={item.label} item={item} />
          ))}
        </div>
      </div>
    </SheetShell>
  )
}
