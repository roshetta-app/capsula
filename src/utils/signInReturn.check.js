// Checks for signInReturn.js (Roshetta plan, Phase K, step 12.15). Run with:
//   node --test src/utils/signInReturn.check.js
// A fake history list plays the sign-in trip: the page, Google's pages, the page again.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  makeMarker, parseMarker, loadedAsSignInReturn, planRewind, shouldReloadOnRestore,
  HISTORY_CAP, MAX_STEPS, MAX_AGE_MS, REWOUND_MAX_AGE_MS,
} from './signInReturn.js'

const NOW = 1_800_000_000_000

test('makeMarker: remembers the count, the page and the time', () => {
  assert.deepEqual(makeMarker({ historyLength: 4, pathname: '/', now: NOW }), { v: 1, at: NOW, len: 4, path: '/' })
})

test('makeMarker: refuses when a later rewind could not be trusted', () => {
  assert.equal(makeMarker({ historyLength: 0, pathname: '/', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: 2.5, pathname: '/', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: '4', pathname: '/', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: 4, pathname: '', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: 4, pathname: '/', now: NaN }), null)
  // near the 50-step limit the count stops growing, so no note is made
  const last = HISTORY_CAP - MAX_STEPS - 1
  assert.notEqual(makeMarker({ historyLength: last, pathname: '/', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: last + 1, pathname: '/', now: NOW }), null)
})

test('parseMarker: only the exact written shape is accepted', () => {
  const m = makeMarker({ historyLength: 3, pathname: '/drugs', now: NOW })
  assert.deepEqual(parseMarker(JSON.stringify(m)), m)
  for (const bad of [null, undefined, '', 'x', '{', '[]', '{}', 42,
    JSON.stringify({ ...m, v: 2 }), JSON.stringify({ ...m, len: 0 }), JSON.stringify({ ...m, len: '3' }),
    JSON.stringify({ ...m, at: 'now' }), JSON.stringify({ ...m, path: '' }), JSON.stringify({ ...m, path: 5 })]) {
    assert.equal(parseMarker(bad), null, String(bad))
  }
})

test('loadedAsSignInReturn: only an address with a code counts', () => {
  assert.equal(loadedAsSignInReturn('?code=abc123'), true)
  assert.equal(loadedAsSignInReturn('?x=1&code=abc123'), true)
  assert.equal(loadedAsSignInReturn(''), false)
  assert.equal(loadedAsSignInReturn('?code='), false)
  assert.equal(loadedAsSignInReturn('?error=access_denied'), false)
  assert.equal(loadedAsSignInReturn('?q=code'), false)
  assert.equal(loadedAsSignInReturn(undefined), false)
})

// ---- the whole trip, with a fake history list -------------------------------------------------
function trip({ before = ['/home', '/drugs'], googleSteps = 3, extraOnReturn = 0 } = {}) {
  const list = [...before]
  const startPath = list[list.length - 1]
  const marker = makeMarker({ historyLength: list.length, pathname: startPath, now: NOW })
  for (let i = 0; i < googleSteps; i++) list.push(`https://accounts.google.test/step${i + 1}`)
  list.push(startPath) // the page Google sends the person back to
  for (let i = 0; i < extraOnReturn; i++) list.push(startPath) // steps the app adds on arrival
  return { list, marker, startPath }
}

test('the trip: the jump lands on the page the person started from', () => {
  const { list, marker, startPath } = trip()
  const plan = planRewind({ marker, now: NOW + 8000, historyLength: list.length, pathname: startPath })
  assert.equal(plan.reason, 'ok')
  const landing = list.length - 1 - plan.steps
  assert.equal(landing, 1) // index 1 is '/drugs', the page they started from
  assert.equal(list[landing], '/drugs')
  assert.equal(list[landing - 1], '/home') // one more Back goes to the screen before it
})

test('the trip: steps the app added on arrival are jumped over too', () => {
  const { list, marker, startPath } = trip({ googleSteps: 2, extraOnReturn: 2 })
  const plan = planRewind({ marker, now: NOW + 5000, historyLength: list.length, pathname: startPath })
  assert.equal(list[list.length - 1 - plan.steps], '/drugs')
})

test('the trip: a one-page Google trip is one step', () => {
  const { list, marker, startPath } = trip({ googleSteps: 0 })
  const plan = planRewind({ marker, now: NOW + 3000, historyLength: list.length, pathname: startPath })
  assert.equal(plan.steps, 1)
})

