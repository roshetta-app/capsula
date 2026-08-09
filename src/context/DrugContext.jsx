import { createContext, useContext, useState } from 'react'
import { useDrugs } from '../hooks/useDrugs'
import { useDrugSearch } from '../hooks/useDrugSearch'

const DrugContext = createContext(null)

/**
 * DrugProvider — wraps the app and makes drug data available everywhere.
 * Uses useDrugs() internally so cache-first logic runs once at the top level.
 *
 * drugs-filter-persist-navigation — also owns 'mode' (Brand/Generic) and
 * 'activeFilters' (Form/Route) for the Drugs screen. These used to live as
 * local useState in DrugsScreen, which meant navigating to a drug detail
 * page (a separate route — DrugsScreen unmounts entirely) or any other tab
 * silently reset them back to defaults. Lifting them here — above the
 * router in App.jsx — means they survive any navigation, same fix as
 * every other piece of state in this app that needs to outlive a screen
 * unmount. Deliberately NOT persisted to localStorage/sessionStorage:
 * this only needs to survive in-app navigation, not a real session end
 * (see DrugFilterPanel.jsx's own header note on filters not persisting
 * between sessions — that decision is unchanged).
 *
 * drug-search-sort-cheapest — 'sortMode' ('relevance' | 'cheapest') joins
 * 'mode' and 'activeFilters' here for the same reason: it needs to survive
 * navigating into a drug's detail page and back, exactly like Search Mode
 * and Form/Route already do, rather than silently resetting to Relevance
 * on every return trip. Same non-persistence rule applies — in-memory only,
 * not saved to localStorage/sessionStorage.
 *
 * drug-search-persist-navigation — 'query'/'setQuery'/'results'/
 * 'queryTooShort'/'suggestion' (from useDrugSearch) join the state above
 * for the exact same reason: useDrugSearch used to be called locally
 * inside DrugsScreen, so opening a drug's detail page (a separate route —
 * DrugsScreen unmounts entirely) and coming back reset the typed query,
 * and everything derived from it, to empty. useDrugSearch itself is
 * unchanged — it's just called here instead, same relocation already done
 * for mode/activeFilters/sortMode.
 */
export function DrugProvider({ children }) {
  const drugsValue = useDrugs()
  const [mode, setMode] = useState('brand')
  const [activeFilters, setActiveFilters] = useState(null)
  const [sortMode, setSortMode] = useState('relevance')
  const searchValue = useDrugSearch(drugsValue.drugs, mode)
  const value = { ...drugsValue, mode, setMode, activeFilters, setActiveFilters, sortMode, setSortMode, ...searchValue }
  return <DrugContext.Provider value={value}>{children}</DrugContext.Provider>
}

/**
 * useDrugContext — consume drug data anywhere in the tree.
 * Returns { drugs, loading, error, refresh, mode, setMode, activeFilters,
 * setActiveFilters, sortMode, setSortMode, query, setQuery, results,
 * queryTooShort, suggestion }
 */
export function useDrugContext() {
  const ctx = useContext(DrugContext)
  if (!ctx) throw new Error('useDrugContext must be used inside <DrugProvider>')
  return ctx
}
