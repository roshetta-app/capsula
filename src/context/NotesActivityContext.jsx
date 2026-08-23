/**
 * src/context/NotesActivityContext.jsx
 *
 * A lightweight app-wide signal for "a personal note was just saved this
 * visit." Mirrors FavouritesContext.jsx's wrap-a-hook pattern, but there's
 * no favourites-style persisted list to wrap here — notes live per-condition
 * in useNotes.js, with no app-wide aggregate of their own. This context
 * exists solely so the sign-in nudge (useSignInPrompt.js) can watch a first
 * note the same way it already watches a first favourite, without
 * PersonalNotes.jsx needing to know anything about the nudge itself.
 *
 * Added this session as part of the sign-in nudge fix — extends D12/D16's
 * "prompt after first useful action" to personal notes, not just
 * favourites.
 *
 * Wrap once at the root (in App.jsx); consume with
 * useNotesActivityContext() anywhere.
 */

import { createContext, useContext, useCallback, useState } from 'react'

const NotesActivityCtx = createContext(null)

export function NotesActivityProvider({ children }) {
  // Increments once per first-note-saved event. useSignInPrompt only cares
  // about it going from 0 to a positive number, so a simple incrementing
  // counter (rather than a boolean) is enough, and it keeps the same shape
  // favouritesCount already uses.
  const [notesActivityCount, setNotesActivityCount] = useState(0)

  const markNoteSaved = useCallback(() => {
    setNotesActivityCount(count => count + 1)
  }, [])

  return (
    <NotesActivityCtx.Provider value={{ notesActivityCount, markNoteSaved }}>
      {children}
    </NotesActivityCtx.Provider>
  )
}

export function useNotesActivityContext() {
  const ctx = useContext(NotesActivityCtx)
  if (!ctx) throw new Error('useNotesActivityContext must be used inside <NotesActivityProvider>')
  return ctx
}
