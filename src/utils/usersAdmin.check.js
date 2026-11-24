import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAGE_SIZE, FILTERS, planKey, planName, endsText, daysLeft, matchesFilter, matchesSearch, filterUsers,
  filterCounts, pageOf, requestCell, lastSeenText, itemsText, trialText, historyLine, requestStatusText,
  requestTitle, requestLine, referenceText, limitHitsText, DETAIL_LOAD_ERROR,
  ADD_DAYS_MAX, canAddDays, validateAddDays, addDaysConfirmText, addDaysErrorText, addDaysDoneText,
  SET_PLAN_OPTIONS, canSetPlan, validateSetPlan, setPlanNewEnd, setPlanConfirmText, setPlanErrorText, setPlanDoneText,
  canStartTrial, startTrialConfirmText, startTrialErrorText, startTrialDoneText,
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

test('a request line reads in plain words with plan, amount, status, date, receipt, code and who decided', () => {
  const r = { plan: 'yearly', amount_egp: 299, status: 'approved', created_at: '2026-11-20T10:00:00Z', has_receipt: true, reference_code: 'CAP-7K4Q', decided_by_name: 'Owner' }
  assert.deepEqual(requestLine(r), { title: 'Pro yearly \u00b7 299 EGP', status: 'Approved', when: '20 Nov 2026', receipt: 'Receipt attached', code: 'CAP-7K4Q', by: 'Owner' })
  assert.equal(requestLine({ plan: 'monthly', amount_egp: 49, status: 'waiting', has_receipt: false }).receipt, 'No receipt yet')
  assert.equal(requestLine({ plan: 'monthly', amount_egp: 49, status: 'rejected', reject_reason: 'wrong_amount', has_receipt: false }).receipt, '')
  assert.equal(requestLine({ plan: 'monthly', amount_egp: 49, status: 'rejected', reject_reason: 'wrong_amount' }).status, 'Not confirmed. Reason: wrong amount')
  assert.equal(requestTitle({}), 'Pro')
  assert.equal(requestTitle({ plan: 'six_months', amount_egp: 199 }), 'Pro 6 months \u00b7 199 EGP')
  assert.deepEqual(requestLine(null), { title: 'Pro', status: '', when: '', receipt: '', code: '', by: '' })
})

test('reference code, limit hits and the load-error line', () => {
  assert.equal(referenceText('CAP-7K4Q'), 'CAP-7K4Q')
  assert.match(referenceText(null), /Not made yet/)
  assert.equal(limitHitsText(0), 'Never')
  assert.equal(limitHitsText(undefined), 'Never')
  assert.equal(limitHitsText(1), '1 time')
  assert.equal(limitHitsText(7), '7 times')
  assert.match(DETAIL_LOAD_ERROR, /role, tier or ban/)
})

test('Add days is allowed only on a running Pro or trial, with a plain reason otherwise', () => {
  assert.deepEqual(canAddDays(paid('monthly', 5), NOW), { allowed: true, why: '' })
  assert.equal(canAddDays(paid('trial', 1), NOW).allowed, true)
  assert.match(canAddDays(paid('lifetime', null), NOW).why, /no end date/)
  assert.equal(canAddDays(paid('lifetime', null), NOW).allowed, false)
  assert.match(canAddDays(person(), NOW).why, /running/)
  assert.equal(canAddDays(paid('monthly', -1), NOW).allowed, false)
  assert.equal(canAddDays(person({ tier: 'paid' }), NOW).allowed, false)
  assert.equal(canAddDays(null, NOW).allowed, false)
})

test('days must be a whole number from 1 to 366 and a reason is required (trimmed, at most 500)', () => {
  assert.equal(ADD_DAYS_MAX, 366)
  assert.deepEqual(validateAddDays('7', ' late approval '), { ok: true, days: 7, reason: 'late approval' })
  assert.deepEqual(validateAddDays(366, 'x'), { ok: true, days: 366, reason: 'x' })
  assert.deepEqual(validateAddDays(1, 'x'), { ok: true, days: 1, reason: 'x' })
  for (const bad of ['', '  ', '0', '-3', '367', '1.5', 'abc', null, undefined, '1e2']) {
    assert.equal(validateAddDays(bad, 'x').ok, false, `days ${bad}`)
  }
  assert.match(validateAddDays('7', '').error, /reason/)
  assert.match(validateAddDays('7', '   ').error, /reason/)
  assert.match(validateAddDays('7', undefined).error, /reason/)
  assert.equal(validateAddDays('7', 'a'.repeat(500)).ok, true)
  assert.equal(validateAddDays('7', 'a'.repeat(501)).ok, false)
  assert.match(validateAddDays('0', 'x').error, /1 to 366/)
})

