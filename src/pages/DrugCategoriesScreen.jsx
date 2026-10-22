/**
 * src/pages/DrugCategoriesScreen.jsx
 * 2026-10-18 (Drugs groups plan, step 1.1): the Category page. The category
 * tiles that used to sit inside the Browse card on the Drugs home, now on a
 * page of their own. Same tiles, same colours, same 'All Drugs' tile first,
 * and tapping one opens the category exactly as the Drugs home did
 * (/drugs/category/:slug, list starts at the top).
 *
 * The page keeps the Drugs tab's bottom bar. Back returns to the Drugs home.
 * Loading and failed-download states are the same ones the Browse card used.
 * Nothing is saved here; the library comes from DrugContext and the category
 * list from useCategories, like the Drugs home.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoryRow from '../components/drugs/home/CategoryRow'
import BrowseHeader from '../components/drugs/home/BrowseHeader'
import { DrugsSkeleton, LibraryErrorState } from '../components/drugs/home/BrowseStates'
import { useDrugContext } from '../context/DrugContext'
import { useCategories } from '../hooks/useCategories'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'
import { ROUTES } from '../router'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { prepareCategoryOpen } from './DrugsScreen'

export default function DrugCategoriesScreen() {
  const navigate = useNavigate()
  // Back (arrow and phone button) goes to the real previous screen; if this page
  // is opened straight from a link, the Drugs home is put behind it first.
  useDeepLinkParent(ROUTES.DRUGS)
  const isDark = useIsDark()
  const { drugs, loading, error, retry } = useDrugContext()
  const { categories } = useCategories()

  // Only categories that have drugs, same rule as the Drugs home.
  const categoriesWithCounts = useMemo(
    () => categories
      .map(cat => ({ ...cat, count: drugs.filter(d => d.category === cat.slug).length }))
      .filter(c => c.count > 0),
    [categories, drugs]
  )

  const allDrugsColors = resolveToken(FALLBACK_TOKEN, isDark)
  const hasDrugs = drugs.length > 0

  function openCategory(slug) {
    prepareCategoryOpen(slug)
    navigate(ROUTES.DRUGS_CATEGORY(slug), { state: { from: 'categories' } })
  }

  let body = null
  if (loading && !hasDrugs) {
    body = <DrugsSkeleton />
  } else if (!loading && !hasDrugs && error) {
    body = <LibraryErrorState onRetry={retry} />
  } else if (!loading) {
    body = (
      // One column while no category has drugs yet, so 'All Drugs' fills the
      // row; two columns as soon as there are real categories.
      <div style={{ display: 'grid', gridTemplateColumns: categoriesWithCounts.length === 0 ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-2)' }}>
        <CategoryRow
          label="All Drugs"
          iconType="lucide"
          iconValue="Pill"
          color={allDrugsColors.bg}
          textColor={allDrugsColors.fg}
          onTap={() => openCategory('all')}
        />
        {categoriesWithCounts.map(cat => {
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

  // Side gap and max width come from Layout (Drug groups plan, step 12.0 / F1); this page adds top and bottom space only.
  return (
    <div style={{ padding: '0 0 var(--space-4)' }}>
      <BrowseHeader backLabel="Drugs" onBack={() => navigate(-1)} title="Categories" />
      {body}
    </div>
  )
}
