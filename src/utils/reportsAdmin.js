/**
 * src/utils/reportsAdmin.js
 * 2026-11-22 (Public profile plan, step 14.9c-1): the plain rules and words for the CMS Reports screen
 * (/admin/reports) and the open-reports count on the CMS home. The database call is handed in, so everything
 * here is checked without a database or a screen (reportsAdmin.check.js). reportsAdminContent.js binds the
 * real one. Only an admin account can run these functions; anyone else gets 'forbidden'.
 *
 * The database facts this relies on (Migration 4):
 *   admin_list_reports()       one row per reported thing (open reports, or an appeal waiting), medical first
 *   admin_report_count()       how many of those rows there are
 *   admin_set_hidden(k,id,b)   hide (true) or restore (false); closes the open reports; written to the audit log
 *   admin_dismiss_reports(k,id) closes the open reports, changes nothing for the owner
 *   admin_answer_appeal(k,id,restore) restore = restore it; false = it stays hidden, the owner's one appeal is used
 * A hide, restore, dismiss and appeal answer are all written to the audit log by the database itself.
 * 2026-11-22 (step 14.9c-2): the preview of what was reported:
 *   admin_report_preview(k,id) the reported item's own words (roshetta text and drugs, group drugs, profile bio);
 *                              only for something with an open report or a flag, admin only (Migration 5)
 *
 * Nothing in this file keeps anything on the phone or the computer, and the list never holds a reporter's id
 * (only how old each reporter's account was when they reported).
 */

import { withTimeLimit } from './roshettaLoad.js'
import { REPORT_REASONS } from './reportRules.js'

const KINDS = new Set(['roshetta', 'group', 'profile'])
const REASON_KEYS = new Set(REPORT_REASONS.map(r => r.key))

export const KIND_LABELS = { roshetta: 'Roshetta', group: 'Drug group', profile: 'Profile' }
export const ACTIONS = ['hide', 'keep', 'restore', 'dismiss', 'answer_restore', 'answer_keep']

