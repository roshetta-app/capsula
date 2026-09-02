import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useIsPro } from './useIsPro'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { FAVOURITES_CAP_DRUGS, FAVOURITES_CAP_CONDITIONS } from '../constants/features'

const STORAGE_KEY = 'capsula_favourites'

const CAPS = {
  drugs:      FAVOURITES_CAP_DRUGS,
  conditions: FAVOURITES_CAP_CONDITIONS,
}

// favourites-pending-fix — a signed-out heart-tap is now persisted here, not
// just held in React state. Opening the system browser for Google sign-in
// backgrounds the app, and Android can reclaim that backgrounded process
// under memory pressure, wiping any in-memory-only state before the app
// ever gets a chance to fold the pending tap in. Storing it means it
// survives that, and gets picked back up the moment this hook next mounts
// (see the lazy useState init below). The timestamp guards against a
// days-old abandoned tap resurfacing unexpectedly — anything older than
// PENDING_FAVOURITE_MAX_AGE_MS is treated as if it were never recorded.
const PENDING_FAVOURITE_STORAGE_KEY = 'capsula_pending_favourite'
const PENDING_FAVOURITE_MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes

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

// ─── Pending favourite storage helpers (favourites-pending-fix) ───────────────

function readPendingFavouriteStorage() {
  try {
    const raw = localStorage.getItem(PENDING_FAVOURITE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.type || typeof parsed.id === 'undefined' || !parsed.savedAt) return null
    if (Date.now() - parsed.savedAt > PENDING_FAVOURITE_MAX_AGE_MS) {
      localStorage.removeItem(PENDING_FAVOURITE_STORAGE_KEY)
      return null
    }
    return { type: parsed.type, id: parsed.id }
  } catch {
    return null
  }
}

function writePendingFavouriteStorage(pending) {
  try {
    localStorage.setItem(PENDING_FAVOURITE_STORAGE_KEY, JSON.stringify({ ...pending, savedAt: Date.now() }))
  } catch {
    // localStorage unavailable — silently ignore; falls back to in-memory-only, same as before this fix
  }
}

