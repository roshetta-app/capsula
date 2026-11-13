/**
 * FavouritesContext — makes useFavourites state available app-wide.
 * Wrap once at the root; consume with useFavouritesContext() anywhere.
 */

import { createContext, useContext } from 'react'
import { useFavourites } from '../hooks/useFavourites'
import { useFavouriteClasses } from '../hooks/useFavouriteClasses'
import { useDrugGroups } from '../hooks/useDrugGroups'
import { useRoshettas } from '../hooks/useRoshettas'

const FavCtx = createContext(null)

export function FavouritesProvider({ children }) {
  const fav = useFavourites()
  // 2026-10-08: favourite classes and families ride on the same provider.
  const classFavs = useFavouriteClasses(fav)
  // 2026-10-18 (Drug groups plan, step 3.4): drug groups ride on the same
  // provider, so they share the sign-in prompt with favourites.
  const groupsApi = useDrugGroups(fav)
  // 2026-11-13 (Roshetta plan, step 2.4d): roshettas ride on the same provider.
  // Kept in ONE nested object, not spread flat: the roshetta hook returns seven
  // names the groups hook also returns (waitingCount, failedCount, failedList,
  // syncState, retryFailedChanges, discardFailedChanges, isReadOnly), and a flat
  // spread would silently overwrite the groups' values and break the groups.
  // Screens read it with: const { roshettasApi } = useFavouritesContext()
  const roshettasApi = useRoshettas()
  const value = { ...fav, ...classFavs, ...groupsApi, roshettasApi }
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>
}

export function useFavouritesContext() {
  const ctx = useContext(FavCtx)
  if (!ctx) throw new Error('useFavouritesContext must be used inside <FavouritesProvider>')
  return ctx
}
