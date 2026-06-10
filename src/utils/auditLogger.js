/**
 * auditLogger.js
 *
 * Utilities for writing admin audit trail entries to the `audit_logs` table
 * and for computing field-level diffs between two record snapshots.
 */

import { supabase } from '../lib/supabase'

// ─── logAudit ────────────────────────────────────────────────────────────────
//
// Inserts one row into `audit_logs`.
//
// @param {string} action      - 'create' | 'update' | 'delete' | 'publish' | 'unpublish'
// @param {string} table       - Target table name, e.g. 'conditions', 'generics', 'brands'
// @param {string} recordId    - UUID of the affected record
// @param {string} recordName  - Human-readable label (used for display in AuditLogs view)
// @param {object} data        - Payload: full record for create/delete, diff object for update,
//                               or { is_published: [before, after] } for publish toggles
//
// Failures are silently swallowed so that a logging hiccup never blocks a save operation.
//
export async function logAudit(action, table, recordId, recordName, data) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      table_name:  table,
      record_id:   recordId,
      record_name: recordName,
      payload:     data ?? null,
    })
  } catch (_err) {
    // Non-fatal — audit logging must never interrupt the primary save path.
    console.warn('[auditLogger] logAudit failed silently:', _err)
  }
}

// ─── getRecordChanges ────────────────────────────────────────────────────────
//
// Returns an object containing only the fields that changed between `before`
// and `after`, structured as:
//   { fieldName: { from: beforeValue, to: afterValue }, … }
//
// Returns `null` when no differences are found (so callers can guard with
// `if (diffs) { await logAudit(...) }`).
//
// @param {object}   before      - Baseline snapshot (initial DB state)
// @param {object}   after       - Current form state
// @param {string[]} [exclude]   - Field keys to skip (e.g. ['updated_at', 'brands'])
//
export function getRecordChanges(before, after, exclude = []) {
  if (!before || !after) return null

  const skipSet = new Set(exclude)
  const diffs   = {}

  const allKeys = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])

  for (const key of allKeys) {
    if (skipSet.has(key)) continue

    const bVal = before[key]
    const aVal = after[key]

    // Use JSON serialisation for a reliable deep-equality check that handles
    // arrays, nested objects, and null/undefined uniformly.
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diffs[key] = { from: bVal, to: aVal }
    }
  }

  return Object.keys(diffs).length > 0 ? diffs : null
}
