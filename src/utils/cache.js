/**
 * cache.js — localStorage cache with timestamp invalidation + 7-day TTL
 *
 * Three slices: 'drugs', 'conditions', 'categories'
 * Each slice: { data: [], fetchedAt: ISO string, version: string }
 *
 * 2026-08-30 (conditions durable storage, plan §4.1/Phase 1): 'drugs' and
 * 'conditions' both now actually live in IndexedDB (see the section below) —
 * only 'categories' still uses the localStorage slice system described here.
 * The write/read/isExpired functions below still accept 'conditions' as a
 * key for backward compatibility, but nothing calls them with it anymore;
 * see writeConditionsCache/readConditionsCache below for the real path.
 *
 * Invalidation logic (called from useDrugs / useConditions / useCategories):
 *   1. Fetch app_metadata timestamp from Supabase (one lightweight request)
 *   2. If timestamp differs from cached version → re-fetch
 *   3. If timestamp matches BUT fetchedAt is older than 7 days → re-fetch
 *   4. If both match and within TTL → use cached data, no network request
 *
 * 1A.4 — widened from a two-way ('drugs'/'conditions') ternary to a lookup
 * map so a third slice (categories) could be added without touching every
 * function's branching logic. Categories watches the same drugs_updated_at
 * timestamp as 'drugs' (see useCategories.js) — no new app_metadata column.
 *
 * Icon cache (below, separate from the slice functions above): custom
 * specialty SVG icons fetched from Supabase Storage in specialtyIcon.jsx.
 * Not modeled as a fourth slice because the slice functions above are
 * array-shaped (writeCache guards on Array.isArray(data)) — icons are
 * naturally a { url: svgMarkup } map, keyed by Storage URL, so they get
 * their own small pair of functions instead. Invalidated the same way as
 * categories — off drugs_updated_at — but read from the categories cache's
 * already-stored timestamp (getCacheTimestamp('categories')) rather than a
 * fresh fetch, since icon edits already bump the same timestamp category
 * edits do and this avoids adding a network round-trip to what's otherwise
 * a pure local read.
 */

import { CACHE_KEYS, CACHE_TTL_MS, DRUGS_CACHE_SCHEMA_VERSION, CONDITIONS_CACHE_SCHEMA_VERSION } from '../constants/cache'
import { logCrash } from './crashLogger'

// ─── Internal helpers ─────────────────────────────────────────────────────────

const CACHE_KEY_MAP = {
  drugs:      CACHE_KEYS.DRUGS,
  conditions: CACHE_KEYS.CONDITIONS,
  categories: CACHE_KEYS.CATEGORIES,
}

