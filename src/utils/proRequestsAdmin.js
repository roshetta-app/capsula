/**
 * src/utils/proRequestsAdmin.js
 *
 * Stage 3, step 4 (2026-11-24) — the plain rules and words behind the CMS Pro requests screen
 * (/admin/pro-requests). No React, no network: the screen passes the rows in, so the checks
 * (proRequestsAdmin.check.js) can run this on its own.
 *
 * The database functions (Migration 16): admin_pro_requests(status, limit), admin_approve_pro_request(id),
 * admin_reject_pro_request(id, reason). The promise to the person is 24 hours from the request
 * (decision 29): a request waiting more than 12 hours is shown as late, more than 24 as overdue.
 */

export const LATE_HOURS = 12
export const OVERDUE_HOURS = 24

export const STATUS_TABS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
]

// The six reasons the database allows, with the short button label for the owner.
// The words the person reads are written by the database function (they match src/lib/proQueries.js).
export const REJECT_REASONS = [
  { key: 'not_found', label: 'Payment not found' },
  { key: 'wrong_amount', label: 'Wrong amount' },
  { key: 'wrong_reference', label: 'Code missing or wrong' },
  { key: 'unclear_receipt', label: 'Receipt not clear' },
  { key: 'duplicate', label: 'Receipt already used' },
  { key: 'other', label: 'Other (no reason shown)' },
]

export const PLAN_NAMES = { monthly: 'Monthly', six_months: '6 months', yearly: 'Yearly' }

/** 'ok' under 12 hours, 'late' from 12, 'overdue' from 24. Anything else (not waiting) is 'none'. */
export function waitTone(status, hours) {
  if (status !== 'waiting') return 'none'
  const h = Number(hours)
  if (!Number.isFinite(h)) return 'ok'
  if (h >= OVERDUE_HOURS) return 'overdue'
  if (h >= LATE_HOURS) return 'late'
  return 'ok'
}

export function waitText(hours) {
  const h = Number(hours)
  if (!Number.isFinite(h)) return ''
  if (h < 1) return 'less than 1 hour'
  if (h < 48) return `${Math.floor(h)} hour${Math.floor(h) === 1 ? '' : 's'}`
  return `${Math.floor(h / 24)} days`
}

/** The question shown before Approve. Says what the owner must have seen first (decision 28). */
export function approveCopy(row) {
  const who = row.full_name ? row.full_name : 'this person'
  return {
    title: 'Approve this payment?',
    message:
      `Only approve after you see ${row.amount_egp} EGP in your own wallet, from a number ending ${row.sender_last4}, ` +
      `with the code ${row.reference_code}. A receipt photo alone is not proof. Pro (${PLAN_NAMES[row.plan] ?? row.plan}) turns on for ${who} and they get a notification.`,
    confirmLabel: 'Approve',
  }
}

export function rejectCopy(row, reasonKey) {
  const reason = REJECT_REASONS.find(r => r.key === reasonKey)
  return {
    title: 'Reject this request?',
    message:
      `${reason ? reason.label : 'No reason'}. The person gets a notification and can send a new request.`,
    confirmLabel: 'Reject',
  }
}

/** Maps a database error from the three functions to words for the owner. */
export function errorText(error) {
  const m = String(error?.message ?? error ?? '')
  if (m.includes('not_waiting')) return 'This request was already decided. Refresh the list.'
  if (m.includes('not_found')) return 'This request no longer exists. Refresh the list.'
  if (m.includes('no_person')) return 'The person deleted their account, so there is nobody to give Pro to.'
  if (m.includes('already_lifetime')) return 'This account already has lifetime Pro.'
  if (m.includes('forbidden')) return 'Only an admin account can do this.'
  return 'Something went wrong. Please try again.'
}
