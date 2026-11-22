/**
 * src/utils/pageProblemsAdmin.js
 * 2026-11-23 (Track I, step I5): the plain rules and words for the CMS "Page problems" section on the
 * Reports screen (/admin/reports) and its count on the CMS home. These are the reports people send about
 * a Topic page, a brand drug page or a generic drug page (I4). A page report never hides anything: the
 * only actions are Mark fixed and Dismiss, which close the open reports about that page. The database call
 * is handed in, so everything here is checked without a database or a screen (pageProblemsAdmin.check.js).
 * pageProblemsAdminContent.js binds the real one. Only an admin account can run these functions; anyone
 * else gets 'forbidden'.
 *
 * The database facts this relies on (Migration 7, library_page_reports_i2):
 *   admin_list_page_problems()                 one row per page with open reports, dose pages first;
 *                                              also closes reports about a page that no longer exists
 *   admin_page_problem_count()                 how many of those rows there are
 *   admin_resolve_page_problems(kind,id,act)   act 'fixed' or 'dismissed': closes the open reports on that
 *                                              page; written to the audit log by the database itself
 * The list never holds a reporter's id. Notes are the reporters' own words: they are only ever drawn as
 * plain text by the screen, never as markup and never as a link.
 */

import { withTimeLimit } from './roshettaLoad.js'
import { LIBRARY_REASONS, NOTE_MAX, sortReasons, isUrgentReason } from './libraryReportRules.js'

const KINDS = new Set(['topic', 'brand', 'generic'])
const REASON_KEYS = new Set(LIBRARY_REASONS.map(r => r.key))

export const PAGE_KIND_LABELS = { topic: 'Topic', brand: 'Brand', generic: 'Generic' }
export const PAGE_ACTIONS = ['fixed', 'dismissed']

