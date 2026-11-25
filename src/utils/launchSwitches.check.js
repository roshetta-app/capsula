// Checks for launchSwitches.js (Track S, step S4). Run with: node --test src/utils/launchSwitches.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isSwitchOn, switchValue, readSignInReturnError, looksLikeRefusedSignup, withoutSignInReturnError,
} from './launchSwitches.js'

test('a switch is on only for the word true', () => {
  assert.equal(isSwitchOn('true'), true)
  assert.equal(isSwitchOn(' TRUE '), true)
  for (const v of ['false', '', '1', 'yes', null, undefined]) assert.equal(isSwitchOn(v), false)
  assert.equal(switchValue(true), 'true')
  assert.equal(switchValue(false), 'false')
})

test('reads the sign-in error from the query string', () => {
  const e = readSignInReturnError('https://x.app/capsula/?error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user')
  assert.deepEqual(e, { error: 'server_error', code: 'unexpected_failure', description: 'Database error saving new user' })
})

test('reads the sign-in error from the hash', () => {
  const e = readSignInReturnError('https://x.app/capsula/#error=server_error&error_description=Database%20error%20saving%20new%20user')
  assert.equal(e.description, 'Database error saving new user')
})

test('no error in the address gives null', () => {
  assert.equal(readSignInReturnError('https://x.app/capsula/drugs?q=abc#top'), null)
  assert.equal(readSignInReturnError('not a url at all'), readSignInReturnError('not a url at all'))
})

test('only the refused-sign-up wording counts', () => {
  assert.equal(looksLikeRefusedSignup('Database error saving new user'), true)
  assert.equal(looksLikeRefusedSignup('signups_paused'), true)
  assert.equal(looksLikeRefusedSignup('The user cancelled the sign-in'), false)
  assert.equal(looksLikeRefusedSignup(''), false)
  assert.equal(looksLikeRefusedSignup(null), false)
})

test('the error words are removed from the address and the rest is kept', () => {
  assert.equal(
    withoutSignInReturnError('https://x.app/capsula/drugs?q=abc&error=server_error&error_description=Database+error#top'),
    '/capsula/drugs?q=abc#top',
  )
  assert.equal(
    withoutSignInReturnError('https://x.app/capsula/#error=server_error&error_code=unexpected_failure&error_description=x'),
    '/capsula/',
  )
  assert.equal(withoutSignInReturnError('https://x.app/capsula/drugs'), '/capsula/drugs')
})
