import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PERIODS, PATH_STEPS, MIN_PEOPLE_FOR_PERCENT, normalizeNumbers, needsAttention, pathPercent,
  formatCount, formatEgp, periodLabel, buildCsvRows, csvText, csvFileName, loadErrorText,
} from './businessNumbersAdmin.js'

const sample = {
  period: '30d',
  generated_at: '2026-11-24T13:00:00Z',
  headline: { signups: 3, active_pro: 2, lifetime: 1, on_trial: 4, income_egp: 598 },
  path: { signed_up: 3, hit_limit: 2, saw_upgrade: 2, asked: 1, approved: 1 },
  needs_you: { waiting_over_12h: 1, waiting_over_24h: 0, open_reports: 2 },
  ending_soon: { pro_7d: 1, pro_1d: 0, trials_2d: 2 },
  trials_started_by_day: [{ day: '2026-11-23', count: 1 }, { day: '2026-11-24', count: 2 }],
}

test('the three periods match the database (7d, 30d, all)', () => {
  assert.deepEqual(PERIODS.map(p => p.key), ['7d', '30d', 'all'])
  assert.equal(periodLabel('all'), 'All time')
  assert.equal(periodLabel('nope'), '')
})

test('the five path boxes are in the drawn order and match the database keys', () => {
  assert.deepEqual(PATH_STEPS.map(s => s.key), ['signed_up', 'hit_limit', 'saw_upgrade', 'asked', 'approved'])
})

test('an answer is read into the full shape', () => {
  const n = normalizeNumbers(sample)
  assert.equal(n.headline.signups, 3)
  assert.equal(n.headline.activePro, 2)
  assert.equal(n.headline.lifetime, 1)
  assert.equal(n.headline.onTrial, 4)
  assert.equal(n.headline.incomeEgp, 598)
  assert.equal(n.path.asked, 1)
  assert.equal(n.needsYou.waitingOver12, 1)
  assert.equal(n.endingSoon.trials2, 2)
  assert.equal(n.trialsByDay.length, 2)
})

test('a new business shows zeros, never a blank (empty, partial and odd answers)', () => {
  const empty = normalizeNumbers({})
  assert.equal(empty.headline.signups, 0)
  assert.equal(empty.headline.incomeEgp, 0)
  assert.equal(empty.path.approved, 0)
  assert.equal(empty.needsYou.openReports, 0)
  assert.equal(empty.endingSoon.pro1, 0)
  assert.deepEqual(empty.trialsByDay, [])
  const odd = normalizeNumbers({ headline: { signups: null, active_pro: 'x', income_egp: '12.5' }, path: { hit_limit: -4 } })
  assert.equal(odd.headline.signups, 0)
  assert.equal(odd.headline.activePro, 0)
  assert.equal(odd.headline.incomeEgp, 12.5)
  assert.equal(odd.path.hit_limit, 0)
})

test('no answer at all stays no answer', () => {
  assert.equal(normalizeNumbers(null), null)
  assert.equal(normalizeNumbers(undefined), null)
  assert.equal(normalizeNumbers('text'), null)
})

test('the red edge shows only when something needs you', () => {
  assert.equal(needsAttention(0), false)
  assert.equal(needsAttention(1), true)
  assert.equal(needsAttention(null), false)
})

test('no percentage under 20 people, none when a box is bigger than the one before', () => {
  assert.equal(MIN_PEOPLE_FOR_PERCENT, 20)
  assert.equal(pathPercent(19, 10), '')
  assert.equal(pathPercent(20, 10), '50% of the box before')
  assert.equal(pathPercent(100, 25), '25% of the box before')
  assert.equal(pathPercent(30, 31), '')
  assert.equal(pathPercent(0, 0), '')
})

test('numbers are written in plain form', () => {
  assert.equal(formatCount(1234), '1,234')
  assert.equal(formatCount(null), '0')
  assert.equal(formatEgp(598), '598 EGP')
  assert.equal(formatEgp(0), '0 EGP')
  assert.equal(formatEgp(12.5), '12.50 EGP')
})

test('the CSV has a header and one row per number, with the period named', () => {
  const rows = buildCsvRows(normalizeNumbers(sample))
  assert.deepEqual(rows[0], ['Block', 'Number', 'Value', 'Period'])
  // 5 headline + 5 path + 3 needs you + 3 ending soon + 2 trial days = 18 rows, plus the header
  assert.equal(rows.length, 19)
  assert.deepEqual(rows[1], ['Headline', 'New sign-ups', 3, '30 days'])
  assert.deepEqual(rows[5], ['Headline', 'Income (EGP, approved payments)', 598, '30 days'])
  assert.deepEqual(rows[6], ['Path to Pro', 'Signed up', 3, '30 days'])
  assert.deepEqual(buildCsvRows(null), [])
})

test('the CSV text quotes every value and doubles inner quotes', () => {
  assert.equal(csvText([['a', 'b"c'], [1, null]]), '"a","b""c"\n"1",""')
})

test('the file name carries the period and ignores anything else', () => {
  assert.equal(csvFileName('7d'), 'capsula-business-7d.csv')
  assert.equal(csvFileName('all'), 'capsula-business-all.csv')
  assert.equal(csvFileName('../x'), 'capsula-business-numbers.csv')
})

test('a failed load says it in plain words', () => {
  assert.match(loadErrorText({ message: 'forbidden' }), /admin/)
  assert.match(loadErrorText({ message: 'network down' }), /Refresh/)
  assert.match(loadErrorText(null), /Refresh/)
})
