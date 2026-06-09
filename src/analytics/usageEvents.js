/**
 * usageEvents.js — Analytics event tracking
 *
 * Logs usage events to Supabase (table: usage_events).
 * No personal data. No user IDs. No device IDs.
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
  })
  if (error) {
    console.error('[Analytics] logUsageEvent failed:', error.message, error.details, error.hint, { eventType, entityId, entityName })
  }
}
