// Checks for scripts/build-catalog.mjs against a fake Supabase server (Track S, S2.1).
// Run with: node --test scripts/build-catalog.check.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

import { runBuild, assertPublicKey, CATALOG_FORMAT } from './build-catalog.mjs'
import { startMockSupabase } from './catalogMockServer.mjs'
import { makeTables } from './catalogFixture.mjs'
import { FLAT_DRUG_SCHEMA_VERSION } from '../src/lib/queries.js'
import { flattenChunks, chunkIndexFor, CATALOG_COLUMNS } from '../src/utils/catalogChunks.js'

const ANON = 'test-public-key'
const STAMP = '2026-11-25T01:00:00.000Z'
const AUDIT = [
  { id: 1, action: 'update', table_name: 'brands', record_id: 'x', created_at: '2026-11-24T20:00:00.000Z' },
  { id: 2, action: 'update', table_name: 'generics', record_id: 'y', created_at: '2026-11-24T23:20:00.000Z' },
  { id: 3, action: 'update', table_name: 'profiles', record_id: 'z', created_at: '2026-11-25T00:00:00.000Z' },   // not a watched table
]

async function withMock(opts, fn) {
  const mock = await startMockSupabase(opts)
  const supabase = createClient(mock.url, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const outDir = path.join(await mkdtemp(path.join(os.tmpdir(), 'catalog-')), 'out')
  const lines = []
  try { return await fn({ mock, supabase, outDir, log: m => lines.push(m), lines }) } finally { await mock.close() }
}

const exists = p => access(p).then(() => true, () => false)
const sha = t => createHash('sha256').update(t).digest('hex')
const BIG = makeTables({ generics: 700, brands: 2300 })

test('a clean build: paging past 1000 rows, 32 chunks, a correct manifest, files that match their hashes', async () => {
  await withMock({ tables: BIG, getStamp: () => STAMP, auditRows: AUDIT }, async ({ mock, supabase, outDir, log, lines }) => {
    const { manifest } = await runBuild({ supabase, outDir, log })

    assert.equal(manifest.catalogFormat, CATALOG_FORMAT)
    assert.equal(manifest.schemaVersion, FLAT_DRUG_SCHEMA_VERSION)
    assert.equal(manifest.drugsUpdatedAt, STAMP)
    assert.equal(manifest.auditCursor, '2026-11-24T23:20:00.000Z', 'newest row of a WATCHED table')
    assert.equal(manifest.chunkCount, 32)
    assert.equal(manifest.chunks.length, 32)
    assert.ok(Date.parse(manifest.builtAt) > 0)

    const files = (await readdir(outDir)).sort()
    assert.equal(files.length, 33)
    assert.ok(files.includes('manifest.json'))
    const chunks = []
    for (const c of manifest.chunks) {
      const text = await readFile(path.join(outDir, c.file), 'utf8')
      assert.equal(sha(text), c.hash)
      assert.equal(Buffer.byteLength(text), c.bytes)
      assert.ok(c.file.includes(c.hash.slice(0, 12)), 'named by its content hash')
      const parsed = JSON.parse(text)
      assert.equal(parsed.length, c.generics)
      for (const g of parsed) assert.equal(chunkIndexFor(g.id), c.index, 'each generic is in its own chunk')
      chunks.push(parsed)
    }
    assert.equal(manifest.totals.generics, chunks.flat().length)
    const flat = flattenChunks(chunks)
    assert.equal(flat.length, manifest.totals.brands)
    assert.ok(flat.length > 2000 && flat.length < 2310, `rows: ${flat.length}`)

    const text = (await Promise.all(manifest.chunks.map(c => readFile(path.join(outDir, c.file), 'utf8')))).join('')
    assert.ok(!text.includes('internal_note') && !text.includes('generic_id') && !text.includes('formulation_id'))
    assert.deepEqual(Object.keys(chunks.flat()[0]).filter(k => k !== 'formulations'), CATALOG_COLUMNS.generic)

    assert.ok(lines.some(l => l.startsWith('Check passed: all ')), 'the comparison ran and passed')
    assert.ok(lines.some(l => l.includes('gzip')), 'sizes reported')
    assert.ok(mock.stats.nestedRequests >= 3, 'today\'s download was fetched (3 pages of 1000)')
    assert.deepEqual([...mock.stats.apikeys], [ANON], 'only the public key was used')
  })
})

test('TAMPER 1: one brand price changed in the Supabase download stops the build and writes nothing', async () => {
  const tamper = rows => { const r = structuredClone(rows); if (r.length && r[0].price !== undefined) r[0] = { ...r[0], price: r[0].price + 1 }; return r }
  await withMock({ tables: BIG, getStamp: () => STAMP, auditRows: AUDIT, nestedTransform: tamper }, async ({ supabase, outDir, log }) => {
    await mkdir(outDir, { recursive: true })
    await writeFile(path.join(outDir, 'previous-good.txt'), 'keep me')
    await assert.rejects(runBuild({ supabase, outDir, log }), err => {
      assert.match(err.message, /do NOT match/)
      assert.match(err.message, /different: 3/, 'the first brand of each of the 3 pages was changed')
      assert.match(err.message, /fields: price/)
      return true
    })
    assert.deepEqual(await readdir(outDir), ['previous-good.txt'], 'the earlier output is untouched, nothing new written')
  })
})

test('TAMPER 2: a missing row and an extra row are both caught', async () => {
  const dropFirst = rows => rows.slice(1)
  await withMock({ tables: BIG, getStamp: () => STAMP, auditRows: AUDIT, nestedTransform: dropFirst }, async ({ supabase, outDir, log }) => {
    await assert.rejects(runBuild({ supabase, outDir, log }), /only in new files: 3/)   // the 3 dropped rows exist in the new files
    assert.equal(await exists(outDir), false)
  })
  let extraN = 0
  const extra = rows => [...rows, { ...rows[0], id: `ffffffff-0000-4000-8000-00000000000${++extraN}` }]
  await withMock({ tables: BIG, getStamp: () => STAMP, auditRows: AUDIT, nestedTransform: extra }, async ({ supabase, outDir, log }) => {
    await assert.rejects(runBuild({ supabase, outDir, log }), /only in Supabase download: 3/)
    assert.equal(await exists(outDir), false)
  })
})

test('the version stamp moving while reading: it starts again, and gives up after 3 tries', async () => {
  // moves on the first attempt only
  let reads = 0
  await withMock({ tables: makeTables(), getStamp: () => `2026-11-25T01:00:0${reads++ < 2 ? reads : 9}Z`, auditRows: AUDIT }, async ({ supabase, outDir, log, lines }) => {
    await runBuild({ supabase, outDir, log })
    assert.ok(lines.some(l => l.startsWith('Attempt 2')), lines.join('\n'))
  })
  // never settles
  let n = 0
  await withMock({ tables: makeTables(), getStamp: () => `stamp-${n++}`, auditRows: AUDIT }, async ({ supabase, outDir, log }) => {
    await assert.rejects(runBuild({ supabase, outDir, log }), /kept changing while reading/)
    assert.equal(await exists(outDir), false)
  })
})

test('one price edit changes exactly one chunk file between two builds', async () => {
  const t1 = makeTables({ generics: 300, brands: 900 })
  const t2 = structuredClone(t1)
  t2.brands[400].price += 1
  const run = tables => withMock({ tables, getStamp: () => STAMP, auditRows: AUDIT }, ({ supabase, outDir, log }) => runBuild({ supabase, outDir, log }))
  const a = (await run(t1)).manifest
  const b = (await run(t2)).manifest
  const changed = a.chunks.filter((c, i) => c.file !== b.chunks[i].file)
  assert.equal(changed.length, 1)
  const form = t1.formulations.find(f => f.id === t1.brands[400].formulation_id)
  assert.equal(changed[0].index, chunkIndexFor(form.generic_id))
})

test('--no-compare builds without downloading the flat list, and says the files are not to be published', async () => {
  await withMock({ tables: makeTables(), getStamp: () => STAMP, auditRows: AUDIT }, async ({ mock, supabase, outDir, log, lines }) => {
    await runBuild({ supabase, outDir, log, compare: false })
    assert.equal(mock.stats.nestedRequests, 0)
    assert.ok(lines.some(l => l.includes('SKIPPED')))
  })
})

test('an empty catalog is refused, never published as a valid empty set', async () => {
  const empty = { generics: [], formulations: [], brands: [] }
  await withMock({ tables: empty, getStamp: () => STAMP, auditRows: AUDIT }, async ({ supabase, outDir, log }) => {
    await assert.rejects(runBuild({ supabase, outDir, log }), /no published drugs/)
    assert.equal(await exists(outDir), false)
  })
})

test('only the public key is accepted', () => {
  const jwt = role => `h.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.s`
  assert.doesNotThrow(() => assertPublicKey(jwt('anon')))
  assert.doesNotThrow(() => assertPublicKey('sb_publishable_abc'))
  assert.throws(() => assertPublicKey(jwt('service_role')), /service_role/)
  assert.throws(() => assertPublicKey('sb_secret_abc'), /secret key/)
})
