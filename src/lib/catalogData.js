/**
 * src/lib/catalogData.js
 *
 * S11 (2026-11-26): the catalog area's one door to the server. The hook that loads the drug list used to
 * import the Supabase client and hand it to each query function. The same functions are bound to the
 * client here, so the hook no longer touches the client (the originals in queries.js and catalogStatic.js
 * still take a client as an argument, which keeps their offline checks working).
 */

import { supabase } from './supabase'
import {
  fetchFlatDrugs as fetchFlatDrugsWith,
  fetchFlatDrugsByScope as fetchFlatDrugsByScopeWith,
  fetchFlatDrugsByBrandId as fetchFlatDrugsByBrandIdWith,
  fetchMetadataTimestamps as fetchMetadataTimestampsWith,
  fetchAuditLogSince as fetchAuditLogSinceWith,
  fetchAuditCursorNow as fetchAuditCursorNowWith,
  fetchClassKeywords as fetchClassKeywordsWith,
  fetchConditions as fetchConditionsWith,
  fetchConditionById as fetchConditionByIdWith,
  fetchAllConditions as fetchAllConditionsWith,
} from './queries'
import {
  isStaticCatalogEnabled as isStaticCatalogEnabledWith,
  manifestCanCatchUp as manifestCanCatchUpWith,
} from './catalogStatic'

export const fetchFlatDrugs = (onProgress) => fetchFlatDrugsWith(supabase, onProgress)
export const fetchFlatDrugsByScope = (scope, id) => fetchFlatDrugsByScopeWith(supabase, scope, id)
export const fetchFlatDrugsByBrandId = (brandId) => fetchFlatDrugsByBrandIdWith(supabase, brandId)
export const fetchMetadataTimestamps = () => fetchMetadataTimestampsWith(supabase)
export const fetchAuditLogSince = (sinceTimestamp) => fetchAuditLogSinceWith(supabase, sinceTimestamp)
export const fetchAuditCursorNow = () => fetchAuditCursorNowWith(supabase)
export const isStaticCatalogEnabled = (timeoutMs) => isStaticCatalogEnabledWith(supabase, timeoutMs)
export const manifestCanCatchUp = (manifest, maxChanges) => manifestCanCatchUpWith(supabase, manifest, maxChanges)
export const fetchClassKeywords = () => fetchClassKeywordsWith(supabase)
export const fetchConditions = (onProgress) => fetchConditionsWith(supabase, onProgress)
export const fetchConditionById = (id) => fetchConditionByIdWith(supabase, id)
export const fetchAllConditions = () => fetchAllConditionsWith(supabase)
