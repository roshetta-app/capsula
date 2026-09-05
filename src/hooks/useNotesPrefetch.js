/**
 * src/hooks/useNotesPrefetch.js
 *
 * notes-offline-prefetch (2026-09-05): after a genuine sign-in, downloads
 * every one of the signed-in user's notes (text + photo) in the
 * background, so any note is viewable offline immediately the first time
 * its screen opens — not just on the second view, the way useNotes.js's
 * own per-note cache-on-load already worked before this task. Decision
 * (per the task's own plan doc): download everything at once, no
 * throttling by recency or count.
 *
 * Two exports:
 *   - prefetchAllNotes(userId) — the actual bulk download. Called once,
 *     fire-and-forget, from AuthContext.jsx's genuine SIGNED_IN branch
 *     only (not the same-user tab-refocus revalidation branch just above
 *     it — a routine background revalidation shouldn't re-trigger a full
 *     re-download of every note+photo the account has).
 *   - useNotesPrefetchResume() — a hook, mounted once in AuthContext.jsx's
 *     AuthProvider (the one component in the app already guaranteed to
 *     mount exactly once — see this task's plan doc for why App.jsx was
 *     checked and ruled out). Watches connectivity and resumes any photo
 *     downloads left unfinished by the last prefetchAllNotes pass,
 *     mirroring the reconnect-flush shape useNotes.js's own
 *     flushPendingWrites/flushPendingPhoto effects already use elsewhere
 *     in this same feature area — same "if (!isOnline) return" gate, same
 *     "leave it queued on failure, the next flush retries it" behavior.
 *
 *     Bugfix (found via on-device testing, same day): this originally used
 *     the shared useOnlineStatus() hook, same as useNotes.js's own flush
 *     effects — but AuthProvider isn't guaranteed to sit inside
 *     <OnlineStatusProvider> in the component tree (confirmed by a real
 *     crash: "useOnlineStatus must be used inside <OnlineStatusProvider>").
 *     Reordering the two providers in App.jsx was the more "correct" fix in
 *     the abstract, but it's a change to the app's root structure well
 *     outside this task's actual scope, and risks its own regressions
 *     elsewhere. Reading navigator.onLine directly instead (see
 *     useIsOnlineFallback below) sidesteps the ordering question entirely —
 *     it's the same underlying browser signal OnlineStatusContext.jsx
 *     itself is built on, just consulted directly rather than through that
 *     shared context, so this mount point has no dependency on where
 *     AuthProvider happens to sit relative to it.
 *
 * Writes each row straight into useNotes.js's own existing localStorage
 * keys (capsula_notes_${conditionId} / _image_ / _updated_) — deliberately
 * the exact same key-naming functions useNotes.js already reads on mount,
 * copied here rather than imported, since useNotes.js doesn't currently
 * export them and adding an export surface there for this one caller
 * seemed like more churn than three one-line key-builder functions
 * duplicated in the one other file that needs them. If a third consumer
 * ever needs these, that's the point to promote them into a shared
 * module instead. This means useNotes.js's own read path needs zero
 * changes — this task only makes those keys already-populated ahead of
 * time, before the user ever opens that note's screen.
 *
 * Note-photo downloads (as opposed to the text/localStorage write above,
 * which is synchronous and can't meaningfully fail) go into
 * utils/cache.js's own 'note-photos' IndexedDB store via
 * saveNotePhotoToCache — the same store useCachedImage.js's new 'notes'
 * option (see that file) reads from when Lightbox.jsx or PersonalNotes.jsx
 * displays a note photo, so a photo downloaded here is exactly what
 * makes that later view instant offline.
 *
 * Resume list: photo downloads that don't finish (interrupted by going
 * offline mid-prefetch, or a single photo's fetch failing) are persisted
 * under their own localStorage key (NOTES_PREFETCH_PENDING_KEY below) as a
 * short list of { conditionId, imageUrl } pairs — small by construction,
 * since it only ever holds entries that failed, not the whole note list —
 * so a plain JSON-in-localStorage list is fine here even though photo
 * Blobs themselves never go through localStorage (see cache.js's own
 * header for why the actual pending-note-photo *uploads*, a different
 * queue in the opposite direction, use IndexedDB for exactly that
 * Blob-size reason). useNotesPrefetchResume() below re-attempts only this
 * list on reconnect — never re-runs the bulk `notes` query itself, since
 * resuming a stalled photo download doesn't need fresher note text.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { saveNotePhotoToCache } from '../utils/cache'

function storageKeyFor(conditionId) {
  return `capsula_notes_${conditionId}`
}

function imageStorageKeyFor(conditionId) {
  return `capsula_notes_image_${conditionId}`
}

function updatedAtKeyFor(conditionId) {
  return `capsula_notes_updated_${conditionId}`
}

const NOTES_PREFETCH_PENDING_KEY = 'capsula_notes_prefetch_pending'

function readPendingPhotos() {
  try {
    const raw = localStorage.getItem(NOTES_PREFETCH_PENDING_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePendingPhotos(list) {
  try {
    if (!list || list.length === 0) {
      localStorage.removeItem(NOTES_PREFETCH_PENDING_KEY)
    } else {
      localStorage.setItem(NOTES_PREFETCH_PENDING_KEY, JSON.stringify(list))
    }
  } catch {
    // localStorage full/unavailable — worst case a photo re-downloads
    // on the next prefetch instead of resuming precisely; not fatal.
  }
}

// Shared by both prefetchAllNotes and useNotesPrefetchResume below, same
// reasoning as useNotes.js's attemptUpload/retryUpload split (this task's
// sibling Task 1) — one real implementation, not two hand-written copies.
async function downloadNotePhoto(imageUrl) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return false
    const blob = await res.blob()
    await saveNotePhotoToCache(imageUrl, blob)
    return true
  } catch {
    return false
  }
}

/**
 * The actual bulk download — one notes query instead of N, per the plan's
 * own key finding that useNotes.js has no "all notes for this user" query
 * today. Fire-and-forget from the caller (AuthContext.jsx): never awaited,
 * never gates `loading`, and any failure here should never block or
 * disrupt a sign-in that already otherwise succeeded.
 * @param {string} userId
 */
