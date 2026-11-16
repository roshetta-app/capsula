// Checks for homeHeading.js (Phase H, step 9.3). Run with: node --test src/utils/homeHeading.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { firstNameOf, headingText } from './homeHeading.js'

test('first name: first word, titles skipped, Arabic kept', () => {
  assert.equal(firstNameOf('Shaf Ali'), 'Shaf')
  assert.equal(firstNameOf('  Dr. Shaf Ali '), 'Shaf')
  assert.equal(firstNameOf('Dr Shaf'), 'Shaf')
  assert.equal(firstNameOf('\u062f. \u0645\u062d\u0645\u062f \u0639\u0644\u064a'), '\u0645\u062d\u0645\u062f')
  assert.equal(firstNameOf('Shaf'), 'Shaf')
  assert.equal(firstNameOf('Dr.'), null)
  assert.equal(firstNameOf(''), null)
  assert.equal(firstNameOf(null), null)
  assert.equal(firstNameOf(42), null)
})

test('heading: guest Welcome, signed in Hello with name, signed in without a name Welcome', () => {
  assert.equal(headingText(false, 'Shaf Ali'), 'Welcome')
  assert.equal(headingText(true, 'Shaf Ali'), 'Hello, Shaf')
  assert.equal(headingText(true, null), 'Welcome')
  assert.equal(headingText(true, '   '), 'Welcome')
})
