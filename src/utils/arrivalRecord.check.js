// Checks for arrivalRecord.js (Roshetta plan, Phase K, step 12.3). Run with: node --test src/utils/arrivalRecord.check.js
// A fake browser history plays the cases of the plan's case table that this step covers
// (K10 website side, K14, K15, K17, K31 and the "extra screen behind the first page" fault, F1).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createArrivalRecord, hasStepBehind, planArrival } from './arrivalRecord.js'

// A fake history that behaves like the router's: the first step is { idx: 0, key: 'default' },
// every push or replace makes a new key, a push drops the forward steps.
function fakeApp(startPath) {
  let n = 0
  const entries = [{ path: startPath, state: { idx: 0, key: 'default' } }]
  let cur = 0
  const record = createArrivalRecord()
  const app = {
    entries,
    record,
    get path() { return entries[cur].path.split(/[?#]/)[0] },
    get full() { return entries[cur].path },
    get state() { return entries[cur].state },
    stack() { return entries.slice(0, cur + 1).map((e) => e.path) },
    // the tracker sees every place the router shows
    show() { record.note(entries[cur].state.key) },
    push(path) { entries.length = cur + 1; entries.push({ path, state: { idx: cur + 1, key: `k${++n}` } }); cur++; app.show() },
    replace(path) { entries[cur] = { path, state: { idx: cur, key: `k${++n}` } }; app.show() },
    back() { cur = Math.max(0, cur - 1); app.show() },
    // what useDeepLinkParent does when a page that has a parent appears
    pageAppeared() {
      const [pathname, rest = ''] = app.full.split('?')
      const steps = planArrival({
        isArrival: record.isArrival(entries[cur].state.key),
        historyState: app.state,
        pathname,
        search: rest ? `?${rest}` : '',
      })
      for (const s of steps) { if (s.replace !== undefined) app.replace(s.replace); else app.push(s.push) }
      return steps
    },
  }
  app.show()
  return app
}

test('arrival on a drug page (website notification or link, K10 and K31): Home, Drugs, the drug', () => {
  const a = fakeApp('/drugs/panadol')
  a.pageAppeared()
  assert.deepEqual(a.stack(), ['/', '/drugs', '/drugs/panadol'])
  a.back(); assert.equal(a.path, '/drugs')
  a.back(); assert.equal(a.path, '/')
})

test('arrival on a roshetta Edit screen lays Home and the roshetta behind it, no duplicate', () => {
  const a = fakeApp('/roshetta/7/edit')
  a.pageAppeared()
  assert.deepEqual(a.stack(), ['/', '/roshetta/7', '/roshetta/7/edit'])
})

test('arrival on a group page (parent is Home): Home once, not twice', () => {
  const a = fakeApp('/drugs/group/abc')
  a.pageAppeared()
  assert.deepEqual(a.stack(), ['/', '/drugs/group/abc'])
})

test('arrival keeps the query and a topic page gets Topics and Home', () => {
  const a = fakeApp('/conditions/gout?tab=plan')
  a.pageAppeared()
  assert.deepEqual(a.stack(), ['/', '/conditions', '/conditions/gout?tab=plan'])
})

test('shared pages stand alone: nothing is laid behind them (K14), a drug opened from one returns to it (K15)', () => {
  const a = fakeApp('/g/abc')
  assert.deepEqual(a.pageAppeared(), [])
  assert.deepEqual(a.stack(), ['/g/abc'])
  a.push('/drugs/panadol')
  assert.deepEqual(a.pageAppeared(), [])
  a.back(); assert.equal(a.path, '/g/abc')
})

test('F1: the first drug opened from the Drugs tab has no second copy of Drugs behind it', () => {
  const a = fakeApp('/')          // the app starts on Home
  a.replace('/drugs')              // a tab tap replaces, it does not pile up
  a.push('/drugs/panadol')
  assert.deepEqual(a.pageAppeared(), [])
  assert.deepEqual(a.stack(), ['/drugs', '/drugs/panadol'])
  a.back(); assert.equal(a.path, '/drugs')
})

test('F1: the first group opened from Home has no second Home behind it', () => {
  const a = fakeApp('/')
  a.push('/drugs/group/abc')
  assert.deepEqual(a.pageAppeared(), [])
  assert.deepEqual(a.stack(), ['/', '/drugs/group/abc'])
})

test('app started on a main screen, a page opened by the native notification tap: Home behind it, no duplicate', () => {
  for (const to of ['/drugs/group/abc', '/roshetta/7', '/drugs/panadol']) {
    const a = fakeApp('/')
    a.push(to)
    assert.deepEqual(a.pageAppeared(), [], to)
    assert.deepEqual(a.stack(), ['/', to], to)
  }
})

test('a screen that appears again after Back is not an arrival (the Back guard step has no number)', () => {
  const a = fakeApp('/drugs/browse/groups')   // the See all screen is where the app started
  a.pageAppeared()                              // this arrival lays Home behind it
  a.push('/drugs/group/abc')
  // Back lands on a step with the first key again; the screen shows again and must not add anything
  a.entries[1].state = { key: 'default' }
  a.back()
  assert.deepEqual(a.pageAppeared(), [])
})

test('refresh in the middle of a session (K17): the history already has steps behind, nothing is added', () => {
  const a = fakeApp('/')
  a.push('/drugs'); a.push('/drugs/panadol')
  const refreshed = createArrivalRecord()           // a refresh starts the app again
  refreshed.note(a.state.key)
  assert.deepEqual(planArrival({ isArrival: refreshed.isArrival(a.state.key), historyState: a.state, pathname: '/drugs/panadol' }), [])
})

test('a page opened from a link in a tab with no earlier step, then refreshed, is not laid twice', () => {
  const a = fakeApp('/drugs/panadol')
  a.pageAppeared()
  assert.deepEqual(a.stack(), ['/', '/drugs', '/drugs/panadol'])
  assert.equal(hasStepBehind(a.state), true)
})

test('unknown addresses and unknown history numbers', () => {
  const a = fakeApp('/nowhere')
  assert.deepEqual(a.pageAppeared(), [])
  assert.equal(hasStepBehind(null), false)
  assert.equal(hasStepBehind({}), false)
  assert.equal(hasStepBehind({ idx: 0 }), false)
  assert.equal(hasStepBehind({ idx: 1 }), true)
  // a guard step with no number does not count as something behind, so an arrival there still lays
  assert.deepEqual(planArrival({ isArrival: true, historyState: { capsulaBottomNavGuard: true }, pathname: '/drugs/x' }).length, 3)
  // not the arrival: nothing, whatever the address
  assert.deepEqual(planArrival({ isArrival: false, historyState: null, pathname: '/drugs/x' }), [])
})

test('the record: first place is the arrival until the router shows another', () => {
  const r = createArrivalRecord()
  assert.equal(r.isArrival('default'), false) // nothing noted yet
  r.note('default')
  assert.equal(r.isArrival('default'), true)
  r.note('default')
  assert.equal(r.isArrival('default'), true)
  r.note('k1')
  assert.equal(r.isArrival('default'), false)
  assert.equal(r.isArrival('k1'), false)
})
