/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
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
 * The Class button is left exactly as it was; step 11.4 replaces it with the
 * 'Browse by class' row.
 *
 * Blank-screen fix (2026-10-18): the routes are read when tapped, not when this
 * file loads, because ROUTES is not ready at load time (router.jsx and this file
 * import each other). The same goes for prepareCategoryOpen from DrugsScreen.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, ChevronRight } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import { shimmer } from './shimmer'
import { SpecialtyIcon, useIsDark } from '../../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../../utils/specialtyTokens'
import { useDrugContext } from '../../../context/DrugContext'
import { useCategories } from '../../../hooks/useCategories'
import { ROUTES } from '../../../router'
import { prepareCategoryOpen } from '../../../pages/DrugsScreen'

// How many category tiles show before the dashed '+N more' tile.
const STRIP_COUNT = 3

// 'route' is a function on purpose: this file and router.jsx import each other,
// so ROUTES does not exist yet while this file loads. It is read at tap time.
const CLASS_BUTTON = {
  label:    'Class',
  subtitle: 'Browse by drug class and family',
  icon:     Layers,
  color:    'var(--color-class)',
  tint:     'var(--color-class-light)',
  route:    () => ROUTES.DRUGS_BROWSE_CLASS,
}

function BrowseButton({ label, subtitle, icon: Icon, color, tint, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        background: tint, border: 'none', borderRadius: 16,
        padding: '14px 14px', cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'var(--color-surface)', color,
      }}>
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, color }}>{label}</span>
        <span style={{ fontSize: 13, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>{subtitle}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2} color={color} aria-hidden="true" style={{ flexShrink: 0 }} />
    </button>
  )
}

// One cell of the strip: a rounded square (the icon, or the '+N' of the dashed
// tile) with the name under it. The square keeps its shape and a 64 px top size,
// so four fit a small phone. The name is limited to two lines.
function StripTile({ label, ariaLabel, onTap, children, dashed = false, bg, accent = false }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={ariaLabel || label}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        minWidth: 0, padding: 0, margin: 0,
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.75 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 64, aspectRatio: '1 / 1',
        borderRadius: 18, boxSizing: 'border-box',
        background: dashed ? 'transparent' : bg,
        border: dashed ? '1.5px dashed var(--color-border)' : 'none',
        color: accent ? 'var(--color-accent)' : 'inherit',
        fontSize: 17, fontWeight: 700,
      }}>
        {children}
      </span>
      <span
        dir="auto"
        style={{
          width: '100%', textAlign: 'center',
          fontSize: 12, fontWeight: 600, lineHeight: 1.25,
          color: dashed ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          overflow: 'hidden', display: '-webkit-box',
          WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
          overflowWrap: 'anywhere', hyphens: 'auto',
        }}
      >
        {label}
      </span>
    </button>
  )
}

function StripSkeleton() {
  return (
    <div style={STRIP_GRID} aria-hidden="true">
      {Array.from({ length: STRIP_COUNT + 1 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={shimmer({ width: '100%', maxWidth: 64, aspectRatio: '1 / 1', borderRadius: 18 })} />
          <div style={shimmer({ width: '70%', height: 12 })} />
        </div>
      ))}
    </div>
  )
}

const STRIP_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 8,
  alignItems: 'start',
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

  const shown = withDrugs.slice(0, STRIP_COUNT)
  const restCount = Math.max(0, withDrugs.length - STRIP_COUNT)
  const total = withDrugs.length

  function openAll() { navigate(ROUTES.DRUGS_BROWSE_CATEGORY) }
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
      {total > 0 ? `View all ${total}` : 'View all'}
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
            <StripTile key={cat.id} label={cat.name_en} bg={colors.bg} onTap={() => openCategory(cat.slug)}>
              <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={26} color={colors.fg} />
            </StripTile>
          )
        })}
        {restCount > 0 && (
          <StripTile dashed accent label="more" ariaLabel={`${restCount} more categories`} onTap={openAll}>
            +{restCount}
          </StripTile>
        )}
      </div>
    )
  }

  return (
    <DrugsSectionCard label="Browse" flat title={title} trailing={viewAll}>
      {strip}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <BrowseButton
          label={CLASS_BUTTON.label}
          subtitle={CLASS_BUTTON.subtitle}
          icon={CLASS_BUTTON.icon}
          color={CLASS_BUTTON.color}
          tint={CLASS_BUTTON.tint}
          onTap={() => navigate(CLASS_BUTTON.route())}
        />
      </div>
    </DrugsSectionCard>
  )
}