function readAll() {
  try {
    const drugs      = localStorage.getItem(CACHE_KEYS.DRUGS)
    const conditions = localStorage.getItem(CACHE_KEYS.CONDITIONS)
    const categories = localStorage.getItem(CACHE_KEYS.CATEGORIES)
    return {
      drugs:      drugs      ? JSON.parse(drugs)      : null,
      conditions: conditions ? JSON.parse(conditions) : null,
      categories: categories ? JSON.parse(categories) : null,
    }
  } catch {
    return { drugs: null, conditions: null, categories: null }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write a cache slice.
 * Silently skips writing if data is empty — prevents poisoning the cache
 * with an empty array that would block future re-fetches.
 * @param {'drugs'|'conditions'|'categories'} key
 * @param {Array}  data        — the full fetched dataset
 * @param {string} version     — ISO timestamp from app_metadata
 */
export function writeCache(key, data, version) {
  // Guard: never persist an empty dataset
  if (!Array.isArray(data) || data.length === 0) return

  try {
    const cacheKey = CACHE_KEY_MAP[key]
    if (!cacheKey) return
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      version,
      fetchedAt: new Date().toISOString(),
    }))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/**
 * Read the cached data array for a given slice, or null.
 * Returns null (not []) when the stored array is empty — callers treat
 * an empty cache the same as no cache (cold start).
 * @param {'drugs'|'conditions'|'categories'} key
 */
export function getCacheData(key) {
  try {
    const cacheKey = CACHE_KEY_MAP[key]
    if (!cacheKey) return null
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const data = parsed?.data ?? null
    // Treat an empty array as a cache miss so hooks trigger a fresh fetch
    if (Array.isArray(data) && data.length === 0) return null
    return data
  } catch {
    return null
  }
}

/**
 * Return the cached version string (app_metadata timestamp) for a slice, or null.
 * @param {'drugs'|'conditions'|'categories'} key
 */
export function getCacheTimestamp(key) {
  try {
    const cacheKey = CACHE_KEY_MAP[key]
    if (!cacheKey) return null
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    return JSON.parse(raw)?.version ?? null
  } catch {
    return null
  }
}

/**
 * Returns true if the cache slice is older than CACHE_TTL_MS (7 days),
 * regardless of version. Forces a re-fetch even if version matches.
 * @param {'drugs'|'conditions'|'categories'} key
 */
export function isCacheExpired(key) {
  try {
    const cacheKey = CACHE_KEY_MAP[key]
    if (!cacheKey) return true
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return true
    const { fetchedAt } = JSON.parse(raw)
    if (!fetchedAt) return true
    return (Date.now() - new Date(fetchedAt).getTime()) > CACHE_TTL_MS
  } catch {
    return true
  }
}

/**
 * Clear one or more cache slices.
 * @param {'drugs'|'conditions'|'categories'|'icons'|'all'} key
 */
export function clearCache(key = 'all') {
  try {
    if (key === 'all' || key === 'categories') localStorage.removeItem(CACHE_KEYS.CATEGORIES)
    if (key === 'all' || key === 'icons') localStorage.removeItem(CACHE_KEYS.ICONS)
    if (key === 'all' || key === 'drugs') {
      localStorage.removeItem(CACHE_KEYS.DRUGS) // legacy key from before the IndexedDB move — harmless no-op cleanup
      clearDrugsCache() // fire-and-forget; the real drugs cache now lives in IndexedDB, see below
    }
    if (key === 'all' || key === 'conditions') {
      localStorage.removeItem(CACHE_KEYS.CONDITIONS) // legacy key from before the IndexedDB move (2026-08-30) — harmless no-op cleanup
      clearConditionsCache() // fire-and-forget; the real conditions cache now lives in IndexedDB, see below
    }
  } catch {
    // fail silently
  }
}

// ─── Icon cache (custom specialty SVGs, keyed by Storage URL) ────────────────
//
// Shape on disk: { version: string, icons: { [url]: svgMarkup } }
// version is the drugs_updated_at value that was current at write time,
// read from the categories cache (see file header comment above for why).

/**
 * Read a cached icon's SVG markup, or null if missing or stale.
 * Stale means: the categories cache has a newer drugs_updated_at than the
 * icon cache was written with. If there's no categories timestamp yet
 * (cold start), the icon cache is treated as unusable — same cold-start
 * behavior as the other slices.
 * @param {string} url — the Supabase Storage URL for the icon
 */
export function getIconCache(url) {
  try {
    const currentVersion = getCacheTimestamp('categories')
    if (!currentVersion) return null
    const raw = localStorage.getItem(CACHE_KEYS.ICONS)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== currentVersion) return null
    return parsed?.icons?.[url] ?? null
  } catch {
    return null
  }
}

/**
 * Persist one icon's SVG markup, stamped with the categories cache's current
 * drugs_updated_at. If the stored version differs from the current one
 * (categories cache has moved on since this icon was last written), the
 * whole icons map is reset first — otherwise entries written under an old
 * version could keep passing the version check forever alongside newer ones.
 * Silently no-ops if there's no categories timestamp yet, or on any storage
 * error — same fail-silent behavior as the other cache functions here.
 * @param {string} url — the Supabase Storage URL for the icon
 * @param {string} svg — the raw fetched SVG markup
 */
