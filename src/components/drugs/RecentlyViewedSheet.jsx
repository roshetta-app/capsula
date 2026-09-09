/**
 * src/components/drugs/RecentlyViewedSheet.jsx
 *
 * 2026-08-09: replaces the old horizontal "Recent" chip strip on
 * DrugsScreen with a single button (rendered by DrugsScreen itself) that
 * opens this sheet — a full list of the last MAX_RECENT (15) drugs the
 * user has opened, rendered as normal SharedDrugCard rows (same row used
 * by search results and Favourites' Drugs tab) rather than the strip's
 * plain-text links.
 *
 * Shell (backdrop fade, slide-up transition, mount/unmount timing, Escape
 * key, body-scroll lock) is copied from BrandsBottomSheet.jsx /
 * SpecialtiesBottomSheet.jsx so it reads as the same "extra list in a
 * sheet" pattern already established there. Unlike BrandsBottomSheet (which
 * mounts BrandsList and relies on that child's own section header), nothing
 * rendered inside this sheet provides a title on its own, so — like
 * FavouritesManagerSheet — this shell renders its own "Recently viewed"
 * heading next to the drag handle. Unlike FavouritesManagerSheet, no
 * separate close button — this list has no other controls competing for
 * attention, so backdrop-tap/gesture alone is enough, same as
 * BrandsBottomSheet and SpecialtiesBottomSheet.
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
 *            drug list scrolls) is unchanged.
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   drugs       FlatDrug[]  — already resolved to full drug records and
 *                             ordered most-recent-first by the caller
 *                             (DrugsScreen maps stored {id,name,slug}
 *                             entries back to the live catalog before
 *                             passing them in here, since SharedDrugCard
 *                             needs the full record, not just id/name/slug)
 *   categories  Category[] — passed straight through to SharedDrugCard
 *   isDark      boolean    — passed straight through to SharedDrugCard
 *   onSelectDrug (drug) => void — called after this sheet closes
 */

import { Clock } from 'lucide-react'
import SharedDrugCard from '../SharedDrugCard'
import SheetShell from '../ui/SheetShell'

export default function RecentlyViewedSheet({
  isOpen,
  onClose,
  drugs = [],
  categories,
  isDark,
  onSelectDrug,
}) {
  function handleTap(drug) {
    onClose()
    onSelectDrug?.(drug)
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Recently viewed" maxHeight="70dvh">
      {/* Fixed header — title, since (unlike BrandsBottomSheet) nothing
          mounted below provides its own section header. The drag handle
          itself now lives in SheetShell, above this. */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-4)' }}>
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}>
          <Clock size={16} strokeWidth={1.8} color="var(--color-text-tertiary)" />
          <h2 style={{
            fontSize:   16,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
            margin:     0,
          }}>
            Recently viewed
          </h2>
        </div>
      </div>

      {/* Scrollable body — same SharedDrugCard row used by search
          results and Favourites' Drugs tab, no trailing bookmark slot
          since this list is about history, not saved status. */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '0 var(--space-4) var(--space-6)',
      }}>
        {drugs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding:   'var(--space-8) var(--space-4)',
            color:     'var(--color-text-tertiary)',
            fontSize:  14,
          }}>
            No recently viewed drugs yet.
          </div>
        ) : (
          drugs.map((drug, i) => (
            <SharedDrugCard
              key={drug.id}
              drug={drug}
              categories={categories}
              isDark={isDark}
              isLast={i === drugs.length - 1}
              onTap={handleTap}
            />
          ))
        )}
      </div>
    </SheetShell>
  )
}
