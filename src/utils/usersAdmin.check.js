import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAGE_SIZE, FILTERS, planKey, planName, endsText, daysLeft, matchesFilter, matchesSearch, filterUsers,
  filterCounts, pageOf, requestCell, lastSeenText, itemsText, trialText, historyLine, requestStatusText,
} from './usersAdmin.js'

const NOW = new Date('2026-11-24T12:00:00Z')
const inDays = n => new Date(NOW.getTime() + n * 86400000).toISOString()
const person = (o = {}) => ({ id: 'x', email: 'x@x.com', full_name: 'X', tier: 'free', pro_plan: null, pro_end: null, waiting_request: null, ...o })
const paid = (plan, days) => person({ tier: 'paid', pro_plan: plan, pro_end: days === null ? null : inDays(days) })

test('plan names: Free, Trial, Pro monthly, Pro 6 months, Pro yearly, Lifetime', () => {
  assert.equal(planName(person(), NOW), 'Free')
  assert.equal(planName(paid('trial', 5), NOW), 'Trial')
  assert.equal(planName(paid('monthly', 20), NOW), 'Pro monthly')
  assert.equal(planName(paid('six_months', 100), NOW), 'Pro 6 months')
  assert.equal(planName(paid('yearly', 300), NOW), 'Pro yearly')
  assert.equal(planName(paid('lifetime', null), NOW), 'Lifetime')
})

test('an ended plan, a free tier with an old plan, and a hand-set tier are told apart', () => {
  assert.equal(planKey(paid('monthly', -1), NOW), 'free')
  assert.equal(planKey(paid('trial', -3), NOW), 'free')
  assert.equal(planKey(person({ tier: 'free', pro_plan: 'yearly', pro_end: inDays(100) }), NOW), 'free')
  assert.equal(planKey(person({ tier: 'paid' }), NOW), 'by_hand')
  assert.equal(planKey(person({ tier: 'paid', pro_plan: 'monthly', pro_end: null }), NOW), 'free')
  assert.equal(planKey(null, NOW), 'free')
})

test('the Ends column and days left', () => {
  assert.equal(endsText(paid('lifetime', null), NOW), 'No end')
  assert.equal(endsText(person(), NOW), '')
  assert.equal(endsText(person({ tier: 'paid' }), NOW), '')
  assert.equal(endsText(paid('monthly', 10), NOW), '4 Dec 2026')
  assert.equal(daysLeft(paid('monthly', 10), NOW), 10)
  assert.equal(daysLeft(paid('monthly', 0.2), NOW), 1)
  assert.equal(daysLeft(paid('lifetime', null), NOW), null)
  assert.equal(daysLeft(person(), NOW), null)
})

test('filters: Pro is paying, Trial is trial, Ending soon is 7 days for Pro and 2 for a trial, Waiting is a waiting request', () => {
  const free = person(), trial5 = paid('trial', 5), trial2 = paid('trial', 2), monthly7 = paid('monthly', 7), monthly8 = paid('monthly', 8)
  const life = paid('lifetime', null), waiting = person({ waiting_request: { hours_waiting: 3 } }), hand = person({ tier: 'paid' })
  assert.deepEqual([free, trial5, monthly7, life, hand].map(u => matchesFilter(u, 'pro', NOW)), [false, false, true, true, true])
  assert.deepEqual([free, trial5, trial2, monthly7].map(u => matchesFilter(u, 'trial', NOW)), [false, true, true, false])
  assert.deepEqual([trial5, trial2, monthly7, monthly8, life, free].map(u => matchesFilter(u, 'ending', NOW)), [false, true, true, false, false, false])
  assert.deepEqual([free, waiting].map(u => matchesFilter(u, 'waiting', NOW)), [false, true])
  assert.equal(matchesFilter(free, 'all', NOW), true)
  assert.deepEqual(FILTERS.map(f => f.key), ['all', 'pro', 'trial', 'ending', 'waiting'])
  assert.deepEqual(FILTERS.map(f => f.label), ['All', 'Pro', 'Trial', 'Ending soon', 'Waiting request'])
})

test('an ended plan is in no Pro, Trial or Ending soon list', () => {
  const ended = paid('monthly', -2)
  assert.equal(matchesFilter(ended, 'pro', NOW), false)
  assert.equal(matchesFilter(ended, 'ending', NOW), false)
})

