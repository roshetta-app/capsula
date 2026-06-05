import { createContext, useContext } from 'react'
import { useConditions } from '../hooks/useConditions'

const ConditionContext = createContext(null)

/**
 * ConditionProvider — wraps the app and makes condition data available everywhere.
 * Uses useConditions() internally so cache-first logic runs once at the top level.
 */
export function ConditionProvider({ children }) {
  const value = useConditions()
  return <ConditionContext.Provider value={value}>{children}</ConditionContext.Provider>
}

/**
 * useConditionContext — consume condition data anywhere in the tree.
 * Returns { conditions, specialties, loading, error, refresh }
 */
export function useConditionContext() {
  const ctx = useContext(ConditionContext)
  if (!ctx) throw new Error('useConditionContext must be used inside <ConditionProvider>')
  return ctx
}
