// Roshetta plan, Phase K, step 12.14: the case table (K1 to K32) played as sequences.
//
// A small fake browser history (push, replace, back, with the router's step numbers) is driven by
// a small model of the app that calls the REAL rule files: navRules, homePaths, arrivalRecord,
// backOrder, tapGuard and openFromOutside. Each case presses buttons in order and then asserts
// what is on screen and which steps are left behind.
//
// What this does NOT model, so it cannot prove it: the website's extra "guard" history steps,
// the sheet placeholder steps, the real router and React, scroll places, the native Back button
// and the platform's own gestures. The cases that depend on those stay phone checks (the
// skipped tests at the end say which, and why).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createArrivalRecord, planArrival, hasStepBehind } from './arrivalRecord.js';
import { decideBack } from './backOrder.js';
import { createTapGuard } from './tapGuard.js';
import { openFromOutside } from './openFromOutside.js';
import { isExactTabScreen, isTopScreen, backTarget } from './homePaths.js';
import { HOME_PATH, matchScreen, needsSignIn, laysBehind, isMainScreen, labelForPath } from './navRules.js';

// ── The fake browser history ─────────────────────────────────────────────────
function createBrowser(url) {
  let keys = 0
  const entries = [{ url, idx: 0, key: `k${keys++}` }]
  let i = 0
  return {
    entries,
    get index() { return i },
    get current() { return entries[i] },
    get state() { return { idx: entries[i].idx } },
    push(u) {
      entries.splice(i + 1)
      entries.push({ url: u, idx: entries[i].idx + 1, key: `k${keys++}` })
      i = entries.length - 1
    },
    replace(u) { entries[i] = { ...entries[i], url: u, key: `k${keys++}` } },
    back() { if (i > 0) i -= 1 },
  }
}

// ── The app model ────────────────────────────────────────────────────────────
function startApp(browser) {
  let time = 0
  const arrival = createArrivalRecord()
  const guard = createTapGuard({ now: () => time })
  const app = {
    browser,
    keyboardOpen: false, sheetOpen: false, layerOpen: false, unsaved: false,
    exited: false, asked: null,
    advance(ms) { time += ms },
    get path() { return new URL(browser.current.url, 'http://x').pathname },
    get paths() { return browser.entries.map(e => new URL(e.url, 'http://x').pathname) },
    note() { arrival.note(browser.current.key) },
    apply(step) {
      if (step.replace !== undefined) browser.replace(step.replace)
      else browser.push(step.push)
      app.note()
    },
    // Tap a tab: the lit tab scrolls to the top, any other tab swaps the screen (no new step).
    tapTab(path) {
      if (isExactTabScreen(path, app.path)) return 'scrollTop'
      browser.replace(path); app.note(); return 'switched'
    },
    // Open a page from a row or card, through the tap guard.
    open(path, key = path) { return guard.open(key, () => { browser.push(path); app.note() }) },
    // One Back press, decided by the written order.
    back() {
      const action = decideBack({
        keyboardOpen: app.keyboardOpen, layerOpen: app.layerOpen, sheetOpen: app.sheetOpen,
        unsavedPending: app.unsaved, onTabScreen: isTopScreen(app.path), onHome: backTarget(app.path) === null,
      })
      if (action === 'keyboard') app.keyboardOpen = false
      else if (action === 'layer') app.layerOpen = false
      else if (action === 'sheet') app.sheetOpen = false
      else if (action === 'unsaved') app.asked = () => { app.unsaved = false; guard.settled(); browser.back(); app.note() }
      else if (action === 'home') { browser.replace(backTarget(app.path)); app.note() }
      else if (action === 'exit') app.exited = true
      else if (!guard.back(() => { browser.back(); app.note() })) return 'ignored'
      return action
    },
    settle() { guard.settled() },
    // A notification or link tapped while the app is running.
    openLink(url) {
      return openFromOutside({
        url,
        here: { pathname: app.path, search: '' },
        isArrival: arrival.isArrival(browser.current.key),
        navigate: (to, opts) => app.apply(opts && opts.replace ? { replace: to } : { push: to }),
        closeSheets: async () => { app.sheetOpen = false; app.layerOpen = false },
        requestLeave: (open, stay) => {
          if (!app.unsaved) { open(); return }
          app.asked = { leave: open, stay }
        },
      })
    },
    // Sign out: a signed-in-only screen goes Home by replacing itself.
    signOut() {
      if (needsSignIn(app.path)) { browser.replace(HOME_PATH); app.note() }
    },
  }
  app.note()
  // The app has just started: place the screens behind a deep address.
  const here = new URL(browser.current.url, 'http://x')
  const steps = planArrival({
    isArrival: arrival.isArrival(browser.current.key), historyState: browser.state,
    pathname: here.pathname, search: here.search, hash: here.hash,
  })
  steps.forEach(app.apply)
  return app
}