export function writeIconCache(url, svg) {
  if (!url || !svg) return
  try {
    const currentVersion = getCacheTimestamp('categories')
    if (!currentVersion) return

    const raw = localStorage.getItem(CACHE_KEYS.ICONS)
    const parsed = raw ? JSON.parse(raw) : null
    const icons = parsed?.version === currentVersion ? { ...parsed.icons } : {}

    icons[url] = svg

    localStorage.setItem(CACHE_KEYS.ICONS, JSON.stringify({
      version: currentVersion,
      icons,
    }))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

// ─── IndexedDB (drugs + conditions + photos) ──────────────────────────────
//
// 2026-07-16: localStorage caps out around 5 MB per site — far below the
// real size of the full drug catalog (tens of MB as JSON) — so
// writeCache('drugs', ...) above was silently failing every single time
// (see its catch block), and every app open was secretly a full re-download.
// IndexedDB has no such practical size limit, so the drugs slice's saved
// copy lives here instead. categories is small and was never affected by
// this — it's untouched, still on localStorage above.
//
// 2026-08-30 (conditions durable storage, plan §4.1/Phase 1): conditions
// moved onto this same storage, ahead of a similar failure — not because it
// already hit the localStorage size cap, but because it's the same trap
// drugs already fell into once, avoidable here simply by moving it while
// the library is still small. DB version bumped 1 → 2 so existing devices
// get the new 'conditions' store created automatically the next time they
// open the app; the existing 'drugs' store and its data are untouched by
// this bump.
//
// 2026-08-31 (onboarding-download-flow hardening, plan §Phase 1, 1.16): a
// failed save or read here used to just fail silently, same as every other
// catch block in this file — which is exactly how the "stuck on loading
// too many times" bug hid for as long as it did (see the 2026-07-16 note
// above). The four IndexedDB functions below now also report a failure to
// the app's existing crash log (crashLogger.js) before falling back to
// their previous silent behavior, so a real, repeating problem on someone's
// device shows up somewhere instead of vanishing without a trace. This is
// deliberately scoped to just these four — the localStorage-based functions
// above (categories, icons) aren't part of the bug this was chasing, and
// logging every localStorage quota hiccup app-wide would be a much noisier,
// separate change.
//
// 2026-08-31 (Phase F14 Stage 3, delta sync): writeDrugsCache/
// writeConditionsCache now also stamp an auditCursor field (the ISO
// created_at of the newest audit_log row applied so far, or null) on the
// saved record, alongside the existing data/version/fetchedAt/
// schemaVersion fields — and readDrugsCache/readConditionsCache return it
// as part of the record like everything else already stored there. A
// record saved before this change simply has no auditCursor key, which
// reads back as undefined — the delta-merge logic in useDrugs.js/
// useConditions.js already treats a missing cursor as 'no cursor yet' and
// falls back to a full fetch, so this needs no separate migration step.
//
// 2026-09-01 (Image System Refinement Plan, Part A): added a third store,
// 'photos', for offline gallery-photo caching. Unlike 'drugs'/'conditions'
// above, this store isn't a single record under a fixed key — it holds one
// Blob per photo, keyed by the photo's own Storage URL, since there can be
// many of them and each is looked up independently by useCachedImage.js.
// IDB_VERSION bumped 2 → 3 so existing devices get this new store created
// automatically the next time they open the app; the existing 'drugs' and
// 'conditions' stores and their data are untouched by this bump.

const IDB_NAME    = 'capsula-cache'
const IDB_VERSION = 3
const IDB_STORES  = ['drugs', 'conditions', 'photos']

const DRUGS_STORE      = 'drugs'
const DRUGS_KEY        = 'drugs'
const CONDITIONS_STORE = 'conditions'
const CONDITIONS_KEY   = 'conditions'
const PHOTOS_STORE     = 'photos'

function openCapsulaDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      for (const storeName of IDB_STORES) {
        if (!req.result.objectStoreNames.contains(storeName)) {
          req.result.createObjectStore(storeName)
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
    // 2026-08-31 (storage-connections-fix): without this handler, a future
    // storage-version bump (IDB_VERSION above — already happened once,
    // 1 → 2, for conditions) that runs into another still-open connection
    // holding the old version wouldn't error out at all — it would just
    // hang here forever, with nothing on screen ever explaining why. Every
    // read/write/clear function below now also closes its connection once
    // it's done (see each function), so in normal use nothing should ever
    // be left open to cause this — this handler is the safety net for if
    // one ever is anyway.
    req.onblocked = () => reject(new Error('Capsula storage upgrade blocked by another open connection'))
  })
}

/**
 * Write the drugs cache to IndexedDB. Same record shape as writeCache,
 * plus schemaVersion (2026-07-18, drug_library_ui_ux bugfix): stamps the
 * current DRUGS_CACHE_SCHEMA_VERSION on every write, so a later app-side
 * shape change (new fields on the mapped drug object, independent of the
 * server-side data version) can be detected and invalidated on read even
 * when the underlying database rows themselves haven't changed. Reports a
 * failure to the crash log (2026-08-31, see file header) before falling
 * back to its previous silent no-op.
 * @param {Array}  data        — the full fetched drug list
 * @param {string} version     — ISO timestamp from app_metadata
 * @param {string|null} [auditCursor] — ISO created_at of the newest applied
 *   audit_log row (Phase F14 Stage 3, delta sync), or null if not yet known
 */
export async function writeDrugsCache(data, version, auditCursor = null) {
  if (!Array.isArray(data) || data.length === 0) return
  // 2026-08-31 (storage-connections-fix): every save/read used to open a
  // fresh connection and never close it. Harmless day-to-day, but any
  // leftover open connection can silently block a future storage-version
  // bump (see openCapsulaDB's onblocked handler above) — closed here now
  // that this function's work is done, success or failure either way.
  let db
  try {
    db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DRUGS_STORE, 'readwrite')
      tx.objectStore(DRUGS_STORE).put({ data, version, fetchedAt: new Date().toISOString(), schemaVersion: DRUGS_CACHE_SCHEMA_VERSION, auditCursor }, DRUGS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch (err) {
    // IndexedDB unavailable (rare — e.g. some private-browsing modes) —
    // still fails silently from the caller's point of view, but now also
    // recorded so a repeating failure on a real device can be found.
    logCrash(err, 'utils/cache.js: writeDrugsCache')
  } finally {
    db?.close()
  }
}

/**
 * Read the full stored drugs record — { data, version, fetchedAt,
 * auditCursor } — or null if nothing valid is saved yet. auditCursor is
 * undefined on a record saved before Phase F14 Stage 3 — callers already
 * treat that the same as "no cursor yet."
 *
 * Also returns null (forcing callers down their cold-start path) if the
 * saved record predates DRUGS_CACHE_SCHEMA_VERSION or was written by an
 * older version of it (2026-07-18 bugfix) — an outdated shape needs a
 * real re-fetch, not just a "the data itself looks fine" pass-through,
 * since the server-side version timestamp alone can't detect an app-side
 * field change. A genuine read failure (as opposed to "nothing saved yet")
 * is reported to the crash log (2026-08-31, see file header) before
 * falling back to null, same as writeDrugsCache above.
 */
export async function readDrugsCache() {
  let db
  try {
    db = await openCapsulaDB()
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(DRUGS_STORE, 'readonly')
      const req = tx.objectStore(DRUGS_STORE).get(DRUGS_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
    if (!record || !Array.isArray(record.data) || record.data.length === 0) return null
    if (record.schemaVersion !== DRUGS_CACHE_SCHEMA_VERSION) return null
    return record
  } catch (err) {
    logCrash(err, 'utils/cache.js: readDrugsCache')
    return null
  } finally {
    db?.close()
  }
}

/**
 * Clear the drugs IndexedDB cache.
 */
export async function clearDrugsCache() {
  let db
  try {
    db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DRUGS_STORE, 'readwrite')
      tx.objectStore(DRUGS_STORE).delete(DRUGS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // fail silently
  } finally {
    db?.close()
  }
}

/**
 * Write the conditions cache to IndexedDB. Exact mirror of writeDrugsCache
 * above, added 2026-08-30 (conditions durable storage, plan §4.1/Phase 1,
 * step 1.1) — same record shape, same schema-version stamping, same
 * crash-log reporting on failure (2026-08-31, see file header).
 * @param {Array}  data        — the full fetched conditions list
 * @param {string} version     — ISO timestamp from app_metadata
 * @param {string|null} [auditCursor] — ISO created_at of the newest applied
 *   audit_log row (Phase F14 Stage 3, delta sync), or null if not yet known
 */
export async function writeConditionsCache(data, version, auditCursor = null) {
  if (!Array.isArray(data) || data.length === 0) return
  let db
  try {
    db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CONDITIONS_STORE, 'readwrite')
      tx.objectStore(CONDITIONS_STORE).put({ data, version, fetchedAt: new Date().toISOString(), schemaVersion: CONDITIONS_CACHE_SCHEMA_VERSION, auditCursor }, CONDITIONS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch (err) {
    logCrash(err, 'utils/cache.js: writeConditionsCache')
  } finally {
    db?.close()
  }
}

/**
 * Read the full stored conditions record — { data, version, fetchedAt,
 * auditCursor } — or null if nothing valid is saved yet. Exact mirror of
 * readDrugsCache above, added 2026-08-30 (conditions durable storage, plan
 * §4.1/Phase 1, step 1.1) — including the same schema-version check and the
 * same crash-log reporting on a genuine failure (2026-08-31, see file
 * header). auditCursor is undefined on a record saved before Phase F14
 * Stage 3 — callers already treat that the same as "no cursor yet."
 */
export async function readConditionsCache() {
  let db
  try {
    db = await openCapsulaDB()
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(CONDITIONS_STORE, 'readonly')
      const req = tx.objectStore(CONDITIONS_STORE).get(CONDITIONS_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
    if (!record || !Array.isArray(record.data) || record.data.length === 0) return null
    if (record.schemaVersion !== CONDITIONS_CACHE_SCHEMA_VERSION) return null
    return record
  } catch (err) {
    logCrash(err, 'utils/cache.js: readConditionsCache')
    return null
  } finally {
    db?.close()
  }
}

/**
 * Clear the conditions IndexedDB cache. Exact mirror of clearDrugsCache
 * above, added 2026-08-30 (conditions durable storage, plan §4.1/Phase 1).
 */
export async function clearConditionsCache() {
  let db
  try {
    db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CONDITIONS_STORE, 'readwrite')
      tx.objectStore(CONDITIONS_STORE).delete(CONDITIONS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // fail silently
  } finally {
    db?.close()
  }
}

// ─── Photos (gallery images) ──────────────────────────────────────────────
//
// Added 2026-09-01 (Image System Refinement Plan, Part A). Each entry is a
// raw Blob keyed by the photo's own Storage URL — not a single record like
// the drugs/conditions stores above, since there can be many photos and
// each one is looked up independently by useCachedImage.js.

/**
 * Save one gallery photo to the on-device store, keyed by its own URL.
 * Called both from the one-time onboarding download (useConditions.js) and
 * from cache-on-view (useCachedImage.js) the first time a photo not yet
 * saved is viewed online. A failed save is non-fatal by design (plan §4 —
 * "a failed photo download during onboarding is non-fatal"); this fails
 * silently from the caller's point of view but reports to the crash log,
 * same pattern as writeDrugsCache/writeConditionsCache above.
 * @param {string} url  — the gallery photo's Storage URL
 * @param {Blob}   blob — the fetched image data
 */
export async function savePhotoToCache(url, blob) {
  if (!url || !blob) return
  let db
  try {
    db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, 'readwrite')
      tx.objectStore(PHOTOS_STORE).put(blob, url)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch (err) {
    logCrash(err, 'utils/cache.js: savePhotoToCache')
  } finally {
    db?.close()
  }
}

/**
 * Read one cached gallery photo's Blob, or null if nothing's saved for
 * that URL yet. A miss here is the normal, expected case for a photo never
 * viewed online and not covered by the onboarding download — callers
 * (useCachedImage.js) fall back to the network for it, not an error.
 * @param {string} url — the gallery photo's Storage URL
 * @returns {Promise<Blob|null>}
 */
export async function getCachedPhoto(url) {
  if (!url) return null
  let db
  try {
    db = await openCapsulaDB()
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, 'readonly')
      const req = tx.objectStore(PHOTOS_STORE).get(url)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
    return blob
  } catch (err) {
    logCrash(err, 'utils/cache.js: getCachedPhoto')
    return null
  } finally {
    db?.close()
  }
}

/**
 * Delete every saved photo whose URL is no longer referenced by any
 * condition. Called from useConditions.js after each fresh condition fetch
 * (plan §4 — "prunes photos no longer referenced by any condition"), so a
 * photo an editor removes doesn't sit on-device forever. No cap on total
 * saved photo count (plan §4 decision, since this is a bounded, curated
 * library rather than user-generated content) — this orphan cleanup is the
 * only pruning this store gets.
 * @param {string[]} validUrls — every gallery photo URL currently referenced
 *   across all conditions (see utils/galleryImageUrls.js)
 */
export async function pruneOrphanedPhotos(validUrls) {
  const validSet = new Set(validUrls ?? [])
  let db
  try {
    db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, 'readwrite')
      const store = tx.objectStore(PHOTOS_STORE)
      const req = store.openKeyCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) return // reached the end of the store
        if (!validSet.has(cursor.key)) store.delete(cursor.key)
        cursor.continue()
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch (err) {
    logCrash(err, 'utils/cache.js: pruneOrphanedPhotos')
  } finally {
    db?.close()
  }
}
