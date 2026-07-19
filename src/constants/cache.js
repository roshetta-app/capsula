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
 * Bump this whenever the SHAPE of what gets cached for the drugs slice
 * changes on the app side (new fields added to the mapped drug object,
 * fields renamed, etc.) — independent of the server-side data version
 * (app_metadata timestamp). A device that already has a cached copy has
 * no other way to know its saved objects are missing fields the current
 * code expects, since the underlying database rows themselves may not
 * have changed at all.
 *
 * 2026-07-20 (drug_card_title_suffix, steps A.1/A.2 follow-up): bumped
 * 1 -> 2. A.1 added fillVolume and A.2 added formModifier to the mapped
 * FlatDrug shape, but this version wasn't bumped alongside those two
 * steps — so devices with a pre-existing cache kept passing the schema
 * check and served the old-shaped data, silently missing both new fields
 * (pack_size, an existing field, still worked fine, which is what made
 * the gap visible: title suffixes showed pack size correctly but never
 * showed fill volume or modifier abbreviations). This bump forces every
 * device to re-fetch once, picking up both new fields.
 */
export const DRUGS_CACHE_SCHEMA_VERSION = 2
