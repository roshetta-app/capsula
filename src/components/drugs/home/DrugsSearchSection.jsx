/**
 * src/components/drugs/home/DrugsSearchSection.jsx
 * 2026-10-22 (UI refresh plan, step 8.4a): the focus mode now keeps the tinted block: the back
 * arrow sits inside the search pill (SearchBar onBack), the Brand / Generic / Class switch is under
 * it as on the home, and the small mode button and the info button are gone. 'How search modes
 * work' sheet now opens from the info icon in the home header (the screen owns it and passes
 * modeInfoOpen / onModeInfoClose); the focus mode has no info link at all.
 * 2026-10-22 (UI refresh plan, step 8.1): the home header block. On the home view the title
 * area (passed in as 'top'), the search field and the Brand / Generic / Class switch sit
 * together in one tinted block with a rounded bottom edge; Recently viewed and Clear filter
 * stay under it, outside the tint. The 'Find a drug' heading and the small mode button are
 * gone from the home (the switch replaces them). The search focus mode keeps its layout
 * (mode button and info button under the bar) until step 8.4. The search field stays in the
 * same place in the tree in both views, so the keyboard stays up. 'blockRef' marks the block
 * for the slim bar on scroll.
 * 2026-10-21 (step 11.7): new 'allowClass' setting (default true). False leaves Class out of the
 * mode pop-up and the info sheet. The Add drugs screen (12.5) will pass false.
 * 2026-10-20 (Drug groups plan, step 11.6): search focus mode, the frame. No card any more.
 * The Search area is one plain section drawn the same way in both views, and what changes
 * is only how its parts are laid out (CSS 'order' and direction, never a different set of
 * elements), so the one search field is never rebuilt and the keyboard stays up:
 *   home:   'Find a drug' heading with the info button and the mode button, then the tall
 *           search field, then Recently viewed and Clear filter (unchanged from 11.2);
 *   focus:  one flat bar: back arrow and the search field (clear and filter buttons inside
 *           it), and under it the mode button with the info button. The heading is hidden.
 * The sticky wrapper in DrugsScreen.jsx adds the thin line under the bar once the list
 * scrolls (the old solid band under the card is gone).
 * 2026-10-15 (search focus mode): the Cancel button beside the bar is gone. While the
 * search is open, a small back arrow sits at the left of the 'Search' title and leaves
 * the search (and clears the text), so the bar keeps its full width. 'onSearchSubmit' is
 * the keyboard's Search key.
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the 'Search'
 * area. Title row with the info icon and the Search Mode button, then the
 * search bar, then (when it applies) the Recently viewed shortcut, then (when a filter
 * is on) the Clear filter button as the last, full-width row of the card. It is written once and used by every view of the screen (the
 * home view, a category, and typed results). Before, the search bar was written
 * out twice, once per view, and the two copies drifting apart is what closed
 * the keyboard on the first typed letter (see the 2026-07-19 note in
 * DrugsScreen.jsx). Now there is only one search bar in one place, so the
 * keyboard stays open however the view changes.
 *
 * 2026-10-04: choosing a mode shows a short toast with the mode ('Searching in
 * Brand mode', the mode word in bold), in that mode's colour and icon.
 * 2026-10-05: that toast moved up to DrugsScreen.jsx (handleModeChange, passed
 * in as onModeChange) so the mode switch buttons on the no-result cards show
 * the very same toast. Picking from the pop-up still shows it, through there.
 *
 * It draws the Search Mode pop-up (its open or closed state is held by the
 * screen, so the sticky header can open it too) and owns the 'how search modes
 * work' sheet (open or closed state local here); the screen owns the mode itself, which
 * lives in DrugContext so it survives opening a drug and coming back.
 *
 * Props:
 *   mode, onModeChange           'brand' | 'generic' | 'class' and its setter
 *   modeMenuOpen, onModeMenuChange  whether the Search Mode pop-up is open and
 *                                its setter; held by the screen so the sticky
 *                                header's mode button can open the same pop-up
 *   query, onQueryChange         the typed text and its setter
 *   placeholder                  search bar hint text
 *   onFilter                     opens the Form / Route filter sheet
 *   filterDisabled               greys out the filter button (Class cards)
 *   hasActiveFilters             tints the filter button when a filter is on
 *   showClear, onClearFilters    the Clear filter button and what it does
 *   showRecent                   draw the Recently viewed shortcut
 *   recentDrugs, onOpenRecent    full drug records for it, and its tap
 *   categories, isDark           colours for Recently viewed and the info sheet
 */

import { Search, Tag, FlaskConical, Layers } from 'lucide-react'
import ClearFiltersButton from './ClearFiltersButton'
import RecentlyViewedButton from './RecentlyViewedButton'
import ModeSegmentedControl from './ModeSegmentedControl'
import SearchBar from '../DrugSearchBar'
import { FilterModal } from '../../ui/FilterModal'
import SearchModeInfoSheet from '../SearchModeInfoSheet'

