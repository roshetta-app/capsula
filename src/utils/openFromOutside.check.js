// Checks for openFromOutside.js (Roshetta plan, Phase K, step 12.4).
// Run with: node --test src/utils/openFromOutside.check.js
// A fake history plays the plan's case table rows K10 to K13 for a notification (or a link) that
// reaches the app from outside: with the app closed, open on a main screen, with unsaved work,
// and with a sheet open.
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanTarget, planOpen, openFromOutside } from './openFromOutside.js'

const home = { pathname: '/', search: '' }

test('cleanTarget: the website prefix, the empty link and anything that is not an inside address', () => {
  assert.equal(cleanTarget('/drugs/panadol'), '/drugs/panadol')
  assert.equal(cleanTarget('/capsula/drugs/panadol'), '/drugs/panadol')
  assert.equal(cleanTarget('/capsula/'), '/')
  assert.equal(cleanTarget('/capsula'), '/')
  assert.equal(cleanTarget(''), '/')
  assert.equal(cleanTarget(null), '/')
  assert.equal(cleanTarget(undefined), '/')
  assert.equal(cleanTarget(42), '/')
  assert.equal(cleanTarget('/drugs/panadol?tab=2#top'), '/drugs/panadol?tab=2#top')
  // another site, or a trick to leave the app, never gets through
  assert.equal(cleanTarget('//evil.example/x'), '/')
  assert.equal(cleanTarget('https://evil.example/x'), '/')
  assert.equal(cleanTarget('javascript:alert(1)'), '/')
  assert.equal(cleanTarget('/\\evil.example'), '/')
  assert.equal(cleanTarget('drugs/panadol'), '/')
  // a lookalike name is not the prefix
  assert.equal(cleanTarget('/capsulafoo/x'), '/capsulafoo/x')
})

test('K10: app just started on Home gets Home, the page parent, then the page', () => {
  const plan = planOpen({ url: '/drugs/panadol', here: home, isArrival: true })
  assert.deepEqual(plan.steps, [{ replace: '/' }, { push: '/drugs' }, { push: '/drugs/panadol' }])
  const topic = planOpen({ url: '/conditions/asthma', here: home, isArrival: true })
  assert.deepEqual(topic.steps, [{ replace: '/' }, { push: '/conditions' }, { push: '/conditions/asthma' }])
})

test('K10: a group or roshetta (parent Home) gets no second Home', () => {
  const group = planOpen({ url: '/drugs/group/7', here: home, isArrival: true })
  assert.deepEqual(group.steps, [{ replace: '/' }, { push: '/drugs/group/7' }])
  const edit = planOpen({ url: '/roshetta/5/edit', here: home, isArrival: true })
  assert.deepEqual(edit.steps, [{ replace: '/' }, { push: '/roshetta/5' }, { push: '/roshetta/5/edit' }])
})

test('K10: the full stack is only laid when the app is still on Home and nothing moved', () => {
  // moved since the start: the page just opens on top
  const moved = planOpen({ url: '/drugs/panadol', here: home, isArrival: false })
  assert.deepEqual(moved.steps, [{ push: '/drugs/panadol' }])
  // the first place was not Home: never lay Home over it
  const elsewhere = planOpen({ url: '/drugs/panadol', here: { pathname: '/drugs', search: '' }, isArrival: true })
  assert.deepEqual(elsewhere.steps, [{ push: '/drugs/panadol' }])
})

test('K10: a shared page has nothing laid behind it, a link with no target goes to Home', () => {
  const shared = planOpen({ url: '/r/abc123', here: home, isArrival: true })
  assert.deepEqual(shared.steps, [{ push: '/r/abc123' }])
  const none = planOpen({ url: '', here: { pathname: '/drugs/panadol', search: '' }, isArrival: false })
  assert.deepEqual(none.steps, [{ push: '/' }])
})

test('K11: with the app open on a main screen the page opens on top, so Back returns to that screen', () => {
  const plan = planOpen({ url: '/drugs/panadol', here: { pathname: '/favourites', search: '' }, isArrival: false })
  assert.deepEqual(plan.steps, [{ push: '/drugs/panadol' }])
})

test('K11: a main screen reached from a main screen replaces, so nothing piles up', () => {
  const plan = planOpen({ url: '/conditions', here: { pathname: '/drugs', search: '' }, isArrival: false })
  assert.deepEqual(plan.steps, [{ replace: '/conditions' }])
})

