// Checks for utils/profileTab.js (step 14.7a): which state the Profile tab is in, and its small helpers.
import test from 'node:test'
import assert from 'node:assert/strict'
import { profileTabView, statusForFailure, heroLines, detailsPercent, TAB_WORDS } from './profileTab.js'

const complete = { full_name: 'Omar', occupation: 'Pharmacist', country: 'Egypt', handle: null }
const withHandle = { ...complete, handle: 'omar-rx' }

test('loading comes first: the sign-in is still resolving, or the row is still being read', () => {
  assert.equal(profileTabView({ authLoading: true, signedIn: true, status: 'ready', profile: complete }), 'loading')
  assert.equal(profileTabView({ authLoading: false, signedIn: true, status: 'loading' }), 'loading')
})

test('a guest sees the sign-in card, whatever else is passed', () => {
  assert.equal(profileTabView({ signedIn: false, status: 'ready', profile: withHandle }), 'guest')
  assert.equal(profileTabView({}), 'guest')
})

test('a failed read is offline or error, never a card for a profile that was not read', () => {
  assert.equal(profileTabView({ signedIn: true, status: 'offline' }), 'offline')
  assert.equal(profileTabView({ signedIn: true, status: 'error' }), 'error')
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: null }), 'error')
})

test('one card at a time: details first, then the public card, then ready', () => {
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: { full_name: 'Omar' } }), 'details')
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: complete }), 'public')
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: withHandle }), 'ready')
})

test('a physician with no specialty still gets the details card first', () => {
  const doctor = { ...withHandle, occupation: 'Specialist Physician' }
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: doctor }), 'details')
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: { ...doctor, specialty: 'Cardiology' } }), 'ready')
})

test('done-ness comes from what is filled in: a "dismissed" flag changes nothing', () => {
  const flagged = { ...complete, profile_setup_dismissed: true, handle: null }
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: flagged }), 'public')
  const flaggedEmpty = { profile_setup_dismissed: true }
  assert.equal(profileTabView({ signedIn: true, status: 'ready', profile: flaggedEmpty }), 'details')
})

test('statusForFailure: no connection is offline, anything else is error, success is ready', () => {
  assert.equal(statusForFailure({ ok: true }), 'ready')
  assert.equal(statusForFailure({ ok: false, kind: 'retry', code: 'offline' }), 'offline')
  assert.equal(statusForFailure({ ok: false, kind: 'retry', code: 'not_signed_in' }), 'error')
  assert.equal(statusForFailure({ ok: false, kind: 'refused', code: 'error' }), 'error')
  assert.equal(statusForFailure(undefined), 'error')
})

test('heroLines: name or a plain fallback, username with an @ or nothing', () => {
  assert.deepEqual(heroLines(withHandle), { name: 'Omar', handle: '@omar-rx' })
  assert.deepEqual(heroLines({ full_name: '  ' }), { name: 'Your profile', handle: '' })
  assert.deepEqual(heroLines(null), { name: 'Your profile', handle: '' })
})

test('detailsPercent follows the required fields only (3, or 4 for a physician)', () => {
  assert.equal(detailsPercent({}), 0)
  assert.equal(detailsPercent({ full_name: 'A', occupation: 'Pharmacist', country: 'Egypt' }), 100)
  assert.equal(detailsPercent({ full_name: 'A' }), 33)
  assert.equal(detailsPercent({ full_name: 'A', occupation: 'Specialist Physician', country: 'Egypt' }), 75)
})

test('wording never names a blocked word and the details line matches the plan', () => {
  assert.equal(TAB_WORDS.detailsLine, 'Not shown on your public profile.')
  for (const text of Object.values(TAB_WORDS)) assert.ok(text.length > 0 && !/\bnull\b|undefined/.test(text))
})
