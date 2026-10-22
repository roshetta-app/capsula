/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
 * 2026-10-22 (UI refresh plan, step 8.3): the strip is now a 2 by 2 grid of four category tiles
 * (the same CategoryRow tile as the categories screen, so a name is never split inside a word)
 * and the link reads 'View all categories'. The dashed '+N more' tile is gone. Loading shows
 * four placeholder tiles in the same shape. The notes below describe the older strip.
 *
 * 2026-10-18 (Drugs groups plan, step 1.4): the 'Browse' area of the Drugs
 * home was two big buttons, Category (blue) and Class (violet).
 *
 * 2026-10-20 (Drug groups plan, step 11.3): the Category button is replaced by a
 * categories strip. The area's title is now 'Categories' with a 'View all N' link
 * at the right. Under it, one row of four equal tiles: the first 3 categories as
 * coloured rounded icons with their names, and a fourth dashed '+N more' tile.
 * The 'View all' link and the '+N more' tile both open the existing categories
 * screen (DrugCategoriesScreen); a category tile opens that category the same way
 * the tiles on that screen do (list starts at the top).
 *
 * Which categories: the same rule the categories screen uses (active categories in
 * their CMS order that have at least one drug), so 'View all 15' always matches
 * the number of tiles on that screen. N in '+N more' is the live count of the rest.
 * Colours and icons are each category's own. Names are the English names; long
 * names wrap to two lines and are cut after that, so a tile never grows.
 *
 * Loading shows four shimmer tiles. A failed first download shows one short line
 * with a 'Try again' button. With three categories or fewer there is no '+N more'
 * tile. With none, only the 'View all' link (no number) is shown.
 *
 * 2026-10-20 (step 11.4): the Class button is replaced by one full-width flat row under
 * the strip, with a thin line above it: a violet icon square, 'Browse by class', and
 * '<N> classes and families, searchable' (N is live: every class plus every drug family
 * the Classes screen lists). It opens the Classes screen. Until the library is loaded
 * the second line reads 'Search by class or drug family' with no number.
 *
 * Blank-screen fix (2026-10-18): the routes are read when tapped, not when this
 * file loads, because ROUTES is not ready at load time (router.jsx and this file
 * import each other). The same goes for prepareCategoryOpen from DrugsScreen.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, ChevronRight } from 'lucide-react'
import { buildClassIndex } from '../../../utils/classSearch'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import { shimmer } from './shimmer'
import CategoryRow from './CategoryRow'
import { useIsDark } from '../../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../../utils/specialtyTokens'
import { useDrugContext } from '../../../context/DrugContext'
import { useCategories } from '../../../hooks/useCategories'
import { ROUTES } from '../../../router'
import { prepareCategoryOpen } from '../../../pages/DrugsScreen'

// How many category tiles show on the home (2 by 2); the rest are behind View all categories.
const STRIP_COUNT = 4

function ClassRow({ subtitle, onTap }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type="button"
      onClick={onTap}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', minHeight: 56, textAlign: 'left',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.7 : 1,
        transition: 'opacity var(--motion-fast) var(--ease-settle)',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: 'var(--color-class-light)', color: 'var(--color-class)',
      }}>
        <Layers size={21} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: 'var(--color-text-primary)' }}>Browse by class</span>
        <span style={{ fontSize: 13, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>{subtitle}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2} color="var(--color-text-tertiary)" aria-hidden="true" style={{ flexShrink: 0 }} />
    </button>
  )
}

function StripSkeleton() {
  return (
    <div style={STRIP_GRID} aria-hidden="true">
      {Array.from({ length: STRIP_COUNT }, (_, i) => (
        <div key={i} style={shimmer({ height: 80, borderRadius: 16 })} />
      ))}
    </div>
  )
}

const STRIP_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'var(--space-2)',
}

export default function DrugsBrowseSection() {
  const navigate = useNavigate()
  const isDark = useIsDark()
  const { drugs, loading: drugsLoading, error: drugsError, retry } = useDrugContext()
  const { categories, loading: catsLoading } = useCategories()

  // Same rule as the categories screen: active categories, CMS order, with drugs.
  const withDrugs = useMemo(() => {
    const counts = new Map()
    for (const d of drugs) counts.set(d.category, (counts.get(d.category) || 0) + 1)
    return categories.filter(c => (counts.get(c.slug) || 0) > 0)
  }, [categories, drugs])

  // Live count for the Class row: classes plus drug families, as the Classes screen lists them.
  const classTotal = useMemo(() => {
    const idx = buildClassIndex(drugs)
    return idx.classes.length + idx.subclasses.length
  }, [drugs])
  const classSubtitle = classTotal > 0
    ? `${classTotal} classes and families, searchable`
    : 'Search by class or drug family'

  const shown = withDrugs.slice(0, STRIP_COUNT)

  function openAll() { navigate(ROUTES.DRUGS_BROWSE_CATEGORY) }
  function openClasses() { navigate(ROUTES.DRUGS_BROWSE_CLASS) }
  function openCategory(slug) {
    prepareCategoryOpen(slug)
    navigate(ROUTES.DRUGS_CATEGORY(slug))
  }

  const hasDrugs = drugs.length > 0
  const showSkeleton = (drugsLoading && !hasDrugs) || (catsLoading && categories.length === 0)
  const failed = !showSkeleton && !hasDrugs && !!drugsError

  const title = <span style={SECTION_TITLE_STYLE}>Categories</span>
  const viewAll = (
    <button
      type="button"
      onClick={openAll}
      style={{
        display: 'flex', alignItems: 'center', gap: 2,
        minHeight: 44, padding: '0 0 0 8px', margin: '-5px 0',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent)', fontSize: 14, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      View all categories
      <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )

  let strip = null
  if (showSkeleton) {
    strip = <StripSkeleton />
  } else if (failed) {
    strip = (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
        <span>Couldn't load categories</span>
        <button
          type="button"
          onClick={retry}
          style={{
            minHeight: 44, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Try again
        </button>
      </div>
    )
  } else if (shown.length > 0) {
    strip = (
      <div style={STRIP_GRID}>
        {shown.map(cat => {
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
              onTap={() => openCategory(cat.slug)}
            />
          )
        })}
      </div>
    )
  }

  return (
    <>
      <DrugsSectionCard label="Browse" flat title={title} trailing={viewAll}>
        {strip}
      </DrugsSectionCard>
      <section
        aria-label="Browse by class"
        style={{ padding: '12px 0' }}
      >
        <ClassRow subtitle={classSubtitle} onTap={openClasses} />
      </section>
    </>
  )
}
