/**
 * src/components/drugs/sections/DoseAdjustmentsBottomSheet.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.3
 * (plan decision 4.11 — see STEPS_DRUG_DETAIL.md §1.3b, plan §10 Section 10)
 *
 * Bottom sheet for "Dose adjustments", opened by the text-link trigger in
 * DoseSection.jsx's header row. Visual shell (backdrop fade, slide-up
 * transition, mount/unmount timing, Escape key, body-scroll lock) is copied
 * from BrandsBottomSheet.jsx — matching the app's established convention of
 * copying the sheet shell per new sheet, not sharing one component (decision
 * 4.11, confirmed against plan §10 Section 10).
 *
 * The body reuses the same condition/adjustment list markup that used to
 * render as an always-visible inline card in DosingSection.jsx.
 *
 * Phase 3 (Back-Button & State-Audit merged plan) — wired into
 * useBackClose so back closes this sheet instead of changing the route;
 * drag handle now has a real close gesture via useSheetDrag instead of
 * being purely decorative.
 *
 * Phase 5 (Back-Button & State-Audit merged plan) — rebuilt on
 *            SheetShell.jsx (vaul-based), the same shared shell every
 *            sheet in this migration now uses instead of copying the
 *            shell per file (superseding the "copy the shell per sheet"
 *            convention decision 4.11 described above). Backdrop/dialog
 *            markup, the shouldRender/animateIn timing, manual Escape-key
 *            and body-scroll-lock effects, and useSheetDrag are all
 *            replaced by the shared shell — the drag handle itself now
 *            lives in SheetShell. Fixed-header/scrollable-body split
 *            (title pinned, adjustment list scrolls) is unchanged.
 *
 * Props:
 *   isOpen           boolean
 *   onClose          () => void
 *   doseAdjustments  { condition: string, adjustment?: string }[]
 */

import SheetShell from '../../ui/SheetShell'

export default function DoseAdjustmentsBottomSheet({
  isOpen,
  onClose,
  doseAdjustments = [],
}) {
  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Dose adjustments" maxHeight="70dvh">
      {/* Fixed header — title, since nothing rendered in the body below
          supplies its own heading. The drag handle itself now lives in
          SheetShell, above this. */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-4)' }}>
        <div style={{
          fontSize:     15,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          marginBottom: 'var(--space-3)',
        }}>
          Dose adjustments
        </div>
      </div>

      {/* Scrollable body — condition/adjustment list, carried over
          unchanged from the old always-visible inline card. */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '0 var(--space-4) var(--space-6)',
      }}>
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
      </div>
    </SheetShell>
  )
}
