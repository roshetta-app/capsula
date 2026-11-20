// Checks for navRules.js (Roshetta plan, Phase K, step 12.2). Run with: node --test src/utils/navRules.check.js
// Plain-file checks, no browser. They also read router.jsx and the screen files as text, so the
// rulebook cannot drift away from the real route list or from today's per-screen parent guesses.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SCREENS, HOME_PATH, matchScreen, fillPattern, parentPath, parentChain, labelForPath,
  kindOf, needsSignIn, laysBehind, isMainScreen,
} from './navRules.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const params = (pattern) => [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1])
// A made-up real address for a pattern: '/roshetta/:id/edit' -> '/roshetta/7/edit'.
const sample = (pattern) => pattern.replace(/:(\w+)/g, (_, n) => `${n}-7`)

// The public routes and their screens, read from router.jsx (the admin tree is not part of this).
function publicRoutes() {
  const src = read('../router.jsx')
  const body = src.slice(src.indexOf('export function PublicRoutes'), src.indexOf('export function AdminRoutes'))
  const imports = Object.fromEntries([...src.matchAll(/import (\w+)\s+from '\.\/pages\/(\w+)'/g)].map((m) => [m[1], m[2]]))
  // Step 12.5: the catch-all and the four reserved words go to UnknownAddressScreen. They are not
  // screens with a place in the rulebook (they send the person elsewhere or say "not available"),
  // so they are left out here; addressFixes.check.js checks that each one has its route.
  return [...body.matchAll(/path="([^"]+)"\s+element=\{<(\w+)/g)]
    .map((m) => ({ path: m[1], file: imports[m[2]] }))
    .filter((r) => r.file !== 'UnknownAddressScreen')
}

test('every public route in router.jsx has a rule, and every rule has a route', () => {
  const routes = publicRoutes().map((r) => r.path).sort()
  const rules = SCREENS.map((s) => s.pattern).sort()
  assert.ok(routes.length >= 20, 'router.jsx was read')
  assert.deepEqual(rules, routes)
})

test('table is well formed: one Home, every parent is a real rule, parents only use the page\'s own names', () => {
  const patterns = new Set(SCREENS.map((s) => s.pattern))
  assert.equal(patterns.size, SCREENS.length, 'no pattern twice')
  assert.deepEqual(SCREENS.filter((s) => s.parent === null).map((s) => s.pattern), [HOME_PATH])
  for (const s of SCREENS) {
    assert.ok(['main', 'page', 'edit'].includes(s.kind), s.pattern)
    assert.equal(typeof s.signIn, 'boolean', s.pattern)
    assert.equal(typeof s.laysBehind, 'boolean', s.pattern)
    if (s.parent !== null) {
      assert.ok(patterns.has(s.parent), `${s.pattern}: parent ${s.parent} is not a rule`)
      for (const n of params(s.parent)) assert.ok(params(s.pattern).includes(n), `${s.pattern}: parent needs :${n}`)
    }
  }
})

test('no parent chain loops, and every one ends at Home within five steps', () => {
  const byPattern = Object.fromEntries(SCREENS.map((s) => [s.pattern, s]))
  for (const s of SCREENS) {
    const seen = [s.pattern]
    let cur = s
    while (cur.parent !== null) {
      assert.ok(!seen.includes(cur.parent), `${s.pattern}: loop at ${cur.parent}`)
      seen.push(cur.parent)
      cur = byPattern[cur.parent]
      assert.ok(seen.length <= 5, `${s.pattern}: chain too long`)
    }
    assert.equal(cur.pattern, HOME_PATH, s.pattern)
    // the same through real addresses
    const chain = parentChain(sample(s.pattern))
    assert.ok(chain, `${s.pattern}: no chain`)
    assert.equal(chain[chain.length - 1], HOME_PATH)
    assert.equal(chain.length, seen.length)
  }
})

