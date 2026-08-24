/**
 * cache.js — App-wide cache constants
 * Import from here whenever you need cache keys or TTL.
 * To change TTL: edit CACHE_TTL_MS here only.
 */

import { FLAT_DRUG_SCHEMA_VERSION } from '../lib/queries'

/** 7 days in milliseconds */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** localStorage key names for each cache slice */
export const CACHE_KEYS = {
  DRUGS:         'capsula_drugs_cache',
  CONDITIONS:    'capsula_conditions_cache',
  CATEGORIES:    'capsula_categories_cache',
  ICONS:         'capsula_icons_cache',
  // account-instant-load: NOT part of the CACHE_KEY_MAP slice system below
  // (utils/cache.js) — that system invalidates on a 7-day TTL/version
  // check, which doesn't apply here. This one is invalidated by identity
  // instead: written on a successful sign-in, wiped on sign-out or when a
  // different account signs in. See utils/authSnapshot.js.
  AUTH_SNAPSHOT: 'capsula_auth_snapshot',
}

/** Supabase table used for cache invalidation timestamps */
export const METADATA_TABLE = 'app_metadata'

/**
 * The local drugs cache's schema version — a stable fingerprint of the
 * FlatDrug shape, sourced from FLAT_DRUG_SCHEMA_VERSION in src/lib/queries.js
 * (derived from FULL_BRAND_SELECT, the query that defines that shape). A
 * device's saved drugs cache is stamped with whatever this value was at the
 * moment it was written (see utils/cache.js's writeDrugsCache/readDrugsCache);
 * it only changes when a column fetchFlatDrugs actually selects is added,
 * removed, or renamed — not on every deploy.
 *
 * 2026-08-03: this used to be pulled from a per-build timestamp
 * (VITE_BUILD_STAMP, see vite.config.js), which changed on every single
 * `vite build` — so every deploy invalidated every device's drugs cache,
 * regardless of whether the drug shape had actually changed. Before that, it
 * was a number a developer had to bump by hand, which got missed twice
 * (first for fillVolume/formModifier, 2026-07-20, then again for `sources`,
 * 2026-07-26) — a stale-shaped cache silently kept passing the check both
 * times. Sourcing it from the select string itself avoids both failure
 * modes: nothing to remember to bump, and no false invalidation on unrelated
 * code changes.
 */
export const DRUGS_CACHE_SCHEMA_VERSION = FLAT_DRUG_SCHEMA_VERSION
