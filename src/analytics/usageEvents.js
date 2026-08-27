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
 *   condition_view    — user opened a condition detail screen
 *   drug_view         — user opened a drug detail screen
 *   condition_search  — user submitted a condition search
 *   drug_search       — user submitted a drug search
 *
 * Call sites (wired up in Phase 3J):
 *   ConditionDetailScreen — on mount  → condition_view
 *   DrugDetailScreen      — on mount  → drug_view
 *   SearchBar             — on submit → condition_search / drug_search
 */

import { supabase } from '../lib/supabase'
import { getDeviceId, getSessionId, getPlatform, getCurrentUserId } from './deviceSession'

/**
 * Log a usage event to Supabase.
 *
 * @param {'condition_view'|'drug_view'|'condition_search'|'drug_search'} eventType
 * @param {string|null} entityId   — UUID of the entity, or null for search events
 * @param {string|null} entityName — Name snapshot at time of event
 */
export async function logUsageEvent(eventType, entityId = null, entityName = null) {
  const { error } = await supabase.from('usage_events').insert({
    event_type:  eventType,
    entity_id:   entityId,
    entity_name: entityName,
    device_id:   getDeviceId(),
    user_id:     getCurrentUserId(),
    platform:    getPlatform(),
    session_id:  getSessionId(),
  })
  if (error) {
    console.error('[Analytics] logUsageEvent failed:', error.message, error.details, error.hint, { eventType, entityId, entityName })
  }
}
