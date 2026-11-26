// node --test src/lib/remoteConfig.check.js  (npm run config:check)
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateConfig, readSavedConfig, chooseServer, refreshRemoteConfig, messageToShow, markMessageSeen,
  CONFIG_STORAGE_KEY,
} from './remoteConfig.js'

const KEY = 'k'.repeat(40)
const BUILT = { url: 'https://abc.supabase.co', anon: KEY }
function memory() {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }
}
const ok = body => async () => ({ ok: true, json: async () => body })

test('validateConfig accepts a good pair and tidies the address', () => {
  const c = validateConfig({ v: 1, url: 'https://new.example.com/', anon: KEY, message: ' hi ' })
  assert.deepEqual(c, { url: 'https://new.example.com', anon: KEY, message: 'hi' })
})

test('validateConfig refuses anything unusable', () => {
  assert.equal(validateConfig(null), null)
  assert.equal(validateConfig({ v: 2, url: 'https://a.b', anon: KEY }), null)
  assert.equal(validateConfig({ v: 1, url: 'http://a.b', anon: KEY }), null)
  assert.equal(validateConfig({ v: 1, url: 'https://u:p@a.b', anon: KEY }), null)
  assert.equal(validateConfig({ v: 1, url: 'not a url', anon: KEY }), null)
  assert.equal(validateConfig({ v: 1, url: 'https://a.b', anon: 'short' }), null)
  assert.equal(validateConfig({ v: 1, url: 'https://a.b', anon: 'has space ' + KEY }), null)
})

test('chooseServer uses the built-in pair when nothing is saved or storage is broken', () => {
  assert.equal(chooseServer(BUILT, memory()).source, 'built-in')
  assert.equal(chooseServer(BUILT, null).source, 'built-in')
  const bad = { getItem() { throw new Error('no') } }
  assert.equal(chooseServer(BUILT, bad).source, 'built-in')
})

test('a saved pair wins; a damaged saved pair is ignored', () => {
  const s = memory()
  s.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ v: 1, url: 'https://new.example.com', anon: KEY, message: '' }))
  assert.equal(chooseServer(BUILT, s).url, 'https://new.example.com')
  s.setItem(CONFIG_STORAGE_KEY, '{oops')
  assert.equal(chooseServer(BUILT, s).source, 'built-in')
  assert.equal(readSavedConfig(s), null)
})

test('refresh saves a different good pair and reports it changed', async () => {
  const s = memory()
  const r = await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: 'https://new.example.com', anon: KEY }), storage: s, builtIn: BUILT })
  assert.equal(r.changed, true)
  assert.equal(chooseServer(BUILT, s).url, 'https://new.example.com')
  const again = await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: 'https://new.example.com', anon: KEY }), storage: s, builtIn: BUILT })
  assert.equal(again.changed, false)
})

test('refresh keeps what the phone had on any problem', async () => {
  const s = memory()
  await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: 'https://new.example.com', anon: KEY }), storage: s, builtIn: BUILT })
  const down = await refreshRemoteConfig({ fetchFn: async () => { throw new Error('offline') }, storage: s, builtIn: BUILT })
  const bad = await refreshRemoteConfig({ fetchFn: ok({ v: 9 }), storage: s, builtIn: BUILT })
  const notOk = await refreshRemoteConfig({ fetchFn: async () => ({ ok: false }), storage: s, builtIn: BUILT })
  assert.equal(down.changed || bad.changed || notOk.changed, false)
  assert.equal(chooseServer(BUILT, s).url, 'https://new.example.com')
})

test('a file that names the built-in pair removes the override', async () => {
  const s = memory()
  await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: 'https://new.example.com', anon: KEY }), storage: s, builtIn: BUILT })
  const back = await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: 'https://abc.supabase.co/', anon: KEY }), storage: s, builtIn: BUILT })
  assert.equal(back.changed, true)
  assert.equal(chooseServer(BUILT, s).source, 'built-in')
})

test('a message shows once, and again only when its text changes', async () => {
  const s = memory()
  await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: BUILT.url, anon: KEY, message: 'Back at 5pm' }), storage: s, builtIn: BUILT })
  assert.equal(messageToShow(s), 'Back at 5pm')
  markMessageSeen(s, 'Back at 5pm')
  assert.equal(messageToShow(s), '')
  await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: BUILT.url, anon: KEY, message: 'Back at 6pm' }), storage: s, builtIn: BUILT })
  assert.equal(messageToShow(s), 'Back at 6pm')
  await refreshRemoteConfig({ fetchFn: ok({ v: 1, url: BUILT.url, anon: KEY, message: '' }), storage: s, builtIn: BUILT })
  assert.equal(messageToShow(s), '')
})
