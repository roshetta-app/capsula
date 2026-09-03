/**
 * src/context/NotesSignInContext.jsx
 *
 * notes-signin-required (this session) — replaces NotesActivityContext.jsx.
 *
 * Notes now require an account to save (same treatment favourites already
 * got this session), and the note textarea itself is not shown at all
 * while signed out — the empty state is a static 'Sign in to add a note'
 * prompt instead. That means there is nothing typed to lose to an Android
 * process kill during the Google sign-in round trip, so unlike
 * pendingFavourite this needs no localStorage persistence — plain React
 * state is enough. All this context owns is 'which condition's note
 * screen asked to open the sign-in sheet', so AccountSheet can show
 * notes-flavored copy instead of the generic one.
 *
 * Replaces NotesActivityContext's old notesActivityCount /
 * markNoteSaved() — that mechanism existed to give useSignInPrompt a
 * 'first note just saved' signal for a soft, after-the-fact nudge.
 * Now that a signed-out Save is blocked up front, that moment can't
 * happen anymore, so useSignInPrompt.js is retired entirely along with
 * it (see App.jsx / SignInNudge.jsx for the other half of that removal).
 *
 * Returns:
 *   pendingNoteConditionId   string | null
 *   requestNoteSignIn        (conditionId: string) => void
 *   dismissNoteSignIn        () => void
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'

const NotesSignInContext = createContext(null)

export function NotesSignInProvider({ children }) {
  const { user } = useAuth()
  const [pendingNoteConditionId, setPendingNoteConditionId] = useState(null)

  const requestNoteSignIn = useCallback((conditionId) => {
    setPendingNoteConditionId(conditionId)
  }, [])

  const dismissNoteSignIn = useCallback(() => {
    setPendingNoteConditionId(null)
  }, [])

  // Once sign-in completes, the prompt has done its job — clear it so a
  // later sign-out doesn't resurrect a stale condition id.
  useEffect(() => {
    if (user) setPendingNoteConditionId(null)
  }, [user])

  return (
    <NotesSignInContext.Provider value={{ pendingNoteConditionId, requestNoteSignIn, dismissNoteSignIn }}>
      {children}
    </NotesSignInContext.Provider>
  )
}

export function useNotesSignInContext() {
  const ctx = useContext(NotesSignInContext)
  if (!ctx) throw new Error('useNotesSignInContext must be used inside <NotesSignInProvider>')
  return ctx
}
