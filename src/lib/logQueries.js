/**
 * src/lib/logQueries.js
 *
 * S11 (2026-11-26): the four write-only log inserts (crash logs, change log, usage events, search gaps),
 * moved out of crashLogger.js, auditLogger.js, usageEvents.js and searchGaps.js. Each returns the same
 * awaitable query the callers already handled ({ error } on failure; callers keep their own error rules).
 */

import { supabase } from './supabase'

export const insertCrashLog = (row) => supabase.from('crash_logs').insert(row)
export const insertAuditLog = (row) => supabase.from('audit_log').insert(row)
export const insertUsageEvent = (row) => supabase.from('usage_events').insert(row)
export const insertSearchGap = (row) => supabase.from('search_gaps').insert(row)
