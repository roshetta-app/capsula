/**
 * usageEvents.js — Analytics event tracking
 *
 * Logs usage events to Supabase (table: usage_events).
 *
 * F10 Stage 2, Batch C — every event now also carries device_id, user_id
 * (nullable), platform, and session_id, read from deviceSession.js at
 * call time. No call site needs to change to pick this up — it's the
 * same event names and same call signature as before, just with real
 * device/session identity attached automatically instead of nothing.
 *
 * Event types:
 *   condition_view             — user opened a condition detail screen
 *   drug_view                  — user opened a drug detail screen
 *   condition_search           — user submitted a condition search
 *   drug_search                — user submitted a drug search
 *   drug_search_near_miss      — drug search found nothing, but "Did you
 *                                 mean" had a guess to offer (added Drug
 *                                 Search Refinement Phase 4, §4.6/§4.7 —
 *                                 not a content gap, tuning input for the
 *                                 later "Did you mean" rework)
 *   drug_search_filter_masked  — drug search found a match, but an active
 *                                 Form/Route filter hid it from view
 *                                 (added Drug Search Refinement Phase 4,
 *                                 §4.6/§4.7 — UX signal only, tracked
 *                                 separately so it never counts as a
 *                                 content gap)
 *   group_create               — a drug group was created (entity_id = group id)
 *   group_drug_add             — one drug was added to a group (entity_id =
 *                                 brand id), logged once per drug
 *   group_share_create         — a share link was made (entity_id = group id)
 *   shared_group_open          — a shared group page opened and showed the
 *                                 group (nothing identifying is sent)
 *   shared_group_save          — a shared group was saved as a copy
 *                                 (entity_id = the new group's id)
 *   group_limit_hit            — a group limit was reached; entity_name is
 *                                 one of free_groups, free_drugs,
 *                                 pro_groups, pro_drugs
 *   (Drug groups, step 9.5: group events never carry a group name or
 *   description. The database list usage_events_event_type_check has them.)
 *
 * Call sites (wired up in Phase 3J):
 *   ConditionDetailScreen — on mount  → condition_view
 *   DrugDetailScreen      — on mount  → drug_view
 *   SearchBar             — on submit → condition_search / drug_search
 *
 * drug_search_near_miss and drug_search_filter_masked are logged from
 * their own points in the search flow (wired up in Phase 4, steps 4c/5c)
 * — not from SearchBar's submit handler.
 */

import { supabase } from '../lib/supabase'
import { getDeviceId, getSessionId, getPlatform, getCurrentUserId } from './deviceSession'

/**
 * Log a usage event to Supabase.
 *
 * @param {'condition_view'|'drug_view'|'condition_search'|'drug_search'|'drug_search_near_miss'|'drug_search_filter_masked'|'group_create'|'group_drug_add'|'group_share_create'|'shared_group_open'|'shared_group_save'|'group_limit_hit'} eventType
 * @param {string|null} entityId   — UUID of the entity, or null for search events
 * @param {string|null} entityName — Name snapshot at time of event
 * @param {'brand'|'generic'|null} [mode] — Brand/Generic mode, for drug-search
 *   related events only (added Drug Search Refinement Phase 4, §4.6/§4.7).
 *   Omit or pass null for event types with no mode concept.
 */
export async function logUsageEvent(eventType, entityId = null, entityName = null, mode = null) {
  const { error } = await supabase.from('usage_events').insert({
    event_type:  eventType,
    entity_id:   entityId,
    entity_name: entityName,
    device_id:   getDeviceId(),
    user_id:     getCurrentUserId(),
    platform:    getPlatform(),
    session_id:  getSessionId(),
    mode,
  })
  if (error) {
    console.error('[Analytics] logUsageEvent failed:', error.message, error.details, error.hint, { eventType, entityId, entityName, mode })
  }
}
