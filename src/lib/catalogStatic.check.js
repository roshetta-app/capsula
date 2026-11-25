// Checks for catalogStatic.js (Track S, step S2.3). Run with: node --test src/lib/catalogStatic.check.js
// No network: a small fake host answers for the files, a fake client answers for the switch row.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

import { FLAT_DRUG_SCHEMA_VERSION, mapFlatDrugRows } from './queries.js'
import { buildChunks, compareFlatLists, CATALOG_CHUNK_COUNT } from '../utils/catalogChunks.js'
import { makeTables } from '../../scripts/catalogFixture.mjs'
import { CATALOG_FORMAT as BUILD_FORMAT } from '../../scripts/build-catalog.mjs'
import {
  CATALOG_FORMAT, CATALOG_SWITCH_KEY, StaticCatalogError, fetchStaticCatalog, isStaticCatalogEnabled, manifestCanCatchUp,
} from './catalogStatic.js'

const sha256 = text => createHash('sha256').update(text).digest('hex')

/** What the publish workflow would put on the host for these tables: files by name, plus the manifest. */
function publish(tables, { stamp = '2026-11-20T10:00:00', cursor = '2026-11-20T09:59:00+00:00', builtAt = '2026-11-20T10:01:00.000Z' } = {}) {
  const { chunks, stats } = buildChunks(tables, CATALOG_CHUNK_COUNT)
  const files = new Map()
  const entries = chunks.map((chunk, index) => {
    const text = JSON.stringify(chunk)
    const hash = sha256(text)
    const file = `chunk-${String(index).padStart(2, '0')}.${hash.slice(0, 12)}.json`
    files.set(file, text)
    return { index, file, hash, generics: chunk.length, bytes: Buffer.byteLength(text) }
  })
  const manifest = {
    catalogFormat: CATALOG_FORMAT,
    schemaVersion: FLAT_DRUG_SCHEMA_VERSION,
    drugsUpdatedAt: stamp,
    auditCursor: cursor,
    builtAt,
    chunkCount: CATALOG_CHUNK_COUNT,
    totals: { generics: stats.generics, formulations: stats.formulations, brands: stats.brands },
    chunks: entries,
  }
  return { files, manifest, stats }
}

/** A fake fetch. `host` is { manifest, files } and can be swapped while a test runs; `hooks` can override answers. */
function fakeHost(host, hooks = {}) {
  const calls = []
  let inFlight = 0
  let maxInFlight = 0
  const fetchImpl = async url => {
    const name = new URL(url).pathname.slice(1)
    calls.push(name)
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    try {
      await new Promise(r => setTimeout(r, 2))
      const override = hooks.answer?.(name, calls.filter(c => c === name).length)
      if (override) return override
      if (name === 'manifest.json') {
        return { ok: true, status: 200, json: async () => structuredClone(host.manifest), text: async () => JSON.stringify(host.manifest) }
      }
      if (host.files.has(name)) {
        return { ok: true, status: 200, text: async () => host.files.get(name) }
      }
      return { ok: false, status: 404, text: async () => 'not found' }
    } finally {
      inFlight--
    }
  }
  return { fetchImpl, calls, maxInFlight: () => maxInFlight }
}

const options = extra => ({ retryDelayMs: 0, ...extra })

test('the format number matches the build script, so the files and the app agree', () => {
  assert.equal(CATALOG_FORMAT, BUILD_FORMAT)
})

test('downloads every chunk and gives the same flat list the Supabase route gives, with the manifest stamp and bookmark', async () => {
  const tables = makeTables()
  const host = publish(tables)
  const progress = []
  const result = await fetchStaticCatalog({ ...options(), fetchImpl: fakeHost(host).fetchImpl, onProgress: (l, t) => progress.push([l, t]) })

  const direct = mapFlatDrugRows(directRows(tables))
  const cmp = compareFlatLists(direct, result.drugs)
  assert.equal(cmp.identical, true)
  assert.equal(result.drugs.length, host.stats.brands)
  assert.equal(result.drugsUpdatedAt, '2026-11-20T10:00:00')
  assert.equal(result.auditCursor, '2026-11-20T09:59:00+00:00')
  assert.deepEqual(progress[0], [0, CATALOG_CHUNK_COUNT])
  assert.deepEqual(progress[progress.length - 1], [CATALOG_CHUNK_COUNT, CATALOG_CHUNK_COUNT])
  assert.equal(progress.length, CATALOG_CHUNK_COUNT + 1)
})

test('never more than 4 chunks at a time', async () => {
  const host = publish(makeTables())
  const fake = fakeHost(host)
  await fetchStaticCatalog({ ...options(), fetchImpl: fake.fetchImpl })
  assert.ok(fake.maxInFlight() <= 4, `saw ${fake.maxInFlight()} at once`)
  assert.ok(fake.maxInFlight() >= 2, 'it should download in parallel')
})

