// Checks for backLabel.js (Roshetta plan, Phase K, step 12.8). Run with: node --test src/utils/backLabel.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { backLabelFor } from './backLabel.js'
import { SCREENS, labelForPath } from './navRules.js'

test('a known earlier page gives its own name', () => {
  assert.equal(backLabelFor({ step: 2, prevPath: '/drugs', pathname: '/drugs/panadol' }), 'Drugs')
  assert.equal(backLabelFor({ step: 1, prevPath: '/', pathname: '/drugs/group/5' }), 'Home')
  assert.equal(backLabelFor({ step: 3, prevPath: '/favourites', pathname: '/conditions/asthma' }), 'Favourites')
})

test('an unknown earlier page falls back to the parent name (after a refresh)', () => {
  assert.equal(backLabelFor({ step: 4, prevPath: undefined, pathname: '/drugs/panadol' }), 'Drugs')
  assert.equal(backLabelFor({ step: 4, prevPath: undefined, pathname: '/conditions/asthma' }), 'Topics')
  assert.equal(backLabelFor({ step: 4, prevPath: undefined, pathname: '/drugs/group/5' }), 'Home')
  assert.equal(backLabelFor({ step: 4, prevPath: undefined, pathname: '/roshetta/9/edit' }), 'Roshetta')
  assert.equal(backLabelFor({ step: 4, prevPath: undefined, pathname: '/drugs/group/5/add' }), 'Group')
})

test('nothing behind: no name', () => {
  assert.equal(backLabelFor({ step: 0, prevPath: undefined, pathname: '/drugs/panadol' }), null)
  assert.equal(backLabelFor({ step: 0, prevPath: '/drugs', pathname: '/g/abc' }), null)
})

test('a shared page keeps the plain Back when the earlier page is unknown', () => {
  assert.equal(backLabelFor({ step: 2, prevPath: undefined, pathname: '/g/abc' }), null)
  assert.equal(backLabelFor({ step: 2, prevPath: undefined, pathname: '/r/abc' }), null)
})

test('an earlier page that is not a screen gives no name, and bad input does not throw', () => {
  assert.equal(backLabelFor({ step: 2, prevPath: '/nowhere', pathname: '/drugs/x' }), null)
  assert.equal(backLabelFor({ step: 2, prevPath: undefined, pathname: undefined }), null)
  assert.equal(backLabelFor({}), null)
})

test('every screen now has a name (no plain Back left for a known page)', () => {
  for (const s of SCREENS) assert.ok(s.label, `${s.pattern} has no name`)
  assert.equal(labelForPath('/roshetta/1'), 'Roshetta')
  assert.equal(labelForPath('/account/faq'), 'FAQ')
})
