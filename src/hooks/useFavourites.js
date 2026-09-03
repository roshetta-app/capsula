import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useIsPro } from './useIsPro'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { FAVOURITES_CAP_DRUGS, FAVOURITES_CAP_CONDITIONS } from '../constants/features'

const STORAGE_KEY = 'capsula_favourites'

const CAPS = {
  drugs:      FAVOURITES_CAP_DRUGS,
  conditions: FAVOURITES_CAP_CONDITIONS,
}

// offline-favourite-sync fix — a database write that fails (or is skipped
// because we're offline) used to just be logged and dropped: local state
// and localStorage already looked correct, so nothing ever told the user
// their favourite never actually reached their account. In practice this
// only ever hits Pro accounts — free accounts are already blocked from the
// app entirely while offline by AppGate.jsx — but nothing below needs to
// special-case that; it just works correctly for whoever hits it.
//
// Every write that fails or is skipped gets queued here instead, keyed by
// user+item so repeated toggles on the same item while offline collapse to
// just the final desired state rather than queuing every intermediate
// flip. Flushed (see the effect below) the moment the app's own confirmed
// isOnline (not the browser's raw, less trustworthy navigator.onLine) goes
// true, and also once on mount in case the app was closed before a prior
// session's queue ever got the chance to flush. No expiry, unlike
// PENDING_FAVOURITE above — this represents something the user actually
// did, not a speculative intent, so it keeps retrying until it succeeds
// rather than silently giving up on a real action.
const PENDING_WRITES_KEY = 'capsula_favourites_pending_writes'

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

// ─── Pending-write queue helpers (offline-favourite-sync fix) ─────────────────

