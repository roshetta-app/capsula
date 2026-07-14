/**
 * cache.js — App-wide cache constants
 * Import from here whenever you need cache keys or TTL.
 * To change TTL: edit CACHE_TTL_MS here only.
 */

/** 7 days in milliseconds */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** localStorage key names for each cache slice */
export const CACHE_KEYS = {
  DRUGS:      'capsula_drugs_cache',
  CONDITIONS: 'capsula_conditions_cache',
  CATEGORIES: 'capsula_categories_cache',
}

/** Supabase table used for cache invalidation timestamps */
export const METADATA_TABLE = 'app_metadata'
