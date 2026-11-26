/**
 * src/lib/screenQueries.js
 *
 * S11 (2026-11-26): one-off server reads and writes that single screens used to make directly. Each
 * returns the same awaitable query (or promise) the screen already handled, so the screens only swapped
 * the call. Areas with several calls have their own files (proQueries, switchQueries, catalogData ...).
 */

import { supabase } from './supabase'

/** CMS: all published formulations with their generic and brand (the drug picker). */
export const queryPublishedFormulations = () => supabase
  .from('formulations')
  .select(`
      id, slug, concentration, form, route,
      doses_structured, default_dose_override,
      generics ( id, name_en, slug, category ),
      brands ( id, name, is_published )
    `)
  .eq('is_published', true)
  .order('concentration')

/** Drug page: the "check the price" link for one brand. */
export const rpcBrandPriceLink = (brandId) => supabase.rpc('brand_price_link', { p_brand_id: brandId })

/** Drug page: the picture address for one brand. */
export const rpcBrandImageUrl = (brandId) => supabase.rpc('brand_image_url', { p_brand_id: brandId })

/** Home: the featured items that are switched on, oldest first. */
export const queryActiveHomeFeatured = () => supabase
  .from('home_featured')
  .select('id, kind, condition_id, brand_id, tagline, is_active')
  .eq('is_active', true)
  .order('created_at', { ascending: true })

/** Notes: every note of one person (for the offline copy). */
export const queryNotesOfUser = (userId) => supabase
  .from('notes')
  .select('condition_id, body, image_url, updated_at')
  .eq('user_id', userId)

/** Profile: stop sharing one item (table is 'drug_group_shares' or 'roshetta_shares'). */
export const deleteShareByCode = (table, code) => supabase.from(table).delete().eq('share_code', code)

/** CMS: send a notification through the server function. */
export const invokeSendNotification = (body) => supabase.functions.invoke('send-notification', { body })

/** CMS: the business numbers for one period. */
export const rpcAdminBusinessNumbers = (period) => supabase.rpc('admin_business_numbers', { p_period: period })

/** CMS: the latest 100 change-log entries. */
export const queryRecentAuditLog = () => supabase
  .from('audit_log')
  .select('id, action, table_name, record_id, record_name, changes, created_at')
  .order('created_at', { ascending: false })
  .limit(100)

/** CMS: the latest 50 crash logs. */
export const queryRecentCrashLogs = () => supabase
  .from('crash_logs')
  .select('id, error_message, error_stack, component_stack, app_version, created_at')
  .order('created_at', { ascending: false })
  .limit(50)