// Search Mode pop-up options. The button keeps the short names (it has a fixed
// width); the pop-up shows the same three modes with the word 'mode' added
// ('Brand mode'). Each mode keeps its own accent: Brand blue, Generic green,
// Class violet (theme variables), the same accents the info sheet uses.
export const MODE_OPTIONS = [
  { value: 'brand',   label: 'Brand',   icon: Tag,          color: 'var(--color-accent)',  tint: 'var(--color-accent-light)' },
  { value: 'generic', label: 'Generic', icon: FlaskConical, color: 'var(--color-generic)', tint: 'var(--color-generic-light)' },
  { value: 'class',   label: 'Class',   icon: Layers,       color: 'var(--color-class)',   tint: 'var(--color-class-light)' },
]
const MODE_POPUP_OPTIONS = MODE_OPTIONS.map(o => ({ ...o, label: o.label + ' mode' }))

export default function DrugsSearchSection({
  mode, onModeChange,
  modeMenuOpen, onModeMenuChange,
  query, onQueryChange, placeholder,
  onFilter, filterDisabled, hasActiveFilters,
  showClear, onClearFilters,
  showRecent, recentDrugs, onOpenRecent,
  categories, isDark,
  searchOpen = false, onSearchFocus, onSearchCancel, onSearchSubmit, searchInputRef,
  allowClass = true,
  top = null, blockRef, tint = null, tintLine = null,
  modeInfoOpen = false, onModeInfoClose,
}) {

  function handlePickMode(value) {
    onModeChange(value)
    onModeMenuChange(false)
  }

  // One layout switch: 'order' puts the bar first in focus mode, 'row-reverse' puts the
  // mode button before the info button under it. The elements and their positions in
  // the tree are the same in both views.
  const switchOptions = allowClass ? MODE_OPTIONS : MODE_OPTIONS.filter(o => o.value !== 'class')

  return (
    <>
      <section
        aria-label="Search"
        style={{
          display:       'flex',
          flexDirection: 'column',
          padding:       searchOpen ? 0 : '0 0 var(--space-2)',
        }}
      >
        {/* The header block. Home: tinted, full width to the screen edges, rounded bottom
            edge. Focus: no tint, no padding (the sticky bar around it does the work). */}
        <div
          ref={blockRef}
          style={{
            order:           0,
            display:         'flex',
            flexDirection:   'column',
            margin:          '0 calc(-1 * var(--page-gutter, 16px))',
            padding:         searchOpen
              ? 'calc(env(safe-area-inset-top, 0px) + 12px) var(--page-gutter, 16px) 14px'
              : '16px var(--page-gutter, 16px) 16px',
            backgroundColor: tint || 'var(--color-header-tint)',
            // 2026-10-22 (step 8.13): an opened category colours its header; the outline of the
            // unchosen mode chips follows it through this variable.
            ...(tintLine ? { '--color-chip-line': tintLine } : null),
            borderRadius:    '0 0 24px 24px',
            transition:      'padding var(--motion-base) ease, margin var(--motion-base) ease, background-color var(--motion-fast) ease',
          }}
        >
        {/* Title area (home only; the screen folds it away in focus mode). */}
        <div style={{ order: 0 }}>{top}</div>

        {/* The one search bar of the screen. Nothing is added or removed above it
            except the back arrow, which sits in this same row ('false' holds its place
            when closed), so React keeps the same input (and the keyboard) while the
            view below changes. */}
        <div style={{ order: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar
              ref={searchInputRef}
              value={query}
              onChange={onQueryChange}
              onInputFocus={onSearchFocus}
              onSubmit={onSearchSubmit}
              placeholder={placeholder}
              onFilter={onFilter}
              filterDisabled={filterDisabled}
              hasActiveFilters={hasActiveFilters}
              tall
              onBack={searchOpen ? onSearchCancel : undefined}
            />
          </div>
        </div>

        {/* The mode switch, full width under the search field (home and focus mode). */}
        <div style={{ order: 2, marginTop: 'var(--space-3)' }}>
          <ModeSegmentedControl options={switchOptions} mode={mode} onChange={onModeChange} />
        </div>
        </div>


        {/* Recently viewed: a shortcut to drugs, so it belongs with search. It sits under the
            tinted block, outside it. */}
        {showRecent && recentDrugs.length > 0 && (
          <div style={{ order: 2, marginTop: 'var(--space-4)' }}>
            <RecentlyViewedButton
              onTap={onOpenRecent}
              drugs={recentDrugs}
              categories={categories}
              isDark={isDark}
              onPage
            />
          </div>
        )}

        {/* Clear filter: the last thing in the area, full width, only while a filter is on. */}
        {showClear && (
          <div style={{ order: 3, marginTop: 'var(--space-3)' }}>
            <ClearFiltersButton
              onClick={onClearFilters}
              style={{ display: 'block', width: '100%' }}
            />
          </div>
        )}
      </section>

      {modeMenuOpen && (
        <FilterModal
          onPage
          title="Search Mode"
          titleIcon={Search}
          columns={1}
          single
          large
          options={allowClass ? MODE_POPUP_OPTIONS : MODE_POPUP_OPTIONS.filter(o => o.value !== 'class')}
          selected={[mode]}
          onPick={handlePickMode}
          onClose={() => onModeMenuChange(false)}
        />
      )}

      <SearchModeInfoSheet
        isOpen={modeInfoOpen}
        onClose={() => onModeInfoClose?.()}
        categories={categories}
        isDark={isDark}
        allowClass={allowClass}
      />
    </>
  )
}