const coldStart = url => startApp(createBrowser(url))
const backToHome = app => { let n = 0; while (app.path !== '/' && n < 10) { app.back(); app.settle(); app.advance(1000); n += 1 } return n }

// ── K1 to K4: the main screens ───────────────────────────────────────────────
test('K1: tapping another tab swaps the screen, no step piles up, Back goes Home', () => {
  const app = coldStart('/')
  for (const tab of ['/conditions', '/drugs', '/favourites', '/conditions']) assert.equal(app.tapTab(tab), 'switched')
  assert.equal(app.browser.entries.length, 1)
  assert.equal(app.path, '/conditions')
  assert.equal(app.back(), 'home')
  assert.equal(app.path, '/')
  assert.equal(app.browser.entries.length, 1)
})

test('K2: tapping the lit tab scrolls to the top and changes no step', () => {
  const app = coldStart('/')
  app.tapTab('/drugs')
  assert.equal(app.tapTab('/drugs'), 'scrollTop')
  assert.equal(app.browser.entries.length, 1)
})

test('K3: Back on Topics, Drugs, Favourites and Account goes Home; Back on Home exits', () => {
  for (const main of ['/conditions', '/drugs', '/favourites', '/account']) {
    const app = coldStart('/')
    app.tapTab(main)
    assert.equal(app.back(), 'home', main)
    assert.equal(app.path, '/', main)
    assert.equal(app.exited, false)
  }
  const home = coldStart('/')
  assert.equal(home.back(), 'exit')
  assert.equal(home.exited, true)
})

test('K4: Home, Drugs tab, a drug, then Back three times: Drugs, then Home, then exit', () => {
  const app = coldStart('/')
  app.tapTab('/drugs')
  app.open('/drugs/panadol')
  assert.equal(app.back(), 'screen'); app.settle(); app.advance(1000)
  assert.equal(app.path, '/drugs')
  assert.equal(app.back(), 'home')
  assert.equal(app.path, '/')
  assert.equal(app.back(), 'exit')
})

// ── K5 to K9: doors ──────────────────────────────────────────────────────────
test('K5: a drug or topic opened from any door is one new step; Back returns to that door', () => {
  const doors = [
    ['/drugs', '/drugs/panadol'], ['/drugs/browse/category', '/drugs/panadol'], ['/drugs/browse/class', '/drugs/generic/paracetamol'],
    ['/drugs/group/5', '/drugs/panadol'], ['/roshetta/7', '/drugs/panadol'], ['/favourites', '/conditions/asthma'],
    ['/conditions', '/conditions/asthma'], ['/', '/conditions/asthma'], ['/g/abc', '/drugs/panadol'], ['/r/abc', '/drugs/panadol'],
  ]
  for (const [door, target] of doors) {
    const app = coldStart(door)
    const before = app.browser.entries.length
    assert.equal(app.open(target), true, door)
    assert.equal(app.browser.entries.length, before + 1, door)
    app.back()
    assert.equal(app.path, door, door)
    assert.equal(app.browser.entries.length, before + 1, door) // the step is still there to go forward to
  }
})

test('K7: a double tap opens once and one Back returns', () => {
  const app = coldStart('/drugs') // Home is laid behind it
  const before = app.browser.entries.length
  assert.equal(app.open('/drugs/panadol'), true)
  assert.equal(app.open('/drugs/panadol'), false)
  assert.equal(app.browser.entries.length, before + 1)
  app.back()
  assert.equal(app.path, '/drugs')
})