test('the confirm question names days, plan, old end and new end', () => {
  const u = { ...paid('yearly', 10), pro_end: '2026-12-04T12:00:00Z' }
  assert.equal(addDaysConfirmText(u, 7, NOW), 'Add 7 days to Pro yearly? It now ends 4 Dec 2026 and will end 11 Dec 2026.')
  assert.match(addDaysConfirmText(u, 1, NOW), /^Add 1 day to /)
  assert.equal(addDaysConfirmText(person(), 7, NOW), '')
  assert.equal(addDaysConfirmText(u, 'x', NOW), '')
})

test('each answer of the database function has plain words, and anything else says nothing was changed', () => {
  assert.match(addDaysErrorText('forbidden'), /admin/)
  assert.match(addDaysErrorText('bad_days'), /1 to 366/)
  assert.match(addDaysErrorText('no_such_user'), /no longer exists/)
  assert.match(addDaysErrorText('lifetime_has_no_end'), /Lifetime/)
  assert.match(addDaysErrorText('not_running'), /Nothing was added/)
  assert.match(addDaysErrorText('some odd failure'), /Nothing was changed/)
  assert.match(addDaysErrorText(undefined), /Nothing was changed/)
  assert.equal(addDaysDoneText(7, '2026-12-11T12:00:00Z'), '7 days added. Pro now ends 11 Dec 2026.')
  assert.equal(addDaysDoneText(1, '2026-12-11T12:00:00Z'), '1 day added. Pro now ends 11 Dec 2026.')
})

// ─── K7: set plan and start trial ───

test('the four plans can be set; the choice and the reason are both required', () => {
  assert.deepEqual(SET_PLAN_OPTIONS.map(o => o.key), ['monthly', 'six_months', 'yearly', 'lifetime'])
  assert.deepEqual(validateSetPlan('yearly', ' gift '), { ok: true, plan: 'yearly', reason: 'gift' })
  for (const bad of ['', 'trial', 'weekly', null, undefined]) assert.equal(validateSetPlan(bad, 'x').ok, false, `plan ${bad}`)
  assert.match(validateSetPlan('', 'x').error, /Choose a plan/)
  assert.match(validateSetPlan('yearly', '').error, /reason/)
  assert.match(validateSetPlan('yearly', '   ').error, /reason/)
  assert.equal(validateSetPlan('yearly', 'a'.repeat(500)).ok, true)
  assert.equal(validateSetPlan('yearly', 'a'.repeat(501)).ok, false)
})

test('a Lifetime person cannot be changed; everyone else can be given a plan', () => {
  assert.equal(canSetPlan(paid('lifetime', null), NOW).allowed, false)
  assert.match(canSetPlan(paid('lifetime', null), NOW).why, /already Lifetime/)
  assert.equal(canSetPlan(person(), NOW).allowed, true)
  assert.equal(canSetPlan(paid('monthly', 10), NOW).allowed, true)
  assert.equal(canSetPlan(paid('trial', 3), NOW).allowed, true)
  assert.equal(canSetPlan(person({ tier: 'paid' }), NOW).allowed, true)
  assert.equal(canSetPlan(null, NOW).allowed, false)
})

test('new end date: from today when nothing runs, after the current end when a plan or trial runs', () => {
  assert.equal(setPlanNewEnd(person(), 'yearly', NOW).toISOString(), '2027-11-24T12:00:00.000Z')
  assert.equal(setPlanNewEnd(person(), 'monthly', NOW).toISOString(), '2026-12-24T12:00:00.000Z')
  assert.equal(setPlanNewEnd(person(), 'six_months', NOW).toISOString(), '2027-05-24T12:00:00.000Z')
  const running = { ...paid('monthly', 20), pro_end: '2026-12-14T12:00:00Z' }
  assert.equal(setPlanNewEnd(running, 'yearly', NOW).toISOString(), '2027-12-14T12:00:00.000Z')
  const trial = { ...paid('trial', 2), pro_end: '2026-11-26T12:00:00Z' }
  assert.equal(setPlanNewEnd(trial, 'monthly', NOW).toISOString(), '2026-12-26T12:00:00.000Z')
  // an ended plan, a free tier with an old date and a hand-set tier all start today
  assert.equal(setPlanNewEnd(paid('monthly', -5), 'monthly', NOW).toISOString(), '2026-12-24T12:00:00.000Z')
  assert.equal(setPlanNewEnd(person({ tier: 'free', pro_plan: 'yearly', pro_end: inDays(100) }), 'monthly', NOW).toISOString(), '2026-12-24T12:00:00.000Z')
  assert.equal(setPlanNewEnd(person({ tier: 'paid' }), 'monthly', NOW).toISOString(), '2026-12-24T12:00:00.000Z')
  assert.equal(setPlanNewEnd(person(), 'lifetime', NOW), null)
})

