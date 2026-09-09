/**
 * src/components/drugs/sections/BrandsBottomSheet.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Bottom sheet for "Available Brands" (decision 4.27), opened by the
 * compact trigger row in DosingSection.jsx. Visual shell (backdrop fade,
 * slide-up transition, mount/unmount timing, Escape key, body-scroll lock)
 * is copied from SpecialtiesBottomSheet.jsx / FavouritesManagerSheet.jsx so
 * it reads as the same "extra controls in a sheet" pattern already
 * established there — no new UI language introduced.
 *
 * Like SpecialtiesBottomSheet.jsx (a single list, not several grouped
 * controls), this sheet relies on backdrop-tap/Escape alone to dismiss —
 * no separate close button. BrandsList.jsx is mounted unchanged as the
 * body, including its own "Available Brands (Egypt)" section header, so
 * the sheet shell itself carries only the drag handle, not a duplicate
 * title.
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
 *            SheetShell, so this sheet no longer needs its own
 *            handle-only fixed header. BrandsList's own section header +
 *            scrollable body is unchanged.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   siblings      array — same shape BrandsList.jsx already receives
 *   onSelectBrand (item) => void — called after this sheet closes
 */

import BrandsList from '../BrandsList.jsx'
import SheetShell from '../../ui/SheetShell'

export default function BrandsBottomSheet({
  isOpen,
  onClose,
  siblings = [],
  onSelectBrand,
}) {
  function handleTap(item) {
    onClose()
    onSelectBrand?.(item)
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Available brands" maxHeight="70dvh">
      {/* Scrollable body — BrandsList's existing filter-chip/sort-toggle/
          sibling-list internals, unchanged. BrandsList renders its own
          "Available Brands (Egypt)" section header, so this sheet doesn't
          duplicate a title. */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '0 var(--space-4) var(--space-6)',
      }}>
        <BrandsList siblings={siblings} onTap={handleTap} />
      </div>
    </SheetShell>
  )
}
