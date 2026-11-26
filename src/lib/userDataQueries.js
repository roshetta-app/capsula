/**
 * src/lib/userDataQueries.js
 *
 * S11 (2026-11-26): the one place for the personal-data calls of six files that used to import the
 * server client themselves: search history, recently viewed, personal notes, the push-token calls,
 * the CMS home counts and the drug editor reads. Every function returns the same awaitable query
 * the file built before, so the callers only swapped the call and nothing else changed.
 */

import { supabase } from './supabase'

// ── Search history ────────────────────────────────────────────────────────
export const querySearchHistory = (table, limit) => supabase
  .from(table)
  .select('search_text, mode, searched_at')
  .order('searched_at', { ascending: false })
  .limit(limit)

export const upsertSearchHistory = (table, rows, conflict) => supabase
  .from(table)
  .upsert(rows, { onConflict: conflict })

export const deleteSearchHistoryEntry = (table, userId, mode, textKey) => supabase
  .from(table)
  .delete()
  .eq('user_id', userId)
  .eq('mode', mode)
  .eq('text_key', textKey)

export const deleteAllSearchHistory = (table, userId) => supabase
  .from(table)
  .delete()
  .eq('user_id', userId)

// ── Recently viewed ───────────────────────────────────────────────────────
export const queryRecentlyViewed = (itemType, limit) => supabase
  .from('recently_viewed')
  .select('item_id, item_name, item_slug, viewed_at')
  .eq('item_type', itemType)
  .order('viewed_at', { ascending: false })
  .limit(limit)

export const upsertRecentlyViewed = (row) => supabase
  .from('recently_viewed')
  .upsert(row, { onConflict: 'user_id,item_type,item_id' })

export const clearRecentlyViewed = (userId, itemType) => supabase
  .from('recently_viewed')
  .delete()
  .eq('user_id', userId)
  .eq('item_type', itemType)

// ── Personal notes ────────────────────────────────────────────────────────
export const upsertNoteText = (userId, conditionId, body, updatedAt) => supabase
  .from('notes')
  .upsert(
    { user_id: userId, condition_id: conditionId, body, updated_at: updatedAt },
    { onConflict: 'user_id,condition_id' }
  )

// body is deliberately left out so an image-only save can never wipe an existing note body.
export const upsertNoteImage = (userId, conditionId, imageUrl, updatedAt) => supabase
  .from('notes')
  .upsert(
    { user_id: userId, condition_id: conditionId, image_url: imageUrl, updated_at: updatedAt },
    { onConflict: 'user_id,condition_id' }
  )

export const queryOwnNote = (userId, conditionId) => supabase
  .from('notes')
  .select('body, image_url, updated_at')
  .eq('user_id', userId)
  .eq('condition_id', conditionId)
  .maybeSingle()

// ── Push tokens ───────────────────────────────────────────────────────────
export const rpcIncrementNotificationClick = (logId) => supabase.rpc('increment_notification_click', { log_id: logId })

export const getSignedInUser = () => supabase.auth.getUser()

export const rpcClaimPushToken = (args) => supabase.rpc('claim_push_token', args)

export const deletePushTokenByToken = (token) => supabase
  .from('push_tokens')
  .delete()
  .eq('token', token)

export const queryPushTokenId = (token) => supabase
  .from('push_tokens')
  .select('id')
  .eq('token', token)
  .maybeSingle()

// ── CMS home counts ───────────────────────────────────────────────────────
export const rpcAdminProRequests = (status, limit) => supabase.rpc('admin_pro_requests', { p_status: status, p_limit: limit })

export const countRows = (table) => supabase.from(table).select('id', { count: 'exact', head: true })

// ── Drug editor reads ─────────────────────────────────────────────────────
export const queryGenericForEditor = (genericId) => supabase
  .from('generics')
  .select(`
        id, slug, name_en, ingredients, category, class, subclass, is_published,
        mechanism_of_action,
        uses_structured,
        warnings_legacy,
        side_effects,
        pregnancy_category, breastfeeding_safety,
        crosses_placenta, crosses_bbb,
        contraindications, drug_interactions, dose_adjustments,
        pharmacokinetics, clinical_relevance, sources,
        textbook_doses, textbook_dose_notes
      `)
  .eq('id', genericId)
  .single()

export const queryFormulationsOfGeneric = (genericId, columns) => supabase
  .from('formulations')
  .select(columns)
  .eq('generic_id', genericId)
  .order('concentration')

export const queryFormulationById = (id, columns) => supabase
  .from('formulations').select(columns).eq('id', id).single()

export const queryGenericSlug = (genericId) => supabase
  .from('generics').select('slug').eq('id', genericId).single()
