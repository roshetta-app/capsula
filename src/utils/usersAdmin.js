/**
 * src/utils/usersAdmin.js
 *
 * Track K, step K5c (2026-11-24) — the plain rules and words behind the richer CMS Users panel.
 * No React, no network: the screen passes the rows from the admin-users function in, so the checks
 * (usersAdmin.check.js) run this on its own.
 *
 * A "user" row here is one item of the `list` answer of supabase/functions/admin-users:
 *   { id, email, full_name, tier, pro_plan, pro_end, trial_started_at, last_seen_at, last_sign_in_at,
 *     items_made, waiting_request: { hours_waiting, ... } | null, ... }
 * A history line is one item of the `history` answer of the `detail` action.
 * `now` is passed in so the rules are the same in every check.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export const PAGE_SIZE = 50
export const PRO_ENDING_DAYS = 7     // a paid plan counts as ending soon from 7 days out
export const TRIAL_ENDING_DAYS = 2   // a trial from 2 days out (same as the Business screen)

export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pro', label: 'Pro' },
  { key: 'trial', label: 'Trial' },
  { key: 'ending', label: 'Ending soon' },
  { key: 'waiting', label: 'Waiting request' },
]

export const PLAN_NAMES = {
  free: 'Free',
  trial: 'Trial',
  monthly: 'Pro monthly',
  six_months: 'Pro 6 months',
  yearly: 'Pro yearly',
  lifetime: 'Lifetime',
  by_hand: 'Pro (set by hand)',
}

const REASON_WORDS = {
  not_found: 'payment not found',
  wrong_amount: 'wrong amount',
  wrong_reference: 'code missing or wrong',
  unclear_receipt: 'receipt not clear',
  duplicate: 'receipt already used',
  other: 'no reason shown',
}

function toDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "5 Dec 2026" in Cairo time, or '' when there is no usable date. */
export function dateText(value) {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' })
}

/**
 * Which plan the person is on right now: free, trial, monthly, six_months, yearly, lifetime or by_hand.
 * A timed plan whose end date has passed, or a person whose tier is free, is free (the hourly job
 * switches the tier off, but this never trusts that it already ran). A paid tier with no plan at all
 * is a hand-set test account (decision of K5a): shown as set by hand, never as a real plan.
 */
export function planKey(user, now = new Date()) {
  if (!user || user.tier !== 'paid') return 'free'
  const plan = user.pro_plan
  if (!plan) return 'by_hand'
  if (plan === 'lifetime') return 'lifetime'
  const end = toDate(user.pro_end)
  if (!end || end.getTime() <= now.getTime()) return 'free'
  return plan in PLAN_NAMES ? plan : 'by_hand'
}

export function planName(user, now = new Date()) {
  return PLAN_NAMES[planKey(user, now)]
}

/** The Ends column: the end date for a timed plan or trial; 'No end' for lifetime; '' for free. */
export function endsText(user, now = new Date()) {
  const key = planKey(user, now)
  if (key === 'lifetime') return 'No end'
  if (key === 'free' || key === 'by_hand') return ''
  return dateText(user.pro_end)
}

/** Whole days left on a timed plan or trial (rounded up, at least 1), or null when there is no end. */
export function daysLeft(user, now = new Date()) {
  const key = planKey(user, now)
  if (key === 'free' || key === 'lifetime' || key === 'by_hand') return null
  const end = toDate(user.pro_end)
  if (!end) return null
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
}

function isEnding(user, now) {
  const key = planKey(user, now)
  const left = daysLeft(user, now)
  if (left === null) return false
  return key === 'trial' ? left <= TRIAL_ENDING_DAYS : left <= PRO_ENDING_DAYS
}

function hasWaiting(user) {
  return Boolean(user && user.waiting_request)
}

/** True when the person belongs under the chip. 'pro' means paying (or lifetime or hand-set), not trial. */
export function matchesFilter(user, filterKey, now = new Date()) {
  const key = planKey(user, now)
  switch (filterKey) {
    case 'pro': return key === 'monthly' || key === 'six_months' || key === 'yearly' || key === 'lifetime' || key === 'by_hand'
    case 'trial': return key === 'trial'
    case 'ending': return isEnding(user, now)
    case 'waiting': return hasWaiting(user)
    default: return true
  }
}

/** Search by name or email: case-insensitive, any part of either, blank search matches everyone. */
export function matchesSearch(user, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return true
  return [user?.full_name, user?.email].some(v => typeof v === 'string' && v.toLowerCase().includes(q))
}

/** Chip, then search, keeping the order the rows came in. */
export function filterUsers(users, { filter = 'all', search = '' } = {}, now = new Date()) {
  return (users ?? []).filter(u => matchesFilter(u, filter, now) && matchesSearch(u, search))
}

/** One count per chip, for the small numbers beside the chips. Search is not applied. */
export function filterCounts(users, now = new Date()) {
  const out = {}
  for (const f of FILTERS) out[f.key] = (users ?? []).filter(u => matchesFilter(u, f.key, now)).length
  return out
}

/** Page of rows (1-based). A page past the end is the last page; the answer says which page it really is. */
export function pageOf(rows, page = 1, size = PAGE_SIZE) {
  const total = rows?.length ?? 0
  const pages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pages)
  return { rows: (rows ?? []).slice((current - 1) * size, current * size), page: current, pages, total }
}

function hoursText(h) {
  const n = Number(h)
  if (!Number.isFinite(n)) return ''
  if (n < 1) return 'less than 1 hour'
  if (n < 48) return `${Math.floor(n)} hour${Math.floor(n) === 1 ? '' : 's'}`
  return `${Math.floor(n / 24)} days`
}