export const PAGE_PROBLEMS_WORDS = {
  title: 'Page problems',
  subtitle: 'Reports about Topic and drug pages. A report never hides a page.',
  empty: 'No page problems',
  emptyLine: 'Problems people report on Topic and drug pages will appear here.',
  loadError: 'Could not load the page problems.',
  forbidden: 'This screen is for admin accounts only.',
  offline: 'You are offline. Reconnect and try again.',
  openPage: 'Open page',
  openEditor: 'Open in editor',
  fixed: 'Mark fixed',
  dismissed: 'Dismiss',
  formulationLink: 'Formulation',
  genericLink: 'Generic',
  notesTitle: 'Newest notes',
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Only well-formed rows, with only the facts the screen needs.
export function parsePageProblems(data) {
  if (!Array.isArray(data)) return []
  const out = []
  for (const r of data) {
    if (!r || typeof r !== 'object') continue
    if (!KINDS.has(r.kind)) continue
    if (typeof r.target_id !== 'string' || !r.target_id) continue
    const reasons = {}
    if (r.reasons && typeof r.reasons === 'object' && !Array.isArray(r.reasons)) {
      for (const [k, c] of Object.entries(r.reasons)) if (REASON_KEYS.has(k) && num(c) > 0) reasons[k] = num(c)
    }
    const notes = []
    if (Array.isArray(r.notes)) {
      for (const n of r.notes) {
        if (!n || typeof n !== 'object' || typeof n.text !== 'string') continue
        // The database already cuts at 300; cut again here so a bad row can never flood the screen.
        const text = Array.from(n.text.trim()).slice(0, NOTE_MAX).join('')
        if (text) notes.push({ at: typeof n.at === 'string' ? n.at : null, text })
      }
    }
    out.push({
      kind: r.kind,
      targetId: r.target_id,
      slug: str(r.slug),
      name: str(r.name),
      genericId: str(r.generic_id),
      genericSlug: str(r.generic_slug),
      genericName: str(r.generic_name),
      formulationId: str(r.formulation_id),
      formulation: str(r.formulation),
      total: num(r.total),
      hasDose: r.has_dose === true || Object.keys(reasons).some(isUrgentReason),
      reasons,
      notes,
    })
  }
  return out
}

// "23 Nov 2026". Day only: the time of a report does not matter on a card.
export function noteWhen(iso) {
  if (typeof iso !== 'string') return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Where the public page lives (same addresses the app uses). Null when the page has no slug.
export function publicPath(row) {
  if (!row.slug) return null
  const s = encodeURIComponent(row.slug)
  if (row.kind === 'topic') return `/conditions/${s}`
  if (row.kind === 'generic') return `/drugs/generic/${s}`
  return `/drugs/${s}`
}

// Where it is fixed in the CMS. A brand opens its generic's editor with the formulation and the brand
// already chosen (the same address the Drugs list uses). Null when the row lacks what the address needs.
export function editorPath(row) {
  const id = encodeURIComponent(row.targetId)
  if (row.kind === 'topic') return `/admin/conditions/${id}`
  if (row.kind === 'generic') return `/admin/drugs/generic/${id}`
  if (!row.genericId || !row.formulationId) return null
  return `/admin/drugs/generic/${encodeURIComponent(row.genericId)}?formulation=${encodeURIComponent(row.formulationId)}&brand=${id}`
}

// A brand page mixes three tables, so the card also links to where its formulation and generic are edited.
export function formulationEditorPath(row) {
  if (row.kind !== 'brand' || !row.genericId || !row.formulationId) return null
  return `/admin/drugs/generic/${encodeURIComponent(row.genericId)}?formulation=${encodeURIComponent(row.formulationId)}`
}

export function genericEditorPath(row) {
  if (row.kind !== 'brand' || !row.genericId) return null
  return `/admin/drugs/generic/${encodeURIComponent(row.genericId)}`
}

// Everything the screen draws for one row.
export function cardView(row) {
  const reasons = sortReasons(Object.keys(row.reasons)).map(key => ({
    key,
    label: LIBRARY_REASONS.find(r => r.key === key).label,
    count: row.reasons[key],
    urgent: isUrgentReason(key),
  }))
  const sub = row.kind === 'brand' ? [row.genericName, row.formulation].filter(Boolean).join(' \u00b7 ') : ''
  return {
    key: `${row.kind}:${row.targetId}`,
    kind: row.kind,
    kindLabel: PAGE_KIND_LABELS[row.kind],
    title: row.name ?? 'Untitled',
    subtitle: sub,
    urgent: row.hasDose,
    reasons,
    countLine: row.total === 0 ? 'No open reports' : plural(row.total, 'open report', 'open reports'),
    notes: row.notes.map(n => ({ when: noteWhen(n.at), text: n.text })),
    openPagePath: publicPath(row),
    editorPath: editorPath(row),
    formulationPath: formulationEditorPath(row),
    genericPath: genericEditorPath(row),
  }
}

// The question asked before an action runs.
export function confirmCopy(action, row) {
  const what = PAGE_KIND_LABELS[row.kind].toLowerCase()
  if (action === 'fixed') {
    return {
      title: 'Mark this page fixed?',
      message: `The open reports about this ${what} page are closed. Nothing changes on the page itself. Anyone can report it again later.`,
      confirmLabel: 'Mark fixed', confirmVariant: 'primary',
    }
  }
  return {
    title: 'Dismiss the reports?',
    message: `The open reports about this ${what} page are closed and nothing changes on the page. Anyone can report it again later.`,
    confirmLabel: 'Dismiss', confirmVariant: 'primary',
  }
}

function failureStatus(error, isOnline) {
  const text = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (/forbidden/.test(text) || error?.code === '42501') return 'forbidden'
  if (!isOnline()) return 'offline'
  return 'error'
}

export async function runPageAction(action, row, { rpc, isOnline, timeLimitMs }) {
  if (!PAGE_ACTIONS.includes(action) || !row || !KINDS.has(row.kind) || !row.targetId) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_resolve_page_problems', { p_kind: row.kind, p_id: row.targetId, p_action: action }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  return { status: 'ok' }
}

export async function loadPageProblems({ rpc, isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_list_page_problems'), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  return { status: 'ok', rows: parsePageProblems(res?.data) }
}

export async function loadPageProblemCount({ rpc, isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_page_problem_count'), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  const n = res?.data
  if (!Number.isInteger(n) || n < 0) return { status: 'error' }
  return { status: 'ok', count: n }
}

// One short line per answer.
export function pageResultText(status) {
  switch (status) {
    case 'ok': return 'Done.'
    case 'forbidden': return PAGE_PROBLEMS_WORDS.forbidden
    case 'offline': return PAGE_PROBLEMS_WORDS.offline
    default: return 'Something went wrong. Try again.'
  }
}
