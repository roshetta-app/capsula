/**
 * src/hooks/useNotes.js
 * Phase F3 — Personal Data Migration
 *
 * Notes storage, pulled out of PersonalNotes.jsx so it follows the same
 * shape as useFavourites.js / useRecentlyViewed.js instead of duplicating
 * the account-aware sync logic a third time inside a component.
 *
 * notes-signin-required — notes require an account:
 *   - save() no-ops for a signed-out call. This is a defensive backstop,
 *     not the primary gate — PersonalNotes.jsx doesn't render an editable
 *     textarea at all while signed out (see that file), so in practice
 *     save() should never be reachable without a user. Kept here anyway
 *     so this hook can't silently write a local-only note if it's ever
 *     called from somewhere that skips that UI gate.
 *   - Single-slot-per-condition offline write queue, mirroring
 *     useFavourites.js's offline-favourite-sync fix. A note is one value
 *     per condition, so only the latest edit for a given condition ever
 *     matters — a single { conditionId, body, updatedAt } slot per
 *     condition (keyed by userId:conditionId) is enough. Last-write-wins
 *     on reconnect, no merge logic.
 *
 * notes-comment-redesign (this session) — added updatedAt tracking, for
 * the new "Edited 2h ago"-style relative timestamp PersonalNotes.jsx now
 * shows under a saved note. Three parts, not just a new return value:
 *   - Loaded alongside `body` from the 'notes' table (same select) and
 *     returned as `updatedAt`.
 *   - Persisted locally too (`capsula_notes_updated_${conditionId}`), same
 *     reasoning as the note body itself — a note edited while offline
 *     needs a timestamp to show immediately, not just once it's finished
 *     syncing.
 *   - Threaded through the offline write queue. A queued write now
 *     carries the timestamp of the actual edit (captured in save() at the
 *     moment the user saved), not the moment the queue later flushes —
 *     otherwise a write that sits queued for an hour would show "Edited
 *     just now" a full hour after it actually happened.
 *
 * Signed out (guest): still localStorage only, key
 * `capsula_notes_${conditionId}` — this hook itself doesn't change what a
 * signed-out call would do to local storage, PersonalNotes.jsx just no
 * longer offers a way to trigger one.
 *
 * Signed in: loads from the 'notes' table on sign-in (or when conditionId
 * changes), then writes through on save, queuing on failure/offline and
 * flushing on reconnect. Condition-only for now — no item_type column,
 * matching today's feature exactly.
 *
 * recently-viewed-offline-fix (2026-09-01) — removed the reactive
 * "clear the local copy when `user` goes from signed-in to signed-out"
 * effect that used to live here (same pattern useRecentlyViewed.js just
 * had removed — see that file's header for the full explanation). The
 * sign-in library can genuinely report "signed out" for a moment purely
 * from a background session check failing while offline, which this
 * effect couldn't tell apart from someone actually tapping Sign Out.
 * AuthContext.jsx's signOut() already sweeps every `capsula_notes_*` key
 * directly, from the one place a real sign-out is guaranteed to run
 * through — see clearAllNotesStorage() there. This hook no longer needs
 * its own copy of that logic.
 *
 * Returns:
 *   savedValue  string          — the current saved note ('' if none)
 *   updatedAt   string | null   — ISO timestamp of the last save, null if
 *                                 the note has never been saved
 *   save        (value: string) => void
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { supabase } from '../lib/supabase'

function storageKeyFor(conditionId) {
  return `capsula_notes_${conditionId}`
}

function updatedAtKeyFor(conditionId) {
  return `capsula_notes_updated_${conditionId}`
}

function readStorage(conditionId) {
  try { return localStorage.getItem(storageKeyFor(conditionId)) ?? '' } catch { return '' }
}

function writeStorage(conditionId, value) {
  try { localStorage.setItem(storageKeyFor(conditionId), value) } catch { /* ignore */ }
}

function readUpdatedAtStorage(conditionId) {
  try { return localStorage.getItem(updatedAtKeyFor(conditionId)) ?? null } catch { return null }
}

function writeUpdatedAtStorage(conditionId, isoString) {
  try {
    if (isoString) {
      localStorage.setItem(updatedAtKeyFor(conditionId), isoString)
    } else {
      localStorage.removeItem(updatedAtKeyFor(conditionId))
    }
  } catch { /* ignore */ }
}

// ─── Pending-write queue helpers (offline fix) ─────────────────────────────
// Single slot per userId:conditionId — a note is one value per condition,
// so a later queued write for the same condition simply replaces an
// earlier one rather than needing an array like favourites' queue.

const NOTES_PENDING_WRITES_KEY = 'capsula_notes_pending_writes'

