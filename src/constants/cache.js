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

/**
 * Stamped automatically at build time (see vite.config.js's BUILD_STAMP /
 * VITE_BUILD_STAMP define) — the same unique value baked into every build
 * that also cache-busts the service worker. A device's saved drugs cache
 * is stamped with whatever this value was at the moment it was written
 * (see utils/cache.js's writeDrugsCache/readDrugsCache); any new build
 * automatically carries a new stamp, so any device with an older saved
 * copy is forced to re-fetch on its next open.
 *
 * This replaces a manually-typed version number that had to be bumped by
 * hand every time a new field was added to the cached drug shape —
 * independent of the server-side data version (app_metadata timestamp),
 * since the underlying database rows themselves may not change at all
 * when the app-side shape does. That manual step was missed twice before
 * bumping to a real fix here: first for fillVolume/formModifier
 * (2026-07-20), then again for `sources` (2026-07-26, decision 4.17) —
 * both times a device with a pre-existing cache kept passing the check
 * and silently served the old-shaped data. There's no number to remember
 * to bump now, because there's no number a person has to type — every
 * build stamps itself.
 */
export const DRUGS_CACHE_SCHEMA_VERSION = import.meta.env.VITE_BUILD_STAMP ?? 'dev'