test('search by name or email, any part, any case; blank matches everyone; missing fields do not crash', () => {
  const u = person({ full_name: 'Sara Hassan', email: 'sara.h@mail.com' })
  assert.equal(matchesSearch(u, 'sara'), true)
  assert.equal(matchesSearch(u, '  HASSAN '), true)
  assert.equal(matchesSearch(u, '@mail'), true)
  assert.equal(matchesSearch(u, 'omar'), false)
  assert.equal(matchesSearch(u, ''), true)
  assert.equal(matchesSearch(u, undefined), true)
  assert.equal(matchesSearch(person({ full_name: null, email: null }), 'a'), false)
})

test('filter and search work together and keep the order; counts ignore search', () => {
  const list = [{ ...paid('yearly', 200), id: '1', full_name: 'Amal' }, person({ id: '2', full_name: 'Amal B' }), { ...paid('yearly', 200), id: '3', full_name: 'Zed' }]
  assert.deepEqual(filterUsers(list, { filter: 'pro', search: 'amal' }, NOW).map(u => u.id), ['1'])
  assert.deepEqual(filterUsers(list, { filter: 'all', search: 'amal' }, NOW).map(u => u.id), ['1', '2'])
  assert.deepEqual(filterUsers(null, {}, NOW), [])
  assert.deepEqual(filterCounts(list, NOW), { all: 3, pro: 2, trial: 0, ending: 0, waiting: 0 })
})

test('paging is 50 per page and a page outside the range becomes the nearest real page', () => {
  const rows = Array.from({ length: 120 }, (_, i) => i)
  assert.equal(PAGE_SIZE, 50)
  assert.deepEqual([pageOf(rows, 1).rows.length, pageOf(rows, 2).rows.length, pageOf(rows, 3).rows.length], [50, 50, 20])
  assert.equal(pageOf(rows, 9).page, 3)
  assert.equal(pageOf(rows, 0).page, 1)
  assert.equal(pageOf(rows, 'x').page, 1)
  assert.deepEqual(pageOf(rows, 1), { rows: rows.slice(0, 50), page: 1, pages: 3, total: 120 })
  assert.deepEqual(pageOf([], 4), { rows: [], page: 1, pages: 1, total: 0 })
  assert.equal(pageOf(Array.from({ length: 50 }, (_, i) => i), 1).pages, 1)
})

test('the Request column: None, Waiting with the hours, Ends in N days; waiting wins', () => {
  assert.deepEqual(requestCell(person(), NOW), { text: 'None', tone: 'none' })
  assert.deepEqual(requestCell(person({ waiting_request: { hours_waiting: 5 } }), NOW), { text: 'Waiting 5 hours', tone: 'ok' })
  assert.deepEqual(requestCell(person({ waiting_request: { hours_waiting: 1 } }), NOW), { text: 'Waiting 1 hour', tone: 'ok' })
  assert.deepEqual(requestCell(person({ waiting_request: { hours_waiting: 0 } }), NOW), { text: 'Waiting less than 1 hour', tone: 'ok' })
  assert.equal(requestCell(person({ waiting_request: { hours_waiting: 12 } }), NOW).tone, 'late')
  assert.equal(requestCell(person({ waiting_request: { hours_waiting: 24 } }), NOW).tone, 'overdue')
  assert.equal(requestCell(person({ waiting_request: { hours_waiting: 50 } }), NOW).text, 'Waiting 2 days')
  assert.deepEqual(requestCell(paid('monthly', 3), NOW), { text: 'Ends in 3 days', tone: 'ending' })
  assert.equal(requestCell(paid('trial', 1), NOW).text, 'Ends in 1 day')
  assert.equal(requestCell({ ...paid('monthly', 3), waiting_request: { hours_waiting: 2 } }, NOW).text, 'Waiting 2 hours')
  assert.equal(requestCell(paid('yearly', 200), NOW).text, 'None')
})