test('the same place is not opened twice', () => {
  const same = planOpen({ url: '/drugs/panadol', here: { pathname: '/drugs/panadol', search: '' }, isArrival: false })
  assert.deepEqual(same.steps, [])
  const samePrefixed = planOpen({ url: '/capsula/drugs/panadol', here: { pathname: '/drugs/panadol', search: '' }, isArrival: false })
  assert.deepEqual(samePrefixed.steps, [])
  const otherQuery = planOpen({ url: '/drugs/panadol?tab=2', here: { pathname: '/drugs/panadol', search: '' }, isArrival: false })
  assert.deepEqual(otherQuery.steps, [{ push: '/drugs/panadol?tab=2' }])
  const homeAgain = planOpen({ url: '', here: home, isArrival: true })
  assert.deepEqual(homeAgain.steps, [])
})

// ── The whole flow, with fakes for the sheets, the leave question and the router ──────────────

function rig({ unsaved = false, answer = 'leave', sheetsOpen = 0, closeFails = false } = {}) {
  const log = []
  return {
    log,
    deps: {
      here: { pathname: '/favourites', search: '' },
      isArrival: false,
      navigate: (to, opts) => log.push(opts && opts.replace ? `replace ${to}` : `push ${to}`),
      closeSheets: async () => {
        if (closeFails) throw new Error('boom')
        log.push(`closeSheets(${sheetsOpen})`)
      },
      requestLeave: (action, onStay) => {
        if (!unsaved) { log.push('no question'); action(); return true }
        log.push('question')
        // the person answers a moment later
        setTimeout(() => (answer === 'leave' ? action() : onStay()), 5)
        return false
      },
    },
  }
}

test('K11: the notification opens the page and says so', async () => {
  const { deps, log } = rig()
  const result = await openFromOutside({ url: '/drugs/panadol', ...deps })
  assert.equal(result, 'opened')
  assert.deepEqual(log, ['closeSheets(0)', 'no question', 'push /drugs/panadol'])
})

test('K13: an open sheet is closed first, then the page opens', async () => {
  const { deps, log } = rig({ sheetsOpen: 2 })
  await openFromOutside({ url: '/conditions/asthma', ...deps })
  assert.deepEqual(log, ['closeSheets(2)', 'no question', 'push /conditions/asthma'])
})

test('K12: unsaved work asks Leave or Stay first; Leave opens the page', async () => {
  const { deps, log } = rig({ unsaved: true, answer: 'leave' })
  const result = await openFromOutside({ url: '/drugs/panadol', ...deps })
  assert.equal(result, 'opened')
  assert.deepEqual(log, ['closeSheets(0)', 'question', 'push /drugs/panadol'])
})

test('K12: Stay keeps the person where they are and opens nothing', async () => {
  const { deps, log } = rig({ unsaved: true, answer: 'stay' })
  const result = await openFromOutside({ url: '/drugs/panadol', ...deps })
  assert.equal(result, 'stayed')
  assert.deepEqual(log, ['closeSheets(0)', 'question'])
  assert.ok(!log.some((l) => l.startsWith('push')))
})

test('K10: a cold start lays the stack in order (replace first, then pushes)', async () => {
  const { deps, log } = rig()
  deps.here = home
  deps.isArrival = true
  await openFromOutside({ url: '/capsula/drugs/panadol', ...deps })
  assert.deepEqual(log, ['closeSheets(0)', 'no question', 'replace /', 'push /drugs', 'push /drugs/panadol'])
})

test('the same place does nothing at all: no sheet closed, no question', async () => {
  const { deps, log } = rig({ unsaved: true })
  deps.here = { pathname: '/drugs/panadol', search: '' }
  const result = await openFromOutside({ url: '/drugs/panadol', ...deps })
  assert.equal(result, 'same')
  assert.deepEqual(log, [])
})

test('a sheet that will not close never blocks the page from opening', async () => {
  const { deps, log } = rig({ closeFails: true })
  const result = await openFromOutside({ url: '/drugs/panadol', ...deps })
  assert.equal(result, 'opened')
  assert.deepEqual(log, ['no question', 'push /drugs/panadol'])
})

test('a failing router call is reported, not swallowed', async () => {
  const { deps } = rig()
  deps.navigate = () => { throw new Error('router gone') }
  await assert.rejects(() => openFromOutside({ url: '/drugs/panadol', ...deps }), /router gone/)
})

test('an answer given twice only counts once', async () => {
  const log = []
  const result = await openFromOutside({
    url: '/drugs/panadol',
    here: { pathname: '/favourites', search: '' },
    isArrival: false,
    navigate: (to) => log.push(`push ${to}`),
    closeSheets: async () => {},
    requestLeave: (action, onStay) => { setTimeout(() => { action(); onStay(); action() }, 1); return false },
  })
  assert.equal(result, 'opened')
  assert.deepEqual(log, ['push /drugs/panadol'])
})