test('stacks of the screens that matter', () => {
  assert.deepEqual(parentChain('/roshetta/7/edit'), ['/roshetta/7/edit', '/roshetta/7', '/'])
  assert.deepEqual(parentChain('/roshetta/7/add'), ['/roshetta/7/add', '/roshetta/7', '/'])
  assert.deepEqual(parentChain('/drugs/group/abc/add'), ['/drugs/group/abc/add', '/drugs/group/abc', '/'])
  assert.deepEqual(parentChain('/drugs/motinorm'), ['/drugs/motinorm', '/drugs', '/'])
  assert.deepEqual(parentChain('/drugs/generic/paracetamol'), ['/drugs/generic/paracetamol', '/drugs', '/'])
  assert.deepEqual(parentChain('/conditions/gout'), ['/conditions/gout', '/conditions', '/'])
  assert.deepEqual(parentChain('/account/edit'), ['/account/edit', '/account', '/'])
  assert.deepEqual(parentChain('/g/abc'), ['/g/abc', '/'])
  assert.deepEqual(parentChain('/'), ['/'])
  for (const p of ['/conditions', '/drugs', '/favourites', '/account']) assert.deepEqual(parentChain(p), [p, '/'], p)
  assert.equal(parentPath('/'), null)
  assert.equal(parentPath('/nowhere'), null)
})

// Step 12.3: the 12 screens that used to name their own parent (useDeepLinkParent) now call it
// with nothing, and the parent comes from the table. Each of them must be a rule that lays
// screens behind it, and nothing may use the old "first screen" flag any more.
test('the 12 screens ask the rulebook for their parent, with no argument', () => {
  let found = 0
  for (const { path, file } of publicRoutes()) {
    if (!file) continue
    const src = read(`../pages/${file}.jsx`)
    assert.ok(!/markScreenMounted/.test(src), `${file}: old flag still used`)
    const call = src.match(/^\s*useDeepLinkParent\((.*)\)\s*$/m)
    if (!call) continue
    found++
    assert.equal(call[1].trim(), '', `${file}: still names its own parent`)
    assert.equal(SCREENS.find((s) => s.pattern === path).laysBehind, true, path)
  }
  assert.equal(found, 12)
})

// Frozen copy of the label function as it was before 12.2 (homePaths.js), so we can prove the
// names did not change for any real screen.
function legacyLabel(path) {
  if (!path) return null
  if (path === '/') return 'Home'
  if (path === '/conditions') return 'Topics'
  if (path === '/drugs') return 'Drugs'
  if (path.startsWith('/drugs/category/')) return 'Category'
  if (path === '/drugs/browse/category') return 'Categories'
  if (path === '/drugs/browse/class') return 'Classes'
  if (path === '/drugs/browse/groups') return 'My groups'
  if (/^\/drugs\/group\/[^/]+\/add$/.test(path)) return 'Add drugs'
  if (path.startsWith('/drugs/group/') || path.startsWith('/g/')) return 'Group'
  if (path.startsWith('/r/')) return 'Roshetta'
  if (path === '/roshettas') return 'My roshettas'
  if (path.startsWith('/drugs/generic/')) return 'Generic'
  if (path.startsWith('/drugs/')) return 'Drug'
  if (path.startsWith('/conditions/')) return 'Topic'
  if (path === '/favourites') return 'Favourites'
  if (path === '/account') return 'Account'
  // Step 12.8 named the five screens that had no name before.
  if (/^\/roshetta\/[^/]+$/.test(path)) return 'Roshetta'
  if (/^\/roshetta\/[^/]+\/add$/.test(path)) return 'Add drugs'
  if (/^\/roshetta\/[^/]+\/edit$/.test(path)) return 'Editor'
  if (path === '/account/edit') return 'Edit profile'
  if (path === '/account/faq') return 'FAQ'
  return null
}

test('names are the same as before for every real screen', () => {
  for (const s of SCREENS) {
    const p = sample(s.pattern)
    assert.equal(labelForPath(p), legacyLabel(p), p)
  }
  // addresses that read as a drug with that name today (step 12.5 will send them elsewhere)
  for (const p of ['/drugs/browse', '/drugs/group', '/drugs/category', '/drugs/generic']) {
    assert.equal(labelForPath(p), legacyLabel(p), p)
  }
  assert.equal(labelForPath('/nowhere'), null)
  assert.equal(labelForPath(undefined), null)
  assert.equal(labelForPath(''), null)
})

