const CACHE_KEY = 'capsula_cache'

/**
 * Read the full cache synchronously.
 * Returns null if nothing cached yet.
 *
 * Shape: { drugs: { data, updatedAt }, conditions: { data, updatedAt } }
 */
export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Write one slice of the cache without touching the other.
 * @param {'drugs'|'conditions'} key
 * @param {Array}  data
 * @param {string} updatedAt — ISO timestamp from app_metadata
 */
export function writeCache(key, data, updatedAt) {
  try {
    const existing = readCache() || {}
    const next = { ...existing, [key]: { data, updatedAt } }
    localStorage.setItem(CACHE_KEY, JSON.stringify(next))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/**
 * Return the cached updatedAt string for a given slice, or null.
 * @param {'drugs'|'conditions'} key
 */
export function getCacheTimestamp(key) {
  try {
    const cache = readCache()
    return cache?.[key]?.updatedAt ?? null
  } catch {
    return null
  }
}

/**
 * Return the cached data array for a given slice, or null.
 * @param {'drugs'|'conditions'} key
 */
export function getCacheData(key) {
  try {
    const cache = readCache()
    return cache?.[key]?.data ?? null
  } catch {
    return null
  }
}
