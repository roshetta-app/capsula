/**
 * useCachedImage.js — Image System Refinement Plan, Part A.
 *
 * Shared device-first loading logic for a single gallery photo. Every
 * photo-display spot (ImageCarousel.jsx's main photo, Lightbox.jsx's
 * full-screen view) uses this instead of a plain <img src={url}>, so a
 * photo saved during onboarding or on a previous view still shows while
 * offline, and a genuinely unavailable photo reports 'error' instead of
 * the browser's default broken-image icon.
 *
 * Order of operations on every url change:
 *   1. Check the on-device photo store (IndexedDB, see utils/cache.js) —
 *      if present, use it immediately, no network request.
 *   2. Otherwise fetch it from the network and quietly save a copy for
 *      next time (cache-on-view, plan §4).
 *   3. If the fetch itself fails (2026-09-02 fix — commonly a CORS block
 *      on externally-hosted photos, or something else preventing fetch()
 *      specifically), fall back to the photo's plain address so it still
 *      renders via the browser's normal <img> loading, which isn't
 *      subject to that restriction. Reports 'ready' with no cached copy
 *      saved — this photo just won't be available offline.
 *   4. Offline with nothing saved, or an address that's genuinely dead
 *      (fails even plain <img> loading — the caller's onError handler
 *      catches this), is the only case that still reports 'error' so the
 *      caller can show ImageLoadError.
 *
 * notes-offline-prefetch (2026-09-05): added an optional second argument,
 * `{ store: 'gallery' | 'notes' }`, defaulting to `'gallery'` — picks which
 * on-device store (and matching save function) step 1 and step 2's
 * cache-on-view save target. Every existing call (ImageCarousel.jsx,
 * Lightbox.jsx's gallery use) passes no second argument at all, so they
 * keep resolving to 'gallery' and behave completely unchanged. Only
 * Lightbox.jsx's note-photo call (PersonalNotes.jsx's own <Lightbox />)
 * passes `{ store: 'notes' }`, so a note photo checks/saves
 * utils/cache.js's separate 'note-photos' store instead of 'photos' — kept
 * separate for the same pruneOrphanedPhotos reason documented on that
 * store in utils/cache.js.
 *
 * @param {string} url — the photo's web address
 * @param {{ store?: 'gallery'|'notes' }} [options]
 * @returns {{ src: string|null, status: 'loading'|'ready'|'error', retry: () => void }}
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { getCachedPhoto, savePhotoToCache, getCachedNotePhoto, saveNotePhotoToCache } from '../utils/cache'
import { logCrash } from '../utils/crashLogger'

// notes-offline-prefetch: maps the optional `store` option to its matching
// get/save pair — 'gallery' (default) preserves every existing call's
// behavior exactly; 'notes' is the only other value, used solely by
// PersonalNotes.jsx's own Lightbox call.
const STORE_FUNCS = {
  gallery: { get: getCachedPhoto,     save: savePhotoToCache },
  notes:   { get: getCachedNotePhoto, save: saveNotePhotoToCache },
}

export function useCachedImage(url, { store = 'gallery' } = {}) {
  const [src,    setSrc]    = useState(null)
  const [status, setStatus] = useState('loading')
  const { get: getCached, save: saveCached } = STORE_FUNCS[store] ?? STORE_FUNCS.gallery

  // Race-guard for rapid url changes (e.g. swiping the carousel while a
  // previous load is still in flight) — same attempt-id pattern already
  // used in useConditions.js/useDrugs.js.
  const attemptIdRef = useRef(0)
  // Tracks the object URL currently backing `src` so it can be revoked
  // before a new one is created or on unmount — object URLs otherwise
  // leak for the lifetime of the page.
  const objectUrlRef = useRef(null)

  const load = useCallback(async () => {
    const myAttempt = ++attemptIdRef.current

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (!url) {
      setSrc(null)
      setStatus('error')
      return
    }

    setStatus('loading')

    // 1. Device first
    try {
      const cachedBlob = await getCached(url)
      if (attemptIdRef.current !== myAttempt) return
      if (cachedBlob) {
        const objectUrl = URL.createObjectURL(cachedBlob)
        objectUrlRef.current = objectUrl
        setSrc(objectUrl)
        setStatus('ready')
        return
      }
    } catch (err) {
      // getCachedPhoto already reports its own failures — this catch just
      // makes sure a device-read error still falls through to the network
      // attempt below instead of getting stuck.
      logCrash(err, 'useCachedImage: device read')
    }

    // 2. Network, then quietly save a copy for next time
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
      const blob = await res.blob()
      if (attemptIdRef.current !== myAttempt) return
      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      setSrc(objectUrl)
      setStatus('ready')
      saveCached(url, blob) // fire-and-forget — self-heals the cache
    } catch (err) {
      if (attemptIdRef.current !== myAttempt) return
      logCrash(err, 'useCachedImage: network fetch')
      // Fallback: fetch() failed (commonly CORS — the hosting site allows
      // normal <img> display but not letting other apps read/copy the
      // bytes) or something else blocked the request (e.g. a browser
      // extension). Rendering the plain address directly isn't subject to
      // fetch()'s CORS restriction, so this still shows online — it just
      // won't be available offline, since there's nothing to save. If the
      // address is genuinely dead, the caller's <img onError> handler is
      // what catches that and shows the real error state.
      setSrc(url)
      setStatus('ready')
    }
  }, [url, store])

  useEffect(() => {
    load()
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return { src, status, retry: load }
}