export const REPORTS_WORDS = {
  title: 'Reports',
  empty: 'No open reports',
  emptyLine: 'Reports and appeals will appear here.',
  loadError: 'Could not load the reports.',
  forbidden: 'This screen is for admin accounts only.',
  offline: 'You are offline. Reconnect and try again.',
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

// Only well-formed rows, with only the facts the screen needs (the owner's id is dropped on purpose).
export function parseReports(data) {
  if (!Array.isArray(data)) return []
  const out = []
  for (const r of data) {
    if (!r || typeof r !== 'object') continue
    if (!KINDS.has(r.kind)) continue
    if (typeof r.target_id !== 'string' || !r.target_id) continue
    const reasons = {}
    if (r.reasons && typeof r.reasons === 'object') {
      for (const [k, c] of Object.entries(r.reasons)) if (REASON_KEYS.has(k) && num(c) > 0) reasons[k] = num(c)
    }
    out.push({
      kind: r.kind,
      targetId: r.target_id,
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : null,
      handle: typeof r.handle === 'string' && r.handle ? r.handle : null,
      total: num(r.total),
      counting: num(r.counting),
      hasMedical: r.has_medical === true,
      reasons,
      reporterAges: Array.isArray(r.reporter_ages_days) ? r.reporter_ages_days.map(a => (typeof a === 'number' && Number.isFinite(a) ? a : null)) : [],
      hidden: r.hidden === true,
      hiddenBy: r.hidden_by === 'admin' ? 'admin' : r.hidden_by === 'reports' ? 'reports' : null,
      appealPending: Boolean(r.appeal_at) && r.stays_hidden !== true,
      staysHidden: r.stays_hidden === true,
    })
  }
  return out
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function countLine(row) {
  if (row.total === 0) return 'No open reports'
  let line = plural(row.total, 'open report', 'open reports')
  // A profile never hides by itself, so how many "count" does not matter there.
  if (row.kind !== 'profile') line += row.counting === 1 ? ', 1 counts toward hiding' : `, ${row.counting} count toward hiding`
  return line
}

function agesLine(row) {
  if (row.reporterAges.length === 0) return ''
  const parts = row.reporterAges.map(a => {
    if (a === null) return 'deleted'
    const text = plural(a, 'day', 'days')
    return a < 7 ? `${text} (new)` : text
  })
  return `Reporter accounts: ${parts.join(', ')}`
}

function actionsFor(row, status) {
  if (status === 'appeal') return [{ key: 'answer_restore', label: 'Restore' }, { key: 'answer_keep', label: 'Keep hidden', danger: true }]
  if (status === 'hidden') {
    const list = [{ key: 'restore', label: 'Restore' }]
    if (row.total > 0) list.push({ key: 'keep', label: 'Keep hidden', danger: true })
    return list
  }
  return [{ key: 'hide', label: 'Hide', danger: true }, { key: 'dismiss', label: 'Dismiss reports' }]
}

// Everything the screen draws for one row.
export function rowView(row) {
  const status = row.hidden && row.appealPending ? 'appeal' : row.hidden ? 'hidden' : 'open'
  let statusLabel = 'Not hidden'
  if (status === 'appeal') statusLabel = 'Appeal waiting'
  else if (status === 'hidden') {
    statusLabel = row.hiddenBy === 'admin' ? 'Hidden by you' : 'Hidden by reports'
    if (row.staysHidden) statusLabel += ', decision final'
  }
  const canOpenProfile = row.kind === 'profile' && Boolean(row.handle) && !row.hidden
  return {
    key: `${row.kind}:${row.targetId}`,
    kind: row.kind,
    kindLabel: KIND_LABELS[row.kind],
    title: row.name ?? 'Untitled',
    handleLine: row.handle ? `@${row.handle}` : 'No username',
    status,
    statusLabel,
    reasons: REPORT_REASONS.filter(r => row.reasons[r.key]).map(r => ({ key: r.key, label: r.label, count: row.reasons[r.key] })),
    countLine: countLine(row),
    agesLine: agesLine(row),
    hasMedical: row.hasMedical,
    canOpenProfile,
    // Same shape as the public profile address (it never changes). Only while the profile is visible.
    profilePath: canOpenProfile ? `/u/${encodeURIComponent(row.handle)}` : null,
    actions: actionsFor(row, status),
  }
}

// The question asked before an action runs.
export function confirmCopy(action, row) {
  const what = KIND_LABELS[row.kind].toLowerCase()
  switch (action) {
    case 'hide':
      return {
        title: `Hide this ${what}?`,
        message: row.kind === 'profile'
          ? 'Its link stops working and every public link of this person stops with it. The person is told it was hidden after a report and can ask for one review. Nothing is deleted.'
          : 'Its link stops working. The owner is told it was hidden after a report and can ask for one review. Nothing is deleted.',
        confirmLabel: 'Hide', confirmVariant: 'danger',
      }
    case 'keep':
      return { title: `Keep this ${what} hidden?`, message: 'The open reports are closed and it stays hidden. The owner can still ask for one review.', confirmLabel: 'Keep hidden', confirmVariant: 'danger' }
    case 'restore':
      return { title: `Restore this ${what}?`, message: 'It becomes visible again and the open reports are closed.', confirmLabel: 'Restore', confirmVariant: 'primary' }
    case 'dismiss':
      return { title: 'Dismiss the reports?', message: 'The open reports are closed and nothing changes for the owner.', confirmLabel: 'Dismiss', confirmVariant: 'primary' }
    case 'answer_restore':
      return { title: `Restore this ${what} and answer the appeal?`, message: 'It becomes visible again and the open reports are closed. This is your final answer.', confirmLabel: 'Restore', confirmVariant: 'primary' }
    default:
      return { title: `Keep this ${what} hidden and answer the appeal?`, message: 'It stays hidden. This is your final answer: the owner cannot appeal again.', confirmLabel: 'Keep hidden', confirmVariant: 'danger' }
  }
}

function failureStatus(error, isOnline) {
  const text = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (/forbidden/.test(text) || error?.code === '42501') return 'forbidden'
  if (!isOnline()) return 'offline'
  return 'error'
}

function callFor(action, row) {
  const base = { p_kind: row.kind, p_id: row.targetId }
  switch (action) {
    case 'hide':
    case 'keep': return ['admin_set_hidden', { ...base, p_hide: true }]
    case 'restore': return ['admin_set_hidden', { ...base, p_hide: false }]
    case 'dismiss': return ['admin_dismiss_reports', base]
    case 'answer_restore': return ['admin_answer_appeal', { ...base, p_restore: true }]
    case 'answer_keep': return ['admin_answer_appeal', { ...base, p_restore: false }]
    default: return null
  }
}

export async function runAction(action, row, { rpc, isOnline, timeLimitMs }) {
  const call = callFor(action, row)
  if (!call) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc(call[0], call[1]), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  return { status: 'ok' }
}

export async function loadReports({ rpc, isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_list_reports'), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  return { status: 'ok', rows: parseReports(res?.data) }
}

export async function loadReportCount({ rpc, isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_report_count'), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  const n = res?.data
  if (!Number.isInteger(n) || n < 0) return { status: 'error' }
  return { status: 'ok', count: n }
}

// One short line per answer, shown after an action that did not work.
export function resultText(status) {
  switch (status) {
    case 'ok': return 'Done.'
    case 'forbidden': return REPORTS_WORDS.forbidden
    case 'offline': return REPORTS_WORDS.offline
    default: return 'Something went wrong. Try again.'
  }
}

// ---- Preview of what was reported (step 14.9c-2) ----

export const PREVIEW_WORDS = {
  button: 'Preview',
  hide: 'Hide preview',
  loading: 'Loading the preview\u2026',
  empty: 'Nothing written here.',
  more: (shown, total) => `Showing the first ${shown} of ${total}`,
}

export function previewStatusText(status) {
  switch (status) {
    case 'forbidden': return REPORTS_WORDS.forbidden
    case 'offline': return REPORTS_WORDS.offline
    case 'gone': return 'This item no longer exists.'
    case 'not_reported': return 'Nothing to preview: no open report.'
    default: return 'Could not load the preview.'
  }
}

// Only text comes out (the screen draws it as plain text, never as markup).
const clean = (v) => (typeof v === 'string' ? v.trim() : '')

function previewItems(rows) {
  if (!Array.isArray(rows)) return []
  const out = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    if (r.row_type === 'drug') {
      const title = clean(r.brand_name)
      if (!title) continue
      const lines = [['Dose', r.dose], ['Note', r.note], ['Drug note', r.drug_note]]
        .map(([label, v]) => (clean(v) ? `${label}: ${clean(v)}` : ''))
        .filter(Boolean)
      out.push({ type: 'drug', title, meta: [clean(r.concentration), clean(r.form)].filter(Boolean).join(' \u00b7 '), lines })
    } else {
      const text = clean(r.content)
      if (text) out.push({ type: 'text', text })
    }
  }
  return out
}

// A well-formed preview, or null.
export function parsePreview(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const base = { kind: data.kind, name: clean(data.name) }
  if (data.kind === 'roshetta') {
    return { ...base, description: clean(data.description), items: previewItems(data.rows), count: num(data.row_count), truncated: data.truncated === true }
  }
  if (data.kind === 'group') {
    const drugs = Array.isArray(data.drugs) ? data.drugs.map(d => clean(d?.name)).filter(Boolean) : []
    return { ...base, description: clean(data.description), drugs, count: num(data.drug_count), truncated: data.truncated === true }
  }
  if (data.kind === 'profile') return { ...base, handle: clean(data.handle) || null, bio: clean(data.bio) }
  return null
}

export async function loadPreview(row, { rpc, isOnline, timeLimitMs }) {
  if (!row || !KINDS.has(row.kind) || typeof row.targetId !== 'string' || !row.targetId) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_report_preview', { p_kind: row.kind, p_id: row.targetId }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    const text = String(res.error.message ?? '')
    if (/not_found/.test(text)) return { status: 'gone' }
    if (/not_reported/.test(text)) return { status: 'not_reported' }
    return { status: failureStatus(res.error, isOnline) }
  }
  const preview = parsePreview(res?.data)
  if (!preview || preview.kind !== row.kind) return { status: 'error' }
  return { status: 'ok', preview }
}
