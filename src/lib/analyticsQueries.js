/**
 * src/lib/analyticsQueries.js
 *
 * S11 (2026-11-26): the data reads of the CMS Analytics dashboard, moved out of the page so it no longer
 * imports the server client. Every function returns the same awaitable query the page built before
 * (the paging helpers in the page still add the row range), so nothing about the numbers changes.
 */

import { supabase } from './supabase'

export const queryEventNamesPage = (eventType, from, to) => supabase
  .from('usage_events')
  .select('entity_name')
  .eq('event_type', eventType)
  .not('entity_name', 'is', null)
  .range(from, to)

export const queryConditionsForDashboard = () => supabase
  .from('conditions')
  .select('id, is_published, needs_review, definition, specialty_id, specialties!conditions_specialty_id_fkey(name_en)')

export const countBrandsForDashboard = () => supabase
  .from('brands')
  .select('id', { count: 'exact', head: true })

export const queryActiveSpecialties = () => supabase
  .from('specialties')
  .select('id, name_en, is_active')
  .eq('is_active', true)
  .order('sort_order', { ascending: true })

export const countUsageEventsOfType = (eventType) => supabase
  .from('usage_events')
  .select('*', { count: 'exact', head: true })
  .eq('event_type', eventType)

export const queryGateEvents = () => supabase
  .from('usage_events')
  .select('event_type, entity_name')
  .in('event_type', ['gate_impression', 'gate_dismiss', 'gate_maybe_later', 'gate_cta_click'])

export const queryProfilesForDashboard = () => supabase
  .from('profiles')
  .select('id, specialty, country, occupation, created_at')

export const queryGenericsForDashboard = () => supabase
  .from('generics')
  .select('id, category, is_published, formulations(id, doses_structured, brands(id, is_published, needs_review))')

export const queryFormulationDoses = () => supabase
  .from('formulations')
  .select('id, doses_structured')

export const querySearchGapsSince = (sinceIso) => supabase
  .from('search_gaps')
  .select('term, context, created_at')
  .gte('created_at', sinceIso)

export const queryUsageEventsSince = (sinceIso) => supabase
  .from('usage_events')
  .select('event_type, entity_name, device_id, user_id, session_id, created_at')
  .gte('created_at', sinceIso)
