/**
 * src/context/RecentlyViewedContext.jsx
 * Phase: sticky-header-permanent-mount-fix
 *
 * Makes the recently-viewed-conditions list one shared, live source instead
 * of a private copy read independently by ConditionsScreen and
 * ConditionDetailScreen. Before this, both screens called
 * useRecentlyViewed() separately — two separate useState instances, only
 * ever kept in sync because both screens fully remounted on every
 * navigation. Now that ConditionsScreen stays permanently mounted, it would
 * never re-read the list on its own, so viewing a condition wouldn't show
 * up in the Recent row until a full app reload. Routing both screens
 * through one Provider fixes that: one addRecentlyViewed() call updates the
 * single shared list everywhere it's read, immediately.
 *
 * Wrap the app with RecentlyViewedProvider once (see App.jsx), then:
 *   const { addRecentlyViewed } = useRecentlyViewedContext()          // write side
 *   const { recentlyViewed, recentOrder } = useRecentlyViewedContext() // read side
 */

import { createContext, useContext } from 'react'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'

const RecentlyViewedContext = createContext(null)

export function RecentlyViewedProvider({ children }) {
  const value = useRecentlyViewed()

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  )
}

export function useRecentlyViewedContext() {
  const ctx = useContext(RecentlyViewedContext)
  if (!ctx) {
    throw new Error('useRecentlyViewedContext must be used within a RecentlyViewedProvider')
  }
  return ctx
}
