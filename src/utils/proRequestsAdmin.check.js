import test from 'node:test'
import assert from 'node:assert/strict'
import { waitTone, waitText, approveCopy, rejectCopy, errorText, REJECT_REASONS, STATUS_TABS } from './proRequestsAdmin.js'

test('waiting requests turn late at 12 hours and overdue at 24 (decision 29)', () => {
  assert.equal(waitTone('waiting', 0), 'ok')
  assert.equal(waitTone('waiting', 11.9), 'ok')
  assert.equal(waitTone('waiting', 12), 'late')
  assert.equal(waitTone('waiting', 23.9), 'late')
  assert.equal(waitTone('waiting', 24), 'overdue')
  assert.equal(waitTone('waiting', null), 'ok')
  assert.equal(waitTone('approved', 50), 'none')
})

test('wait text is plain words', () => {
  assert.equal(waitText(0.4), 'less than 1 hour')
  assert.equal(waitText(1.2), '1 hour')
  assert.equal(waitText(13.7), '13 hours')
  assert.equal(waitText(50), '2 days')
  assert.equal(waitText(undefined), '')
})

test('the six reject reasons match the database list exactly', () => {
  assert.deepEqual(REJECT_REASONS.map(r => r.key), ['not_found', 'wrong_amount', 'wrong_reference', 'unclear_receipt', 'duplicate', 'other'])
  assert.deepEqual(STATUS_TABS.map(t => t.key), ['waiting', 'approved', 'rejected', 'cancelled'])
})

test('the approve question says what to check first and names the amount, number end and code', () => {
  const c = approveCopy({ amount_egp: 299, sender_last4: '1234', reference_code: 'CAP-7K4Q', plan: 'yearly', full_name: 'Sara' })
  assert.match(c.message, /299 EGP/)
  assert.match(c.message, /ending 1234/)
  assert.match(c.message, /CAP-7K4Q/)
  assert.match(c.message, /not proof/)
  assert.match(c.message, /Sara/)
  assert.match(approveCopy({ amount_egp: 49, sender_last4: '0000', reference_code: 'CAP-AAAA', plan: 'monthly', full_name: null }).message, /this person/)
})

test('the reject question names the reason and promises no refund or deletion', () => {
  const c = rejectCopy({}, 'wrong_amount')
  assert.match(c.message, /Wrong amount/)
  assert.match(c.message, /new request/)
})

test('database errors become plain words', () => {
  assert.match(errorText({ message: 'not_waiting' }), /already decided/)
  assert.match(errorText({ message: 'no_person' }), /deleted their account/)
  assert.match(errorText({ message: 'forbidden' }), /admin/)
  assert.match(errorText(new Error('boom')), /Something went wrong/)
})
