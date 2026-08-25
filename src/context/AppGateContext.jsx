/**
 * src/context/AppGateContext.jsx
 * App Gate System Phase 1 Step 4b.
 *
 * Makes useAppGate's state available app-wide. Wrap once at the root;
 * consume with useAppGateContext() anywhere. Same shape as
 * PushSubscriptionContext.jsx — a single hook instance mounted once here,
 * so every consumer (AppGate.jsx and anything else that later needs to
 * know about a live gate) reads one shared, live result instead of each
 * mounting its own separate useAppGate() and re-fetching independently.
 */

import { createContext, useContext } from 'react'
import { useAppGate } from '../hooks/useAppGate'

const AppGateCtx = createContext(null)

export function AppGateProvider({ children }) {
  const value = useAppGate()
  return <AppGateCtx.Provider value={value}>{children}</AppGateCtx.Provider>
}

export function useAppGateContext() {
  const ctx = useContext(AppGateCtx)
  if (!ctx) throw new Error('useAppGateContext must be used inside <AppGateProvider>')
  return ctx
}
