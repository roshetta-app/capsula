/**
 * src/components/drugs/home/DrugsSearchSection.jsx
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the 'Search'
 * area. Title row with the info icon and the Search Mode button, then the
 * search bar, then (when it applies) the Recently viewed shortcut. The Clear filter
 * button (when a filter is on) sits on the title row beside the Search Mode
 * button. It is written once and used by every view of the screen (the
 * home view, a category, and typed results). Before, the search bar was written
 * out twice, once per view, and the two copies drifting apart is what closed
 * the keyboard on the first typed letter (see the 2026-07-19 note in
 * DrugsScreen.jsx). Now there is only one search bar in one place, so the
 * keyboard stays open however the view changes.
 *
 * It owns the Search Mode pop-up and the 'how search modes work' sheet (their
 * open or closed state is local here); the screen owns the mode itself, which
 * lives in DrugContext so it survives opening a drug and coming back.
 *
 * Props:
 *   mode, onModeChange           'brand' | 'generic' | 'class' and its setter
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

import { useState } from 'react'
import { Search, Tag, FlaskConical, Layers, Info } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import ModeButton from './ModeButton'
import ClearFiltersButton from './ClearFiltersButton'
import RecentlyViewedButton from './RecentlyViewedButton'
import SearchBar from '../../ui/SearchBar'
import { FilterModal } from '../../ui/FilterModal'
import SearchModeInfoSheet from '../SearchModeInfoSheet'

// Search Mode pop-up options. The button keeps the short names (it has a fixed
// width); the pop-up shows the same three modes with the word 'mode' added
// ('Brand mode'). Each mode keeps its own accent: Brand blue, Generic green,
// Class violet (theme variables), the same accents the info sheet uses.
const MODE_OPTIONS = [
  { value: 'brand',   label: 'Brand',   icon: Tag,          color: 'var(--color-accent)',  tint: 'var(--color-accent-light)' },
  { value: 'generic', label: 'Generic', icon: FlaskConical, color: 'var(--color-generic)', tint: 'var(--color-generic-light)' },
  { value: 'class',   label: 'Class',   icon: Layers,       color: 'var(--color-class)',   tint: 'var(--color-class-light)' },
]
const MODE_POPUP_OPTIONS = MODE_OPTIONS.map(o => ({ ...o, label: o.label + ' mode' }))

export default function DrugsSearchSection({
  mode, onModeChange,
  query, onQueryChange, placeholder,
  onFilter, filterDisabled, hasActiveFilters,
  showClear, onClearFilters,
  showRecent, recentDrugs, onOpenRecent,
  categories, isDark,
}) {
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [showModeInfo, setShowModeInfo] = useState(false)
  const currentMode = MODE_OPTIONS.find(o => o.value === mode) ?? MODE_OPTIONS[0]

  function handlePickMode(value) {
    onModeChange(value)
    setModeMenuOpen(false)
  }

  const title = (
    <>
      <span style={SECTION_TITLE_STYLE}>Search</span>
      <button
        onClick={() => setShowModeInfo(true)}
        aria-label="How search modes work"
        style={{
          display:                 'flex',
          alignItems:              'center',
          justifyContent:          'center',
          width:                   28,
          height:                  28,
          borderRadius:            '50%',
          background:              'none',
          border:                  'none',
          padding:                 0,
          cursor:                  'pointer',
          color:                   'var(--color-text-tertiary)',
          WebkitTapHighlightColor: 'transparent',
          outline:                 'none',
        }}
      >
        <Info size={14} />
      </button>
    </>
  )

  return (
    <>
      <DrugsSectionCard
        label="Search"
        title={title}
        trailing={
          // Clear filter sits on the title row, just left of the Search Mode
          // button, and only while a filter is on.
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {showClear && <ClearFiltersButton onClick={onClearFilters} />}
            <ModeButton
              icon={currentMode.icon}
              label={currentMode.label}
              color={currentMode.color}
              tint={currentMode.tint}
              onPress={() => setModeMenuOpen(true)}
            />
          </div>
        }
      >
        {/* The one search bar of the screen. Nothing is added or removed
            above it, so React keeps the same input (and the keyboard) while
            the view below changes. */}
        <div>
          <SearchBar
            value={query}
            onChange={onQueryChange}
            placeholder={placeholder}
            onFilter={onFilter}
            filterDisabled={filterDisabled}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Recently viewed: a shortcut to drugs, so it belongs with search. */}
        {showRecent && recentDrugs.length > 0 && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <RecentlyViewedButton
              onTap={onOpenRecent}
              drugs={recentDrugs}
              categories={categories}
              isDark={isDark}
            />
          </div>
        )}
      </DrugsSectionCard>

      {modeMenuOpen && (
        <FilterModal
          onPage
          title="Search Mode"
          titleIcon={Search}
          columns={1}
          single
          large
          options={MODE_POPUP_OPTIONS}
          selected={[mode]}
          onPick={handlePickMode}
          onClose={() => setModeMenuOpen(false)}
        />
      )}

      <SearchModeInfoSheet
        isOpen={showModeInfo}
        onClose={() => setShowModeInfo(false)}
        categories={categories}
        isDark={isDark}
      />
    </>
  )
}