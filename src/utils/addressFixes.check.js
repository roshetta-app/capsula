// Checks for addressFixes.js (Roshetta plan, Phase K, step 12.5). Run with: node --test src/utils/addressFixes.check.js
// Plan case K19 (an unknown or mistyped address) and finding F4 (addresses that drew nothing,
// and the words an address read as a drug with that name).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ADDRESS_FIXES, fixAddress } from './addressFixes.js'
import { matchScreen } from './navRules.js'

test('the common typos go to the real screen', () => {
  assert.equal(fixAddress('/favorites'), '/favourites')
  assert.equal(fixAddress('/favourite'), '/favourites')
  assert.equal(fixAddress('/home'), '/')
  assert.equal(fixAddress('/topics'), '/conditions')
  assert.equal(fixAddress('/roshetta'), '/roshettas')
})

test('the four words an address reads as a drug go to the right list (F4)', () => {
  assert.equal(fixAddress('/drugs/browse'), '/drugs')
  assert.equal(fixAddress('/drugs/group'), '/drugs/browse/groups')
  assert.equal(fixAddress('/drugs/category'), '/drugs/browse/category')
  assert.equal(fixAddress('/drugs/generic'), '/drugs')
})

test('capital letters, a trailing slash, a query and a hash do not matter', () => {
  assert.equal(fixAddress('/Favorites'), '/favourites')
  assert.equal(fixAddress('/favorites/'), '/favourites')
  assert.equal(fixAddress('/HOME//'), '/')
  assert.equal(fixAddress('/drugs/Browse?x=1'), '/drugs')
  assert.equal(fixAddress('/home#top'), '/')
})

test('real screens and real drugs are never touched', () => {
  for (const p of ['/', '/drugs', '/favourites', '/conditions', '/roshettas', '/drugs/panadol',
    '/drugs/browse/groups', '/drugs/browse/category', '/drugs/group/5', '/drugs/generic/paracetamol',
    '/g/abc', '/r/abc', '/account/faq']) {
    assert.equal(fixAddress(p), null, p)
  }
})

test('an unknown address has no fix (it gets the not available screen)', () => {
  for (const p of ['/xyz', '/g', '/r', '/account/foo', '/drugs/browse/other', '/admin']) {
    assert.equal(fixAddress(p), null, p)
  }
})

test('bad input gives no fix and no error', () => {
  for (const p of [undefined, null, 5, '', 'home', '//home']) {
    assert.equal(fixAddress(p), null, String(p))
  }
})

test('every fix lands on a real screen and never on another fix (no loop)', () => {
  for (const [from, to] of Object.entries(ADDRESS_FIXES)) {
    assert.ok(matchScreen(to), `${from} -> ${to} is not a real screen`)
    assert.equal(fixAddress(to), null, `${from} -> ${to} would be fixed again`)
    assert.notEqual(from, to)
  }
})

test('the router has a route for each reserved word, so none is read as a drug', () => {
  const router = readFileSync(new URL('../router.jsx', import.meta.url), 'utf8')
  for (const from of Object.keys(ADDRESS_FIXES).filter((p) => p.startsWith('/drugs/'))) {
    assert.ok(router.includes(`path="${from}"`), `router.jsx has no route for ${from}`)
  }
  assert.ok(router.includes('path="*"'), 'router.jsx has no catch-all route')
})