test('planRewind: does nothing when anything looks wrong', () => {
  const { list, marker, startPath } = trip()
  const ok = { marker, now: NOW + 8000, historyLength: list.length, pathname: startPath }
  assert.equal(planRewind(ok).reason, 'ok')
  assert.deepEqual(planRewind({ ...ok, marker: null }), { steps: 0, reason: 'no-marker' })
  assert.equal(planRewind({ ...ok, now: NOW + MAX_AGE_MS + 1 }).reason, 'stale')
  assert.equal(planRewind({ ...ok, now: NOW - 1 }).reason, 'stale')
  assert.equal(planRewind({ ...ok, now: undefined }).reason, 'bad-time')
  assert.equal(planRewind({ ...ok, historyLength: 0 }).reason, 'bad-length')
  assert.equal(planRewind({ ...ok, pathname: '/favourites' }).reason, 'moved-on')
  assert.equal(planRewind({ ...ok, historyLength: marker.len }).reason, 'nothing-added')
  assert.equal(planRewind({ ...ok, historyLength: marker.len - 1 }).reason, 'nothing-added')
  assert.equal(planRewind({ ...ok, historyLength: marker.len + MAX_STEPS + 1 }).reason, 'too-many')
  assert.equal(planRewind({ ...ok, historyLength: HISTORY_CAP }).reason, 'list-full')
  assert.equal(planRewind({ ...ok, historyLength: HISTORY_CAP + 3 }).reason, 'list-full')
})

test('planRewind: the largest allowed jump is still accepted', () => {
  const marker = makeMarker({ historyLength: 10, pathname: '/', now: NOW })
  const plan = planRewind({ marker, now: NOW + 1000, historyLength: 10 + MAX_STEPS, pathname: '/' })
  assert.deepEqual(plan, { steps: MAX_STEPS, reason: 'ok' })
})

test('the note is used once: with no note left, a second return does nothing', () => {
  const { list, startPath } = trip()
  assert.equal(planRewind({ marker: parseMarker(null), now: NOW + 8000, historyLength: list.length, pathname: startPath }).steps, 0)
})

test('shouldReloadOnRestore: only a restored page right after a jump reloads', () => {
  assert.equal(shouldReloadOnRestore({ persisted: true, rewoundAt: NOW, now: NOW + 500 }), true)
  assert.equal(shouldReloadOnRestore({ persisted: false, rewoundAt: NOW, now: NOW + 500 }), false)
  assert.equal(shouldReloadOnRestore({ persisted: true, rewoundAt: null, now: NOW + 500 }), false)
  assert.equal(shouldReloadOnRestore({ persisted: true, rewoundAt: NOW, now: NOW + REWOUND_MAX_AGE_MS + 1 }), false)
  assert.equal(shouldReloadOnRestore({ persisted: true, rewoundAt: NOW + 10, now: NOW }), false)
  assert.equal(shouldReloadOnRestore({ persisted: undefined, rewoundAt: NOW, now: NOW }), false)
})

test('makeMarker: steps ahead of the current page (after an earlier Back) are not counted', () => {
  // 4 steps in the list, the person is on step 3 of 4: leaving for Google drops the last one
  assert.deepEqual(makeMarker({ historyLength: 4, forwardSteps: 1, pathname: '/a', now: NOW }), { v: 1, at: NOW, len: 3, path: '/a' })
  assert.equal(makeMarker({ historyLength: 4, forwardSteps: -1, pathname: '/a', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: 4, forwardSteps: 4, pathname: '/a', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: 4, forwardSteps: 1.5, pathname: '/a', now: NOW }), null)
  assert.equal(makeMarker({ historyLength: 4, forwardSteps: '1', pathname: '/a', now: NOW }), null)
})

test('the whole trip after an earlier Back lands on the page the person started from', () => {
  // list: p0, p1, p2; the person pressed Back, so they are on p1 and p2 is still ahead
  const length = 3
  const marker = makeMarker({ historyLength: length, forwardSteps: 1, pathname: '/p1', now: NOW })
  // leaving drops p2, then: p0, p1, chooser, consent, back on p1 = 5 steps
  const plan = planRewind({ marker, now: NOW + 5000, historyLength: 5, pathname: '/p1' })
  assert.deepEqual(plan, { steps: 3, reason: 'ok' })
  // current index 4, minus 3 = index 1 = p1 (the page they started from)
  assert.equal(4 - plan.steps, 1)
})
