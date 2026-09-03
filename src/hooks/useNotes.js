/**
 * src/hooks/useNotes.js
 * Phase F3 — Personal Data Migration
 *
 * Notes storage, pulled out of PersonalNotes.jsx so it follows the same
 * shape as useFavourites.js / useRecentlyViewed.js instead of duplicating
 * the account-aware sync logic a third time inside a component.
 *
 * notes-signin-required (this session) — notes now require an account,
 * matching favourites' Phase 7 treatment:
 *   - save() no-ops for a signed-out call. This is a defensive backstop,
 *     not the primary gate — PersonalNotes.jsx no longer renders an
 *     editable textarea at all while signed out (see that file), so in
 *     practice save() should never be reachable without a user. Kept here
 *     anyway so this hook can't silently write a local-only note if it's
 *     ever called from somewhere that skips that UI gate.
 *   - No pending-item/localStorage-draft mechanism was added (unlike
 *     favourites' pendingFavourite) — see NotesSignInContext.jsx's header
 *     for why: nothing can be typed while signed out, so there's no draft
 *     that needs to survive the Google sign-in round trip.
 *   - Added a single-slot-per-condition offline write queue, mirroring
 *     useFavourites.js's offline-favourite-sync fix. Confirmed before this
 *     change: a failed/offline supabase.upsert here was only
 *     console.error'd, never retried — a signed-in edit made while
 *     offline could silently never reach the account. Unlike favourites'
 *     array-of-queued-writes (a list can gain two different offline
 *     additions from two devices), a note is one value per condition, so
 *     only the latest edit for a given condition ever matters — queuing a
 *     single { conditionId, body } slot per condition (keyed by
 *     userId:conditionId) is enough. Last-write-wins on reconnect: no
 *     merge logic, whichever device's queued write flushes last simply
 *     overwrites the row, an accepted trade-off for something this
 *     low-stakes.
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
 *   savedValue  string   — the current saved note ('' if none)
 *   save        (value: string) => void
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
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

// ─── Pending-write queue helpers (notes-signin-required offline fix) ──────────
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

function queueWrite(userId, conditionId, body) {
  const pending = readPendingWrites()
  pending[`${userId}:${conditionId}`] = { userId, conditionId, body }
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

function buildNoteUpsert(userId, conditionId, body) {
  return supabase
    .from('notes')
    .upsert(
      { user_id: userId, condition_id: conditionId, body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,condition_id' }
    )
}

export function useNotes(conditionId) {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [savedValue, setSavedValue] = useState(() => readStorage(conditionId))

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

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

  // notes-signin-required offline fix — flushes anything left in the
  // queue above. Runs whenever isOnline is true: on a genuine reconnect,
  // and also on mount in case the app was closed before a previous
  // session's queue got the chance to flush. Waits for authLoading too,
  // same cold-start race reasoning as useFavourites.js's own flush effect
  // — isOnline can already read true on the very first render, before
  // `user` has resolved.
  useEffect(() => {
    if (!isOnline || authLoading) return
    let cancelled = false

    async function flushPendingWrites() {
      const pending = readPendingWrites()
      for (const [key, entry] of Object.entries(pending)) {
        if (cancelled) return
        const { error } = await buildNoteUpsert(entry.userId, entry.conditionId, entry.body)
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
            setSavedValue(entry.body)
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

    writeStorage(conditionId, value)
    setSavedValue(value)

    const userId = user.id

    if (!isOnlineRef.current) {
      queueWrite(userId, conditionId, value)
      return
    }

    buildNoteUpsert(userId, conditionId, value).then(({ error }) => {
      if (error) {
        console.error('Failed to sync note:', error)
        queueWrite(userId, conditionId, value)
      } else {
        unqueueWrite(userId, conditionId)
      }
    })
  }, [user, conditionId])

  return { savedValue, save }
}
