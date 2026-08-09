import { createContext, useContext } from 'react'
import { useConditions } from '../hooks/useConditions'
import { useSortToggle } from '../hooks/useSortToggle'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { useConditionSearch } from '../hooks/useConditionSearch'

const ConditionContext = createContext(null)

/**
 * ConditionProvider — wraps the app and makes condition data available everywhere.
 * Uses useConditions() internally so cache-first logic runs once at the top level.
 *
 * conditions-search-persist-navigation — also owns sort mode
 * (useSortToggle), view history (useRecentlyViewed), and search
 * (useConditionSearch). These used to be called locally inside
 * ConditionsScreen (and, for view-history recording, separately again in
 * ConditionDetailScreen), which meant opening a condition's detail page (a
 * separate route — ConditionsScreen unmounts entirely) and coming back
 * reset the typed search query to empty. useSortToggle's sort choice and
 * useRecentlyViewed's history already survive on their own (both persist
 * to localStorage internally), but useConditionSearch's query/results
 * don't, and useConditionSearch needs sortMode/recentOrder passed in as
 * arguments rather than reading them itself — so all three are lifted
 * here together, the same relocation already done for Drugs' search.
 * ConditionDetailScreen now also reads addRecentlyViewed from here rather
 * than a separate hook instance, so a newly-viewed condition updates the
 * shared recency order immediately instead of only via localStorage on
 * next remount.
 */
export function ConditionProvider({ children }) {
  const conditionsValue = useConditions()
  const sortValue = useSortToggle()
  const recentValue = useRecentlyViewed()
  const searchValue = useConditionSearch(
    conditionsValue.conditions,
    sortValue.sortMode,
    recentValue.recentOrder,
    'capsula_conditions_specialty'
  )
  const value = { ...conditionsValue, ...sortValue, ...recentValue, ...searchValue }
  return <ConditionContext.Provider value={value}>{children}</ConditionContext.Provider>
}

/**
 * useConditionContext — consume condition data anywhere in the tree.
 * Returns { conditions, specialties, loading, error, refresh, sortMode,
 * cycleSortMode, setSortMode, SORT_LABELS, recentlyViewed, recentOrder,
 * addRecentlyViewed, clearRecentlyViewed, query, setQuery, activeSpecialty,
 * setActiveSpecialty, results, resultCount }
 */
export function useConditionContext() {
  const ctx = useContext(ConditionContext)
  if (!ctx) throw new Error('useConditionContext must be used inside <ConditionProvider>')
  return ctx
}


