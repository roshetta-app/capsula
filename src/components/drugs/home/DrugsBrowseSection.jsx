/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the 'Browse'
 * area of the Drugs home. Its header reads 'Browse drugs' on the left and, on the
 * right, a Category / Class button built like the Search area's mode button (the
 * same ModeButton: tinted pill with icon, name and a down arrow). Tapping it
 * opens a pop-up like the Search Mode pop-up (same FilterModal) to pick
 * Category or Class. Category is blue and Class is violet, the same accents
 * Brand and Class have in Search. Under the header it shows the category tiles
 * or every class (the same cards Class search uses), plus the loading and
 * failed-download states.
 *
 * Nothing here keeps the choice itself: 'browseMode' and its setter come from
 * the screen, and live in DrugContext so the choice is remembered when you
 * open a drug or switch tabs. Only whether the pop-up is open is held here.
 *
 * Class view sort: a small sort button at the right of the class count line,
 * styled like the sort button on the Conditions screen (arrow icon + the name
 * of the other order). Two orders: Relevance (default, classes with the most
 * drugs first, ties A to Z) and A - Z. The choice ('classSortMode') lives in
 * DrugContext so it survives opening a drug or switching tabs; this file reads
 * it from there directly.
 *
 * Props:
 *   browseMode, onBrowseModeChange   'category' | 'class' and its setter
 *   loading, hasDrugs, error, onRetry  the library's loading / failed state
 *   categories                       categories that have drugs, with slug,
 *                                    name_en and the icon / colour fields
 *   allClasses                       every class (this file puts them in order)
 *   isDark                           for the category colours
 *   onOpenCategory(slug | 'all')     open a category (or All Drugs)
 *   onOpenClass, onOpenSubclass      open the class sheet from a class card
 */

import { useMemo, useState } from 'react'
import { LayoutGrid, Layers, ArrowUpDown } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import ModeButton from './ModeButton'
import CategoryRow from './CategoryRow'
import { DrugsSkeleton, LibraryErrorState } from './BrowseStates'
import ClassSearchResults from '../ClassSearchResults'
import { FilterModal } from '../../ui/FilterModal'
import { resolveToken, FALLBACK_TOKEN } from '../../../utils/specialtyTokens'
import { useDrugContext } from '../../../context/DrugContext'

// Browse pop-up options. Same shape as the Search Mode options. Category keeps
// the app's blue accent, Class the violet it has in Search.
const BROWSE_OPTIONS = [
  { value: 'category', label: 'Category', icon: LayoutGrid, color: 'var(--color-accent)', tint: 'var(--color-accent-light)' },
  { value: 'class',    label: 'Class',    icon: Layers,     color: 'var(--color-class)',  tint: 'var(--color-class-light)' },
]

// 'Category' is a little longer than the Search mode names, so this button is
// a bit wider than the Search one (116px, was 104) to keep the whole word.
const BROWSE_BUTTON_WIDTH = 116

const CLASS_SORT_LABELS = { relevance: 'Relevance', az: 'A \u2013 Z' }

// Sort button for the class list. Same look as the Conditions screen sort
// button: no box, arrow icon, 13px medium text in the secondary colour. Like
// that one it shows the order a tap will switch to, and says both in its
// spoken label.
function ClassSortButton({ sortMode, onToggle }) {
  const nextMode = sortMode === 'relevance' ? 'az' : 'relevance'
  return (
    <button
      onClick={onToggle}
      aria-label={`Sort: currently ${CLASS_SORT_LABELS[sortMode]}. Tap to switch to ${CLASS_SORT_LABELS[nextMode]}.`}
      style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     4,
        background:              'none',
        border:                  'none',
        cursor:                  'pointer',
        padding:                 '4px 0 4px 8px',
        fontSize:                13,
        fontWeight:              500,
        color:                   'var(--color-text-secondary)',
        fontFamily:              'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <ArrowUpDown size={13} strokeWidth={1.8} aria-hidden="true" />
      {CLASS_SORT_LABELS[nextMode]}
    </button>
  )
}

