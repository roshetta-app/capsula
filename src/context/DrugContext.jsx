import { createContext, useContext, useState } from 'react'
import { useDrugs } from '../hooks/useDrugs'

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
 */
export function DrugProvider({ children }) {
  const drugsValue = useDrugs()
  const [mode, setMode] = useState('brand')
  const [activeFilters, setActiveFilters] = useState(null)
  const value = { ...drugsValue, mode, setMode, activeFilters, setActiveFilters }
  return <DrugContext.Provider value={value}>{children}</DrugContext.Provider>
}

/**
 * useDrugContext — consume drug data anywhere in the tree.
 * Returns { drugs, loading, error, refresh, mode, setMode, activeFilters, setActiveFilters }
 */
export function useDrugContext() {
  const ctx = useContext(DrugContext)
  if (!ctx) throw new Error('useDrugContext must be used inside <DrugProvider>')
  return ctx
}