/**
 * The Request column. A waiting request wins ("Waiting 5 hours", with a tone for late and overdue:
 * 12 and 24 hours, decision 29). Otherwise "Ends in N days" when the plan is ending soon. Otherwise "None".
 */
export function requestCell(user, now = new Date()) {
  if (hasWaiting(user)) {
    const h = Number(user.waiting_request.hours_waiting)
    const tone = h >= 24 ? 'overdue' : h >= 12 ? 'late' : 'ok'
    const how = hoursText(h)
    return { text: how ? `Waiting ${how}` : 'Waiting', tone }
  }
  if (isEnding(user, now)) {
    const n = daysLeft(user, now)
    return { text: `Ends in ${n} day${n === 1 ? '' : 's'}`, tone: 'ending' }
  }
  return { text: 'None', tone: 'none' }
}

// Whole Cairo calendar day of a date, as a number, so "today" and "yesterday" follow the clock on the wall.
function cairoDay(d) {
  const [y, m, day] = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).split('-').map(Number)
  return Date.UTC(y, m - 1, day) / DAY_MS
}

/** Last seen: the app's own last-use day when there is one, else the last sign-in; plain words. */
export function lastSeenText(user, now = new Date()) {
  const d = toDate(user?.last_seen_at) ?? toDate(user?.last_sign_in_at)
  if (!d) return 'Never'
  const days = cairoDay(now) - cairoDay(d)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 60) return `${days} days ago`
  return dateText(d)
}

export function itemsText(user) {
  const n = Number(user?.items_made)
  return Number.isFinite(n) && n > 0 ? String(n) : '0'
}

/** Trial used or not (the person view). */
export function trialText(user) {
  return user?.trial_started_at ? `Used (started ${dateText(user.trial_started_at)})` : 'Not used'
}

function planWord(plan) {
  return PLAN_NAMES[plan] ?? ''
}

function withReason(text, reason) {
  const r = typeof reason === 'string' ? reason.trim() : ''
  return r ? `${text}. Reason: ${REASON_WORDS[r] ?? r}` : text
}

/**
 * One Pro history line in plain words: { text, when, by }. `when` is a date text, `by` is the name of
 * the admin when the line has one (the database writes it only for things an admin did).
 */
export function historyLine(h) {
  const plan = planWord(h?.plan)
  let text
  switch (h?.event_type) {
    case 'trial_start':
      text = 'Free trial started'
      break
    case 'approved':
      text = `Pro approved${plan ? `: ${plan}` : ''}${h.new_end ? `, until ${dateText(h.new_end)}` : ''}`
      break
    case 'rejected':
      text = withReason('Request not confirmed', h.reason)
      break
    case 'expired':
      text = `${h.plan === 'trial' ? 'Free trial' : 'Pro'} ended`
      break
    case 'days_added': {
      const n = Number(h.days_added)
      const base = `${Number.isFinite(n) ? n : 'Some'} day${n === 1 ? '' : 's'} added${h.new_end ? `, now ends ${dateText(h.new_end)}` : ''}`
      text = h.reason ? `${base}. Reason: ${String(h.reason).trim()}` : base
      break
    }
    case 'backfill':
      text = `Plan recorded when Pro was introduced${plan ? `: ${plan}` : ''}`
      break
    case 'tier_set': {
      const from = h.old_tier === 'paid' ? 'paid' : 'free'
      const to = h.new_tier === 'paid' ? 'paid' : 'free'
      const base = `Tier set by hand: ${from} to ${to}`
      text = h.reason ? `${base}. Reason: ${String(h.reason).trim()}` : base
      break
    }
    default:
      text = 'Pro change'
  }
  return { text, when: dateText(h?.created_at), by: h?.by_name || '' }
}

/** The five states a request can show in the person view. */
export function requestStatusText(request) {
  switch (request?.status) {
    case 'waiting': return 'Waiting'
    case 'approved': return 'Approved'
    case 'rejected': return withReason('Not confirmed', request.reject_reason)
    case 'cancelled': return 'Cancelled by the person'
    default: return ''
  }
}

/** "Pro yearly · 299 EGP" for a request line in the person view. */
export function requestTitle(request) {
  const plan = PLAN_NAMES[request?.plan] ?? 'Pro'
  const amount = Number(request?.amount_egp)
  return Number.isFinite(amount) ? `${plan} \u00b7 ${amount} EGP` : plan
}

/** One request in the person view, in plain words: { title, status, when, receipt, code, by }. */
export function requestLine(request) {
  return {
    title: requestTitle(request),
    status: requestStatusText(request),
    when: dateText(request?.created_at),
    receipt: request?.has_receipt ? 'Receipt attached' : request?.status === 'waiting' ? 'No receipt yet' : '',
    code: request?.reference_code || '',
    by: request?.decided_by_name || '',
  }
}

/** The payment code, or a plain line when the person has never opened the Upgrade page. */
export function referenceText(code) {
  return code ? code : 'Not made yet (they have not opened Upgrade)'
}

/** How many times the person hit a free limit (roshetta or group), in words. */
export function limitHitsText(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return 'Never'
  return v === 1 ? '1 time' : `${v} times`
}

/** Shown when the person view cannot be loaded; the role, tier and ban controls still work. */
export const DETAIL_LOAD_ERROR = 'The Pro details could not be loaded. You can still change role, tier or ban below.'
