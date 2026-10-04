/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the 'Browse'
 * area of the Drugs home. Its title is 'Browse by Category · Class': the word
 * that is chosen is bold and in the accent colour, the other is muted, and a
 * tap on the muted one switches. One tap, both options always visible. Under
 * the title it shows the category tiles or every class (A to Z, the same cards
 * Class search uses), plus the loading and failed-download states.
 *
 * Nothing here keeps the choice itself: 'browseMode' and its setter come from
 * the screen, and live in DrugContext so the choice is remembered when you
 * open a drug or switch tabs.
 *
 * Props:
 *   browseMode, onBrowseModeChange   'category' | 'class' and its setter
 *   loading, hasDrugs, error, onRetry  the library's loading / failed state
 *   categories                       categories that have drugs, with slug,
 *                                    name_en and the icon / colour fields
 *   allClasses                       every class, A to Z
 *   isDark                           for the category colours
 *   onOpenCategory(slug | 'all')     open a category (or All Drugs)
 *   onOpenClass, onOpenSubclass      open the class sheet from a class card
 */

import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import CategoryRow from './CategoryRow'
import { DrugsSkeleton, LibraryErrorState } from './BrowseStates'
import ClassSearchResults from '../ClassSearchResults'
import { resolveToken, FALLBACK_TOKEN } from '../../../utils/specialtyTokens'

const BROWSE_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'class',    label: 'Class' },
]

// The word buttons of the title. Same size as the title; the chosen one is
// bold and accent-coloured, the other is muted. The padding gives each word a
// comfortable tap area without changing how the title looks.
function BrowseWord({ label, active, onPress }) {
  return (
    <button
      aria-pressed={active}
      onClick={active ? undefined : onPress}
      style={{
        ...SECTION_TITLE_STYLE,
        fontWeight:              active ? 700 : 500,
        color:                   active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
        background:              'none',
        border:                  'none',
        padding:                 '6px 2px',
        cursor:                  active ? 'default' : 'pointer',
        transition:              'color var(--motion-fast) var(--ease-settle)',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      {label}
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

  const title = (
    <div role="group" aria-label="Browse by" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={SECTION_TITLE_STYLE}>Browse by</span>
      {BROWSE_OPTIONS.map((opt, i) => (
        <span key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {i > 0 && <span aria-hidden="true" style={{ ...SECTION_TITLE_STYLE, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>·</span>}
          <BrowseWord
            label={opt.label}
            active={browseMode === opt.value}
            onPress={() => onBrowseModeChange(opt.value)}
          />
        </span>
      ))}
    </div>
  )

  let body = null
  if (loading && !hasDrugs) {
    body = <DrugsSkeleton />
  } else if (!loading && !hasDrugs && error) {
    body = <LibraryErrorState onRetry={onRetry} />
  } else if (!loading) {
    body = browseMode === 'class' ? (
      allClasses.length > 0 ? (
        <ClassSearchResults
          key="browse-classes"
          results={{ classes: allClasses, subclasses: [] }}
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
    <DrugsSectionCard label="Browse" title={title}>
      {body}
    </DrugsSectionCard>
  )
}
