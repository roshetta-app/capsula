/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the 'Browse'
 * area of the Drugs home. Its header reads 'Browse drugs' on the left and, on the
 * right, a small pill switch with 'Category' and 'Class' (the same place, tint,
 * text size and height as the Search area's mode pill). The chosen option sits on a white
 * thumb that slides across the soft tint; the other is muted and one tap away. Under the header
 * it shows the category tiles or every class (the same cards Class search
 * uses), plus the loading and failed-download states.
 *
 * Class view sort: a small sort button at the right of the class count line,
 * styled like the sort button on the Conditions screen (arrow icon + the name
 * of the other order). Two orders: Relevance (default, classes with the most
 * drugs first, ties A to Z) and A - Z. The choice ('classSortMode') lives in
 * DrugContext so it survives opening a drug or switching tabs; this file reads
 * it from there directly.
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
 *   allClasses                       every class (this file puts them in order)
 *   isDark                           for the category colours
 *   onOpenCategory(slug | 'all')     open a category (or All Drugs)
 *   onOpenClass, onOpenSubclass      open the class sheet from a class card
 */

import { LayoutGrid, Layers } from 'lucide-react'
import { useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import CategoryRow from './CategoryRow'
import { DrugsSkeleton, LibraryErrorState } from './BrowseStates'
import ClassSearchResults from '../ClassSearchResults'
import { resolveToken, FALLBACK_TOKEN } from '../../../utils/specialtyTokens'
import { useDrugContext } from '../../../context/DrugContext'

const BROWSE_OPTIONS = [
  { value: 'category', label: 'Category', icon: LayoutGrid },
  { value: 'class',    label: 'Class',    icon: Layers },
]

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

// The Category / Class switch. Kept quiet on purpose: a soft tinted track with
// a plain white (card-colour) thumb that slides between the two options, with
// a very light shadow. The chosen option is accent-coloured text on the thumb;
// the other is muted grey. Both options are the same width so the thumb
// travels exactly one half of the track. Same pill shape, 12px semi-bold text
// and 28px height as the Search area's mode button. The thumb slide and the
// colour change run together; with 'reduce motion' on, the thumb just jumps.
function BrowseSwitch({ value, onChange }) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const slide = reduceMotion ? 'none' : '240ms var(--ease-settle)'
  const fade  = reduceMotion ? 'none' : 'color 200ms var(--ease-settle)'
  const activeIndex = BROWSE_OPTIONS.findIndex(o => o.value === value)

  return (
    <div
      role="group"
      aria-label="Browse drugs by"
      style={{
        position:            'relative',
        display:             'inline-grid',
        gridTemplateColumns: '1fr 1fr',
        padding:             2,
        flexShrink:          0,
        boxSizing:           'border-box',
        borderRadius:        'var(--radius-full)',
        backgroundColor:     'var(--color-accent-light)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position:        'absolute',
          top:             2,
          bottom:          2,
          left:            2,
          width:           'calc((100% - 4px) / 2)',
          borderRadius:    'var(--radius-full)',
          backgroundColor: 'var(--color-surface)',
          boxShadow:       '0 1px 3px rgba(0, 0, 0, 0.08)',
          transform:       `translateX(${Math.max(activeIndex, 0) * 100}%)`,
          transition:      reduceMotion ? 'none' : `transform ${slide}`,
        }}
      />
      {BROWSE_OPTIONS.map(opt => {
        const active = value === opt.value
        const Icon   = opt.icon
        const fg     = active ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
        return (
          <button
            key={opt.value}
            aria-pressed={active}
            onClick={active ? undefined : () => onChange(opt.value)}
            style={{
              position:                'relative',
              zIndex:                  1,
              height:                  24,
              boxSizing:               'border-box',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     5,
              padding:                 '0 12px',
              borderRadius:            'var(--radius-full)',
              border:                  'none',
              background:              'none',
              color:                   fg,
              fontFamily:              'var(--font-body)',
              fontSize:                12,
              fontWeight:              600,
              lineHeight:              1,
              cursor:                  active ? 'default' : 'pointer',
              transition:              fade,
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            <Icon size={13} color="currentColor" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{opt.label}</span>
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

  const { classSortMode, setClassSortMode } = useDrugContext()
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
    <DrugsSectionCard
      label="Browse"
      title={title}
      trailing={<BrowseSwitch value={browseMode} onChange={onBrowseModeChange} />}
    >
      {body}
    </DrugsSectionCard>
  )
}
