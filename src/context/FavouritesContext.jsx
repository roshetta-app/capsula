/**
 * FavouritesContext — makes useFavourites state available app-wide.
 * Wrap once at the root; consume with useFavouritesContext() anywhere.
 */

import { createContext, useContext } from 'react'
import { useFavourites } from '../hooks/useFavourites'

const FavCtx = createContext(null)

export function FavouritesProvider({ children }) {
  const value = useFavourites()
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>
}

export function useFavouritesContext() {
  const ctx = useContext(FavCtx)
  if (!ctx) throw new Error('useFavouritesContext must be used inside <FavouritesProvider>')
  return ctx
}
