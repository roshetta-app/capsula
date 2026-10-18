/**
 * FavouritesContext — makes useFavourites state available app-wide.
 * Wrap once at the root; consume with useFavouritesContext() anywhere.
 */

import { createContext, useContext } from 'react'
import { useFavourites } from '../hooks/useFavourites'
import { useFavouriteClasses } from '../hooks/useFavouriteClasses'
import { useDrugGroups } from '../hooks/useDrugGroups'

const FavCtx = createContext(null)

export function FavouritesProvider({ children }) {
  const fav = useFavourites()
  // 2026-10-08: favourite classes and families ride on the same provider.
  const classFavs = useFavouriteClasses(fav)
  // 2026-10-18 (Drug groups plan, step 3.4): drug groups ride on the same
  // provider, so they share the sign-in prompt with favourites.
  const groupsApi = useDrugGroups(fav)
  const value = { ...fav, ...classFavs, ...groupsApi }
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>
}

export function useFavouritesContext() {
  const ctx = useContext(FavCtx)
  if (!ctx) throw new Error('useFavouritesContext must be used inside <FavouritesProvider>')
  return ctx
}