function readPendingWrites() {
  try {
    const raw = localStorage.getItem(NOTES_PENDING_WRITES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch {
    return {}
  }
}

function writePendingWrites(pending) {
  try {
    localStorage.setItem(NOTES_PENDING_WRITES_KEY, JSON.stringify(pending))
  } catch {
    // localStorage unavailable — silently ignore, same risk as before this fix
  }
}

function queueWrite(userId, conditionId, body, updatedAt) {
  const pending = readPendingWrites()
  pending[`${userId}:${conditionId}`] = { userId, conditionId, body, updatedAt }
  writePendingWrites(pending)
}

function unqueueWrite(userId, conditionId) {
  const key = `${userId}:${conditionId}`
  const pending = readPendingWrites()
  if (key in pending) {
    delete pending[key]
    writePendingWrites(pending)
  }
}

function buildNoteUpsert(userId, conditionId, body, updatedAt) {
  return supabase
    .from('notes')
    .upsert(
      { user_id: userId, condition_id: conditionId, body, updated_at: updatedAt },
      { onConflict: 'user_id,condition_id' }
    )
}

export function useNotes(conditionId) {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [savedValue, setSavedValue] = useState(() => readStorage(conditionId))
  const [updatedAt, setUpdatedAt]   = useState(() => readUpdatedAtStorage(conditionId))

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  // notes-timestamp-race-fix: guards against a slow initial load
  // overwriting a note that was saved WHILE that load was still in
  // flight. Reset to false each time a fresh load starts, flipped to
  // true by save() below — if a save lands before the load's response
  // arrives, the load's now-stale result is discarded instead of
  // clobbering the just-saved value/timestamp (this is what produced
  // the "edited just now" flashing back to an old "3w ago").
  const editedSinceLoadRef = useRef(false)

  // Load from the database once signed in, and whenever the signed-in
  // user or the condition being viewed changes.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    editedSinceLoadRef.current = false

    supabase
      .from('notes')
      .select('body, updated_at')
      .eq('user_id', user.id)
      .eq('condition_id', conditionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || editedSinceLoadRef.current) return
        const value = data?.body ?? ''
        const ts    = data?.updated_at ?? null
        writeStorage(conditionId, value)
        writeUpdatedAtStorage(conditionId, ts)
        setSavedValue(value)
        setUpdatedAt(ts)
      })

    return () => { cancelled = true }
  }, [user, conditionId])

  // Flushes anything left in the offline queue above. Runs whenever
  // isOnline is true: on a genuine reconnect, and also on mount in case
  // the app was closed before a previous session's queue got the chance
  // to flush. Waits for authLoading too, same cold-start race reasoning
  // as useFavourites.js's own flush effect — isOnline can already read
  // true on the very first render, before `user` has resolved.
  useEffect(() => {
    if (!isOnline || authLoading) return
    let cancelled = false

    async function flushPendingWrites() {
      const pending = readPendingWrites()
      for (const [key, entry] of Object.entries(pending)) {
        if (cancelled) return
        const { error } = await buildNoteUpsert(entry.userId, entry.conditionId, entry.body, entry.updatedAt)
        if (cancelled) return
        if (!error) {
          const current = readPendingWrites()
          delete current[key]
          writePendingWrites(current)

          // Only applies to the condition this hook instance is currently
          // showing, and only for the currently signed-in account — same
          // reasoning as useFavourites.js's flush effect: a flush can
          // land either before or after the sign-in fetch effect above,
          // so self-heal here in case this flush wins the race.
          if (entry.userId === user?.id && entry.conditionId === conditionId) {
            writeStorage(conditionId, entry.body)
            writeUpdatedAtStorage(conditionId, entry.updatedAt)
            setSavedValue(entry.body)
            setUpdatedAt(entry.updatedAt)
          }
        }
        // On error, leave it queued — the next flush (reconnect or next
        // app open) will retry it.
      }
    }

    flushPendingWrites()
    return () => { cancelled = true }
  }, [isOnline, authLoading, user, conditionId])

  const save = useCallback((value) => {
    // Defensive gate — see file header. PersonalNotes.jsx no longer
    // offers a way to reach this without a signed-in user.
    if (!user) return

    // Captured once, at the moment of the actual edit — used for both the
    // local write and (eventually) the database write, whether that
    // happens immediately or after sitting in the offline queue.
    const now = new Date().toISOString()

    // See notes-timestamp-race-fix above: tells any still-in-flight
    // initial load for this condition not to overwrite what we're about
    // to write below.
    editedSinceLoadRef.current = true

    writeStorage(conditionId, value)
    writeUpdatedAtStorage(conditionId, now)
    setSavedValue(value)
    setUpdatedAt(now)

    const userId = user.id

    if (!isOnlineRef.current) {
      queueWrite(userId, conditionId, value, now)
      return
    }

    buildNoteUpsert(userId, conditionId, value, now).then(({ error }) => {
      if (error) {
        console.error('Failed to sync note:', error)
        queueWrite(userId, conditionId, value, now)
      } else {
        unqueueWrite(userId, conditionId)
      }
    })
  }, [user, conditionId])

  return { savedValue, updatedAt, save }
}