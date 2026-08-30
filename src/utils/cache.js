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

// ─── IndexedDB (drugs + conditions) ────────────────────────────────────────
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

const IDB_NAME    = 'capsula-cache'
const IDB_VERSION = 2
const IDB_STORES  = ['drugs', 'conditions']

const DRUGS_STORE      = 'drugs'
const DRUGS_KEY        = 'drugs'
const CONDITIONS_STORE = 'conditions'
const CONDITIONS_KEY   = 'conditions'

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
  })
}

/**
 * Write the drugs cache to IndexedDB. Same record shape as writeCache,
 * plus schemaVersion (2026-07-18, drug_library_ui_ux bugfix): stamps the
 * current DRUGS_CACHE_SCHEMA_VERSION on every write, so a later app-side
 * shape change (new fields on the mapped drug object, independent of the
 * server-side data version) can be detected and invalidated on read even
 * when the underlying database rows themselves haven't changed. Silently
 * no-ops on empty data or any storage error, same guarding behavior as
 * writeCache above.
 * @param {Array}  data     — the full fetched drug list
 * @param {string} version  — ISO timestamp from app_metadata
 */
export async function writeDrugsCache(data, version) {
  if (!Array.isArray(data) || data.length === 0) return
  try {
    const db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DRUGS_STORE, 'readwrite')
      tx.objectStore(DRUGS_STORE).put({ data, version, fetchedAt: new Date().toISOString(), schemaVersion: DRUGS_CACHE_SCHEMA_VERSION }, DRUGS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // IndexedDB unavailable (rare — e.g. some private-browsing modes) — fail silently
  }
}

/**
 * Read the full stored drugs record — { data, version, fetchedAt } — or
 * null if nothing valid is saved yet.
 *
 * Also returns null (forcing callers down their cold-start path) if the
 * saved record predates DRUGS_CACHE_SCHEMA_VERSION or was written by an
 * older version of it (2026-07-18 bugfix) — an outdated shape needs a
 * real re-fetch, not just a "the data itself looks fine" pass-through,
 * since the server-side version timestamp alone can't detect an app-side
 * field change.
 */
export async function readDrugsCache() {
  try {
    const db = await openCapsulaDB()
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(DRUGS_STORE, 'readonly')
      const req = tx.objectStore(DRUGS_STORE).get(DRUGS_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
    if (!record || !Array.isArray(record.data) || record.data.length === 0) return null
    if (record.schemaVersion !== DRUGS_CACHE_SCHEMA_VERSION) return null
    return record
  } catch {
    return null
  }
}

/**
 * Clear the drugs IndexedDB cache.
 */
export async function clearDrugsCache() {
  try {
    const db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DRUGS_STORE, 'readwrite')
      tx.objectStore(DRUGS_STORE).delete(DRUGS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // fail silently
  }
}

/**
 * Write the conditions cache to IndexedDB. Exact mirror of writeDrugsCache
 * above, added 2026-08-30 (conditions durable storage, plan §4.1/Phase 1,
 * step 1.1) — same record shape, same schema-version stamping, same
 * silent-fail guarding.
 * @param {Array}  data     — the full fetched conditions list
 * @param {string} version  — ISO timestamp from app_metadata
 */
export async function writeConditionsCache(data, version) {
  if (!Array.isArray(data) || data.length === 0) return
  try {
    const db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CONDITIONS_STORE, 'readwrite')
      tx.objectStore(CONDITIONS_STORE).put({ data, version, fetchedAt: new Date().toISOString(), schemaVersion: CONDITIONS_CACHE_SCHEMA_VERSION }, CONDITIONS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // IndexedDB unavailable (rare — e.g. some private-browsing modes) — fail silently
  }
}

/**
 * Read the full stored conditions record — { data, version, fetchedAt } —
 * or null if nothing valid is saved yet. Exact mirror of readDrugsCache
 * above, added 2026-08-30 (conditions durable storage, plan §4.1/Phase 1,
 * step 1.1) — including the same schema-version check, so an app-side
 * shape change safely throws out an old cached copy instead of breaking.
 */
export async function readConditionsCache() {
  try {
    const db = await openCapsulaDB()
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(CONDITIONS_STORE, 'readonly')
      const req = tx.objectStore(CONDITIONS_STORE).get(CONDITIONS_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
    if (!record || !Array.isArray(record.data) || record.data.length === 0) return null
    if (record.schemaVersion !== CONDITIONS_CACHE_SCHEMA_VERSION) return null
    return record
  } catch {
    return null
  }
}

/**
 * Clear the conditions IndexedDB cache. Exact mirror of clearDrugsCache
 * above, added 2026-08-30 (conditions durable storage, plan §4.1/Phase 1).
 */
export async function clearConditionsCache() {
  try {
    const db = await openCapsulaDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CONDITIONS_STORE, 'readwrite')
      tx.objectStore(CONDITIONS_STORE).delete(CONDITIONS_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // fail silently
  }
}