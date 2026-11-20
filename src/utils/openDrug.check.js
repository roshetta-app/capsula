// Checks for openDrug.js and its wiring (Roshetta plan, Phase K, step 12.7a). Run with:
//   node --test src/utils/openDrug.check.js
// Cases K5 (a drug opens as one new step from its door) and K7 (a double tap opens once).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openDrugWith } from './openDrug.js'
import { createTapGuard } from './tapGuard.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const pathFor = (slug) => `/drugs/${slug}`

function door() {
  let t = 1000
  const guard = createTapGuard({ now: () => t })
  const steps = []          // what the history would get
  const recent = []         // what "recently viewed" would get
  const openPage = (path) => guard.open(path, () => steps.push(path))
  const addRecent = (d) => recent.push(d)
  return { steps, recent, openPage, addRecent, wait: (ms) => { t += ms } }
}

test('K5: opens the drug page as one new step and writes the recent list once', () => {
  const d = door()
  const ok = openDrugWith({ id: 7, slug: 'panadol', genericName: 'Paracetamol' }, { ...d, pathFor })
  assert.equal(ok, true)
  assert.deepEqual(d.steps, ['/drugs/panadol'])
  assert.deepEqual(d.recent, [{ id: 7, name: 'Paracetamol', slug: 'panadol' }])
})

test('K5: a drug with no slug opens by its id', () => {
  const d = door()
  openDrugWith({ id: 'abc', genericName: 'X' }, { ...d, pathFor })
  assert.deepEqual(d.steps, ['/drugs/abc'])
  assert.deepEqual(d.recent, [{ id: 'abc', name: 'X', slug: 'abc' }])
})

test('K7: a double tap opens once and counts once in the recent list', () => {
  const d = door()
  const drug = { id: 7, slug: 'panadol', genericName: 'Paracetamol' }
  assert.equal(openDrugWith(drug, { ...d, pathFor }), true)
  d.wait(150)
  assert.equal(openDrugWith(drug, { ...d, pathFor }), false)
  assert.equal(d.steps.length, 1)
  assert.equal(d.recent.length, 1)
})

test('K7: two different drugs in quick succession both open', () => {
  const d = door()
  openDrugWith({ id: 1, slug: 'a', genericName: 'A' }, { ...d, pathFor })
  assert.equal(openDrugWith({ id: 2, slug: 'b', genericName: 'B' }, { ...d, pathFor }), true)
  assert.deepEqual(d.steps, ['/drugs/a', '/drugs/b'])
})

test('a screen with no recent list (no writer) still opens', () => {
  const d = door()
  assert.equal(openDrugWith({ id: 1, slug: 'a' }, { openPage: d.openPage, pathFor }), true)
  assert.deepEqual(d.steps, ['/drugs/a'])
})

test('nothing to open: no drug, or a drug with no slug and no id, opens nothing', () => {
  const d = door()
  assert.equal(openDrugWith(null, { ...d, pathFor }), false)
  assert.equal(openDrugWith({ genericName: 'X' }, { ...d, pathFor }), false)
  assert.equal(openDrugWith({ id: '', slug: '' }, { ...d, pathFor }), false)
  assert.deepEqual(d.steps, [])
  assert.deepEqual(d.recent, [])
})

test('wiring: the Drugs and Classes screens open drugs only through useOpenDrug', () => {
  for (const rel of ['../pages/DrugsScreen.jsx', '../pages/DrugClassesScreen.jsx']) {
    const src = read(rel)
    assert.match(src, /useOpenDrug\(addRecentDrug\)/, rel)
    assert.doesNotMatch(src, /navigate\(ROUTES\.DRUG_DETAIL/, rel)
  }
})

test('wiring: the hook goes through the tap guard, with no flags on the open', () => {
  const hook = read('../hooks/useOpenDrug.js')
  assert.match(hook, /useTapGuard/)
  assert.match(hook, /ROUTES\.DRUG_DETAIL/)
  const util = read('./openDrug.js')
  assert.doesNotMatch(util, /replace|state:/)
})
