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
 * 2026-10-02 (Related drugs, Alternatives lookup): the sheet now has two
 * tabs, Similar (same generic, as before) and Alternatives (same class and
 * subclass, other generics). The tab bar only shows when Alternatives has
 * at least one brand; with none, the sheet looks exactly like before (one
 * list with its own 'Similar Brands' title). The sheet opens on the tab
 * given by initialTab, except that when Similar is empty it opens on
 * Alternatives. Tab bar styling follows FavouritesTabBar.jsx (accent
 * underline under the active tab). Accessible name renamed 'Similar
 * drugs' -> 'Related drugs'.
 *
 * 2026-10-02 (spacing): when the tab bar shows, the list area gets a roomier
 * top padding so the note and filters don't sit tight under the tabs.
 *
 * 2026-10-02 (fixed height): the sheet is now always its maximum height
 * (70svh at the time) instead of shrinking to fit a short list, so the tabs, filters and
 * pop-ups no longer jump around as filters change the list.
 *
 * 2026-10-03 (taller sheet): the fixed height went from 70svh to 80svh.
 *
 * 2026-10-03 (remembered filters): each tab's Sort / Form / Medicine picks are
 * kept here while the person stays on the same drug page, so closing the
 * sheet or switching tabs doesn't clear them. This sheet lives inside the
 * drug page, which is rebuilt per drug, so browsing to another drug or
 * leaving the page starts fresh.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   siblings      array — same shape BrandsList.jsx already receives
 *   alternatives  array — brands in the same class and subclass (other generics)
 *   initialTab    'similar' | 'alternatives' — which tab to open on
 *   onSelectBrand (item) => void — called after this sheet closes
 */

import { useState, useEffect, useRef } from 'react'
import BrandsList from '../BrandsList.jsx'
import SheetShell from '../../ui/SheetShell'

function TabButton({ label, count, active, onClick }) {
  const fg = active ? 'var(--color-accent)' : 'var(--color-text-secondary)'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        onClick={onClick}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            6,
          height:         50,
          width:          '100%',
          border:         'none',
          background:     'none',
          cursor:         'pointer',
          fontFamily:     'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline:        'none',
          transition:     'color 0.15s ease',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: fg }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{count}</span>
      </button>
      <span style={{
        display:         'block',
        height:          2,
        width:           '100%',
        marginTop:       2,
        borderRadius:    'var(--radius-full)',
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        transition:      'background-color 0.15s ease',
      }} />
    </div>
  )
}

export default function BrandsBottomSheet({
  isOpen,
  onClose,
  siblings = [],
  alternatives = [],
  initialTab = 'similar',
  onSelectBrand,
}) {
  const [tab, setTab] = useState(initialTab)
  // Remembered picks per tab (a ref: no re-render needed, only read when a
  // list is built).
  const savedFilters = useRef({ similar: null, alternatives: null })

  // Each time the sheet opens, start on the tab the person came in for.
  useEffect(() => {
    if (isOpen) setTab(initialTab)
  }, [isOpen, initialTab])

  const showTabs = alternatives.length > 0
  // No Alternatives: single Similar list. No Similar: Alternatives only.
  const activeTab = !showTabs ? 'similar' : siblings.length === 0 ? 'alternatives' : tab

  function handleTap(item) {
    onClose()
    onSelectBrand?.(item)
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Related drugs" maxHeight="80svh">
      {/* Scrollable body — BrandsList's existing filter-chip/sort-toggle/
          sibling-list internals, unchanged. BrandsList renders its own
          "Other Brands" section header, so this sheet doesn't duplicate
          a title. */}
      {/* Fixed-height frame: the sheet used to grow and shrink with the list,
          which moved the tabs, filters and pop-ups around. 40px is the drag
          handle's own space in SheetShell, so this fills the sheet's usual
          maximum height exactly, however few brands there are. */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        height:        'calc(80svh - 40px - env(safe-area-inset-bottom, 0px))',
        minHeight:     0,
      }}>
      {showTabs && (
        <div style={{ display: 'flex', padding: '0 var(--space-4)' }}>
          <TabButton
            label="Similar"
            count={siblings.length}
            active={activeTab === 'similar'}
            onClick={() => setTab('similar')}
          />
          <TabButton
            label="Alternatives"
            count={alternatives.length}
            active={activeTab === 'alternatives'}
            onClick={() => setTab('alternatives')}
          />
        </div>
      )}

      <div style={{
        flex:      1,
        minHeight: 0,
        overflowY: 'auto',
        padding:   `${showTabs ? 'var(--space-5)' : '0'} var(--space-4) var(--space-6)`,
      }}>
        <BrandsList
          key={activeTab}
          siblings={activeTab === 'alternatives' ? alternatives : siblings}
          onTap={handleTap}
          mode={activeTab}
          saved={savedFilters.current[activeTab]}
          onSave={picks => { savedFilters.current[activeTab] = picks }}
          familyName={alternatives[0]?.subclass}
        />
      </div>
      </div>
    </SheetShell>
  )
}