function readPendingWrites() {
  try {
    const raw = localStorage.getItem(PENDING_WRITES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch {
    return {}
  }
}

function writePendingWrites(pending) {
  try {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(pending))
  } catch {
    // localStorage unavailable — silently ignore. A write that fails here
    // simply won't be retried automatically, same risk as before this fix.
  }
}

function queueWrite(userId, itemType, id, nowFavourited) {
  const pending = readPendingWrites()
  pending[`${userId}:${itemType}:${id}`] = { userId, itemType, id, nowFavourited }
  writePendingWrites(pending)
}

function unqueueWrite(userId, itemType, id) {
  const key = `${userId}:${itemType}:${id}`
  const pending = readPendingWrites()
  if (key in pending) {
    delete pending[key]
    writePendingWrites(pending)
  }
}

function buildFavouriteQuery(userId, itemType, id, nowFavourited) {
  return nowFavourited
    ? supabase.from('favourites').upsert(
        { user_id: userId, item_type: itemType, item_id: id },
        { onConflict: 'user_id,item_type,item_id' }
      )
    : supabase.from('favourites').delete()
        .eq('user_id', userId).eq('item_type', itemType).eq('item_id', id)
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
 * offline-favourite-sync fix (this session) — a database write that failed,
 * or was skipped entirely because the app was offline, used to just be
 * logged and dropped; the account's actual saved list could silently never
 * receive it. Every such write is now queued to localStorage and retried
 * automatically once the app's own confirmed isOnline goes true (see
 * writeThrough and the flush effect below). In practice this only ever
 * affects Pro accounts, since AppGate.jsx already blocks free accounts from
 * the app entirely while offline — but the fix itself doesn't need to know
 * that; it's correct for anyone regardless of tier.
 *
 * offline-favourite-sync refinement (this session) — two follow-up gaps
 * found in testing, both fixed together:
 *   - The sign-in fetch had no explicit order, so it could silently
 *     scramble "recently added" ordering (which is just this array's own
 *     order, reversed — see FavouritesScreen.jsx's Phase 14 note) whenever
 *     it ran after a queued write flushed. Now explicitly ordered by
 *     created_at.
 *   - A successful flush only cleared the queue; it didn't touch local
 *     state. If the sign-in fetch happened to run before the flush
 *     finished, the flushed item could end up missing from view entirely,
 *     with nothing left to pull it back in. The flush now merges its own
 *     result into favourites directly, so the outcome is correct no
 *     matter which of the two finishes first.
 *   - Also depends on OnlineStatusContext.jsx now force-checking
 *     reachability on app resume (see that file) — a normal background/
 *     foreground cycle (not a relaunch) never re-runs this hook's effects
 *     at all, so without that, a reconnect that happens while backgrounded
 *     could go unnoticed indefinitely.
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
  const { isOnline } = useOnlineStatus()
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
  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

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
  //
  // offline-favourite-sync fix — previously, a failed (or offline) write
  // was only logged, never retried, so it could silently never reach the
  // account at all. Now: if we're not online, skip attempting the request
  // altogether and queue it straight away; if the request is attempted and
  // fails for any other reason, queue it too. Either way it retries via
  // the flush effect below.
  const writeThrough = useCallback((itemType, id, nowFavourited) => {
    if (!user) return
    const userId = user.id

    if (!isOnlineRef.current) {
      queueWrite(userId, itemType, id, nowFavourited)
      return
    }

    buildFavouriteQuery(userId, itemType, id, nowFavourited).then(({ error }) => {
      if (error) {
        console.error('Failed to sync favourite:', error)
        queueWrite(userId, itemType, id, nowFavourited)
      } else {
        // Succeeded directly — clear any older queued entry for this same
        // item so a stale queued write can't overwrite this newer result
        // on a later flush.
        unqueueWrite(userId, itemType, id)
      }
    })
  }, [user])

  // offline-favourite-sync fix — flushes anything left in the queue above.
  // Runs whenever isOnline is true: on a genuine reconnect, and also on
  // mount if the app was closed before a previous session's queue got the
  // chance to flush. Each entry is retried and only removed from the queue
  // on success, so a still-offline (or otherwise still-failing) entry is
  // simply left for the next flush rather than lost.
  useEffect(() => {
    if (!isOnline) return
    let cancelled = false

    async function flushPendingWrites() {
      const pending = readPendingWrites()
      for (const [key, entry] of Object.entries(pending)) {
        if (cancelled) return
        const { error } = await buildFavouriteQuery(entry.userId, entry.itemType, entry.id, entry.nowFavourited)
        if (cancelled) return
        if (!error) {
          const current = readPendingWrites()
          delete current[key]
          writePendingWrites(current)

          // offline-favourite-sync refinement — a successful flush can
          // land either before or after the sign-in fetch effect's own
          // DB-replace runs (they're independent effects with no fixed
          // order). If the fetch already ran, it wouldn't have included
          // this item (the write hadn't reached the database yet), so it
          // needs to be folded in here too — same append-to-end/filter-out
          // shape as everywhere else in this file. If the fetch hasn't
          // run yet, this is a safe no-op once it does, since the fetch
          // will already include this item (its created_at is now set).
          // Only applies to the currently signed-in account, so a queued
          // write left over from a previously signed-out account can't
          // bleed into someone else's local list.
          if (entry.userId === user?.id) {
            const listKey = entry.itemType === 'drug' ? 'drugs' : 'conditions'
            setFavourites(prev => {
              const list = prev[listKey]
              const already = list.includes(entry.id)
              if (entry.nowFavourited === already) return prev
              const nextList = entry.nowFavourited
                ? [...list, entry.id]
                : list.filter(x => x !== entry.id)
              const next = { ...prev, [listKey]: nextList }
              writeStorage(next)
              return next
            })
          }
        }
        // On error, leave it queued — the next flush (reconnect or next
        // app open) will retry it.
      }
    }

    flushPendingWrites()
    return () => { cancelled = true }
  }, [isOnline, user])

  // Shared add/remove step (Phase 7) — the only place toggleDrug/
  // toggleCondition actually mutate favourites once a user is present.
  // Removing always goes through, no check. Adding checks the free-tier
  // cap first: if already at the limit, blocks the add (capBlocked) and
  // leaves favourites untouched instead of silently exceeding it.
  // favourites-pending-fix follow-up — accepts an optional { silent: true }
  // so a screen that already shows its own feedback for a remove (e.g.
  // FavouritesScreen's own Undo snackbar) can skip this generic toast
  // instead of showing both at once. Defaults to false everywhere else,
  // so every other call site's behavior is unchanged.
  const applyToggle = useCallback((type, id, { silent = false } = {}) => {
    setFavourites(prev => {
      const list = prev[type]
      const itemType = type === 'drugs' ? 'drug' : 'condition'

      if (list.includes(id)) {
        const next = { ...prev, [type]: list.filter(x => x !== id) }
        writeStorage(next)
        writeThrough(itemType, id, false)
        if (!silent) toast.info('Removed from Favourites')
        return next
      }

      if (!isPro && list.length >= CAPS[type]) {
        setCapBlocked(type)
        return prev
      }

      const next = { ...prev, [type]: [...list, id] }
      writeStorage(next)
      writeThrough(itemType, id, true)
      if (!silent) toast.success('Added to Favourites')
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
      // offline-favourite-sync refinement — explicit order, ascending, so
      // this array's order (index 0 oldest → last index newest) is always
      // deterministic. Without this, Postgres returns rows in whatever
      // scan order it happens to use, which is NOT guaranteed to match
      // insertion/upsert recency — and FavouritesScreen's "recently added"
      // tab is just this array's own order, reversed (see that file's
      // Phase 14 note), so an unordered fetch could silently scramble it.
      .order('created_at', { ascending: true })
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

  const toggleDrug = useCallback((id, options) => {
    if (!user) {
      recordPendingFavourite({ type: 'drugs', id })
      return
    }
    applyToggle('drugs', id, options)
  }, [user, applyToggle, recordPendingFavourite])

  const toggleCondition = useCallback((id, options) => {
    if (!user) {
      recordPendingFavourite({ type: 'conditions', id })
      return
    }
    applyToggle('conditions', id, options)
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
