/**
 * src/context/FavouritesSignInContext.jsx
 *
 * Favourites empty-state sign-in banner (this session) — lets a guest
 * viewing an empty Favourites tab open the account sheet directly, with
 * no favourite/note action pending. Built the same way
 * NotesSignInContext.jsx already solved this exact problem for notes: a
 * small, self-contained context owning one flag, rather than routing
 * through useFavourites.js (which already owns pendingFavourite/
 * capBlocked for a different, action-triggered flow, and is otherwise
 * out of scope here).
 *
 * favouriteContext/noteContext in AccountSheet.jsx are both false when
 * this is the reason the sheet is open, so it falls through to its
 * existing generic "Sign in or create account" copy — no changes needed
 * there.
 *
 * Returns:
 *   signInRequested       boolean
 *   requestSignIn         () => void
 *   dismissSignInRequest  () => void
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'

const FavouritesSignInContext = createContext(null)

export function FavouritesSignInProvider({ children }) {
  const { user } = useAuth()
  const [signInRequested, setSignInRequested] = useState(false)

  const requestSignIn = useCallback(() => {
    setSignInRequested(true)
  }, [])

  const dismissSignInRequest = useCallback(() => {
    setSignInRequested(false)
  }, [])

  // Once sign-in completes, the prompt has done its job — clear it so a
  // later sign-out doesn't resurrect a stale request.
  useEffect(() => {
    if (user) setSignInRequested(false)
  }, [user])

  return (
    <FavouritesSignInContext.Provider value={{ signInRequested, requestSignIn, dismissSignInRequest }}>
      {children}
    </FavouritesSignInContext.Provider>
  )
}

export function useFavouritesSignInContext() {
  const ctx = useContext(FavouritesSignInContext)
  if (!ctx) throw new Error('useFavouritesSignInContext must be used inside <FavouritesSignInProvider>')
  return ctx
}