test('matching: fixed parts beat changing parts, case and a trailing slash do not matter', () => {
  assert.equal(matchScreen('/drugs/generic/x').rule.pattern, '/drugs/generic/:slug')
  assert.equal(matchScreen('/drugs/group/5').rule.pattern, '/drugs/group/:groupId')
  assert.equal(matchScreen('/drugs/browse/groups').rule.pattern, '/drugs/browse/groups')
  assert.equal(matchScreen('/drugs/browse/category').rule.pattern, '/drugs/browse/category')
  assert.equal(matchScreen('/drugs/category/all').rule.pattern, '/drugs/category/:categorySlug')
  assert.equal(matchScreen('/drugs/panadol').rule.pattern, '/drugs/:slug')
  assert.deepEqual(matchScreen('/roshetta/42/edit').params, { id: '42' })
  assert.equal(matchScreen('/Drugs/').rule.pattern, '/drugs')
  assert.equal(matchScreen('/roshetta/42?x=1').rule.pattern, '/roshetta/:id')
  assert.equal(matchScreen('/').rule.pattern, '/')
})

test('addresses with no screen match nothing (12.5 will give them a clear screen)', () => {
  for (const p of ['/xyz', '/roshetta', '/g', '/r', '/favorites', '/home', '/account/foo', '/drugs/browse/other', '/admin', '', 'drugs', null, undefined]) {
    assert.equal(matchScreen(p), null, String(p))
  }
  // read as a drug with that name today
  for (const p of ['/drugs/browse', '/drugs/group', '/drugs/category']) assert.equal(matchScreen(p).rule.pattern, '/drugs/:slug', p)
})

test('kinds, sign-in and shared pages', () => {
  const main = SCREENS.filter((s) => s.kind === 'main').map((s) => s.pattern).sort()
  assert.deepEqual(main, ['/', '/account', '/conditions', '/drugs', '/favourites'])
  for (const p of ['/', '/conditions', '/drugs', '/favourites', '/account']) assert.equal(isMainScreen(p), true, p)
  for (const p of ['/conditions/x', '/drugs/x', '/roshettas', '/account/edit', '/admin', '/nowhere']) assert.equal(isMainScreen(p), false, p)
  assert.equal(kindOf('/roshetta/1/edit'), 'edit')
  assert.equal(kindOf('/drugs/group/1/add'), 'edit')
  assert.equal(kindOf('/drugs/x'), 'page')
  assert.equal(kindOf('/nowhere'), null)
  // signed-in only: groups, roshettas, account edit; open to guests: everything else
  const signIn = SCREENS.filter((s) => s.signIn).map((s) => s.pattern).sort()
  assert.deepEqual(signIn, [
    '/account/edit', '/drugs/group/:groupId', '/drugs/group/:groupId/add', '/roshetta/:id',
    '/roshetta/:id/add', '/roshetta/:id/edit', '/roshettas',
  ])
  assert.equal(needsSignIn('/roshetta/9'), true)
  assert.equal(needsSignIn('/g/abc'), false)
  assert.equal(needsSignIn('/nowhere'), false)
  // shared pages stand alone; everything else gets its parent behind it
  assert.deepEqual(SCREENS.filter((s) => !s.laysBehind).map((s) => s.pattern).sort(), ['/g/:code', '/r/:code'])
  assert.equal(laysBehind('/g/abc'), false)
  assert.equal(laysBehind('/drugs/x'), true)
  assert.equal(laysBehind('/nowhere'), false)
})

test('fillPattern puts values in, and says null when one is missing', () => {
  assert.equal(fillPattern('/roshetta/:id/add', { id: '3' }), '/roshetta/3/add')
  assert.equal(fillPattern('/roshetta/:id/add', {}), null)
  assert.equal(fillPattern('/drugs', {}), '/drugs')
})
