import { createContext, useContext } from 'react'
import { useDrugs } from '../hooks/useDrugs'

const DrugContext = createContext(null)

/**
 * DrugProvider — wraps the app and makes drug data available everywhere.
 * Uses useDrugs() internally so cache-first logic runs once at the top level.
 */
export function DrugProvider({ children }) {
  const value = useDrugs()
  return <DrugContext.Provider value={value}>{children}</DrugContext.Provider>
}

/**
 * useDrugContext — consume drug data anywhere in the tree.
 * Returns { drugs, loading, error, refresh }
 */
export function useDrugContext() {
  const ctx = useContext(DrugContext)
  if (!ctx) throw new Error('useDrugContext must be used inside <DrugProvider>')
  return ctx
}
