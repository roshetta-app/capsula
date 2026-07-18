/**
 * cache.js — localStorage cache with timestamp invalidation + 7-day TTL
 *
 * Three slices: 'drugs', 'conditions', 'categories'
 * Each slice: { data: [], fetchedAt: ISO string, version: string }
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
 */

import { CACHE_KEYS, CACHE_TTL_MS, DRUGS_CACHE_SCHEMA_VERSION } from '../constants/cache'

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
 * @param {'drugs'|'conditions'|'categories'|'all'} key
 */
export function clearCache(key = 'all') {
  try {
    if (key === 'all' || key === 'conditions') localStorage.removeItem(CACHE_KEYS.CONDITIONS)
    if (key === 'all' || key === 'categories') localStorage.removeItem(CACHE_KEYS.CATEGORIES)
    if (key === 'all' || key === 'drugs') {
      localStorage.removeItem(CACHE_KEYS.DRUGS) // legacy key from before the IndexedDB move — harmless no-op cleanup
      clearDrugsCache() // fire-and-forget; the real drugs cache now lives in IndexedDB, see below
    }
  } catch {
    // fail silently
  }
}

// ─── IndexedDB (drugs slice only) ──────────────────────────────────────────
//
// 2026-07-16: localStorage caps out around 5 MB per site — far below the
// real size of the full drug catalog (tens of MB as JSON) — so
// writeCache('drugs', ...) above was silently failing every single time
// (see its catch block), and every app open was secretly a full re-download.
// IndexedDB has no such practical size limit, so the drugs slice's saved
// copy lives here instead. conditions/categories are both small and were
// never affected by this — they're untouched, still on localStorage above.

const IDB_NAME    = 'capsula-cache'
const IDB_VERSION = 1
const IDB_STORE   = 'drugs'
const IDB_KEY     = 'drugs'

function openDrugsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE)
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
    const db = await openDrugsDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put({ data, version, fetchedAt: new Date().toISOString(), schemaVersion: DRUGS_CACHE_SCHEMA_VERSION }, IDB_KEY)
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
    const db = await openDrugsDB()
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
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
    const db = await openDrugsDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  } catch {
    // fail silently
  }
}
