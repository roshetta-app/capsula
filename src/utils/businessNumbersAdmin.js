/**
 * src/utils/businessNumbersAdmin.js
 *
 * Track K step K4 (2026-11-24) - the plain rules and words behind the CMS Business screen (/admin/business).
 * Pure functions, no React, no network: the screen passes the database answer in, so
 * businessNumbersAdmin.check.js can run this on its own.
 *
 * The database side is Migration 20: admin_business_numbers(p_period) with p_period '7d', '30d' or 'all'.
 * It returns counts and sums only (no names, no emails, no receipts).
 */

export const PERIODS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
]

// Below this many people, a percentage says nothing; the screen shows the plain count only (Track K rule).
export const MIN_PEOPLE_FOR_PERCENT = 20

export const PATH_STEPS = [
  { key: 'signed_up', label: 'Signed up' },
  { key: 'hit_limit', label: 'Hit a limit' },
  { key: 'saw_upgrade', label: 'Saw Upgrade' },
  { key: 'asked', label: 'Asked (tapped I paid)' },
  { key: 'approved', label: 'Approved' },
]

function whole(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

function amount(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Turns the database answer into the full shape the screen reads. A missing or odd value becomes 0,
 * so a new business shows zeros and never a blank. Returns null when there is no answer at all.
 */
export function normalizeNumbers(raw) {
  if (!raw || typeof raw !== 'object') return null
  const h = raw.headline ?? {}
  const p = raw.path ?? {}
  const n = raw.needs_you ?? {}
  const e = raw.ending_soon ?? {}
  const days = Array.isArray(raw.trials_started_by_day) ? raw.trials_started_by_day : []
  return {
    period: raw.period ?? null,
    generatedAt: raw.generated_at ?? null,
    headline: {
      signups: whole(h.signups),
      activePro: whole(h.active_pro),
      lifetime: whole(h.lifetime),
      onTrial: whole(h.on_trial),
      incomeEgp: amount(h.income_egp),
    },
    path: {
      signed_up: whole(p.signed_up),
      hit_limit: whole(p.hit_limit),
      saw_upgrade: whole(p.saw_upgrade),
      asked: whole(p.asked),
      approved: whole(p.approved),
    },
    needsYou: {
      waitingOver12: whole(n.waiting_over_12h),
      waitingOver24: whole(n.waiting_over_24h),
      openReports: whole(n.open_reports),
    },
    endingSoon: {
      pro7: whole(e.pro_7d),
      pro1: whole(e.pro_1d),
      trials2: whole(e.trials_2d),
    },
    trialsByDay: days.map(d => ({ day: String(d?.day ?? ''), count: whole(d?.count) })).filter(d => d.day),
  }
}

/** True when the box is a red-edge "needs you" item. */
export function needsAttention(count) {
  return whole(count) > 0
}

/**
 * The small note under a path box: the share of the box before, as a whole percent.
 * Only when the box before has at least 20 people AND this box is not larger than it
 * (the boxes count different people in the same period, so a bigger box would give a number over 100 that means nothing).
 * Otherwise empty: the plain count stands alone.
 */
export function pathPercent(previousCount, count) {
  const before = whole(previousCount)
  const now = whole(count)
  if (before < MIN_PEOPLE_FOR_PERCENT) return ''
  if (now > before) return ''
  return `${Math.round((now / before) * 100)}% of the box before`
}

export function formatCount(value) {
  return whole(value).toLocaleString('en-US')
}

export function formatEgp(value) {
  const n = amount(value)
  const text = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${text} EGP`
}

export function periodLabel(key) {
  return PERIODS.find(p => p.key === key)?.label ?? ''
}

/** The rows of the CSV file: a header, then one row per number. Same words as the screen. */
export function buildCsvRows(numbers) {
  if (!numbers) return []
  const label = periodLabel(numbers.period)
  const rows = [['Block', 'Number', 'Value', 'Period']]
  const add = (block, name, value, period) => rows.push([block, name, value, period])
  add('Headline', 'New sign-ups', numbers.headline.signups, label)
  add('Headline', 'Active Pro (paid plans, now)', numbers.headline.activePro, 'now')
  add('Headline', 'Lifetime accounts (not counted above)', numbers.headline.lifetime, 'now')
  add('Headline', 'On trial now', numbers.headline.onTrial, 'now')
  add('Headline', 'Income (EGP, approved payments)', numbers.headline.incomeEgp, label)
  for (const step of PATH_STEPS) add('Path to Pro', step.label, numbers.path[step.key], label)
  add('Needs you now', 'Requests waiting over 12 hours', numbers.needsYou.waitingOver12, 'now')
  add('Needs you now', 'Requests waiting over 24 hours', numbers.needsYou.waitingOver24, 'now')
  add('Needs you now', 'Open reports', numbers.needsYou.openReports, 'now')
  add('Ending soon', 'Pro ending in 7 days', numbers.endingSoon.pro7, 'now')
  add('Ending soon', 'Pro ending in 1 day', numbers.endingSoon.pro1, 'now')
  add('Ending soon', 'Trials ending in 2 days', numbers.endingSoon.trials2, 'now')
  for (const d of numbers.trialsByDay) add('Trials started per day', d.day, d.count, 'last 14 days')
  return rows
}

/** Rows to CSV text; every value in quotes, quotes doubled (same as the Analytics export). */
export function csvText(rows) {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function csvFileName(period) {
  return `capsula-business-${period === '7d' || period === '30d' || period === 'all' ? period : 'numbers'}.csv`
}

/** Plain words for a failed load. */
export function loadErrorText(error) {
  const text = String(error?.message ?? error ?? '')
  if (text.includes('forbidden')) return 'Only an admin account can see these numbers.'
  return 'Could not load the numbers. Check the connection and press Refresh.'
}