export default function DrugsBrowseSection({
  browseMode, onBrowseModeChange,
  loading, hasDrugs, error, onRetry,
  categories, allClasses, isDark,
  onOpenCategory, onOpenClass, onOpenSubclass,
}) {
  const allDrugsColors = resolveToken(FALLBACK_TOKEN, isDark)

  const { classSortMode, setClassSortMode } = useDrugContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const currentOption = BROWSE_OPTIONS.find(o => o.value === browseMode) ?? BROWSE_OPTIONS[0]

  function handlePick(value) {
    onBrowseModeChange(value)
    setMenuOpen(false)
  }
  const sortedClasses = useMemo(() => {
    const list   = (allClasses ?? []).slice()
    const byName = (a, b) => a.name.localeCompare(b.name)
    if (classSortMode === 'az') return list.sort(byName)
    return list.sort((a, b) => (b.brandCount - a.brandCount) || byName(a, b))
  }, [allClasses, classSortMode])

  const title = <span style={SECTION_TITLE_STYLE}>Browse drugs</span>

  let body = null
  if (loading && !hasDrugs) {
    body = <DrugsSkeleton />
  } else if (!loading && !hasDrugs && error) {
    body = <LibraryErrorState onRetry={onRetry} />
  } else if (!loading) {
    body = browseMode === 'class' ? (
      sortedClasses.length > 0 ? (
        <ClassSearchResults
          key="browse-classes"
          results={{ classes: sortedClasses, subclasses: [] }}
          countTrailing={
            <ClassSortButton
              sortMode={classSortMode}
              onToggle={() => setClassSortMode(classSortMode === 'relevance' ? 'az' : 'relevance')}
            />
          }
          startExpanded
          hideKicker
          onOpenClass={onOpenClass}
          onOpenSubclass={onOpenSubclass}
        />
      ) : (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: 'var(--space-4) 0' }}>
          No classes to show yet.
        </div>
      )
    ) : (
      // Single column while no category has drugs yet, so 'All Drugs' fills
      // the row instead of sitting next to an empty slot (2026-08-31 note in
      // DrugsScreen.jsx). It goes back to two columns by itself the moment
      // there are real categories.
      <div style={{ display: 'grid', gridTemplateColumns: categories.length === 0 ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-2)' }}>
        <CategoryRow
          label="All Drugs"
          iconType="lucide"
          iconValue="Pill"
          color={allDrugsColors.bg}
          textColor={allDrugsColors.fg}
          onTap={() => onOpenCategory('all')}
        />
        {categories.map(cat => {
          const iconType  = cat.icon_type || 'lucide'
          const iconValue = iconType === 'custom' ? (cat.icon_url || '') : (cat.icon_name || 'Pill')
          const colors    = resolveToken(cat.color_token || FALLBACK_TOKEN, isDark)
          return (
            <CategoryRow
              key={cat.id}
              label={cat.name_en}
              iconType={iconType}
              iconValue={iconValue}
              color={colors.bg}
              textColor={colors.fg}
              onTap={() => onOpenCategory(cat.slug)}
            />
          )
        })}
      </div>
    )
  }

  return (
    <>
      <DrugsSectionCard
        label="Browse"
        title={title}
        trailing={
          <ModeButton
            icon={currentOption.icon}
            label={currentOption.label}
            color={currentOption.color}
            tint={currentOption.tint}
            width={BROWSE_BUTTON_WIDTH}
            onPress={() => setMenuOpen(true)}
          />
        }
      >
        {body}
      </DrugsSectionCard>

      {menuOpen && (
        <FilterModal
          onPage
          title="Browse by"
          titleIcon={LayoutGrid}
          columns={1}
          single
          large
          options={BROWSE_OPTIONS}
          selected={[browseMode]}
          onPick={handlePick}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