export async function prefetchAllNotes(userId) {
  if (!userId) return

  const { data, error } = await supabase
    .from('notes')
    .select('condition_id, body, image_url, updated_at')
    .eq('user_id', userId)

  if (error || !data) return

  const stillPending = []

  for (const row of data) {
    const conditionId = row.condition_id
    if (!conditionId) continue

    try {
      localStorage.setItem(storageKeyFor(conditionId), row.body ?? '')
      if (row.image_url) {
        localStorage.setItem(imageStorageKeyFor(conditionId), row.image_url)
      } else {
        localStorage.removeItem(imageStorageKeyFor(conditionId))
      }
      if (row.updated_at) {
        localStorage.setItem(updatedAtKeyFor(conditionId), row.updated_at)
      } else {
        localStorage.removeItem(updatedAtKeyFor(conditionId))
      }
    } catch {
      // localStorage full/unavailable for this one row's text — the photo
      // download below is still attempted independently; not fatal to the
      // rest of the prefetch pass.
    }

    if (row.image_url) {
      const ok = await downloadNotePhoto(row.image_url)
      if (!ok) stillPending.push({ conditionId, imageUrl: row.image_url })
    }
  }

  writePendingPhotos(stillPending)
}

// Bugfix (see file header): a self-contained connectivity read, deliberately
// not the shared useOnlineStatus() hook — this hook is mounted inside
// AuthProvider, which isn't guaranteed to sit inside <OnlineStatusProvider>
// in the component tree. navigator.onLine plus the browser's own
// online/offline events is the same underlying signal that context is
// built on, just read directly so this mount point has no dependency on
// provider ordering elsewhere in the app.
function useIsOnlineFallback() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    function goOnline()  { setIsOnline(true) }
    function goOffline() { setIsOnline(false) }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}

/**
 * Mounted once in AuthContext.jsx's AuthProvider. Resumes only the photo
 * downloads left unfinished by the last prefetchAllNotes pass, whenever
 * the device comes back online — mirrors useNotes.js's own
 * flushPendingWrites/flushPendingPhoto effect shape (same file, this same
 * feature area): read the pending list, retry each entry, drop it from the
 * list on success, leave it queued on failure for the next reconnect.
 */
export function useNotesPrefetchResume() {
  const isOnline = useIsOnlineFallback()
  // Guards against the same resume pass running twice in a row if
  // isOnline flips true, false, true in quick succession before the
  // first pass's fetches resolve — the second effect run would otherwise
  // start a redundant, overlapping set of downloads for the same entries.
  const runningRef = useRef(false)

  useEffect(() => {
    if (!isOnline || runningRef.current) return
    let cancelled = false

    async function resume() {
      const pending = readPendingPhotos()
      if (pending.length === 0) return

      runningRef.current = true
      const stillPending = []

      for (const entry of pending) {
        if (cancelled) return
        const ok = await downloadNotePhoto(entry.imageUrl)
        if (!ok) stillPending.push(entry)
      }

      if (!cancelled) writePendingPhotos(stillPending)
      runningRef.current = false
    }

    resume()
    return () => { cancelled = true }
  }, [isOnline])
}