test('months are added like the database: a short month ends on its last day, the time of day is kept', () => {
  const jan31 = new Date('2027-01-31T08:30:00Z')
  assert.equal(setPlanNewEnd(person(), 'monthly', jan31).toISOString(), '2027-02-28T08:30:00.000Z')
  const leap = new Date('2027-08-31T08:30:00Z')
  assert.equal(setPlanNewEnd(person(), 'six_months', leap).toISOString(), '2028-02-29T08:30:00.000Z')
  const feb29 = new Date('2028-02-29T10:00:00Z')
  assert.equal(setPlanNewEnd(person(), 'yearly', feb29).toISOString(), '2029-02-28T10:00:00.000Z')
})

test('the plan question says starting today or added after the current end, and what Lifetime means', () => {
  assert.equal(setPlanConfirmText(person(), 'yearly', NOW), 'Give Pro yearly starting today? It will end 24 Nov 2027.')
  const running = { ...paid('monthly', 20), pro_end: '2026-12-14T12:00:00Z' }
  assert.equal(
    setPlanConfirmText(running, 'yearly', NOW),
    'Give Pro yearly? The current plan (Pro monthly) ends 14 Dec 2026. The new plan is added after it, so this person will be on Pro yearly until 14 Dec 2027.',
  )
  assert.match(setPlanConfirmText(paid('trial', 3), 'monthly', NOW), /current plan \(Trial\)/)
  assert.match(setPlanConfirmText(person(), 'lifetime', NOW), /no end date and cannot be changed/)
  assert.doesNotMatch(setPlanConfirmText(person(), 'lifetime', NOW), /replaced/)
  assert.match(setPlanConfirmText(running, 'lifetime', NOW), /Pro monthly, ends 14 Dec 2026\) is replaced/)
  assert.equal(setPlanConfirmText(person(), 'weekly', NOW), '')
})

test('each answer of admin_set_pro has plain words; success lines name the plan and the end', () => {
  assert.match(setPlanErrorText('forbidden'), /admin/)
  assert.match(setPlanErrorText('bad_plan'), /listed plans/)
  assert.match(setPlanErrorText('no_such_user'), /no longer exists/)
  assert.match(setPlanErrorText('already_lifetime'), /already Lifetime/)
  assert.match(setPlanErrorText('odd'), /Nothing was changed/)
  assert.match(setPlanErrorText(undefined), /Nothing was changed/)
  assert.equal(setPlanDoneText('yearly', '2027-11-24T12:00:00Z'), 'Pro yearly set. It now ends 24 Nov 2027.')
  assert.equal(setPlanDoneText('lifetime', null), 'Lifetime set. It has no end date.')
})

test('the trial can start only for a Free person who never had one', () => {
  assert.equal(canStartTrial(person()).allowed, true)
  assert.equal(canStartTrial(person({ trial_started_at: '2026-10-01T00:00:00Z' })).allowed, false)
  assert.match(canStartTrial(person({ trial_started_at: '2026-10-01T00:00:00Z' })).why, /already used/)
  assert.equal(canStartTrial(paid('monthly', 10)).allowed, false)
  assert.match(canStartTrial(paid('monthly', 10)).why, /already on Pro/)
  assert.equal(canStartTrial(person({ tier: 'paid' })).allowed, false)
  assert.equal(canStartTrial(null).allowed, false)
})

test('the trial question and answers are in plain words', () => {
  assert.equal(startTrialConfirmText(NOW), 'Start a 7-day free trial now? It will end 1 Dec 2026.')
  assert.match(startTrialErrorText('forbidden'), /admin/)
  assert.match(startTrialErrorText('no_such_user'), /no longer exists/)
  assert.match(startTrialErrorText('trial_already_used'), /already used/)
  assert.match(startTrialErrorText('already_pro'), /already on Pro/)
  assert.match(startTrialErrorText('odd'), /Nothing was changed/)
  assert.equal(startTrialDoneText('2026-12-01T12:00:00Z'), 'Trial started. It ends 1 Dec 2026.')
})
