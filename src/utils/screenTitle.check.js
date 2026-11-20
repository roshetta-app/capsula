// Checks for screenTitle.js (Roshetta plan, Phase K, step 12.11). Run with: node --test src/utils/screenTitle.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { titleFor } from './screenTitle.js'
import { SCREENS } from './navRules.js'

test('K32: Home is just Capsula', () => {
  assert.equal(titleFor('/'), 'Capsula')
})

test('K32: a screen is named from the rulebook', () => {
  assert.equal(titleFor('/drugs'), 'Drugs | Capsula')
  assert.equal(titleFor('/conditions'), 'Topics | Capsula')
  assert.equal(titleFor('/roshettas'), 'My roshettas | Capsula')
  assert.equal(titleFor('/roshetta/4/edit'), 'Editor | Capsula')
})

test('K32: an item uses its own name', () => {
  assert.equal(titleFor('/drugs/panadol', 'Panadol'), 'Panadol | Capsula')
  assert.equal(titleFor('/conditions/asthma', '  Asthma '), 'Asthma | Capsula')
})

test('K32: an empty name or an unknown address falls back safely', () => {
  assert.equal(titleFor('/drugs/panadol', ''), 'Drug | Capsula')
  assert.equal(titleFor('/drugs/panadol', undefined), 'Drug | Capsula')
  assert.equal(titleFor('/nowhere'), 'Capsula')
  assert.equal(titleFor(undefined), 'Capsula')
})

test('K32: no two top screens share a title', () => {
  const tops = ['/', '/conditions', '/drugs', '/favourites', '/account']
  assert.equal(new Set(tops.map((p) => titleFor(p))).size, tops.length)
  assert.ok(SCREENS.every((s) => titleFor(s.pattern.replace(/:\w+/g, 'x')).endsWith('Capsula')))
})
