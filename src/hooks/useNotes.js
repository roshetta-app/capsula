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
 * notes-comment-redesign — added updatedAt tracking, for the
 * "Edited 2h ago"-style relative timestamp PersonalNotes.jsx shows under
 * a saved note. Three parts, not just a new return value:
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
 * notes-pro-image-and-char-cap (this task):
 *   Added a second, independent field — image_url — carried alongside
 *   body. Kept genuinely independent rather than folded into the same
 *   save() call/queue slot, because attaching a photo shouldn't have to
 *   wait on (or clobber) a pending text edit and vice versa — the task
 *   goal is explicit that picking a photo saves it immediately, without
 *   also requiring a Send tap on whatever text happens to be mid-edit:
 *     - Own localStorage cache (`capsula_notes_image_${conditionId}`),
 *       same reasoning as body/updatedAt's own caches.
 *     - Own offline-queue slot, keyed `${userId}:${conditionId}:image`
 *       (the existing text queue is now `${userId}:${conditionId}:body`)
 *       — so a queued photo and a queued text edit for the same
 *       condition never overwrite one another while offline.
 *     - `saveImage(url)` mirrors `save(value)`'s shape exactly (same
 *       gating, same optimistic local write, same queue-on-failure
 *       behavior) but only ever touches the image_url/updated_at columns
 *       — never body — so a photo save can't accidentally revert
 *       in-flight text.
 *   This hook only persists a URL it's given; the actual upload (resize +
 *   Storage write) happens in src/lib/noteQueries.js, called from
 *   PersonalNotes.jsx — kept out of this hook so its job stays "save and
 *   load", matching its existing shape.
 *
 * notes-photo-uploader-redesign (this task):
 *   Added offline queueing for the upload step itself, one layer earlier
 *   than the image_url queue described just above (that queue only ever
 *   applies once a URL already exists; this one covers the gap before it
 *   does).
 *     - queuePendingImage(file) — called by PersonalNotes.jsx instead of
 *       attempting uploadNoteImage at all when it already knows the device
 *       is offline. Saves the resized File/Blob into its own IndexedDB
 *       store (utils/cache.js's pending-note-photos, one slot per
 *       userId:conditionId — same single-slot convention as every other
 *       pending-write queue in this file) and returns immediately; no
 *       optimistic local write happens here, since there's no URL yet to
 *       write.
 *     - A sibling reconnect effect (flushPendingPhoto, alongside the
 *       existing flushPendingWrites below) checks this hook instance's own
 *       pending photo slot whenever isOnline flips true, and — if one is
 *       waiting — runs it through uploadNoteImage, then applies the same
 *       local-write-plus-upsert steps saveImage() already does on success,
 *       then clears the slot. On failure it's left queued for the next
 *       flush, same as the existing queue's error handling.
 *     - Deliberately scoped to only this hook instance's own condition,
 *       not every pending photo across every condition the way the
 *       existing body/image flush loop below iterates — a photo picked
 *       offline uploads automatically the next time that note's own
 *       screen is open while online, which covers the case this task
 *       actually asked for without needing a new "list every pending key"
 *       IndexedDB helper.
 *     - This does cross the "hook only persists a URL it's given" line
 *       from the paragraph just above — uploadNoteImage (an actual network
 *       call) is now called from inside this hook for the reconnect-retry
 *       path specifically, since the whole point of this queue is that no
 *       component is necessarily on screen anymore to make that call
 *       itself when the reconnect happens. The original, still-current
 *       online happy path (PersonalNotes.jsx calling uploadNoteImage
 *       directly, then this hook's own saveImage(url)) is unchanged.
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
 * recently-viewed-offline-fix — removed the reactive "clear the local
 * copy when `user` goes from signed-in to signed-out" effect that used to
 * live here (same pattern useRecentlyViewed.js just had removed — see
 * that file's header for the full explanation). The sign-in library can
 * genuinely report "signed out" for a moment purely from a background
 * session check failing while offline, which this effect couldn't tell
 * apart from someone actually tapping Sign Out. AuthContext.jsx's
 * signOut() already sweeps every `capsula_notes_*` key directly, from the
 * one place a real sign-out is guaranteed to run through — see
 * clearAllNotesStorage() there. This hook no longer needs its own copy of
 * that logic.
 *
 * Returns:
 *   savedValue     string          — the current saved note body ('' if none)
 *   savedImageUrl  string | null   — the current saved photo URL, null if none
 *   updatedAt      string | null   — ISO timestamp of the last save (body or
 *                                    image, whichever is more recent), null
 *                                    if nothing has ever been saved
 *   save           (value: string) => void
 *   saveImage      (url: string) => void
 *   queuePendingImage  (file: File|Blob) => void — queues a resized photo
 *                      for upload on reconnect; see notes-photo-uploader-
 *                      redesign above
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { supabase } from '../lib/supabase'
import { uploadNoteImage } from '../lib/noteQueries'
import { savePendingNotePhoto, getPendingNotePhoto, clearPendingNotePhoto } from '../utils/cache'

function storageKeyFor(conditionId) {
  return `capsula_notes_${conditionId}`
}

function imageStorageKeyFor(conditionId) {
  return `capsula_notes_image_${conditionId}`
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

function readImageStorage(conditionId) {
  try { return localStorage.getItem(imageStorageKeyFor(conditionId)) ?? null } catch { return null }
}

function writeImageStorage(conditionId, url) {
  try {
    if (url) {
      localStorage.setItem(imageStorageKeyFor(conditionId), url)
    } else {
      localStorage.removeItem(imageStorageKeyFor(conditionId))
    }
  } catch { /* ignore */ }
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
// One slot per userId:conditionId:type — 'body' and 'image' are kept as
// separate slots (notes-pro-image-and-char-cap) so a queued photo and a
// queued text edit for the same condition never overwrite one another
// while offline; within a single type, a later queued write still simply
// replaces an earlier one, same as before this task.

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

function queueTextWrite(userId, conditionId, body, updatedAt) {
  const pending = readPendingWrites()
  pending[`${userId}:${conditionId}:body`] = { type: 'body', userId, conditionId, body, updatedAt }
  writePendingWrites(pending)
}

function unqueueTextWrite(userId, conditionId) {
  const key = `${userId}:${conditionId}:body`
  const pending = readPendingWrites()
  if (key in pending) {
    delete pending[key]
    writePendingWrites(pending)
  }
}

function queueImageWrite(userId, conditionId, imageUrl, updatedAt) {
  const pending = readPendingWrites()
  pending[`${userId}:${conditionId}:image`] = { type: 'image', userId, conditionId, imageUrl, updatedAt }
  writePendingWrites(pending)
}

function unqueueImageWrite(userId, conditionId) {
  const key = `${userId}:${conditionId}:image`
  const pending = readPendingWrites()
  if (key in pending) {
    delete pending[key]
    writePendingWrites(pending)
  }
}

function buildNoteTextUpsert(userId, conditionId, body, updatedAt) {
  return supabase
    .from('notes')
    .upsert(
      { user_id: userId, condition_id: conditionId, body, updated_at: updatedAt },
      { onConflict: 'user_id,condition_id' }
    )
}

// Only touches image_url/updated_at — body is deliberately omitted from
// this object (not set to '' or null) so an image-only save can never
// wipe out an existing, unrelated note body on the same row.
function buildNoteImageUpsert(userId, conditionId, imageUrl, updatedAt) {
  return supabase
    .from('notes')
    .upsert(
      { user_id: userId, condition_id: conditionId, image_url: imageUrl, updated_at: updatedAt },
      { onConflict: 'user_id,condition_id' }
    )
}

export function useNotes(conditionId) {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [savedValue, setSavedValue]       = useState(() => readStorage(conditionId))
  const [savedImageUrl, setSavedImageUrl] = useState(() => readImageStorage(conditionId))
  const [updatedAt, setUpdatedAt]         = useState(() => readUpdatedAtStorage(conditionId))

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  // notes-timestamp-race-fix: guards against a slow initial load
  // overwriting a note that was saved WHILE that load was still in
  // flight. Reset to false each time a fresh load starts, flipped to
  // true by save()/saveImage() below — if a save lands before the load's
  // response arrives, the load's now-stale result is discarded instead of
  // clobbering the just-saved value/timestamp (this is what produced
  // the "edited just now" flashing back to an old "3w ago").
  const editedSinceLoadRef = useRef(false)

  // notes-timestamp-flicker-fix: AuthContext.jsx intentionally gives
  // `user` a fresh object reference on every SIGNED_IN re-validation for
  // the SAME account — e.g. the app going to the background and back to
  // the foreground while someone is mid-note, which is a very normal
  // thing to do while typing on a phone. That's correct behavior over
  // there (keeps the session token current), but this effect used to
  // depend on the whole `user` object, so every one of those silent
  // refreshes re-ran it: resetting editedSinceLoadRef above and
  // re-fetching from the database. If that re-fetch's response reflected
  // a moment slightly earlier than the most recent save, the "Edited …
  // ago" line would jump to a stale value right after a real edit —
  // exactly the "hallucinated" timestamp reported. Depending on the
  // user's id instead of the user object itself means this effect only
  // re-runs on an actual sign-in, sign-out, or account switch, not on a
  // same-account background/foreground refresh. `user.id` inside the
  // effect body still always reads the current value via closure, so
  // nothing else here changes.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    editedSinceLoadRef.current = false

    supabase
      .from('notes')
      .select('body, image_url, updated_at')
      .eq('user_id', user.id)
      .eq('condition_id', conditionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || editedSinceLoadRef.current) return
        const value    = data?.body ?? ''
        const imageUrl = data?.image_url ?? null
        const ts       = data?.updated_at ?? null
        writeStorage(conditionId, value)
        writeImageStorage(conditionId, imageUrl)
        writeUpdatedAtStorage(conditionId, ts)
        setSavedValue(value)
        setSavedImageUrl(imageUrl)
        setUpdatedAt(ts)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: see notes-timestamp-flicker-fix above
  }, [user?.id, conditionId])

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

        const isSameTarget = entry.userId === user?.id && entry.conditionId === conditionId
        let error

        if (entry.type === 'image') {
          ;({ error } = await buildNoteImageUpsert(entry.userId, entry.conditionId, entry.imageUrl, entry.updatedAt))
        } else {
          ;({ error } = await buildNoteTextUpsert(entry.userId, entry.conditionId, entry.body, entry.updatedAt))
        }

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
          if (isSameTarget) {
            if (entry.type === 'image') {
              writeImageStorage(conditionId, entry.imageUrl)
              setSavedImageUrl(entry.imageUrl)
            } else {
              writeStorage(conditionId, entry.body)
              setSavedValue(entry.body)
            }
            writeUpdatedAtStorage(conditionId, entry.updatedAt)
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

  // notes-photo-uploader-redesign: flushes this hook instance's own queued
  // photo upload (see file header) whenever isOnline flips true. Scoped to
  // just this condition/user pair — unlike flushPendingWrites above, which
  // iterates every pending entry across every condition, this only ever
  // has one possible slot to check (the one keyed to the condition this
  // hook instance is showing), so there's nothing to iterate.
  useEffect(() => {
    if (!isOnline || authLoading || !user) return
    let cancelled = false

    async function flushPendingPhoto() {
      const pendingBlob = await getPendingNotePhoto(user.id, conditionId)
      if (!pendingBlob || cancelled) return

      const { url, error } = await uploadNoteImage(pendingBlob, user.id, conditionId)
      if (cancelled) return

      if (error || !url) {
        // Leave it queued — the next flush (reconnect or next app open)
        // retries it, same error handling as flushPendingWrites above.
        return
      }

      const now = new Date().toISOString()
      writeImageStorage(conditionId, url)
      writeUpdatedAtStorage(conditionId, now)
      setSavedImageUrl(url)
      setUpdatedAt(now)

      await buildNoteImageUpsert(user.id, conditionId, url, now)
      await clearPendingNotePhoto(user.id, conditionId)
    }

    flushPendingPhoto()
    return () => { cancelled = true }
  }, [isOnline, authLoading, user, conditionId])

  // notes-photo-uploader-redesign: called by PersonalNotes.jsx instead of
  // attempting uploadNoteImage at all when it already knows the device is
  // offline — see file header for the full flow.
  const queuePendingImage = useCallback((file) => {
    if (!user) return
    savePendingNotePhoto(user.id, conditionId, file)
  }, [user, conditionId])

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
      queueTextWrite(userId, conditionId, value, now)
      return
    }

    buildNoteTextUpsert(userId, conditionId, value, now).then(({ error }) => {
      if (error) {
        console.error('Failed to sync note:', error)
        queueTextWrite(userId, conditionId, value, now)
      } else {
        unqueueTextWrite(userId, conditionId)
      }
    })
  }, [user, conditionId])

  // notes-pro-image-and-char-cap: saves a photo's URL the moment it's
  // picked — deliberately independent of save() above (see file header).
  // Same shape as save(): defensive signed-out gate, optimistic local
  // write, offline queue with its own slot, retry-on-failure.
  const saveImage = useCallback((url) => {
    if (!user) return

    const now = new Date().toISOString()
    editedSinceLoadRef.current = true

    writeImageStorage(conditionId, url)
    writeUpdatedAtStorage(conditionId, now)
    setSavedImageUrl(url)
    setUpdatedAt(now)

    const userId = user.id

    if (!isOnlineRef.current) {
      queueImageWrite(userId, conditionId, url, now)
      return
    }

    buildNoteImageUpsert(userId, conditionId, url, now).then(({ error }) => {
      if (error) {
        console.error('Failed to sync note image:', error)
        queueImageWrite(userId, conditionId, url, now)
      } else {
        unqueueImageWrite(userId, conditionId)
      }
    })
  }, [user, conditionId])

  return { savedValue, savedImageUrl, updatedAt, save, saveImage, queuePendingImage }
}
