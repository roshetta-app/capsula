// Checks for homePaths.js (Phase H, step 9.3a). Run with: node --test src/utils/homePaths.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { isTabActive, isExactTabScreen, isTopScreen, backTarget, labelForPath } from './homePaths.js'

test('Home is lit only for "/", Topics only for "/conditions" and below', () => {
  assert.equal(isTabActive('/', '/'), true)
  assert.equal(isTabActive('/', '/conditions'), false)
  assert.equal(isTabActive('/', '/conditions/acute-cholecystitis'), false)
  assert.equal(isTabActive('/conditions', '/'), false)
  assert.equal(isTabActive('/conditions', '/conditions'), true)
  assert.equal(isTabActive('/conditions', '/conditions/x'), true)
  assert.equal(isTabActive('/drugs', '/drugs/browse/groups'), true)
  assert.equal(isTabActive('/drugs', '/'), false)
  assert.equal(isTabActive('/favourites', '/favourites'), true)
})

test('second tap scrolls only on the exact top screen', () => {
  assert.equal(isExactTabScreen('/', '/'), true)
  assert.equal(isExactTabScreen('/', '/conditions'), false)
  assert.equal(isExactTabScreen('/conditions', '/'), false)
  assert.equal(isExactTabScreen('/conditions', '/conditions/x'), false)
})

test('top screens are the four tabs and Account, nothing underneath them', () => {
  for (const p of ['/', '/conditions', '/drugs', '/favourites', '/account']) assert.equal(isTopScreen(p), true, p)
  for (const p of ['/conditions/x', '/drugs/motinorm', '/roshettas', '/account/edit', '/admin']) assert.equal(isTopScreen(p), false, p)
})

test('Back: from every other top screen to Home, from Home exit, nothing on other screens', () => {
  for (const p of ['/conditions', '/drugs', '/favourites', '/account']) assert.equal(backTarget(p), '/', p)
  assert.equal(backTarget('/'), null)
  assert.equal(backTarget('/conditions/x'), null)
  assert.equal(backTarget('/roshettas'), null)
})

test('names: "/" says Home, "/conditions" says Topics, the rest as before', () => {
  assert.equal(labelForPath('/'), 'Home')
  assert.equal(labelForPath('/conditions'), 'Topics')
  assert.equal(labelForPath('/conditions/x'), 'Topic')
  assert.equal(labelForPath('/drugs'), 'Drugs')
  assert.equal(labelForPath('/drugs/category/all'), 'Category')
  assert.equal(labelForPath('/drugs/browse/groups'), 'My groups')
  assert.equal(labelForPath('/drugs/group/1/add'), 'Add drugs')
  assert.equal(labelForPath('/drugs/group/1'), 'Group')
  assert.equal(labelForPath('/g/abc'), 'Group')
  assert.equal(labelForPath('/r/abc'), 'Roshetta')
  assert.equal(labelForPath('/roshettas'), 'My roshettas')
  assert.equal(labelForPath('/drugs/generic/x'), 'Generic')
  assert.equal(labelForPath('/drugs/motinorm'), 'Drug')
  assert.equal(labelForPath('/favourites'), 'Favourites')
  assert.equal(labelForPath('/account'), 'Account')
  assert.equal(labelForPath('/nowhere'), null)
  assert.equal(labelForPath(undefined), null)
})
