/**
 * auditLogger.js — Audit trail helper for the admin CMS.
 *
 * Every admin save, delete, publish, or unpublish action calls logAudit()
 * which inserts a single row into the audit_log Supabase table.
 *
 * logAudit is fire-and-forget: failures are logged to console but never
 * bubble up to the caller — a broken audit trail must never block a real
 * admin operation.
 *
 * Usage:
 *   import { logAudit } from '../utils/auditLogger'
 *
 *   await logAudit('create',    'conditions', row.id,  row.name)
 *   await logAudit('update',    'generics',   id,      name,    { field: [oldVal, newVal] })
 *   await logAudit('delete',    'brands',     id,      name)
 *   await logAudit('publish',   'conditions', id,      name)
 *   await logAudit('unpublish', 'generics',   id,      name)
 */

import { supabase } from '../lib/supabase'

/**
 * Insert one row into audit_log.
 *
 * @param {'create'|'update'|'delete'|'publish'|'unpublish'} action
 * @param {string}  tableName  — affected Supabase table, e.g. 'conditions'
 * @param {string}  recordId   — UUID of the affected row
 * @param {string}  [recordName] — human-readable name snapshot (optional but recommended)
 * @param {object}  [changes]  — for updates: { field: [oldValue, newValue] }
 *                               for creates/deletes: the full record object
 */
export async function logAudit(action, tableName, recordId, recordName = null, changes = null) {
  try {
    const { error } = await supabase.from('audit_log').insert({
      action,
      table_name:  tableName,
      record_id:   recordId,
      record_name: recordName ?? null,
      changes:     changes    ?? null,
    })
    if (error) {
      // Log visibly so we can diagnose — never thrown to caller
      console.error('[auditLogger] Insert failed:', error.message, { action, tableName, recordId })
    }
  } catch (err) {
    console.error('[auditLogger] Unexpected error:', err)
  }
}
