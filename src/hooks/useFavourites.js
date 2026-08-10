import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'capsula_favourites'

// ─── Storage helpers ──────────────────────────────────────────────────────────

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { drugs: [], conditions: [] }
    const parsed = JSON.parse(raw)
    return {
      drugs:      Array.isArray(parsed.drugs)      ? parsed.drugs      : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
    }
  } catch {
    return { drugs: [], conditions: [] }
  }
}

function writeStorage(favourites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ─── useFavourites ────────────────────────────────────────────────────────────

/**
 * useFavourites — manages bookmarked drugs and conditions.
 *
 * Signed out (guest): unchanged from before — localStorage only, key
 * 'capsula_favourites', no account required (D12).
 *
 * Signed in: loads from the 'favourites' table on sign-in, then writes
 * through to the table on every toggle/restore (optimistic — local state
 * updates immediately, the database call fires alongside it). The local
 * copy becomes a fast mirror, not the source of truth, once a user is
 * present (D1). The mirror is cleared the moment the user signs out —
 * nothing is lost, it stays safely in the account.
 *
 * Storage shape (both local and as read from the database): { drugs:
 * string[], conditions: string[] }
 *
 * Returns:
 *   favourites            { drugs: string[], conditions: string[] }
 *   toggleDrug            (id: string) => void
 *   toggleCondition       (id: string) => void
 *   restoreConditionAt    (id: string, index: number) => void
 *   restoreDrugAt         (id: string, index: number) => void
 *   isDrugFavourited      (id: string) => boolean
 *   isConditionFavourited (id: string) => boolean
 */
export function useFavourites() {
  const { user } = useAuth()
  const [favourites, setFavourites] = useState(() => readStorage())
  const prevUserRef = useRef(user)

  // Load from the database once signed in, and whenever the signed-in
  // user changes (e.g. one account signs out and a different one signs
  // into the same session).
  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('favourites')
      .select('item_type, item_id')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const next = {
          drugs:      data.filter(r => r.item_type === 'drug').map(r => r.item_id),
          conditions: data.filter(r => r.item_type === 'condition').map(r => r.item_id),
        }
        writeStorage(next)
        setFavourites(next)
      })

    return () => { cancelled = true }
  }, [user])

  // Sign-out transition: clear the local mirror immediately. Guarded so
  // this only fires when an actual signed-in user goes to null, not on
  // the initial guest render.
  useEffect(() => {
    if (prevUserRef.current && !user) {
      clearStorage()
      setFavourites({ drugs: [], conditions: [] })
    }
    prevUserRef.current = user
  }, [user])

  // Fire-and-forget write-through to the database. No-ops for guests.
  // Upsert (not plain insert) on add, since the table has a unique
  // constraint on (user_id, item_type, item_id) — this keeps a fast
  // double-tap from erroring out or creating a duplicate row.
  const writeThrough = useCallback((itemType, id, nowFavourited) => {
    if (!user) return
    const query = nowFavourited
      ? supabase.from('favourites').upsert(
          { user_id: user.id, item_type: itemType, item_id: id },
          { onConflict: 'user_id,item_type,item_id' }
        )
      : supabase.from('favourites').delete()
          .eq('user_id', user.id).eq('item_type', itemType).eq('item_id', id)

    query.then(({ error }) => {
      if (error) console.error('Failed to sync favourite:', error)
    })
  }, [user])

  const toggleDrug = useCallback((id) => {
    setFavourites(prev => {
      const nowFavourited = !prev.drugs.includes(id)
      const next = nowFavourited
        ? { ...prev, drugs: [...prev.drugs, id] }
        : { ...prev, drugs: prev.drugs.filter(d => d !== id) }
      writeStorage(next)
      writeThrough('drug', id, nowFavourited)
      return next
    })
  }, [writeThrough])

  const toggleCondition = useCallback((id) => {
    setFavourites(prev => {
      const nowFavourited = !prev.conditions.includes(id)
      const next = nowFavourited
        ? { ...prev, conditions: [...prev.conditions, id] }
        : { ...prev, conditions: prev.conditions.filter(c => c !== id) }
      writeStorage(next)
      writeThrough('condition', id, nowFavourited)
      return next
    })
  }, [writeThrough])

  // restoreConditionAt — reinserts a condition id at a specific index instead
  // of appending it to the end. Used by Undo after a remove: toggleCondition
  // is append-only by design (so ordinary re-favouriting always lands at the
  // end, which is what powers the "recently added" sort), but Undo isn't
  // ordinary re-favouriting — it should put the item back exactly where it
  // was, not bump it to the top. No-ops if the id is already present, as a
  // guard against a stray double-fire (e.g. a fast double-tap on Undo).
  //
  // When signed in, the database side is a normal upsert — it lands with a
  // fresh created_at rather than the original one. This only affects the
  // database's own recency ordering after the next sign-in fetch on another
  // device; the local list (what the user actually sees right now) is
  // restored at the exact original position either way.
  const restoreConditionAt = useCallback((id, index) => {
    setFavourites(prev => {
      if (prev.conditions.includes(id)) return prev
      const conditions = [...prev.conditions]
      const insertAt = Math.max(0, Math.min(index, conditions.length))
      conditions.splice(insertAt, 0, id)
      const next = { ...prev, conditions }
      writeStorage(next)
      writeThrough('condition', id, true)
      return next
    })
  }, [writeThrough])

  // restoreDrugAt — mirrors restoreConditionAt exactly (see its comment
  // above): reinserts a drug id at a specific index instead of appending it
  // to the end, so Favourites' Undo-after-remove flow (decision 4.16) can
  // put a drug back exactly where it was. No-ops if the id is already
  // present, as a guard against a stray double-fire.
  const restoreDrugAt = useCallback((id, index) => {
    setFavourites(prev => {
      if (prev.drugs.includes(id)) return prev
      const drugs = [...prev.drugs]
      const insertAt = Math.max(0, Math.min(index, drugs.length))
      drugs.splice(insertAt, 0, id)
      const next = { ...prev, drugs }
      writeStorage(next)
      writeThrough('drug', id, true)
      return next
    })
  }, [writeThrough])

  const isDrugFavourited = useCallback(
    (id) => favourites.drugs.includes(id),
    [favourites.drugs]
  )

  const isConditionFavourited = useCallback(
    (id) => favourites.conditions.includes(id),
    [favourites.conditions]
  )

  return {
    favourites,
    toggleDrug,
    toggleCondition,
    restoreConditionAt,
    restoreDrugAt,
    isDrugFavourited,
    isConditionFavourited,
  }
}
