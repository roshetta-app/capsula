import test from 'node:test'
import assert from 'node:assert/strict'
import { proStatusLabel } from './proStatusLabel.js'

const now = new Date('2026-11-24T10:00:00Z')

test('lifetime, no plan or no end date: plain plan, not tappable', () => {
  assert.deepEqual(proStatusLabel({ pro_plan: 'lifetime', pro_end: null }, now), { text: 'plan', tappable: false })
  assert.deepEqual(proStatusLabel(null, now), { text: 'plan', tappable: false })
  assert.deepEqual(proStatusLabel({ pro_plan: 'yearly', pro_end: null }, now), { text: 'plan', tappable: false })
  assert.deepEqual(proStatusLabel({ pro_plan: 'yearly', pro_end: 'nonsense' }, now), { text: 'plan', tappable: false })
})

test('trial counts days left, rounding up, never below 1', () => {
  assert.equal(proStatusLabel({ pro_plan: 'trial', pro_end: '2026-12-01T10:00:00Z' }, now).text, 'free trial \u00b7 7 days left')
  assert.equal(proStatusLabel({ pro_plan: 'trial', pro_end: '2026-11-25T09:00:00Z' }, now).text, 'free trial \u00b7 1 day left')
  assert.equal(proStatusLabel({ pro_plan: 'trial', pro_end: '2026-11-24T10:30:00Z' }, now).text, 'free trial \u00b7 1 day left')
  assert.equal(proStatusLabel({ pro_plan: 'trial', pro_end: '2026-11-27T12:00:00Z' }, now).tappable, true)
})

test('paid plans show the end date and can be renewed', () => {
  const r = proStatusLabel({ pro_plan: 'yearly', pro_end: '2027-11-23T12:00:00Z' }, now)
  assert.equal(r.text, 'plan \u00b7 until 23 Nov 2027')
  assert.equal(r.tappable, true)
})