test('last seen: Today, Yesterday, N days ago, a date after 60 days, Never; the app day wins over the sign-in day', () => {
  assert.equal(lastSeenText({ last_seen_at: NOW.toISOString() }, NOW), 'Today')
  assert.equal(lastSeenText({ last_seen_at: inDays(-1) }, NOW), 'Yesterday')
  assert.equal(lastSeenText({ last_seen_at: inDays(-5) }, NOW), '5 days ago')
  assert.equal(lastSeenText({ last_seen_at: inDays(-90) }, NOW), '26 Aug 2026')
  assert.equal(lastSeenText({}, NOW), 'Never')
  assert.equal(lastSeenText({ last_seen_at: 'junk' }, NOW), 'Never')
  assert.equal(lastSeenText({ last_seen_at: inDays(-5), last_sign_in_at: inDays(0) }, NOW), '5 days ago')
  assert.equal(lastSeenText({ last_seen_at: null, last_sign_in_at: inDays(-2) }, NOW), '2 days ago')
  assert.equal(lastSeenText({ last_seen_at: inDays(1) }, NOW), 'Today')
  // 23:30 Cairo the day before is "Yesterday" even though it is under 24 hours ago
  assert.equal(lastSeenText({ last_seen_at: '2026-11-23T21:30:00Z' }, new Date('2026-11-24T05:00:00Z')), 'Yesterday')
})

test('items and trial wording', () => {
  assert.equal(itemsText({ items_made: 12 }), '12')
  assert.equal(itemsText({}), '0')
  assert.equal(itemsText({ items_made: 'x' }), '0')
  assert.equal(trialText({ trial_started_at: '2026-11-20T10:00:00Z' }), 'Used (started 20 Nov 2026)')
  assert.equal(trialText({ trial_started_at: null }), 'Not used')
})

test('every history type reads in plain words, with who and when', () => {
  const at = '2026-11-24T10:00:00Z'
  assert.deepEqual(historyLine({ event_type: 'trial_start', created_at: at }), { text: 'Free trial started', when: '24 Nov 2026', by: '' })
  assert.equal(historyLine({ event_type: 'approved', plan: 'yearly', new_end: '2027-11-24T10:00:00Z', created_at: at, by_name: 'Owner' }).text, 'Pro approved: Pro yearly, until 24 Nov 2027')
  assert.equal(historyLine({ event_type: 'approved', plan: 'yearly', created_at: at, by_name: 'Owner' }).by, 'Owner')
  assert.equal(historyLine({ event_type: 'rejected', reason: 'wrong_amount', created_at: at }).text, 'Request not confirmed. Reason: wrong amount')
  assert.equal(historyLine({ event_type: 'rejected', created_at: at }).text, 'Request not confirmed')
  assert.equal(historyLine({ event_type: 'expired', plan: 'trial', created_at: at }).text, 'Free trial ended')
  assert.equal(historyLine({ event_type: 'expired', plan: 'monthly', created_at: at }).text, 'Pro ended')
  assert.equal(historyLine({ event_type: 'days_added', days_added: 7, new_end: '2026-12-01T10:00:00Z', reason: ' late approval ', created_at: at }).text, '7 days added, now ends 1 Dec 2026. Reason: late approval')
  assert.equal(historyLine({ event_type: 'days_added', days_added: 1, created_at: at }).text, '1 day added')
  assert.equal(historyLine({ event_type: 'backfill', plan: 'lifetime', created_at: at }).text, 'Plan recorded when Pro was introduced: Lifetime')
  assert.equal(historyLine({ event_type: 'backfill', created_at: at }).text, 'Plan recorded when Pro was introduced')
  assert.equal(historyLine({ event_type: 'tier_set', old_tier: 'free', new_tier: 'paid', reason: 'test account', created_at: at, by_name: 'Owner' }).text, 'Tier set by hand: free to paid. Reason: test account')
  assert.equal(historyLine({ event_type: 'tier_set', old_tier: 'paid', new_tier: 'free', created_at: at }).text, 'Tier set by hand: paid to free')
  assert.equal(historyLine({ event_type: 'something_new', created_at: at }).text, 'Pro change')
  assert.equal(historyLine(null).when, '')
})

test('request status words', () => {
  assert.equal(requestStatusText({ status: 'waiting' }), 'Waiting')
  assert.equal(requestStatusText({ status: 'approved' }), 'Approved')
  assert.equal(requestStatusText({ status: 'rejected', reject_reason: 'duplicate' }), 'Not confirmed. Reason: receipt already used')
  assert.equal(requestStatusText({ status: 'cancelled' }), 'Cancelled by the person')
  assert.equal(requestStatusText({}), '')
})