test('K8 and K9: a group, a roshetta and their Add and Edit screens return to their door', () => {
  const home = coldStart('/')
  home.open('/drugs/group/5'); home.back(); home.settle(); home.advance(1000)
  assert.equal(home.path, '/')
  home.open('/drugs/browse/groups', 'see-all'); home.back(); home.settle(); home.advance(1000)
  assert.equal(home.path, '/')
  const r = coldStart('/'); r.open('/roshetta/7'); r.open('/roshetta/7/edit'); r.advance(1000)
  r.back(); r.settle(); r.advance(1000)
  assert.equal(r.path, '/roshetta/7')
  r.open('/roshetta/7/add', 'add'); r.back()
  assert.equal(r.path, '/roshetta/7')
})

// ── K10 to K13: notifications ────────────────────────────────────────────────
test('K10: a notification with the app closed: Home, the page\'s parent, then the page; no duplicate Home', () => {
  const app = coldStart('/drugs/panadol')
  assert.deepEqual(app.paths, ['/', '/drugs', '/drugs/panadol'])
  assert.equal(app.path, '/drugs/panadol')
  assert.equal(backToHome(app), 2) // Back twice reaches Home
  const editor = coldStart('/roshetta/7/edit')
  assert.deepEqual(editor.paths, ['/', '/roshetta/7', '/roshetta/7/edit'])
  const roshetta = coldStart('/roshetta/7')
  assert.deepEqual(roshetta.paths, ['/', '/roshetta/7'])
  assert.equal(roshetta.paths.filter(p => p === '/').length, 1)
})

test('K10 (app just started on Home, then a notification): the same stack, no duplicate Home', async () => {
  const app = coldStart('/')
  assert.equal(await app.openLink('/capsula/drugs/panadol'), 'opened')
  assert.deepEqual(app.paths, ['/', '/drugs', '/drugs/panadol'])
})

test('K11: a notification with the app open on a main screen opens on top; Back returns to that screen', async () => {
  const app = coldStart('/')
  app.tapTab('/favourites')
  assert.equal(await app.openLink('/roshetta/7'), 'opened')
  assert.deepEqual(app.paths, ['/favourites', '/roshetta/7'])
  app.back()
  assert.equal(app.path, '/favourites')
})

test('K12: a notification with unsaved changes asks Leave or Stay first', async () => {
  const app = coldStart('/'); app.open('/roshetta/7'); app.open('/roshetta/7/edit')
  app.unsaved = true
  const before = app.paths.slice()
  const pending = app.openLink('/drugs/panadol')
  await Promise.resolve(); await Promise.resolve()
  assert.ok(app.asked, 'the question is asked')
  assert.deepEqual(app.paths, before) // nothing moved yet
  app.asked.stay()
  assert.equal(await pending, 'stayed')
  assert.deepEqual(app.paths, before)
  app.asked = null
  const second = app.openLink('/drugs/panadol')
  await Promise.resolve(); await Promise.resolve()
  app.asked.leave()
  assert.equal(await second, 'opened')
  assert.equal(app.path, '/drugs/panadol')
})

test('K13: a notification with a sheet open closes the sheet first, then opens the page', async () => {
  const app = coldStart('/drugs')
  app.sheetOpen = true
  assert.equal(await app.openLink('/drugs/panadol'), 'opened')
  assert.equal(app.sheetOpen, false)
  assert.equal(app.path, '/drugs/panadol')
})

// ── K14, K15: shared pages ───────────────────────────────────────────────────
test('K14: a shared link with nothing behind it has no Back arrow; with something behind it, it has one', () => {
  for (const url of ['/g/abc', '/r/abc']) {
    const alone = coldStart(url)
    assert.equal(laysBehind(url), false)
    assert.deepEqual(alone.paths, [url])
    assert.equal(hasStepBehind(alone.browser.state), false)
  }
  const fromHome = coldStart('/'); fromHome.open('/g/abc')
  assert.equal(hasStepBehind(fromHome.browser.state), true)
})

test('K15: a drug opened from a shared page returns to the shared page', () => {
  const app = coldStart('/r/abc')
  app.open('/drugs/panadol'); app.back()
  assert.equal(app.path, '/r/abc')
})

// ── K17 to K19: addresses ────────────────────────────────────────────────────
test('K17: a refresh on a deep address keeps the same screen with a screen behind it, and adds nothing', () => {
  const app = coldStart('/drugs/panadol')
  const refreshed = startApp(app.browser) // same browser history, the app starts again
  assert.deepEqual(refreshed.paths, ['/', '/drugs', '/drugs/panadol'])
  assert.equal(refreshed.path, '/drugs/panadol')
  const reopened = coldStart('/conditions/asthma') // installed app reopened on a deep address
  assert.deepEqual(reopened.paths, ['/', '/conditions', '/conditions/asthma'])
})

