import test from 'node:test'
import assert from 'node:assert/strict'

import { decidePlan, manifestProblems, HEADERS_FILE } from './catalog-publish.mjs'

const published = { catalogFormat: 1, schemaVersion: 'abc', drugsUpdatedAt: '2026-11-13T02:55:05' }
const now = { published, drugsUpdatedAt: '2026-11-13T02:55:05', schemaVersion: 'abc', catalogFormat: 1, force: false }

test('nothing published yet means build', () => {
  assert.equal(decidePlan({ ...now, published: null }).needsBuild, true)
})
test('same stamp, format and shape means no build', () => {
  assert.equal(decidePlan(now).needsBuild, false)
})
test('a moved stamp means build', () => {
  assert.equal(decidePlan({ ...now, drugsUpdatedAt: '2026-11-14T00:00:00' }).needsBuild, true)
})
test('a changed list shape or file format means build', () => {
  assert.equal(decidePlan({ ...now, schemaVersion: 'zzz' }).needsBuild, true)
  assert.equal(decidePlan({ ...now, catalogFormat: 2 }).needsBuild, true)
})
test('force always builds, a manifest with no stamp builds', () => {
  assert.equal(decidePlan({ ...now, force: true }).needsBuild, true)
  assert.equal(decidePlan({ ...now, published: { ...published, drugsUpdatedAt: undefined } }).needsBuild, true)
})

const local = {
  builtAt: 'T1', drugsUpdatedAt: 'S', auditCursor: 'C',
  chunks: [{ index: 0, file: 'chunk-00.aaa.json', hash: 'h0' }, { index: 1, file: 'chunk-01.bbb.json', hash: 'h1' }],
}
test('a live manifest equal to the built one has no problems', () => {
  assert.deepEqual(manifestProblems(local, JSON.parse(JSON.stringify(local))), [])
})
test('an older live manifest, a different chunk or an unreadable manifest is caught', () => {
  assert.ok(manifestProblems(local, { ...local, builtAt: 'T0' }).length > 0)
  assert.ok(manifestProblems(local, { ...local, chunks: [local.chunks[0]] }).length > 0)
  assert.ok(manifestProblems(local, { ...local, chunks: [{ ...local.chunks[0], hash: 'x' }, local.chunks[1]] }).length > 0)
  assert.deepEqual(manifestProblems(local, null), ['the live manifest could not be read'])
})

test('the headers file allows other websites and caches chunks for ever, not the manifest', () => {
  assert.match(HEADERS_FILE, /Access-Control-Allow-Origin: \*/)
  assert.match(HEADERS_FILE, /\/manifest\.json\n  Cache-Control: no-cache/)
  assert.match(HEADERS_FILE, /\/chunk-\*\n  Cache-Control: public, max-age=31536000, immutable/)
})

// S10: the remote address book file
import { buildConfigFile, configMatches } from './catalog-publish.mjs'
test('buildConfigFile writes the pair and refuses a bad pair', () => {
  const key = 'k'.repeat(40)
  const ok = JSON.parse(buildConfigFile({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: key }))
  assert.deepEqual(ok, { v: 1, url: 'https://abc.supabase.co', anon: key })
  assert.throws(() => buildConfigFile({ VITE_SUPABASE_URL: 'http://abc', VITE_SUPABASE_ANON_KEY: key }))
  assert.throws(() => buildConfigFile({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'x' }))
})

// 2026-11-27: a changed key or address republishes config.json by itself
test('a config.json that differs from the pair in use means build', () => {
  assert.equal(decidePlan({ ...now, configMatches: false }).needsBuild, true)
  assert.equal(decidePlan({ ...now, configMatches: true }).needsBuild, false)
  assert.equal(decidePlan(now).needsBuild, false)
})
test('configMatches compares address and key, and treats an unreadable file as different', () => {
  const key = 'k'.repeat(40)
  const env = { VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: key }
  assert.equal(configMatches({ v: 1, url: 'https://abc.supabase.co', anon: key }, env), true)
  assert.equal(configMatches({ v: 1, url: 'https://abc.supabase.co/', anon: key }, env), true)
  assert.equal(configMatches({ v: 1, url: 'https://abc.supabase.co', anon: 'o'.repeat(40) }, env), false)
  assert.equal(configMatches({ v: 1, url: 'https://zzz.supabase.co', anon: key }, env), false)
  assert.equal(configMatches(null, env), false)
})
