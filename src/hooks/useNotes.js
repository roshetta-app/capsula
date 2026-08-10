/**
 * src/hooks/useNotes.js
 * Phase F3 — Personal Data Migration
 *
 * Notes storage, pulled out of PersonalNotes.jsx so it follows the same
 * shape as useFavourites.js / useRecentlyViewed.js instead of duplicating
 * the account-aware sync logic a third time inside a component.
 *
 * Signed out (guest): unchanged from before — localStorage only, key
 * `capsula_notes_${conditionId}`, no account required (D12).
 *
 * Signed in: loads from the 'notes' table on sign-in (or when conditionId
 * changes), then writes through on save. Condition-only for now — no
 * item_type column, matching today's feature exactly. The local copy is
 * cleared the moment the user signs out.
 *
 * Returns:
 *   savedValue  string   — the current saved note ('' if none)
 *   save        (value: string) => void
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

function storageKeyFor(conditionId) {
  return `capsula_notes_${conditionId}`
}

function readStorage(conditionId) {
  try { return localStorage.getItem(storageKeyFor(conditionId)) ?? '' } catch { return '' }
}

function writeStorage(conditionId, value) {
  try { localStorage.setItem(storageKeyFor(conditionId), value) } catch { /* ignore */ }
}

function clearStorage(conditionId) {
  try { localStorage.removeItem(storageKeyFor(conditionId)) } catch { /* ignore */ }
}

export function useNotes(conditionId) {
  const { user } = useAuth()
  const [savedValue, setSavedValue] = useState(() => readStorage(conditionId))
  const prevUserRef = useRef(user)

  // Load from the database once signed in, and whenever the signed-in
  // user or the condition being viewed changes.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('notes')
      .select('body')
      .eq('user_id', user.id)
      .eq('condition_id', conditionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return
        const value = data?.body ?? ''
        writeStorage(conditionId, value)
        setSavedValue(value)
      })

    return () => { cancelled = true }
  }, [user, conditionId])

  // Sign-out transition: clear the local mirror immediately.
  useEffect(() => {
    if (prevUserRef.current && !user) {
      clearStorage(conditionId)
      setSavedValue('')
    }
    prevUserRef.current = user
  }, [user, conditionId])

  const save = useCallback((value) => {
    writeStorage(conditionId, value)
    setSavedValue(value)

    if (user) {
      supabase
        .from('notes')
        .upsert(
          { user_id: user.id, condition_id: conditionId, body: value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,condition_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Failed to sync note:', error)
        })
    }
  }, [user, conditionId])

  return { savedValue, save }
}