test('a one-off server error on a chunk is retried and the download still works', async () => {
  const host = publish(makeTables())
  const target = host.manifest.chunks[5].file
  const fake = fakeHost(host, {
    answer: (name, nth) => (name === target && nth === 1 ? { ok: false, status: 503, text: async () => '' } : null),
  })
  const result = await fetchStaticCatalog({ ...options(), fetchImpl: fake.fetchImpl })
  assert.equal(result.drugs.length, host.stats.brands)
  assert.equal(fake.calls.filter(c => c === target).length, 2)
})

test('a chunk that is gone (404) makes it ask for the manifest again and use the new files', async () => {
  const oldPublish = publish(makeTables({ generics: 40, brands: 120 }))
  const newTables = makeTables({ generics: 44, brands: 140 })
  const newPublish = publish(newTables, { stamp: '2026-11-21T08:00:00', builtAt: '2026-11-21T08:01:00.000Z' })
  // The host starts with the old manifest, but the old chunk files are already deleted (a republish happened).
  const host = { manifest: oldPublish.manifest, files: new Map() }
  let manifestReads = 0
  const fake = fakeHost(host, {
    answer: name => {
      if (name === 'manifest.json') {
        manifestReads++
        if (manifestReads === 2) { host.manifest = newPublish.manifest; host.files = newPublish.files }
      }
      return null
    },
  })
  const result = await fetchStaticCatalog({ ...options(), fetchImpl: fake.fetchImpl })
  assert.equal(manifestReads, 2)
  assert.equal(result.drugsUpdatedAt, '2026-11-21T08:00:00')
  assert.equal(result.drugs.length, newPublish.stats.brands)
})

test('if the chunks are still gone after the second manifest, it gives up (the app then uses Supabase)', async () => {
  const p = publish(makeTables())
  const host = { manifest: p.manifest, files: new Map() }
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: fakeHost(host).fetchImpl }),
    err => err instanceof StaticCatalogError && err.code === 'chunk-gone',
  )
})

test('a chunk whose content does not match the manifest hash is never used', async () => {
  const p = publish(makeTables())
  const target = p.manifest.chunks[3].file
  const fake = fakeHost(p, {
    answer: name => (name === target ? { ok: true, status: 200, text: async () => '<html>a catch-all page</html>' } : null),
  })
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: fake.fetchImpl }),
    err => err instanceof StaticCatalogError && err.code === 'chunk-bad',
  )
})

test('a manifest the app cannot trust is refused', async () => {
  const good = publish(makeTables())
  const cases = [
    ['another file format', m => { m.catalogFormat = 99 }],
    ['another list shape', m => { m.schemaVersion = 'zzzz' }],
    ['no version stamp', m => { delete m.drugsUpdatedAt }],
    ['no bookmark', m => { m.auditCursor = null }],
    ['chunk count does not match the list', m => { m.chunkCount = 31 }],
    ['no drugs', m => { m.totals.brands = 0 }],
    ['a chunk with an odd file name', m => { m.chunks[0].file = '../secret.json' }],
    ['a chunk with no hash', m => { delete m.chunks[0].hash }],
  ]
  for (const [label, change] of cases) {
    const manifest = structuredClone(good.manifest)
    change(manifest)
    await assert.rejects(
      fetchStaticCatalog({ ...options(), fetchImpl: fakeHost({ manifest, files: good.files }).fetchImpl }),
      err => err instanceof StaticCatalogError && err.code === 'manifest-unusable',
      label,
    )
  }
})

test('a manifest that is down or not JSON is refused', async () => {
  const good = publish(makeTables())
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: fakeHost(good, { answer: n => (n === 'manifest.json' ? { ok: false, status: 500 } : null) }).fetchImpl }),
    err => err.code === 'manifest-unreadable',
  )
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: fakeHost(good, { answer: n => (n === 'manifest.json' ? { ok: true, status: 200, json: async () => { throw new SyntaxError('x') } } : null) }).fetchImpl }),
    err => err.code === 'manifest-unreadable',
  )
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: async () => { throw new TypeError('network down') } }),
    err => err.code === 'manifest-unreadable',
  )
})

test('a list that is shorter than the manifest says is refused', async () => {
  const good = publish(makeTables())
  const manifest = structuredClone(good.manifest)
  manifest.totals.brands += 5
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: fakeHost({ manifest, files: good.files }).fetchImpl }),
    err => err.code === 'count-mismatch',
  )
})

// ─── The switch ─────────────────────────────────────────────────────────────

function fakeSupabase(answer) {
  const seen = {}
  const builder = {
    select(cols) { seen.cols = cols; return builder },
    eq(col, val) { seen.col = col; seen.val = val; return builder },
    maybeSingle() { return Promise.resolve(typeof answer === 'function' ? answer() : answer) },
  }
  return { from(table) { seen.table = table; return builder }, seen }
}

test('the switch reads the right row and is on only for the value true', async () => {
  const sb = fakeSupabase({ data: { value: 'true' }, error: null })
  assert.equal(await isStaticCatalogEnabled(sb), true)
  assert.deepEqual([sb.seen.table, sb.seen.col, sb.seen.val], ['cms_config', 'key', CATALOG_SWITCH_KEY])
  assert.equal(await isStaticCatalogEnabled(fakeSupabase({ data: { value: ' TRUE ' }, error: null })), true)
})