test('K19: an unknown address matches no screen (the router draws the not-available screen)', () => {
  for (const url of ['/nope', '/roshetta', '/drugs/a/b/c']) assert.equal(matchScreen(url), null, url)
  assert.deepEqual(coldStart('/nope').paths, ['/nope'])
})

// ── K20 to K22, K24: the order of Back ───────────────────────────────────────
test('K20: Back with the keyboard open closes the keyboard; the screen and steps stay', () => {
  const app = coldStart('/'); app.open('/drugs/panadol'); app.keyboardOpen = true
  const before = app.paths.slice()
  assert.equal(app.back(), 'keyboard')
  assert.deepEqual(app.paths, before)
  assert.equal(app.keyboardOpen, false)
})

test('K21: Back with a sheet, or a layer in a sheet, closes only that', () => {
  const app = coldStart('/drugs'); app.sheetOpen = true; app.layerOpen = true
  assert.equal(app.back(), 'layer'); assert.equal(app.sheetOpen, true)
  assert.equal(app.back(), 'sheet'); assert.equal(app.sheetOpen, false)
  assert.deepEqual(app.paths, ['/', '/drugs'])
  assert.equal(app.back(), 'home')
})

test('K22: Back with unsaved work asks first; Stay keeps the screen, Leave goes back one step', () => {
  const app = coldStart('/'); app.open('/roshetta/7'); app.open('/roshetta/7/edit'); app.unsaved = true
  app.advance(1000)
  assert.equal(app.back(), 'unsaved')
  assert.equal(app.path, '/roshetta/7/edit')
  app.asked = null // Stay
  assert.equal(app.back(), 'unsaved')
  app.asked() // Leave
  assert.equal(app.path, '/roshetta/7')
})

test('K24: Back pressed fast moves one screen per press and never skips one', () => {
  const app = coldStart('/'); app.tapTab('/drugs'); app.open('/drugs/panadol'); app.open('/drugs/generic/paracetamol', 'alt'); app.advance(1000)
  const at = app.browser.index
  assert.equal(app.back(), 'screen')
  assert.equal(app.back(), 'ignored') // a second press before the first has settled
  assert.equal(app.back(), 'ignored')
  assert.equal(app.browser.index, at - 1)
  app.settle(); app.advance(1000)
  assert.equal(app.back(), 'screen')
  assert.equal(app.path, '/drugs')
})

// ── K25, K32 ─────────────────────────────────────────────────────────────────
test('K25: signed out on a signed-in-only screen goes Home by replacing it, with no loop', () => {
  const app = coldStart('/'); app.open('/roshetta/7')
  const length = app.browser.entries.length
  app.signOut()
  assert.equal(app.path, '/')
  assert.equal(app.browser.entries.length, length)
  app.signOut() // already on a public screen: nothing more happens
  assert.equal(app.path, '/')
  assert.equal(needsSignIn('/drugs/panadol'), false)
})

test('K32: every screen the app knows has a name for its title and Back label', () => {
  for (const url of ['/', '/conditions', '/drugs', '/favourites', '/account', '/drugs/browse/groups', '/roshetta/7', '/roshetta/7/edit', '/account/faq', '/account/settings', '/g/abc', '/r/abc']) {
    assert.ok(labelForPath(url), url)
    assert.ok(matchScreen(url), url)
  }
  assert.equal(isMainScreen('/drugs'), true)
})

// ── What stays a phone check ─────────────────────────────────────────────────
const phoneOnly = {
  K6:  'the alternatives rule lives in the drug page, not in a plain rule file',
  K16: 'needs the real sign-in round trip (covered by signInReturn.check.js and your phone check)',
  K18: 'needs real item data (a deleted or expired item)',
  K23: 'needs the real offline and maintenance screens',
  K26: 'needs the real profile setup screen',
  K27: 'needs the app to be sent to the background for a long time',
  K28: 'the Android Back button, the gesture and the preview (the full native build)',
  K29: 'the installed PWA on Android',
  K30: 'the iPhone PWA and its edge swipe',
  K31: 'the website\'s extra guard steps and the browser\'s Forward button',
}
for (const [k, why] of Object.entries(phoneOnly)) test(`${k}: phone check`, { skip: why }, () => {})
