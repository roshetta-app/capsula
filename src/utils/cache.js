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

import { CACHE_KEYS, CACHE_TTL_MS } from '../constants/cache'

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
    if (key === 'all' || key === 'drugs')      localStorage.removeItem(CACHE_KEYS.DRUGS)
    if (key === 'all' || key === 'conditions') localStorage.removeItem(CACHE_KEYS.CONDITIONS)
    if (key === 'all' || key === 'categories') localStorage.removeItem(CACHE_KEYS.CATEGORIES)
  } catch {
    // fail silently
  }
}
