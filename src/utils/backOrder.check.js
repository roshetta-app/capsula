// Checks for backOrder.js and its wiring (Roshetta plan, Phase K, step 12.9a; cases K20 to K24).
// Run with:  node --test src/utils/backOrder.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BACK_ORDER, decideBack } from './backOrder.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const base = { keyboardOpen: false, layerOpen: false, sheetOpen: false, unsavedPending: false, onTabScreen: false, onHome: false }

test('the written order is keyboard, layer, sheet, unsaved, screen, home, exit', () => {
  assert.deepEqual(BACK_ORDER, ['keyboard', 'layer', 'sheet', 'unsaved', 'screen', 'home', 'exit'])
})

test('K20: with the keyboard open, Back only closes the keyboard, whatever else is open', () => {
  assert.equal(decideBack({ ...base, keyboardOpen: true }), 'keyboard')
  assert.equal(decideBack({ ...base, keyboardOpen: true, sheetOpen: true, unsavedPending: true, onTabScreen: true }), 'keyboard')
})

test('K21: a layer inside a sheet closes first, then the sheet, and nothing else moves', () => {
  assert.equal(decideBack({ ...base, sheetOpen: true, layerOpen: true }), 'layer')
  assert.equal(decideBack({ ...base, sheetOpen: true }), 'sheet')
  assert.equal(decideBack({ ...base, sheetOpen: true, unsavedPending: true, onTabScreen: true }), 'sheet')
})

test('a layer with no sheet under it does nothing on its own (a layer only works inside a sheet)', () => {
  assert.equal(decideBack({ ...base, layerOpen: true }), 'screen')
})

test('K22: unsaved work asks Leave or Stay before the screen changes', () => {
  assert.equal(decideBack({ ...base, unsavedPending: true }), 'unsaved')
})

test('K3: on a tab screen Back goes Home; on Home Back exits; elsewhere the screen goes back', () => {
  assert.equal(decideBack({ ...base, onTabScreen: true }), 'home')
  assert.equal(decideBack({ ...base, onTabScreen: true, onHome: true }), 'exit')
  assert.equal(decideBack(base), 'screen')
})

test('the same state always gives the same answer, and an empty state is a plain screen Back', () => {
  assert.equal(decideBack({}), 'screen')
  assert.equal(decideBack(), 'screen')
})

test('wiring: the bottom bar and the sheet hook read the written order', () => {
  const nav = read('../components/BottomNav.jsx')
  const sheet = read('../hooks/useBackClose.js')
  assert.match(nav, /decideBack\(/)
  assert.match(sheet, /decideBack\(/)
})
