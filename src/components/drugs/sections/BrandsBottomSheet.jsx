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
 * body, including its own "Other Brands" section header, so the sheet
 * shell itself carries only the drag handle, not a duplicate title.
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
 * 2026-09-19 (this session): SheetShell's `ariaLabel` — the closest thing
 * this sheet has to a "title", since it carries only the drag handle and
 * BrandsList's own in-body section header, no separate visible title of
 * its own — renamed "Available brands" → "Similar drugs". Note this only
 * changes the sheet's accessible (screen-reader) name; there's no visible
 * title text here to rename, since BrandsList's own in-body header
 * ("Other Brands") is the only visible heading and wasn't part of this
 * request.
 *
 * 2026-09-19 (this session, follow-up — flicker fix attempt): reported
 * symptom — this sheet flickers/isn't stable in place after tapping a
 * sibling row's new image-search icon (opens the native in-app browser)
 * and closing that tab to return. `maxHeight` switched from `70dvh` to
 * `70svh`. Root cause hypothesis: `dvh` (dynamic viewport height)
 * recalculates live as system/browser chrome changes, and Android WebViews
 * are known to briefly recompute it right as the app returns to the
 * foreground — which the native browser open/close is. `svh` (stable
 * viewport height) doesn't track that kind of transient chrome change, so
 * it shouldn't re-settle when the browser tab closes. Scoped to this sheet
 * only, not SheetShell's shared default — other sheets may have a search
 * input and actually want `dvh`'s shrink-for-keyboard behavior, which
 * `svh` would remove. If this doesn't fully resolve it on-device, the
 * `<html>` position-lock effect in SheetShell.jsx (see that file's own
 * comment history) is the next thing to test, since it's the other
 * documented unknown for this exact class of bug.
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
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Similar drugs" maxHeight="70svh">
      {/* Scrollable body — BrandsList's existing filter-chip/sort-toggle/
          sibling-list internals, unchanged. BrandsList renders its own
          "Other Brands" section header, so this sheet doesn't duplicate
          a title. */}
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