test('the switch is off when the row is missing, says anything else, errors, throws or is too slow', async () => {
  assert.equal(await isStaticCatalogEnabled(fakeSupabase({ data: null, error: null })), false)
  assert.equal(await isStaticCatalogEnabled(fakeSupabase({ data: { value: 'false' }, error: null })), false)
  assert.equal(await isStaticCatalogEnabled(fakeSupabase({ data: { value: '1' }, error: null })), false)
  assert.equal(await isStaticCatalogEnabled(fakeSupabase({ data: null, error: { message: 'boom' } })), false)
  assert.equal(await isStaticCatalogEnabled(fakeSupabase(() => { throw new Error('boom') })), false)
  assert.equal(await isStaticCatalogEnabled(fakeSupabase(() => new Promise(() => {})), 20), false)
})

// ─── Stale files (S2.5) ─────────────────────────────────────────────────────

/** A fake client for the stale check: app_metadata gives the server stamp, audit_log gives the changes. */
function fakeServer({ stamp, changes = [], failOn = null }) {
  const asked = []
  return {
    asked,
    from(table) {
      const b = {
        select() { return b },
        eq() { return b },
        single() {
          if (failOn === 'stamp') return Promise.resolve({ data: null, error: new Error('down') })
          return Promise.resolve({ data: { drugs_updated_at: stamp, conditions_updated_at: null }, error: null })
        },
        in() { return b },
        gt(col, val) { asked.push([table, col, val]); return b },
        order() {
          if (failOn === 'log') return Promise.resolve({ data: null, error: new Error('down') })
          return Promise.resolve({ data: changes, error: null })
        },
      }
      return b
    },
  }
}
const rows = (n, table = 'brands') => Array.from({ length: n }, (_, i) => ({ id: i, action: 'UPDATE', table_name: table, record_id: 'x' + i, created_at: '2026-11-21T00:00:00+00:00' }))
const MANIFEST = { drugsUpdatedAt: '2026-11-20T10:00:00', auditCursor: '2026-11-20T09:59:00+00:00' }

test('files with the server version stamp are fine (no change-log read needed)', async () => {
  const server = fakeServer({ stamp: MANIFEST.drugsUpdatedAt })
  assert.equal(await manifestCanCatchUp(server, MANIFEST, 200), true)
  assert.equal(server.asked.length, 0)
})

test('files a few drug changes behind can be caught up from the manifest bookmark', async () => {
  const server = fakeServer({ stamp: '2026-11-21T08:00:00', changes: rows(12) })
  assert.equal(await manifestCanCatchUp(server, MANIFEST, 200), true)
  assert.deepEqual(server.asked[0], ['audit_log', 'created_at', MANIFEST.auditCursor])
  assert.equal(await manifestCanCatchUp(fakeServer({ stamp: 'x', changes: rows(200) }), MANIFEST, 200), true)
})

test('files too far behind after a bulk job are stale', async () => {
  assert.equal(await manifestCanCatchUp(fakeServer({ stamp: 'x', changes: rows(201) }), MANIFEST, 200), false)
})

test('a moved stamp with no drug change in the log (a direct database edit) is stale', async () => {
  assert.equal(await manifestCanCatchUp(fakeServer({ stamp: 'x', changes: [] }), MANIFEST, 200), false)
  assert.equal(await manifestCanCatchUp(fakeServer({ stamp: 'x', changes: rows(5, 'conditions') }), MANIFEST, 200), false)
})

test('a database error in the stale check is thrown, never answered as fresh or stale', async () => {
  await assert.rejects(manifestCanCatchUp(fakeServer({ stamp: 'x', failOn: 'stamp' }), MANIFEST, 200))
  await assert.rejects(manifestCanCatchUp(fakeServer({ stamp: 'x', failOn: 'log' }), MANIFEST, 200))
})

test('when the manifest is declined, no chunk is downloaded and the code is declined', async () => {
  const host = publish(makeTables())
  const fake = fakeHost(host)
  await assert.rejects(
    fetchStaticCatalog({ ...options(), fetchImpl: fake.fetchImpl, acceptManifest: async () => false }),
    err => err instanceof StaticCatalogError && err.code === 'declined',
  )
  assert.deepEqual(fake.calls, ['manifest.json'])
  const ok = await fetchStaticCatalog({ ...options(), fetchImpl: fakeHost(host).fetchImpl, acceptManifest: async m => m.chunks.length === CATALOG_CHUNK_COUNT })
  assert.equal(ok.drugs.length, host.stats.brands)
})

// The nested rows the database would return, built straight from the tables (the independent route).
function directRows({ generics, formulations, brands }) {
  const g = new Map(generics.map(r => [r.id, r]))
  const f = new Map(formulations.map(r => [r.id, r]))
  return brands.filter(b => b.is_published === true).map(b => {
    const form = f.get(b.formulation_id)
    const gen = form ? g.get(form.generic_id) : null
    return { ...b, formulations: form ? { ...form, generics: gen ?? null } : null }
  })
}
