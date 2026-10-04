/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the 'Browse'
 * area of the Drugs home. Its header reads 'Browse by' on the left and, on the
 * right, a small pill switch with 'Category' and 'Class' (the same place and
 * shape as the Search area's mode pill). The chosen option is a filled accent
 * pill, the other sits on the soft tint and is one tap away. Under the header
 * it shows the category tiles or every class (A to Z, the same cards Class
 * search uses), plus the loading and failed-download states.
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

// The Category / Class switch: a soft accent-tinted pill track holding two
// options. The chosen option is a filled accent pill with white text; the other
// is plain accent text on the tint. Each option is at least 28px tall (34px with the track) so it is
// easy to hit with a thumb. The track never shrinks, so the header title can
// not squeeze it.
function BrowseSwitch({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Browse by"
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             2,
        padding:         3,
        flexShrink:      0,
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-accent-light)',
      }}
    >
      {BROWSE_OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            aria-pressed={active}
            onClick={active ? undefined : () => onChange(opt.value)}
            style={{
              minHeight:               28,
              boxSizing:               'border-box',
              padding:                 '0 14px',
              borderRadius:            'var(--radius-full)',
              border:                  'none',
              backgroundColor:         active ? 'var(--color-accent)' : 'transparent',
              color:                   active ? '#fff' : 'var(--color-accent)',
              fontFamily:              'var(--font-body)',
              fontSize:                12,
              fontWeight:              600,
              lineHeight:              1,
              cursor:                  active ? 'default' : 'pointer',
              transition:              'background-color var(--motion-fast) var(--ease-settle), color var(--motion-fast) var(--ease-settle)',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function DrugsBrowseSection({
  browseMode, onBrowseModeChange,
  loading, hasDrugs, error, onRetry,
  categories, allClasses, isDark,
  onOpenCategory, onOpenClass, onOpenSubclass,
}) {
  const allDrugsColors = resolveToken(FALLBACK_TOKEN, isDark)

  const title = <span style={SECTION_TITLE_STYLE}>Browse by</span>

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
    <DrugsSectionCard
      label="Browse"
      title={title}
      trailing={<BrowseSwitch value={browseMode} onChange={onBrowseModeChange} />}
    >
      {body}
    </DrugsSectionCard>
  )
}