function clearPendingFavouriteStorage() {
  try {
    localStorage.removeItem(PENDING_FAVOURITE_STORAGE_KEY)
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ─── useFavourites ────────────────────────────────────────────────────────────

/**
 * useFavourites — manages bookmarked drugs and conditions.
 *
 * Phase 7 (this session) — favouriting now requires an account:
 *   - A signed-out tap never touches favourites at all. It's recorded as
 *     `pendingFavourite` ({ type, id }) instead, so SignInNudge can open the
 *     sign-in sheet. The moment sign-in completes, the pending item is
 *     folded into the freshly-loaded database list (see the sign-in effect
 *     below) — this supersedes the old "guest favourites via localStorage"
 *     behaviour (D12) entirely.
 *   - A confirmed guest (useAuth().loading is false, no user) gets any
 *     leftover local favourites from before this change wiped once, with
 *     no migration.
 *   - Free accounts are capped per-list (see constants/features.js). Adding
 *     past the cap is blocked and surfaces via `capBlocked` instead of
 *     silently exceeding it; removing always goes through, uncapped, at any
 *     tier. Pro accounts are never capped (see useIsPro.js).
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
 *   pendingFavourite      { type: 'drugs' | 'conditions', id } | null
 *   capBlocked            'drugs' | 'conditions' | null
 *   dismissPendingFavourite () => void
 *   dismissCapBlocked       () => void
 */
export function useFavourites() {
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const { toast } = useToast()

  const [favourites, setFavourites]           = useState(() => readStorage())
  // favourites-pending-fix — seeded from storage, not just null, so a tap
  // recorded before the app got reloaded (e.g. by the OS during the native
  // sign-in round trip) is still here the moment this hook next mounts.
  const [pendingFavourite, setPendingFavourite] = useState(() => readPendingFavouriteStorage())
  const [capBlocked, setCapBlocked]             = useState(null)

  const prevUserRef      = useRef(user)
  const wipedGuestRef     = useRef(false)

  // Refs so the sign-in DB-fetch effect below can read the latest
  // pendingFavourite/isPro without depending on them — same pattern as
  // prevUserRef above. That effect must only re-run when `user` changes;
  // depending on pendingFavourite/isPro too would re-run it on every
  // unrelated favourite/tier change.
  const pendingFavouriteRef = useRef(pendingFavourite)
  useEffect(() => { pendingFavouriteRef.current = pendingFavourite }, [pendingFavourite])
  const isProRef = useRef(isPro)
  useEffect(() => { isProRef.current = isPro }, [isPro])

  // favourites-pending-fix — every place that used to call
  // setPendingFavourite(...) directly now goes through one of these two, so
  // the storage copy never drifts out of sync with the in-memory one.
  const recordPendingFavourite = useCallback((pending) => {
    setPendingFavourite(pending)
    writePendingFavouriteStorage(pending)
  }, [])

  const clearPendingFavourite = useCallback(() => {
    setPendingFavourite(null)
    clearPendingFavouriteStorage()
  }, [])

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

  // Shared add/remove step (Phase 7) — the only place toggleDrug/
  // toggleCondition actually mutate favourites once a user is present.
  // Removing always goes through, no check. Adding checks the free-tier
  // cap first: if already at the limit, blocks the add (capBlocked) and
  // leaves favourites untouched instead of silently exceeding it.
  const applyToggle = useCallback((type, id) => {
    setFavourites(prev => {
      const list = prev[type]
      const itemType = type === 'drugs' ? 'drug' : 'condition'

      if (list.includes(id)) {
        const next = { ...prev, [type]: list.filter(x => x !== id) }
        writeStorage(next)
        writeThrough(itemType, id, false)
        toast.info('Removed from Favourites')
        return next
      }

      if (!isPro && list.length >= CAPS[type]) {
        setCapBlocked(type)
        return prev
      }

      const next = { ...prev, [type]: [...list, id] }
      writeStorage(next)
      writeThrough(itemType, id, true)
      toast.success('Added to Favourites')
      return next
    })
  }, [isPro, writeThrough, toast])

  // Load from the database once signed in, and whenever the signed-in
  // user changes (e.g. one account signs out and a different one signs
  // into the same session).
  useEffect(() => {
    if (!user) return
    // favourites-pending-fix — wait for AuthContext's own loading flag to
    // clear before doing anything. `user` becomes available synchronously
    // on sign-in, but `profile` (what isPro/isProRef actually reads) only
    // resolves a beat later over the network — `loading` stays true for
    // that whole gap. Without this check, a pending favourite could be
    // folded in before the app has any real idea whether the account is
    // Pro or free, capping a genuine Pro account by pure timing luck. This
    // effect re-runs once `authLoading` flips to false (it's in the
    // dependency array below), so nothing here is lost by waiting.
    if (authLoading) return
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

        // Fold in a pending favourite from a guest tap that triggered this
        // sign-in. Must happen here, before setFavourites(next) below, and
        // nowhere else — this fetch replaces the whole favourites object,
        // so a separate effect adding the pending item first would get
        // silently wiped out the moment this resolves.
        const pending = pendingFavouriteRef.current
        if (pending) {
          if (!next[pending.type].includes(pending.id)) {
            const atCap = !isProRef.current && next[pending.type].length >= CAPS[pending.type]
            if (atCap) {
              setCapBlocked(pending.type)
            } else {
              next[pending.type] = [...next[pending.type], pending.id]
              writeThrough(pending.type === 'drugs' ? 'drug' : 'condition', pending.id, true)
              toast.success('Added to Favourites')
            }
          }
          clearPendingFavourite()
        }

        writeStorage(next)
        setFavourites(next)
      })

    return () => { cancelled = true }
  }, [user, authLoading])

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

  // Guest clean-slate (Phase 7) — favouriting now requires an account, so
  // a guest never keeps local favourites going forward (see file header).
  // Waits for useAuth()'s own loading flag so this only fires for a
  // *confirmed* guest, not on the render before the session check has
  // resolved. One-time wipe of anything left over from before this
  // change — no migration.
  useEffect(() => {
    if (authLoading || user) return
    if (wipedGuestRef.current) return
    wipedGuestRef.current = true
    clearStorage()
    setFavourites({ drugs: [], conditions: [] })
  }, [authLoading, user])

  const toggleDrug = useCallback((id) => {
    if (!user) {
      recordPendingFavourite({ type: 'drugs', id })
      return
    }
    applyToggle('drugs', id)
  }, [user, applyToggle, recordPendingFavourite])

  const toggleCondition = useCallback((id) => {
    if (!user) {
      recordPendingFavourite({ type: 'conditions', id })
      return
    }
    applyToggle('conditions', id)
  }, [user, applyToggle, recordPendingFavourite])

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

  const dismissPendingFavourite = clearPendingFavourite
  const dismissCapBlocked       = useCallback(() => setCapBlocked(null), [])

  return {
    favourites,
    toggleDrug,
    toggleCondition,
    restoreConditionAt,
    restoreDrugAt,
    isDrugFavourited,
    isConditionFavourited,
    pendingFavourite,
    capBlocked,
    dismissPendingFavourite,
    dismissCapBlocked,
  }
}
