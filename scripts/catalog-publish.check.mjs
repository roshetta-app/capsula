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
